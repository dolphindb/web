import { ScriptConfig, ScriptResult } from '../types.js';
import {
  executeWithTaskAuth,
  formatDdbScriptError,
  normalizeScriptArgs,
  stringifyDdbResult,
} from './helpers.js';

const DB_PATH = 'dfs://chat_dolphindb';
const SKILLS_TABLE = 'skills';

const toDosStringLiteral = (value: string): string => {
  return `"${value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')}"`;
};

const buildReadBySkillIdScript = (skillId: string): string => {
  return `
skillsTable = loadTable(${toDosStringLiteral(DB_PATH)}, ${toDosStringLiteral(SKILLS_TABLE)})
skillIdText = ${toDosStringLiteral(skillId)}
select top 1
  string(skillId) as skillId,
  skillName,
  description,
  string(script) as script,
  isEnabled,
  string(createTime) as createTime,
  string(updateTime) as updateTime
from skillsTable
where string(skillId) = skillIdText
order by updateTime desc, createTime desc
`;
};

export const skillReadConfig: ScriptConfig = {
  function: 'skill_read',
  handler: async (type, content, taskContext): Promise<ScriptResult> => {
    try {
      const args = normalizeScriptArgs(content);
      const skillId = (args[0] || '').trim();
      if (!skillId) {
        return {
          next_loop: true,
          save_message: {
            role: 'user',
            messageType: 'tool_error',
            name: type,
            content: 'skill_read requires args[0] as skillId.',
          },
        };
      }

      const result = await executeWithTaskAuth(taskContext, buildReadBySkillIdScript(skillId));
      const messageContent = stringifyDdbResult(result);

      return {
        next_loop: true,
        save_message: {
          role: 'user',
          messageType: 'skill_result',
          name: type,
          content: messageContent,
        },
      };
    } catch (error) {
      return {
        next_loop: true,
        save_message: {
          role: 'user',
          messageType: 'tool_error',
          name: type,
          content: formatDdbScriptError('skill_read failed: ', error),
        },
      };
    }
  },
};
