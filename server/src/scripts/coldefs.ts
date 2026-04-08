import { ScriptConfig, ScriptResult } from '../types.js';
import {
  executeWithTaskAuth,
  formatDdbScriptError,
  normalizeScriptArgs,
  stringifyDdbResult,
} from './helpers.js';

export const coldefsConfig: ScriptConfig = {
  function: 'coldefs',
  handler: async (type, content, taskContext): Promise<ScriptResult> => {
    try {
      const args = normalizeScriptArgs(content);
      const tbhandle = args[0] || '';
      if (!tbhandle) {
        return {
          next_loop: true,
          save_message: {
            role: 'user',
            messageType: 'tool_error',
            name: type,
            content: 'coldefs requires args[0] as table handle expression.',
          },
        };
      }

      const result = await executeWithTaskAuth(taskContext, `schema(${tbhandle})['colDefs']`);
      const messageContent = stringifyDdbResult(result);

      return {
        next_loop: true,
        save_message: {
          role: 'user',
          messageType: 'tool_result',
          name: type,
          content: messageContent,
        },
      };
    } catch (error) {
      return {
        next_loop: true,
        save_message: {
          role: 'user',
          messageType: 'tool_error',
          name: type,
          content: formatDdbScriptError('coldefs failed: ', error),
        },
      };
    }
  }
};
