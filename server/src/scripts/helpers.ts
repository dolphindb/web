import { ddbConnectionPool } from '../lib/ddb-connection-pool.js';
import type { DdbEvalOptions, DdbObj } from 'dolphindb';
import type { ChatTask } from '../types.js';

type ScriptPayloadObject = {
  args?: unknown;
  content?: unknown;
};

const toStringArg = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }
  if (value == null) {
    return '';
  }
  return String(value);
};

export const normalizeScriptArgs = (payload: unknown): string[] => {
  if (Array.isArray(payload)) {
    return payload.map(toStringArg);
  }

  if (typeof payload === 'string') {
    return payload.trim() ? [payload] : [];
  }

  if (payload && typeof payload === 'object') {
    const obj = payload as ScriptPayloadObject;

    if (Array.isArray(obj.args)) {
      return obj.args.map(toStringArg);
    }
    if (typeof obj.args === 'string') {
      return obj.args.trim() ? [obj.args] : [];
    }

    if (Array.isArray(obj.content)) {
      return obj.content.map(toStringArg);
    }
    if (typeof obj.content === 'string') {
      return obj.content.trim() ? [obj.content] : [];
    }
  }

  return [];
};

export const executeWithTaskAuth = async (taskContext: ChatTask, script: string): Promise<unknown> => {
  const lease = await ddbConnectionPool.get(taskContext.auth);
  try {
    return await lease.ddb.execute(script, { table: 'full' });
  } finally {
    await lease.release();
  }
};

export const evalWithTaskAuth = async (
  taskContext: ChatTask,
  script: string,
  options?: DdbEvalOptions,
): Promise<DdbObj> => {
  const lease = await ddbConnectionPool.get(taskContext.auth);
  try {
    return await lease.ddb.eval(script, options);
  } finally {
    await lease.release();
  }
};

export const evalWithTaskAuthAndPrint = async (
  taskContext: ChatTask,
  script: string,
  options?: DdbEvalOptions,
): Promise<{ result: DdbObj; printMessages: string[] }> => {
  const lease = await ddbConnectionPool.get(taskContext.auth);
  const printMessages: string[] = [];
  const userListener = options?.listener;
  const listener: NonNullable<DdbEvalOptions['listener']> = (message, ddb) => {
    if (message.type === 'print' && message.data) {
      printMessages.push(message.data);
    }
    userListener?.(message, ddb);
  };

  try {
    const result = await lease.ddb.eval(script, {
      ...options,
      listener,
    });
    return {
      result,
      printMessages,
    };
  } finally {
    await lease.release();
  }
};

export const stringifyDdbResult = (result: unknown): string => {
  try {
    return JSON.stringify(result);
  } catch {
    return String(result);
  }
};

export const formatResultWithPrintMessages = (result: unknown, printMessages: string[]): string => {
  if (printMessages.length === 0) {
    return stringifyDdbResult(result);
  }

  return stringifyDdbResult({
    result,
    print: printMessages,
  });
};

const DEFAULT_TOOL_CONTENT_MAX_CHARS = 5000;
const CONTENT_TRUNCATION_MARKER = '\n\n[内容过长，已截断]';

export const truncateToolContent = (text: string, maxChars = DEFAULT_TOOL_CONTENT_MAX_CHARS): string => {
  const safeMaxChars = Number.isFinite(maxChars) && maxChars > 0 ? Math.trunc(maxChars) : DEFAULT_TOOL_CONTENT_MAX_CHARS;
  if (text.length <= safeMaxChars) {
    return text;
  }

  if (safeMaxChars <= CONTENT_TRUNCATION_MARKER.length) {
    return text.slice(0, safeMaxChars);
  }

  const cutoff = safeMaxChars - CONTENT_TRUNCATION_MARKER.length;
  return `${text.slice(0, cutoff).trimEnd()}${CONTENT_TRUNCATION_MARKER}`;
};

const DDB_ERROR_GUIDANCE = '建议查询文档获取准确的函数参考';

export const formatDdbScriptError = (prefix: string, error: unknown): string => {
  const messageContent = error instanceof Error ? error.message : String(error);
  return `${prefix}${messageContent}。${DDB_ERROR_GUIDANCE}`;
};
