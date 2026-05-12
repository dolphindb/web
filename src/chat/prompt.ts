import { get_all_scripts } from './scripts/index.ts'
import type { ISkillInfo } from './model.ts'


// ─── 工具提示词文档 ───

type ToolPromptDoc = {
    summary: string
    args_hint: string
    args_desc?: string
}

const TOOL_PROMPT_DOCS: Record<string, ToolPromptDoc> = {
    coldefs: {
        summary: '查看目标表的列定义信息（列名、类型等）。DolphinDB 有两种库表查询形式：catalog.schema.tb 和 loadTable("dfs://db", "tb")。',
        args_hint: '["catalog.schema.tb"] 或 ["loadTable(\\"dfs://db\\", \\"tb\\")"]',
    },
    testsql: {
        summary: '返回表的 5 条样例数据（快速理解数据分布与字段取值）。DolphinDB 有两种库表查询形式：catalog.schema.tb 和 loadTable("dfs://db", "tb")。',
        args_hint: '["catalog.schema.tb"] 或 ["loadTable(\\"dfs://db\\", \\"tb\\")"]',
    },
    show: {
        summary: '执行脚本或 SQL，并将结果直接展示给用户。仅用于最终展示结果。如果涉及多步骤场景，不要调用，而是使用 execute 分步执行，否则流程会中断。',
        args_hint: '["select * from loadTable(\\"dfs://db\\", \\"tb\\")"]',
    },
    execute: {
        summary: '执行脚本或 SQL，将结果回传给助手继续推理（不直接作为最终答复）。DolphinDB 只有在脚本最后一行是可求值内容（表达式、变量名或 SQL）时才会返回结果；末行若为赋值/控制语句通常拿不到结果。',
        args_desc: 'args[0] 必须确保"最后一行可返回结果"。推荐写法：先赋值，最后一行单独放变量名或查询语句，例如 `t = select * from ...;\\nt`。',
        args_hint: '["select * from catalog.schema.tb"]',
    },
    skill_read: {
        summary: '按 skillId 读取单个技能的完整详情，并包含技能指令 instruction 与文件目录结构 fileTree。',
        args_hint: '["<skillId>"]',
    },
    skill_file_read: {
        summary: '读取指定 Skill 包内一个或多个文件的文本内容。先用 skill_read 查看 files/fileTree，再按路径读取需要的文件。',
        args_desc: 'args[0]=skillId；后续参数可以是一个或多个文件路径，也可以传文件路径数组。',
        args_hint: '["<skillId>","SKILL.md","src/index.dos"]',
    },
    doc_search: {
        summary: '搜索 DolphinDB 官方中文文档，返回最多 30 条结果（含 title/content/url/score）。',
        args_desc: 'args[0]=query(必填, 搜索关键词); args[1]=pageToShow(可选, 正整数, 默认 1)。',
        args_hint: '["数据库","1"]',
    },
    doc_read: {
        summary: '读取 DolphinDB 文档正文。支持 /zh/... 路径或完整 URL；会提取正文并返回清洗后的内容。',
        args_desc: 'args[0]=docUrlOrPath(必填, 可传 "/zh/..." 或完整 URL); args[1]=maxChars(可选, 正整数, 默认 50000, 上限 150000)。',
        args_hint: '["/zh/db_distr_comp/db/tsdb.html","50000"]',
    },
}


// ─── 基础系统提示词 ───

const BASE_SYSTEM_PROMPT = [
    '# Web 平台 tool_call 补充说明',
    '你运行在 Dolphin DB Web 平台上，可调用平台工具。以下是在 Web 平台使用工具的补充说明和建议：',
    '',
    '- 调用工具时只输出 JSON，不要用 Markdown 代码块；需要多次调用时，连续输出多个独立的工具调用 JSON 对象，不要包成数组。',
    '- 每个工具调用必须包含 `tool_call` 和 `args`，且 `args` 必须是数组；代码里的双引号和换行要正确转义。',
    '- 优先用自然语言和用户协作：能解释、总结、给建议或说明错误原因时，直接回答，不要绕成 `show + print`。',
    '- `execute` 用于验证和继续推理；脚本最后一行尽量返回表、字典、字符串或标量，方便读取结果。',
    '- 只有用户需要查看真实查询结果、表格数据，或结果需要进入结果视图时，才使用 `show`。',
    '- 工具结果通常是 JSON；重点读取 `ok`、`content`、`error`、`hint`、`harnessHint`、`returnedVoid`、`repeatedCall`。',
    '- `repeatedCall=true` 时不要重复同一工具调用；应换参数、换工具、查文档，或基于已有信息回答。',
    '- `harnessHint` 表示当前策略效果差；收到后应调整策略，不要继续猜测 API。',
    '- 不确定 DolphinDB 函数、参数或错误含义时，先查官方文档，再继续验证。',
].join('\n')


const SHORT_DESCRIPTION_MAX_LENGTH = 60


function to_short_description (description: string): string {
    const normalized = description.replace(/\s+/g, ' ').trim()
    if (!normalized)
        return '无简短描述'
    if (normalized.length <= SHORT_DESCRIPTION_MAX_LENGTH)
        return normalized
    return `${normalized.slice(0, SHORT_DESCRIPTION_MAX_LENGTH)}...`
}


function build_skills_section (skills: ISkillInfo[]): string {
    if (skills.length === 0)
        return '可用技能列表（skillId + 名称 + 简短描述）：\n- 暂无启用技能。'
        
    const lines = skills.map(
        (item, index) =>
            `${index + 1}. [${item.skillId}] ${item.displayName || item.name}: ${to_short_description(item.description || '')}`
    )
    return [
        '可用技能列表（skillId + 名称 + 简短描述）：',
        ...lines,
        '',
        '当需要查看技能完整详情时，请使用 skill_read 工具并传入 skillId。',
    ].join('\n')
}


function build_tools_section (): string {
    const script_functions = Array.from(
        new Set(get_all_scripts().map(config => String(config.function).trim()))
    ).filter(Boolean)
    
    const tool_blocks =
        script_functions.length > 0
            ? script_functions.map(name => {
                const doc = TOOL_PROMPT_DOCS[name]
                const summary = doc?.summary ?? '已注册工具，具体语义按函数名理解。'
                const args_hint = doc?.args_hint ? `- 调用示例：\`${doc.args_hint}\`` : ''
                const args_desc = doc?.args_desc ? `- 参数要求：${doc.args_desc}` : ''
                return [
                    `### 工具：\`${name}\``,
                    `- 用途：${summary}`,
                    args_hint,
                    args_desc,
                ].filter(Boolean).join('\n')
            })
            : ['- 当前未注册可调用工具。']
            
    return [
        '# 可用工具列表',
        ...tool_blocks,
        '',
        '# 工具选择建议',
        '- 不确定 API 时用 doc_search/doc_read。',
        '- 中间验证用 execute，最终展示真实结果才用 show。',
        '- 能自然语言回答时不要用 show 或 print。',
        '- 需要技能细节时先用 skill_read/skill_file_read。',
        '',
        '## 调用示例',
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
    ].join('\n')
}


export function build_system_prompt (skills: ISkillInfo[]): string {
    try {
        const skills_section = build_skills_section(skills)
        const tools_section = build_tools_section()
        return [BASE_SYSTEM_PROMPT, '', skills_section, '', tools_section].join('\n')
    } catch (error) {
        console.error('Failed to build system prompt:', error)
        return BASE_SYSTEM_PROMPT
    }
}
