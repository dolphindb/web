import { ScriptConfig, ScriptResult } from '../types.js';
import { getFile, updateFileContent } from '../db.js';
import { normalizeScriptArgs } from './helpers.js';

export const vfsUpdateConfig: ScriptConfig = {
  function: 'vfs_update',
  handler: async (type, payload, taskContext): Promise<ScriptResult> => {
    try {
      const args = normalizeScriptArgs(payload);
      let path = args[0] || '';
      let oldString = args[1] || '';
      let newString = args[2] || '';
      
      let cleanedPath = path.trim();
      if (cleanedPath.startsWith('/')) {
        cleanedPath = cleanedPath.substring(1);
      }

      if (!cleanedPath) {
        throw new Error('Path is required');
      }

      const existingFile = await getFile(taskContext.auth, taskContext.workspaceId, cleanedPath);
      if (!existingFile) {
        throw new Error(`File not found: ${cleanedPath}`);
      }

      const currentContent = existingFile.content || '';
      if (!currentContent.includes(oldString)) {
        throw new Error(`The specified old_string was not found in the file.`);
      }

      const updatedContent = currentContent.replace(oldString, newString);

      await updateFileContent(taskContext.auth, existingFile.id, updatedContent);

      return {
        next_loop: true,
        save_message: {
          role: 'user',
          messageType: 'tool_result',
          name: type,
          content: `File updated successfully: ${cleanedPath}`,
        },
      };
    } catch (error: any) {
      return {
        next_loop: true,
        save_message: {
          role: 'user',
          messageType: 'tool_error',
          name: type,
          content: `vfs_update failed: ${error.message}`,
        },
      };
    }
  }
};
