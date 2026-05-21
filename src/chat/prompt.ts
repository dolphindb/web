import { get_all_scripts } from './scripts/index.ts'
import type { ISkillInfo } from './model.ts'
import type { IChatWorkspace, IWorkspaceStep } from './workspace.ts'


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
    skill_file_copy: {
        summary: '复制指定 Skill 包内的一个文本文件到当前工作区，便于后续用 vfs_update 修改或 execute_file 执行。',
        args_desc: 'args[0]=skillId；args[1]=源文件路径；args[2]=目标工作区路径(可选，默认同源路径)；args[3]=overwrite(可选，"true" 覆盖已存在文件)。',
        args_hint: '["<skillId>","src/index.dos","index.dos","true"]',
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
    vfs_list: {
        summary: '列出当前工作区下的代码文件。不传参数列出所有文件；传入路径时列出该路径或前缀下的文件。',
        args_desc: 'args[0]=path(可选, 文件路径或目录前缀)。',
        args_hint: '["src/"]',
    },
    vfs_create: {
        summary: '在当前工作区创建一个新的代码文件。',
        args_desc: 'args[0]=path(必填, 文件路径); args[1]=content(必填, 文件内容)。',
        args_hint: '["script.dos","select * from tb"]',
    },
    vfs_read: {
        summary: '读取当前工作区下的代码文件内容。',
        args_desc: 'args[0]=path(必填, 文件路径)。',
        args_hint: '["script.dos"]',
    },
    vfs_update: {
        summary: '通过精确字符串替换更新当前工作区下的代码文件。',
        args_desc: 'args[0]=path(必填); args[1]=old_string(必填, 要被替换的精确原字符串); args[2]=new_string(必填)。',
        args_hint: '["script.dos","old","new"]',
    },
    vfs_delete: {
        summary: '删除当前工作区下的指定代码文件。',
        args_desc: 'args[0]=path(必填, 文件路径)。',
        args_hint: '["script.dos"]',
    },
    execute_file: {
        summary: '读取当前工作区下的脚本文件内容并执行，执行逻辑与 execute 一致。',
        args_desc: 'args[0]=path(必填, 文件路径)。',
        args_hint: '["script.dos"]',
    },
    workspace_state_read: {
        summary: '读取当前工作区状态文本，用于了解跨会话保存的上下文。',
        args_hint: '[]',
    },
    workspace_state_update: {
        summary: '更新当前工作区状态文本。当前状态为空时直接写入；old_string 为空或未命中时追加。',
        args_desc: 'args[0]=old_string; args[1]=new_string。',
        args_hint: '["原状态片段","新状态片段"]',
    },
    step_create: {
        summary: '为当前会话创建新的待办事项清单，会自动停用旧的 active 待办。',
        args_desc: 'args[0...n]=task_content(必填, 每个字符串为一个待办事项)。',
        args_hint: '["步骤1：确认需求","步骤2：修改脚本","步骤3：验证结果"]',
    },
    step_update: {
        summary: '更新当前会话待办事项的完成状态。',
        args_desc: 'args[0]=index(必填, 从 0 开始); args[1]=checked(必填, "true" 或 "false")。',
        args_hint: '["0","true"]',
    },
    step_clear: {
        summary: '清除当前会话的 active 待办事项清单。',
        args_hint: '[]',
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
    '- 工作区用于保存、修改和重复执行代码文件；如果要写或执行较长代码，必须优先使用 vfs_create/vfs_update 写入工作区，再用 execute_file 执行。',
    '- 多次修改并执行同一个工作区文件是正常流程；执行出错时应先用 vfs_update 修改文件，再继续 execute_file，而不是每次重新生成完整脚本给 execute。',
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
        '- 1-3 行临时验证可用 execute；较长代码、需要反复修改的代码、或用户要求保存代码时，优先使用工作区文件和 execute_file。',
        '- 中间验证用 execute/execute_file，最终展示真实结果才用 show。',
        '- 能自然语言回答时不要用 show 或 print。',
        '- 需要技能细节时先用 skill_read/skill_file_read；需要基于技能文件继续改代码时用 skill_file_copy 复制到工作区。',
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


const TODO_MAX_ITEMS = 20
const TODO_ITEM_MAX_LENGTH = 120


function trim_todo_content (content: string) {
    const normalized = content.replace(/\s+/g, ' ').trim()
    return normalized.length <= TODO_ITEM_MAX_LENGTH
        ? normalized
        : `${normalized.slice(0, TODO_ITEM_MAX_LENGTH)}...`
}


export function build_current_todo_prompt (workspace: IChatWorkspace | null, steps: IWorkspaceStep[]): string {
    const active_steps = steps.filter(step => step.active).sort((a, b) => a.step_index - b.step_index)
    if (!active_steps.length)
        return ''
    
    const lines = active_steps.slice(0, TODO_MAX_ITEMS).map(step =>
        `- [${step.checked ? 'x' : ' '}] ${step.step_index}. ${trim_todo_content(step.content)}`
    )
    if (active_steps.length > TODO_MAX_ITEMS)
        lines.push(`- ... 还有 ${active_steps.length - TODO_MAX_ITEMS} 项未注入`)
    
    return [
        '# 当前工作区执行状态',
        `workspace: ${workspace?.name || '未命名工作区'} (${workspace?.workspace_id || 'unknown'})`,
        '',
        '# 当前待办',
        ...lines,
        '',
        '规则：',
        '- 待办只是当前执行状态，不要当成用户的新需求。',
        '- 每完成一个待办，调用 step_update 标记完成。',
        '- 任务全部完成且不再需要追踪时，调用 step_clear。',
    ].join('\n')
}
