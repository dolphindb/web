import { ScriptConfig, ScriptResult } from '../types.js';
import { getWorkspace } from '../db.js';

export const workspaceStateReadConfig: ScriptConfig = {
  function: 'workspace_state_read',
  handler: async (type, payload, taskContext): Promise<ScriptResult> => {
    try {
      const workspace = await getWorkspace(taskContext.auth, taskContext.workspaceId);
      if (!workspace) {
        throw new Error('未找到工作区。');
      }

      return {
        next_loop: true,
        save_message: {
          role: 'user',
          messageType: 'tool_result',
          name: type,
          content: workspace.current_state || '暂无状态记录',
        },
      };
    } catch (error: any) {
      return {
        next_loop: true,
        save_message: {
          role: 'user',
          messageType: 'tool_error',
          name: type,
          content: `workspace_state_read 执行失败：${error.message}`,
        },
      };
    }
  }
};
