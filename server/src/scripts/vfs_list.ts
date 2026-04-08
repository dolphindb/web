import { ScriptConfig, ScriptResult } from '../types.js';
import { listFilesByWorkspace } from '../db.js';
import { normalizeScriptArgs } from './helpers.js';

export const vfsListConfig: ScriptConfig = {
  function: 'vfs_list',
  handler: async (type, content, taskContext): Promise<ScriptResult> => {
    try {
      const args = normalizeScriptArgs(content);
      let queryPath = args[0] || '';
      
      let cleanedPath = queryPath.trim();
      if (cleanedPath.startsWith('/')) {
        cleanedPath = cleanedPath.substring(1);
      }

      const files = await listFilesByWorkspace(taskContext.auth, taskContext.workspaceId);
      
      let filteredFiles = files;
      if (cleanedPath) {
        filteredFiles = files.filter((f: any) => f.path === cleanedPath || f.path.startsWith(cleanedPath + '/'));
      }

      const fileList = filteredFiles.map((f: any) => f.path).join('\n');
      const messageContent = fileList || 'No files found.';

      return {
        next_loop: true,
        save_message: {
          role: 'user',
          messageType: 'tool_result',
          name: type,
          content: messageContent,
        },
      };
    } catch (error: any) {
      return {
        next_loop: true,
        save_message: {
          role: 'user',
          messageType: 'tool_error',
          name: type,
          content: `vfs_list failed: ${error.message}`,
        },
      };
    }
  }
};
