import { EventEmitter } from 'events';
import {
  ScriptType,
  ScriptResult,
  ChatTask,
  IMessage,
  AgentStatus,
  IAgentStatusEvent,
  IAgentRuntimeSnapshot,
  IChatUpdatedEvent,
} from './types.js';
import { getScriptHandler } from './scripts/index.js';
import { initScripts } from './scripts/init.js';
import { do_loop, getRuntimeConfig, callLlm } from './loop.js';
import { insertMessage, updateChatTitle, getMessages } from './db.js';

const DEFAULT_CHAT_TITLE = '新会话';
const MAX_CHAT_TITLE_LENGTH = 40;
const DEFAULT_IDLE_TASK_EVICT_MS = 10 * 60 * 1000;
const DEFAULT_IDLE_SWEEP_INTERVAL_MS = 60 * 1000;

const readPositiveIntEnv = (name: string, fallback: number): number => {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
};

const IDLE_TASK_EVICT_MS = readPositiveIntEnv('AGENT_IDLE_TASK_EVICT_MS', DEFAULT_IDLE_TASK_EVICT_MS);
const IDLE_SWEEP_INTERVAL_MS = readPositiveIntEnv('AGENT_IDLE_SWEEP_INTERVAL_MS', DEFAULT_IDLE_SWEEP_INTERVAL_MS);

export class BackgroundAgent {
  private static instance: BackgroundAgent;
  private activeTasks: Map<string, ChatTask>;
  
  // In-memory buffer queue for op-event pattern
  private inputBuffer: Map<string, string[]>;

  // Last active time per chat task, for idle eviction
  private lastActivityAt: Map<string, number>;
  
  // Concurrency control for run loop per chatId
  private runningTasks: Set<string>;

  // Last known runtime status per chatId for "subscribe then snapshot" use cases
  private chatStatus: Map<string, IAgentStatusEvent>;
  
  // Event emitter for broadcasting updates (e.g., to WebSocket clients)
  public readonly events: EventEmitter;

  private constructor() {
    initScripts();
    this.activeTasks = new Map<string, ChatTask>();
    this.inputBuffer = new Map<string, string[]>();
    this.lastActivityAt = new Map<string, number>();
    this.runningTasks = new Set<string>();
    this.chatStatus = new Map<string, IAgentStatusEvent>();
    this.events = new EventEmitter();
    const timer = setInterval(() => {
      this.evictIdleTasks();
    }, IDLE_SWEEP_INTERVAL_MS);
    timer.unref?.();
  }

  public static getInstance(): BackgroundAgent {
    if (!BackgroundAgent.instance) {
      BackgroundAgent.instance = new BackgroundAgent();
    }
    return BackgroundAgent.instance;
  }

  public startTask(task: ChatTask, options?: { runImmediately?: boolean }): void {
    const runImmediately = options?.runImmediately ?? true;
    this.activeTasks.set(task.chatId, task);
    this.inputBuffer.set(task.chatId, []);
    this.touchTask(task.chatId);
    this.chatStatus.set(task.chatId, {
      status: 'idle',
      timestamp: Date.now(),
    });
    if (runImmediately) {
      this.run(task.chatId).catch(err => console.error(`Task ${task.chatId} failed:`, err));
    }
  }

  public endTask(chatId: string): void {
    this.emitStatus(chatId, 'idle');
    this.activeTasks.delete(chatId);
    this.inputBuffer.delete(chatId);
    this.lastActivityAt.delete(chatId);
    this.runningTasks.delete(chatId);
    this.chatStatus.delete(chatId);
  }

  public getTask(chatId: string): ChatTask | undefined {
    return this.activeTasks.get(chatId);
  }

  public updateTaskModel(chatId: string, providerId: string, modelId: string): void {
    const task = this.activeTasks.get(chatId);
    if (task) {
      task.providerId = providerId;
      task.modelId = modelId;
    }
  }

  public updateTaskTitle(chatId: string, title: string): void {
    const task = this.activeTasks.get(chatId);
    if (task) {
      task.title = title;
      task.updateTime = Date.now();
    }
  }

  public emitChatUpdated(chat: Omit<IChatUpdatedEvent, 'updateTime'> & { updateTime?: number }): void {
    const payload: IChatUpdatedEvent = {
      chatId: chat.chatId,
      title: chat.title,
      updateTime: chat.updateTime ?? Date.now(),
    };
    this.events.emit('chat_updated', payload);
  }

  public emitStepsUpdated(chatId: string): void {
    this.events.emit('steps_updated', chatId);
  }

  /**
   * Submit new user input into the in-memory buffer.
   * Do NOT write to DB yet. Wait for the run loop to flush it.
   */
  public submitInput(chatId: string, content: string): void {
    if (!this.inputBuffer.has(chatId)) {
      this.inputBuffer.set(chatId, []);
    }
    if (!this.chatStatus.has(chatId)) {
      this.chatStatus.set(chatId, {
        status: 'idle',
        timestamp: Date.now(),
      });
    }
    const buffer = this.inputBuffer.get(chatId)!;
    buffer.push(content);
    this.touchTask(chatId);
    
    // OP-EVENT: Emit event to let UI know buffer state changed
    this.events.emit('buffer_updated', chatId, [...buffer]);
  }

  /**
   * Write an agent message to the database and emit event.
   */
  public async saveMessageAndEmit(chatId: string, message: IMessage): Promise<void> {
    const task = this.getTask(chatId);
    if (!task) return;

    message.chatId = chatId;
    message.msgId = await insertMessage(task.auth, message);
    this.touchTask(chatId);
    this.events.emit('message', chatId, message);
  }

  public emitMessageStream(chatId: string, message: IMessage): void {
    this.touchTask(chatId);
    this.events.emit('message_stream', chatId, {
      ...message,
      chatId,
    });
  }

  public emitMessageStreamEnd(chatId: string, msgId: string, discard = false): void {
    this.touchTask(chatId);
    this.events.emit('message_stream_end', chatId, {
      msgId,
      discard,
      timestamp: Date.now(),
    });
  }

  public emitStatus(chatId: string, status: AgentStatus, message?: string): void {
    const payload: IAgentStatusEvent = {
      status,
      message,
      timestamp: Date.now(),
    };
    this.chatStatus.set(chatId, payload);
    this.touchTask(chatId);
    this.events.emit('status', chatId, payload);
  }

  public getLatestStatus(chatId: string): IAgentStatusEvent {
    const status = this.chatStatus.get(chatId);
    if (status) {
      return { ...status };
    }
    return {
      status: 'idle',
      timestamp: Date.now(),
    };
  }

  public getBufferedInputs(chatId: string): string[] {
    const buffer = this.inputBuffer.get(chatId) || [];
    return [...buffer];
  }

  public getRuntimeSnapshot(chatId: string): IAgentRuntimeSnapshot {
    const buffer = this.getBufferedInputs(chatId);
    return {
      chatId,
      hasTask: this.activeTasks.has(chatId),
      isRunning: this.runningTasks.has(chatId),
      buffer,
      bufferCount: buffer.length,
      status: this.getLatestStatus(chatId),
    };
  }

  private shouldAutoGenerateTitle(title: string | null | undefined): boolean {
    const normalized = (title || '').trim();
    return !normalized || normalized === DEFAULT_CHAT_TITLE;
  }

  private normalizeTitle(value: string): string {
    return value
      .replace(/\r?\n/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/^["'""''《》【】\[\]\(\)\s]+|["'""''《》【】\[\]\(\)\s]+$/g, '')
      .trim()
      .slice(0, MAX_CHAT_TITLE_LENGTH);
  }

  private async maybeGenerateTitleForFirstUserMessage(task: ChatTask, firstUserMessage: string): Promise<void> {
    if (!this.shouldAutoGenerateTitle(task.title)) {
      return;
    }

    const firstUserText = firstUserMessage.trim();
    if (!firstUserText) {
      return;
    }

    try {
      const messages = await getMessages(task.auth, task.chatId);
      const hasUserMessage = messages.some(
        (message) => message.role === 'user' && (message.messageType ?? 'text') === 'text',
      );
      if (hasUserMessage) {
        return;
      }

      const runtimeConfigResult = await getRuntimeConfig(task);
      if (!runtimeConfigResult.config) {
        return;
      }

      const completion = await callLlm(runtimeConfigResult.config, [
        {
          role: 'system',
          content:
            '你是一个对话标题生成器。根据用户的第一条消息，生成一个简洁准确的中文标题，用于概括本次对话的主题。\n' +
            '要求：\n' +
            '- 只输出标题文本，不要加引号、标点或任何额外说明\n' +
            '- 标题长度控制在 20 字以内\n' +
            '- 使用名词短语或动宾短语，不要使用完整句子',
        },
        {
          role: 'user',
          content: firstUserText,
        },
      ]);
      const generatedTitle = this.normalizeTitle(completion.content || '');
      if (!generatedTitle) {
        return;
      }

      if (!this.shouldAutoGenerateTitle(task.title)) {
        return;
      }

      await updateChatTitle(task.auth, task.chatId, generatedTitle);
      this.updateTaskTitle(task.chatId, generatedTitle);
      this.emitChatUpdated({
        chatId: task.chatId,
        title: generatedTitle,
      });
    } catch (error) {
      console.error(`Failed to auto-generate title for ${task.chatId}:`, error);
    }
  }

  /**
   * Main agent loop that orchestrates op-event queue and do_loop.
   */
  public async run(chatId: string): Promise<void> {
    // Prevent multiple concurrent run loops for the same task
    if (this.runningTasks.has(chatId)) {
      return;
    }

    this.runningTasks.add(chatId);
    this.touchTask(chatId);

    try {
      while (true) {
        const task = this.getTask(chatId);
        if (!task) break;

        // 1. Flush any buffered inputs into the DB (Single Source of Truth)
        const buffer = this.inputBuffer.get(chatId) || [];
        if (buffer.length > 0) {
          this.emitStatus(chatId, 'thinking', `Agent 正在处理输入队列（${buffer.length} 条）...`);
          const contentsToFlush = [...buffer];
          this.inputBuffer.set(chatId, []);
          this.events.emit('buffer_updated', chatId, []); // UI clears gray box

          for (const content of contentsToFlush) {
            if (this.shouldAutoGenerateTitle(task.title)) {
              this.maybeGenerateTitleForFirstUserMessage(task, content).catch((error) => {
                console.error(`Auto title generation task failed for ${chatId}:`, error);
              });
            }

            const msg: IMessage = {
              chatId,
              role: 'user',
              messageType: 'text',
              content,
            };
            // "进消息" -> Write to DB
            msg.msgId = await insertMessage(task.auth, msg);
            this.touchTask(chatId);
            this.events.emit('message', chatId, msg);
            
            // Sleep briefly to prevent DolphinDB timestamp collisions
            await new Promise(r => setTimeout(r, 20));
          }
        }

        // 2. Execute one iteration of the agent's logic.
        const shouldContinue = await do_loop(this, chatId);
        this.touchTask(chatId);

        // 3. Decide whether to continue
        if (shouldContinue) {
          continue; // Agent wants to continue, loop top will flush new inputs if any
        } else {
          // If no autonomous continuation, check if user submitted anything while we were running
          const newBuffer = this.inputBuffer.get(chatId) || [];
          if (newBuffer.length > 0) {
            continue; // Go back to flush the newly buffered messages
          } else {
            break; // Sleep until awakened by next submitInput -> run()
          }
        }
      }
    } finally {
      const currentStatus = this.getLatestStatus(chatId);
      if (currentStatus.status !== 'error') {
        this.emitStatus(chatId, 'idle');
      }
      this.runningTasks.delete(chatId);
    }
  }

  private touchTask(chatId: string): void {
    this.lastActivityAt.set(chatId, Date.now());
  }

  private evictIdleTasks(): void {
    const now = Date.now();
    const toEvict: string[] = [];

    for (const [chatId, task] of this.activeTasks.entries()) {
      if (!task) {
        continue;
      }
      if (this.runningTasks.has(chatId)) {
        continue;
      }

      const buffered = this.inputBuffer.get(chatId);
      if (buffered && buffered.length > 0) {
        continue;
      }

      const lastAt = this.lastActivityAt.get(chatId) ?? 0;
      if (now - lastAt < IDLE_TASK_EVICT_MS) {
        continue;
      }

      toEvict.push(chatId);
    }

    for (const chatId of toEvict) {
      console.log(`Evicting idle task ${chatId} after ${IDLE_TASK_EVICT_MS}ms of inactivity.`);
      this.endTask(chatId);
    }
  }

  public async dispatchScript(chatId: string, type: ScriptType, content: any): Promise<ScriptResult> {
    const taskContext = this.getTask(chatId);
    
    if (!taskContext) {
      return {
        next_loop: false,
        save_message: {
          role: 'user',
          messageType: 'tool_error',
          name: type,
          content: `Task with chatId ${chatId} not found in the running queue.`,
        }
      };
    }

    const handler = getScriptHandler(type);
    if (!handler) {
      const stringifiedContent = typeof content === 'string' ? content : JSON.stringify(content);
      return {
        next_loop: true,
        save_message: {
          role: 'user',
          messageType: 'tool_error',
          name: type,
          content: `No script handler found for type: ${type}. Content: ${stringifiedContent}`,
        }
      };
    }

    return handler(type, content, taskContext);
  }
}
