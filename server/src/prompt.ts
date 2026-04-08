import type { DdbAuth } from './lib/ddb-auth.js';
import { ddbConnectionPool } from './lib/ddb-connection-pool.js';
import { getAllScripts } from './scripts/index.js';

type SkillPromptItem = {
  skillId: string;
  skillName: string;
  shortDescription: string;
};

type SkillTableResult = {
  data?: Array<Record<string, unknown>>;
};

type ToolPromptDoc = {
  summary: string;
  argsHint: string;
  argsDesc?: string;
  priorityNote?: string;
};

const DB_PATH = 'dfs://chat_dolphindb';
const SKILLS_TABLE = 'skills';
const SHORT_DESCRIPTION_MAX_LENGTH = 60;

const TOOL_PROMPT_DOCS: Record<string, ToolPromptDoc> = {
  coldefs: {
    summary: '查看目标表的列定义信息（列名、类型等）。DolphinDB 有两种库表查询形式：catalog.schema.tb 和 loadTable("dfs://db", "tb")。',
    argsHint: '["catalog.schema.tb"] 或 ["loadTable(\\"dfs://db\\", \\"tb\\")"]',
  },
  testsql: {
    summary: '返回表的 5 条样例数据（快速理解数据分布与字段取值）。DolphinDB 有两种库表查询形式：catalog.schema.tb 和 loadTable("dfs://db", "tb")。',
    argsHint: '["catalog.schema.tb"] 或 ["loadTable(\\"dfs://db\\", \\"tb\\")"]',
    priorityNote: '极其重要：优先级极高，必须优先、多次使用以理解数据。',
  },
  show: {
    summary: '执行脚本或 SQL，并将结果用于直接展示给用户。这个函数仅适用于最终向用户展示结果。如果涉及到需要多个步骤的情况，不要调用，而是分步执行并使用 execute，否则流程会中断。',
    argsHint: '["select * from loadTable(\\"dfs://db\\", \\"tb\\")"]',
  },
  execute: {
    summary:
      '执行脚本或 SQL，将结果回传给助手继续推理（不直接作为最终答复）。DolphinDB 只有在脚本最后一行是可求值内容（表达式、变量名或 SQL）时才会返回结果；末行若为赋值/控制语句通常拿不到结果。',
    argsDesc:
      'args[0] 必须确保"最后一行可返回结果"。推荐写法：先赋值，最后一行单独放变量名或查询语句，例如 `t = select * from ...;\\nt`。',
    argsHint: '["select * from catalog.schema.tb"]',
  },
  skill_read: {
    summary: '按 skillId 读取单个技能的完整详情（含 script）。',
    argsHint: '["<skillId>"]',
  },
  doc_search: {
    summary: '搜索 DolphinDB 官方中文文档，返回最多 30 条结果（含 title/content/url/score）。第一个参数为关键词，第二个参数为页数。',
    argsDesc:
      'args[0]=query(必填, 搜索关键词); args[1]=pageToShow(可选, 正整数, 默认1)。服务端固定 maxItemsPerPage=30, language="zh", 且不传 version。',
    argsHint: '["数据库","1"]',
  },
  doc_read: {
    summary: '读取 DolphinDB 文档正文。支持 /zh/... 路径或完整 URL；会提取 div.wh_topic_content.body 并返回清洗后的正文内容。',
    argsDesc:
      'args[0]=docUrlOrPath(必填, 可传 "/zh/..." 或完整URL); args[1]=maxChars(可选, 正整数, 默认50000, 上限150000)。',
    argsHint: '["/zh/db_distr_comp/db/tsdb.html","50000"]',
  },
  vfs_list: {
    summary: '列出当前工作区下的文件。如果不传参数，则列出所有文件；如果传入路径，则列出该路径或前缀下的文件。',
    argsDesc: 'args[0]=path(可选, 文件路径或目录前缀)',
    argsHint: '[""] 或 ["src/"]',
  },
  vfs_create: {
    summary: '在当前工作区创建一个新文件。',
    argsDesc: 'args[0]=path(必填, 文件路径); args[1]=content(必填, 文件内容)',
    argsHint: '["script.dos", "select * from tb"]',
  },
  vfs_read: {
    summary: '读取当前工作区下的文件内容。',
    argsDesc: 'args[0]=path(必填, 文件路径)',
    argsHint: '["script.dos"]',
  },
  vfs_update: {
    summary: '更新当前工作区下的文件内容，通过字符串精确替换的方式。',
    argsDesc: 'args[0]=path(必填, 文件路径); args[1]=old_string(必填, 要被替换的精确原字符串); args[2]=new_string(必填, 新字符串)',
    argsHint: '["script.dos", "select * from old_tb", "select * from new_tb"]',
  },
  vfs_delete: {
    summary: '删除当前工作区下的指定文件。',
    argsDesc: 'args[0]=path(必填, 文件路径)',
    argsHint: '["script.dos"]',
  },
  execute_file: {
    summary: '读取当前工作区下的脚本文件内容并执行，执行逻辑与 execute 一致，只有最后一行可求值内容会返回结果。',
    argsDesc: 'args[0]=path(必填, 文件路径)',
    argsHint: '["script.dos"]',
  },
  step_create: {
    summary: '创建新的待办事项清单（Steps）。调用此工具会自动将该对话之前的所有未完成待办事项置为失效（非 active）。传入的每个参数代表一个按顺序执行的待办事项。',
    argsDesc: 'args[0...n]=task_content(必填, 字符串，每个字符串为一个待办事项)',
    argsHint: '["步骤1：获取列定义", "步骤2：查询样本数据", "步骤3：编写分析脚本"]',
    priorityNote: '当用户下达复杂或多步骤任务时，强烈建议首选此工具拆解任务。',
  },
  step_update: {
    summary: '更新待办事项（Steps）的完成状态。',
    argsDesc: 'args[0]=index(必填, 待办事项的索引，从 0 开始); args[1]=checked(必填, "true" 或 "false")',
    argsHint: '["0", "true"]',
  },
  step_clear: {
    summary: '清除（标记为失效）当前对话的所有待办事项清单。如果当前任务已经全部完成且不再需要步骤指引，调用此工具。',
    argsHint: '[]',
  },
  workspace_state_read: {
    summary: '读取当前工作区的状态（Current State）。状态是一个可以由你自由维护的文本（Markdown 格式），用于记录数据库连接、表结构、重要的设计决策、当前进度等跨会话的持久化上下文。',
    argsHint: '[]',
    priorityNote: '强烈建议在开启新的复杂任务前读取此状态，以获取前置上下文。',
  },
  workspace_state_update: {
    summary: '更新当前工作区的状态。通过精确的字符串替换实现。如果当前状态为空，则直接写入 `new_string` 忽略 `old_string`。',
    argsDesc: 'args[0]=old_string(必填, 要被替换的精确原字符串); args[1]=new_string(必填, 新字符串)',
    argsHint: '["原状态片段", "新状态片段"]',
    priorityNote: '在完成了重要结构设计或创建了关键库表后，必须主动调用此工具将相关总结写入工作区状态中。',
  },
};

export const BASE_CHAT_SYSTEM_PROMPT = [
  '# 角色设定',
  '你是 DolphinDB 高级智能专家与数据分析 Agent。你的目标是提供极其准确的 DolphinDB 脚本和问题解答。',
  '',
  '# 核心工作流（强制执行）',
  '接收到用户请求后，你必须按以下顺序进行思考和行动：',
  '1. **理解上下文**：首先建议使用 `workspace_state_read` 读取当前工作区状态，了解全局上下文（如已有表结构、全局变量等）。',
  '2. **任务规划**：对于复杂的任务，强烈建议首先使用 `step_create` 工具拆解任务，建立待办事项清单。这有助于保持上下文连贯并让用户了解进度。',
  '3. **检索技能 (Skills)**：查看下方的【可用技能列表】。如果有任何技能听起来与用户的需求相关，**必须**第一步就使用 `skill_read` 工具读取它。这比任何文档都重要！',
  '4. **查阅文档 (Docs)**：DolphinDB 函数极多且用法专业。对于任何不确定 100% 正确的函数名或语法，**严禁凭空捏造**。**必须**使用 `doc_search` 和 `doc_read` 进行查证。',
  '5. **探查数据**：在编写处理具体表的数据脚本前，**必须**先用 `coldefs` 和 `testsql` 了解列结构和真实数据样例，防止字段名或类型错误。',
  '6. **编写并执行文件 (极其重要)**：除非是极简单（1-3行）的试错代码可以使用 `execute`，否则**必须**先使用 `vfs_create` 或 `vfs_update` 将代码写入工作区文件，然后再使用 `execute_file` 执行该文件。如果执行出错，使用 `vfs_update` 修改文件后再次 `execute_file`。这种方式更有利于代码的维护和多步迭代。',
  '7. **维护状态**：如果你的操作造成了系统级的变更（如建库建表、确立了新的约定），在任务结束前，必须使用 `workspace_state_update` 将这些知识沉淀到工作区状态中。',
  '8. **最终输出**：只有当所有逻辑验证成功，需要向用户展示最终结果时，才允许使用 `show`。如果有待办事项，记得在最后使用 `step_clear` 清除。',
  '',
  '# 绝对红线（违反将导致系统崩溃）',
  '- **严禁将工具调用 JSON 与普通聊天文本混在一起**。如果你决定调用工具，你的回复**只能**是一个合法的 JSON 对象，不包含任何多余的解释、前言或后语。',
  '- 每次回复**只能调用一个工具**。',
  '- 中间调试步骤**绝对不能**使用 `show`，因为那会提前终止你的工作流！中间步骤只能使用 `execute` 或 `execute_file`。',
].join('\n');

const toText = (value: unknown): string => {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
};

const toDosStringLiteral = (value: string): string => {
  return `"${value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')}"`;
};

const toShortDescription = (description: string): string => {
  const normalized = description
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) {
    return '无简短描述';
  }

  if (normalized.length <= SHORT_DESCRIPTION_MAX_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, SHORT_DESCRIPTION_MAX_LENGTH)}...`;
};

const extractSkillRows = (result: unknown): Array<Record<string, unknown>> => {
  if (!result || typeof result !== 'object') {
    return [];
  }

  if (Array.isArray((result as SkillTableResult).data)) {
    return (result as SkillTableResult).data ?? [];
  }

  if (Array.isArray(result)) {
    return result as Array<Record<string, unknown>>;
  }

  return [];
};

async function getEnabledSkillPromptItems(auth: DdbAuth): Promise<SkillPromptItem[]> {
  const lease = await ddbConnectionPool.get(auth);
  try {
    const script = `
skillsTable = loadTable(${toDosStringLiteral(DB_PATH)}, ${toDosStringLiteral(SKILLS_TABLE)})
select
  string(skillId) as skillId,
  skillName,
  description
from skillsTable
where isEnabled = true
order by updateTime desc, createTime desc
`;
    const result = await lease.ddb.execute(script, { table: 'full' });
    const rows = extractSkillRows(result);

    return rows
      .map((row) => ({
        skillId: toText(row.skillId).trim(),
        skillName: toText(row.skillName).trim(),
        shortDescription: toShortDescription(toText(row.description)),
      }))
      .filter((item) => item.skillId && item.skillName);
  } finally {
    await lease.release();
  }
}

const buildSkillsPromptSection = (skills: SkillPromptItem[]): string => {
  if (skills.length === 0) {
    return '可用技能列表（skillId + 名称 + 简短描述）：\n- 暂无启用技能。';
  }

  const lines = skills.map(
    (item, index) => `${index + 1}. [${item.skillId}] ${item.skillName}: ${item.shortDescription}`,
  );
  return [
    '可用技能列表（skillId + 名称 + 简短描述）：',
    ...lines,
    '',
    '当需要查看技能完整详情时，请使用：{"tool_call":"skill_read","args":["<skillId>"]}',
  ].join('\n');
};

const buildToolsPromptSection = (): string => {
  const scriptFunctions = Array.from(new Set(getAllScripts().map((config) => String(config.function).trim()))).filter(
    Boolean,
  );

  const toolBlocks =
    scriptFunctions.length > 0
      ? scriptFunctions.map((name) => {
          const doc = TOOL_PROMPT_DOCS[name];
          const summary = doc?.summary ?? '已注册工具，具体语义按函数名理解。';
          const argsHint = doc?.argsHint ?? '["<参数>"]';
          const argsDesc = doc?.argsDesc ? `- 参数要求：${doc.argsDesc}` : '';
          const priorityNote = doc?.priorityNote ? `- 🚨 注意：${doc.priorityNote}` : '';
          return [
            `### 工具：\`${name}\``,
            `- 用途：${summary}`,
            argsDesc,
            priorityNote,
          ]
            .filter(Boolean)
            .join('\n');
        })
      : ['- 当前未注册可调用工具。'];

  return [
    '# 可用工具列表',
    ...toolBlocks,
    '',
    '# 工具调用规范 (极其重要)',
    '1. 工具调用必须是标准且合法的 JSON 格式，并且**不要使用 Markdown 代码块（如 ```json ... ```）包裹**，直接输出纯 JSON 字符串即可。',
    '2. 必须包含 `tool_call` 和 `args` 两个字段，`args` 必须是数组。',
    '3. 如果 JSON 中包含代码，请务必正确转义代码中的双引号 (\\") 和换行符 (\\n)。',
    '',
    '## 正确调用示例（直接输出如下 JSON，不要加反引号）：',
    '{',
    '  "tool_call": "doc_search",',
    '  "args": ["loadTable", "1"]',
    '}',
    '',
    '## 另一个示例：',
    '{',
    '  "tool_call": "execute",',
    '  "args": ["data = select * from loadTable(\\"dfs://db\\", \\"tb\\");\\ndata"]',
    '}',
  ].join('\n');
};

export async function getInitialSystemPrompt(auth: DdbAuth): Promise<string> {
  try {
    const skills = await getEnabledSkillPromptItems(auth);
    const skillsSection = buildSkillsPromptSection(skills);
    const toolsSection = buildToolsPromptSection();
    return [BASE_CHAT_SYSTEM_PROMPT, '', skillsSection, '', toolsSection].join('\n');
  } catch (error) {
    console.error('Failed to build initial system prompt with skills:', error);
    return BASE_CHAT_SYSTEM_PROMPT;
  }
}
