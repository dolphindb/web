import { ScriptConfig, ScriptResult } from '../types.js';
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

export const showConfig: ScriptConfig = {
  function: 'show',
  handler: async (type, content, taskContext): Promise<ScriptResult> => {
    try {
      const args = normalizeScriptArgs(content);
      const scriptOrSql = args[0] || '';
      if (!scriptOrSql) {
        return {
          next_loop: true,
          save_message: {
            role: 'user',
            messageType: 'tool_error',
            name: type,
            content: 'show requires args[0] as SQL/script content.',
          },
        };
      }

      const { result, printMessages } = await evalWithTaskAuthAndPrint(taskContext, scriptOrSql);
      const messageContent = truncateToolContent(
        formatResultWithPrintMessages(result.data({ table: 'full' }), printMessages),
      );

      return {
        next_loop: false,
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
          content: formatDdbScriptError('show failed: ', error),
        },
      };
    }
  }
};
