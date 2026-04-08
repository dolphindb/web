import { ScriptConfig, ScriptResult } from '../types.js';
import { setStepStatusByIndex } from '../db.js';
import { normalizeScriptArgs } from './helpers.js';
import { BackgroundAgent } from '../BackgroundAgent.js';

export const stepUpdateConfig: ScriptConfig = {
  function: 'step_update',
  handler: async (type, payload, taskContext): Promise<ScriptResult> => {
    try {
      const args = normalizeScriptArgs(payload);
      const indexStr = args[0] || '';
      const checkedStr = args[1] || '';

      if (!indexStr || !checkedStr) {
        return {
          next_loop: true,
          save_message: {
            role: 'user',
            messageType: 'tool_error',
            name: type,
            content: 'step_update requires two arguments: index (number) and checked (boolean string).',
          },
        };
      }

      const index = parseInt(indexStr, 10);
      if (isNaN(index)) {
        throw new Error('Index must be a valid number.');
      }

      const checked = checkedStr.toLowerCase() === 'true';

      await setStepStatusByIndex(taskContext.auth, taskContext.chatId, index, checked);
      BackgroundAgent.getInstance().emitStepsUpdated(taskContext.chatId);

      return {
        next_loop: true,
        save_message: {
          role: 'user',
          messageType: 'tool_result',
          name: type,
          content: `Successfully updated task ${index} to ${checked ? 'checked' : 'unchecked'}.`,
        },
      };
    } catch (error: any) {
      return {
        next_loop: true,
        save_message: {
          role: 'user',
          messageType: 'tool_error',
          name: type,
          content: `step_update failed: ${error.message}`,
        },
      };
    }
  }
};
