import { ScriptConfig, ScriptResult } from '../types.js';
import { getFile } from '../db.js';
import {
  evalWithTaskAuthAndPrint,
  formatResultWithPrintMessages,
  formatDdbScriptError,
  normalizeScriptArgs,
  truncateToolContent,
} from './helpers.js';

const uint8ArrayToBase64 = (bytes: Uint8Array): string => {
  if (!bytes.length) {
    return '';
  }
  return Buffer.from(bytes).toString('base64');
};

const extractRawDdbBase64 = (packed: Uint8Array): string => {
  return uint8ArrayToBase64(packed);
};

export const executeFileConfig: ScriptConfig = {
  function: 'execute_file',
  handler: async (type, content, taskContext): Promise<ScriptResult> => {
    try {
      const args = normalizeScriptArgs(content);
      let path = args[0] || '';
      
      let cleanedPath = path.trim();
      if (cleanedPath.startsWith('/')) {
        cleanedPath = cleanedPath.substring(1);
      }

      if (!cleanedPath) {
        return {
          next_loop: true,
          save_message: {
            role: 'user',
            messageType: 'tool_error',
            name: type,
            content: 'execute_file requires args[0] as file path.',
          },
        };
      }

      const existingFile = await getFile(taskContext.auth, taskContext.workspaceId, cleanedPath);
      if (!existingFile) {
        return {
          next_loop: true,
          save_message: {
            role: 'user',
            messageType: 'tool_error',
            name: type,
            content: `execute_file failed: File not found: ${cleanedPath}`,
          },
        };
      }

      const scriptOrSql = existingFile.content || '';
      if (!scriptOrSql.trim()) {
        return {
          next_loop: true,
          save_message: {
            role: 'user',
            messageType: 'tool_result',
            name: type,
            content: 'File is empty, nothing to execute.',
          },
        };
      }

      const { result, printMessages } = await evalWithTaskAuthAndPrint(taskContext, scriptOrSql);
      const messageContent = truncateToolContent(
        formatResultWithPrintMessages(result.data({ table: 'full' }), printMessages),
      );

      return {
        next_loop: true,
        save_message: {
          role: 'user',
          messageType: 'tool_result',
          name: type,
          content: messageContent,
          content_object: extractRawDdbBase64(result.pack()),
        },
      };
    } catch (error) {
      return {
        next_loop: true,
        save_message: {
          role: 'user',
          messageType: 'tool_error',
          name: type,
          content: formatDdbScriptError('execute_file failed: ', error),
        },
      };
    }
  }
};
