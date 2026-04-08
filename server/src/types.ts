import type { DdbAuth } from './lib/ddb-auth.js'

export type MessageRole = 'system' | 'user' | 'assistant'
export type MessageType =
  | 'system'
  | 'text'
  | 'tool_call'
  | 'tool_result'
  | 'skill_result'
  | 'tool_error'
  | 'agent_error'

export type AgentStatus = 'idle' | 'thinking' | 'tool_running' | 'error'

export interface IAgentStatusEvent {
  status: AgentStatus
  message?: string
  timestamp: number
}

export interface IAgentRuntimeSnapshot {
  chatId: string
  hasTask: boolean
  isRunning: boolean
  buffer: string[]
  bufferCount: number
  status: IAgentStatusEvent
}

export interface IChatUpdatedEvent {
  chatId: string
  title: string
  updateTime: number
}

export interface IMessage {
  msgId?: string;
  chatId?: string;
  username?: string;
  createTime?: number | Date;
  updateTime?: number | Date;
  role: MessageRole;
  messageType?: MessageType;
  content: string;
  reasoning?: string;
  reasoning_content?: string;
  content_object?: string; // Stored as BLOB in DB
  msgIndex?: number;
  
  // Optional fields for function/tool calls depending on LLM integration
  name?: string; 
  function_call?: {
    name: string;
    arguments: string;
  };
  tool_calls?: any[];
}

export interface ChatTask {
  chatId: string;
  workspaceId: string;
  username: string;
  title: string;
  providerId: string;
  modelId: string;
  agentId: string;
  authHeader: string; 
  auth: DdbAuth; // Extracted auth credentials for DB pool access
  createTime?: number | Date;
  updateTime?: number | Date;
  isDeleted?: boolean;
}

export type ScriptType = 'coldefs' | 'testsql' | 'show' | 'execute' | string;

export interface ScriptResult {
  next_loop: boolean;
  save_message?: IMessage;
}

export type ScriptHandler = (type: ScriptType, content: any, taskContext: ChatTask) => Promise<ScriptResult> | ScriptResult;

export interface ScriptConfig {
  function: ScriptType;
  handler: ScriptHandler;
}
