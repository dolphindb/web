import { ScriptConfig, ScriptResult } from '../types.js';
import { getWorkspace, updateWorkspaceState } from '../db.js';
import { normalizeScriptArgs } from './helpers.js';

const toText = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }
  if (value == null) {
    return '';
  }
  return String(value);
};

export const workspaceStateUpdateConfig: ScriptConfig = {
  function: 'workspace_state_update',
  handler: async (type, payload, taskContext): Promise<ScriptResult> => {
    try {
      const args = normalizeScriptArgs(payload);
      const oldString = args[0] || '';
      const newString = args[1] || '';

      const workspace = await getWorkspace(taskContext.auth, taskContext.workspaceId);
      if (!workspace) {
        throw new Error('未找到工作区。');
      }

      const currentState = toText(workspace.current_state);
      
      let updatedState = currentState;
      let updateMode = 'replace';
      if (!currentState) {
        updatedState = newString;
        updateMode = 'initialize';
      } else if (!oldString) {
        updatedState = currentState + '\n\n' + newString;
        updateMode = 'append_without_old_string';
      } else {
        if (!currentState.includes(oldString)) {
          updatedState = currentState + '\n\n' + newString;
          updateMode = 'append_when_old_string_not_found';
        } else {
          updatedState = currentState.replace(oldString, newString);
          updateMode = 'replace';
        }
      }

      await updateWorkspaceState(taskContext.auth, taskContext.workspaceId, updatedState);
      const verifiedWorkspace = await getWorkspace(taskContext.auth, taskContext.workspaceId);
      if (!verifiedWorkspace) {
        throw new Error(`更新后未找到工作区。workspaceId=${taskContext.workspaceId}`);
      }

      const verifiedState = toText(verifiedWorkspace.current_state);
      if (verifiedState !== updatedState) {
        throw new Error(
          `写入校验失败。workspaceId=${taskContext.workspaceId}, expectedLen=${updatedState.length}, actualLen=${verifiedState.length}`,
        );
      }

      return {
        next_loop: true,
        save_message: {
          role: 'user',
          messageType: 'tool_result',
          name: type,
          content:
            `工作区状态已更新并校验成功。` +
            `workspaceId=${taskContext.workspaceId}，` +
            `更新方式=${updateMode}，` +
            `oldStringLen=${oldString.length}，` +
            `newStringLen=${newString.length}，` +
            `beforeLen=${currentState.length}，` +
            `afterLen=${verifiedState.length}。`,
        },
      };
    } catch (error: any) {
      return {
        next_loop: true,
        save_message: {
          role: 'user',
          messageType: 'tool_error',
          name: type,
          content: `workspace_state_update 执行失败：${error.message}`,
        },
      };
    }
  }
};
