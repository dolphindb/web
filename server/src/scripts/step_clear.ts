import { ScriptConfig, ScriptResult } from '../types.js';
import { updateStepsDeactivateAll } from '../db.js';
import { normalizeScriptArgs } from './helpers.js';
import { BackgroundAgent } from '../BackgroundAgent.js';

export const stepClearConfig: ScriptConfig = {
  function: 'step_clear',
  handler: async (type, payload, taskContext): Promise<ScriptResult> => {
    try {
      await updateStepsDeactivateAll(taskContext.auth, taskContext.chatId);
      BackgroundAgent.getInstance().emitStepsUpdated(taskContext.chatId);

      return {
        next_loop: true,
        save_message: {
          role: 'user',
          messageType: 'tool_result',
          name: type,
          content: 'Successfully deactivated all current tasks for this chat.',
        },
      };
    } catch (error: any) {
      return {
        next_loop: true,
        save_message: {
          role: 'user',
          messageType: 'tool_error',
          name: type,
          content: `step_clear failed: ${error.message}`,
        },
      };
    }
  }
};
