import { ScriptConfig, ScriptResult } from '../types.js';
import {
  executeWithTaskAuth,
  formatDdbScriptError,
  normalizeScriptArgs,
  stringifyDdbResult,
} from './helpers.js';

export const testsqlConfig: ScriptConfig = {
  function: 'testsql',
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
            content: 'testsql requires args[0] as table handle expression.',
          },
        };
      }

      // Reference behavior: run a quick sample query to help understand data.
      const result = await executeWithTaskAuth(taskContext, `select * from ${tbhandle} limit 5`);
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
          content: formatDdbScriptError('testsql failed: ', error),
        },
      };
    }
  }
};
