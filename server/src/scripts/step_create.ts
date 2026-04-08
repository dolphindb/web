import { ScriptConfig, ScriptResult } from '../types.js';
import { createStepBatch } from '../db.js';
import { normalizeScriptArgs } from './helpers.js';
import { BackgroundAgent } from '../BackgroundAgent.js';

export const stepCreateConfig: ScriptConfig = {
  function: 'step_create',
  handler: async (type, payload, taskContext): Promise<ScriptResult> => {
    try {
      const args = normalizeScriptArgs(payload);
      if (!args || args.length === 0) {
        return {
          next_loop: true,
          save_message: {
            role: 'user',
            messageType: 'tool_error',
            name: type,
            content: 'step_create requires at least one task string.',
          },
        };
      }

      await createStepBatch(taskContext.auth, taskContext.chatId, args);
      BackgroundAgent.getInstance().emitStepsUpdated(taskContext.chatId);

      return {
        next_loop: true,
        save_message: {
          role: 'user',
          messageType: 'tool_result',
          name: type,
          content: `Successfully created ${args.length} tasks and deactivated previous ones.`,
        },
      };
    } catch (error: any) {
      return {
        next_loop: true,
        save_message: {
          role: 'user',
          messageType: 'tool_error',
          name: type,
          content: `step_create failed: ${error.message}`,
        },
      };
    }
  }
};
