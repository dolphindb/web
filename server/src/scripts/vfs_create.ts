import { ScriptConfig, ScriptResult } from '../types.js';
import { createFile, getFile } from '../db.js';
import { normalizeScriptArgs } from './helpers.js';

export const vfsCreateConfig: ScriptConfig = {
  function: 'vfs_create',
  handler: async (type, payload, taskContext): Promise<ScriptResult> => {
    try {
      const args = normalizeScriptArgs(payload);
      let path = args[0] || '';
      let fileContent = args[1] || '';
      
      let cleanedPath = path.trim();
      if (cleanedPath.startsWith('/')) {
        cleanedPath = cleanedPath.substring(1);
      }

      if (!cleanedPath) {
        throw new Error('Path is required');
      }

      const existingFile = await getFile(taskContext.auth, taskContext.workspaceId, cleanedPath);
      if (existingFile) {
        throw new Error(`File already exists: ${cleanedPath}`);
      }

      await createFile(taskContext.auth, {
        workspaceId: taskContext.workspaceId,
        path: cleanedPath,
        content: fileContent,
      });

      return {
        next_loop: true,
        save_message: {
          role: 'user',
          messageType: 'tool_result',
          name: type,
          content: `File created successfully: ${cleanedPath}`,
        },
      };
    } catch (error: any) {
      return {
        next_loop: true,
        save_message: {
          role: 'user',
          messageType: 'tool_error',
          name: type,
          content: `vfs_create failed: ${error.message}`,
        },
      };
    }
  }
};
