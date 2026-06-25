import { get_all_scripts } from './scripts/index.ts'
import type { IChatWorkspace, IWorkspaceStep } from './workspace.ts'


// ─── 工具提示词文档 ───

type ToolPromptDoc = {
    summary: string
    args_hint: string
    args_desc?: string
}

const WORKSPACE_FILE_NAME_RULE = '工作区虚拟路径为 `/home/workspace/<file>`；后端只支持单层普通文件名，不能包含 `/`、`\\`、`..`，不能以 `.` 开头'

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
        summary: '按 skillId 或唯一技能名称读取单个技能的完整详情，并包含技能指令 instruction 与文件目录结构 fileTree。只用于 Skill 元信息，不读取工作区文件；名称重名时必须改用 skillId。',
        args_hint: '["<skillId-or-unique-skill-name>"]',
    },
    doc_search: {
        summary: '搜索 DolphinDB 官方文档、函数说明、示例和错误说明，返回可读取的文档候选 id。',
        args_desc: 'args[0]=query(必填, 搜索关键词); args[1]=max_results(可选, 默认 20, 上限 30)。',
        args_hint: '["loadTable","20"]',
    },
    doc_read: {
        summary: '读取 doc_search 返回的某个文档候选 id，返回正文内容。',
        args_desc: 'args[0]=id(必填, 必须来自 doc_search 返回结果)。不要传 URL 或 source。',
        args_hint: '["doc_a1b2c3d4"]',
    },
    vfs_list: {
        summary: '列出虚拟文件。`/home/workspace` 列工作区文件，`/home/skills/<skillId>` 列 Skill 包文件。',
        args_desc: `args[0]=name(可选, /home/workspace 或 /home/skills/<skillId>，${WORKSPACE_FILE_NAME_RULE})。`,
        args_hint: '["/home/workspace"]',
    },
    vfs_create: {
        summary: '在当前会话工作区写入代码文件；文件存在时会完整覆盖。',
        args_desc: `args[0]=name(必填, 文件名，${WORKSPACE_FILE_NAME_RULE}); args[1]=content(必填, UTF-8 文本内容)。`,
        args_hint: '["script.dos","select * from tb"]',
    },
    vfs_read: {
        summary: '读取虚拟文本文件。`/home/workspace/<file>` 读工作区文件并返回 hash；`/home/skills/<skillId>/<file>` 读 Skill 包文件。',
        args_desc: `args[0]=name(必填, /home/workspace/<file> 或 /home/skills/<skillId>/<file>，${WORKSPACE_FILE_NAME_RULE}); args[1]=startLine(可选, 1-based 起始行); args[2]=endLine(可选, 闭区间结束行)。`,
        args_hint: '["/home/skills/<skillId>/SKILL.md","1","120"]',
    },
    vfs_search: {
        summary: '搜索虚拟文本文件。默认搜索 `/home/workspace`；传 path=`/home/skills/<skillId>` 或 names 中传 `/home/skills/<skillId>/<file>` 搜索 Skill 包。',
        args_desc: '可传对象参数：query/all/any 三选一；path；scope=file|line；caseSensitive；names；extensions；contextLines；maxResults；maxPerFile。',
        args_hint: '{"tool_call":"vfs_search","args":{"path":"/home/skills/<skillId>","query":"RSI","extensions":[".md",".json"],"contextLines":2,"maxResults":20}}',
    },
    vfs_update: {
        summary: '用精确字符串替换局部修改当前会话工作区下的已有文件。必须先通过 vfs_read/vfs_search/vfs_create/上一次 vfs_update 获取最新 hash。',
        args_desc: `传对象参数：name(必填, 文件名，${WORKSPACE_FILE_NAME_RULE}); hash(必填); replacements(必填数组，每项 old/new/replaceAll)。old 必须从读取到的内容中精确复制；replaceAll=false 时 old 必须只出现一次。`,
        args_hint: '{"tool_call":"vfs_update","args":{"name":"script.dos","hash":"xxh64:...","replacements":[{"old":"return 1","new":"return 2"}]}}',
    },
    vfs_delete: {
        summary: '删除当前会话工作区下的指定代码文件。',
        args_desc: `args[0]=name(必填, 文件名，${WORKSPACE_FILE_NAME_RULE})。`,
        args_hint: '["script.dos"]',
    },
    vfs_copy: {
        summary: '复制只读 Skill 文件到当前会话工作区。只能从 `/home/skills/<skillId>/<file>` 复制到 `/home/workspace/<file>`；修改 Skill 文件前必须先复制。',
        args_desc: `args[0]=source(必填, /home/skills/<skillId>/<file>); args[1]=target(可选, /home/workspace/<file>，默认同源文件名，${WORKSPACE_FILE_NAME_RULE}); args[2]=overwrite(可选, "true" 覆盖已存在文件)。`,
        args_hint: '["/home/skills/<skillId>/src/index.dos","/home/workspace/index.dos","true"]',
    },
    execute_file: {
        summary: '读取当前会话工作区下的脚本文件内容并执行，执行逻辑与 execute 一致。',
        args_desc: `args[0]=name(必填, 文件名，${WORKSPACE_FILE_NAME_RULE})。`,
        args_hint: '["script.dos"]',
    },
    workspace_state_read: {
        summary: '读取当前会话工作区状态文本。',
        args_hint: '[]',
    },
    workspace_state_update: {
        summary: '更新当前会话工作区状态文本。当前状态为空时直接写入；old_string 为空或未命中时追加。',
        args_desc: 'args[0]=old_string; args[1]=new_string。',
        args_hint: '["原状态片段","新状态片段"]',
    },
    step_create: {
        summary: '为当前会话创建新的待办事项清单，会自动停用旧的 active 待办。',
        args_desc: '必须传对象参数 tasks，类型为字符串数组；不要把多条待办拼成一个换行字符串。',
        args_hint: '{"tool_call":"step_create","args":{"tasks":["步骤1：确认需求","步骤2：修改脚本","步骤3：验证结果"]}}',
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
    '- 每个工具调用必须包含 `tool_call` 和 `args`；简单工具优先用数组参数，工具说明要求或参数较多时可用对象参数；代码里的双引号和换行要正确转义。',
    '- 优先用自然语言和用户协作：能解释、总结、给建议或说明错误原因时，直接回答，不要绕成 `show + print`。',
    '- 用户使用中文，处于中文语境。思考过程和最终回答都用中文表达；除非用户要求，不要切换英文。',
    '- 一开始必须先判断用户要求是否需要 TODO：凡是复杂任务、跨多步验证、需要修改代码/脚本、排查问题、或用户目标不止一步，都必须优先调用 step_create 建立 TODO，再开始其他工具调用。',
    '- TODO 是执行计划和进度来源：每完成一项必须及时调用 step_update checked=true；发现计划变化时重新 step_create；所有 TODO 都 checked 后必须及时调用 step_clear。',
    '- `execute` 用于验证和继续推理；脚本最后一行尽量返回表、字典、字符串或标量，方便读取结果。',
    `- 虚拟文件路径：Workspace 文件在 /home/workspace/<file>，Skill 文件在 /home/skills/<skillId>/<file>。${WORKSPACE_FILE_NAME_RULE}。`,
    '- 如果要写或执行较长代码，必须优先使用 vfs_create 写入 /home/workspace，再用 execute_file 执行。',
    '- Skill 包路径 /home/skills/<skillId>/<file> 是只读路径，不能创建、更新或删除。需要改 Skill 文件内容时，先用 vfs_copy 复制到 /home/workspace/<file>，再修改 workspace 副本。不要用 cp/copy。',
    '- /home/skills 下没有执行权限；执行 Skill 包中的 .dos 文件时，永远不要写 run("/home/skills/...")，必须先用 vfs_copy 复制到 /home/workspace/<file>，再用 execute_file 执行副本。',
    '- 修改已有工作区文件必须优先使用 vfs_update 的 hash + replacements 精确替换；需要定位内容时先用 vfs_read 的行范围参数或 vfs_search 搜索，并使用返回的 hash。',
    '- vfs_update 成功后会返回新 hash；连续修改同一文件时必须使用最新 hash。hash stale 时重新 vfs_read 或 vfs_search 后再更新。',
    '- 多次修改并执行同一个工作区文件是正常流程；执行出错时应先用 vfs_update 替换旧片段，再继续 execute_file，而不是每次重新生成完整脚本给 execute。',
    '- 只有用户需要查看真实查询结果、表格数据，或结果需要进入结果视图时，才使用 `show`；`show` 成功后工具结果可以不返回具体数据，但必须返回是否展示成功，避免 assistant tool_calls 后缺少对应 tool 结果。',
    '- 用户指定展示形式（如 plot 绘图、表格或结果视图）时，先完成查询分析，最后再执行展示；展示后不要再运行会覆盖结果的数据脚本。',
    '- 工具结果通常是 JSON；重点读取 `ok`、`content`、`error`、`hint`、`harnessHint`、`returnedVoid`、`repeatedCall`。',
    '- `repeatedCall=true` 表示同一工具且同一参数已重复失败；应换参数、换工具、查文档，或基于已有信息回答。',
    '- `harnessHint` 表示当前策略效果差；收到后应调整策略，不要继续猜测 API。',
    '- 不确定 DolphinDB 函数、参数或错误含义时，先查官方文档，再继续验证。',
].join('\n')


const NATIVE_TOOL_SYSTEM_PROMPT = [
    '# Web 平台工具使用规则',
    '你运行在 Dolphin DB Web 平台上，可调用平台提供的工具。',
    '',
    '- 需要调用工具时，使用系统提供的原生 function/tool calling，不要在正文里输出 JSON 工具调用。',
    '- 优先用自然语言和用户协作：能解释、总结、给建议或说明错误原因时，直接回答，不要绕成 `show + print`。',
    '- 用户使用中文或处于中文语境时，思考过程和最终回答都用中文表达；除非用户要求，不要切换英文。',
    '- 一开始必须先判断用户要求是否需要 TODO：凡是复杂任务、跨多步验证、需要修改代码/脚本、排查问题、或用户目标不止一步，都必须优先调用 step_create 建立 TODO，再开始其他工具调用。',
    '- TODO 是执行计划和进度来源：每完成一项必须及时调用 step_update checked=true；发现计划变化时重新 step_create；所有 TODO 都 checked 后必须及时调用 step_clear。',
    '- `execute` 用于验证和继续推理；脚本最后一行尽量返回表、字典、字符串或标量，方便读取结果。',
    `- 虚拟文件路径：Workspace 文件在 /home/workspace/<file>，Skill 文件在 /home/skills/<skillId>/<file>。${WORKSPACE_FILE_NAME_RULE}。`,
    '- 如果要写或执行较长代码，必须优先使用 vfs_create 写入 /home/workspace，再用 execute_file 执行。',
    '- Skill 包路径 /home/skills/<skillId>/<file> 是只读路径，不能创建、更新或删除。需要改 Skill 文件内容时，先用 vfs_copy 复制到 /home/workspace/<file>，再修改 workspace 副本。不要用 cp/copy。',
    '- /home/skills 下没有执行权限；执行 Skill 包中的 .dos 文件时，永远不要写 run("/home/skills/...")，必须先用 vfs_copy 复制到 /home/workspace/<file>，再用 execute_file 执行副本。',
    '- 修改已有工作区文件必须优先使用 vfs_update 的 hash + replacements 精确替换；需要定位内容时先用 vfs_read 的行范围参数或 vfs_search 搜索，并使用返回的 hash。',
    '- vfs_update 成功后会返回新 hash；连续修改同一文件时必须使用最新 hash。hash stale 时重新 vfs_read 或 vfs_search 后再更新。',
    '- 多次修改并执行同一个工作区文件是正常流程；执行出错时应先用 vfs_update 替换旧片段，再继续 execute_file，而不是每次重新生成完整脚本给 execute。',
    '- 只有用户需要查看真实查询结果、表格数据，或结果需要进入结果视图时，才使用 `show`；`show` 成功后工具结果可以不返回具体数据，但必须返回是否展示成功，避免 assistant tool_calls 后缺少对应 tool 结果。',
    '- 用户指定展示形式（如 plot 绘图、表格或结果视图）时，先完成查询分析，最后再执行展示；展示后不要再运行会覆盖结果的数据脚本。',
    '- 工具结果通常是 JSON；重点读取 `ok`、`content`、`error`、`hint`、`harnessHint`、`returnedVoid`、`repeatedCall`。',
    '- `repeatedCall=true` 表示同一工具且同一参数已重复失败；应换参数、换工具、查文档，或基于已有信息回答。',
    '- `harnessHint` 表示当前策略效果差；收到后应调整策略，不要继续猜测 API。',
    '- 不确定 DolphinDB 函数、参数或错误含义时，先查官方文档，再继续验证。',
].join('\n')


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
        '- 不确定 DolphinDB API、参数、错误或示例时，先调用 doc_search。',
        '- doc_search 返回后，必须选择最相关的 id 调用 doc_read；doc_read 只传 id，不要猜 URL 或 source。',
        '- 复杂任务第一步就是 step_create 拆成 TODO，不要等执行到一半才补；执行过程中每完成一项立即 step_update。',
        '- 1-3 行临时验证可用 execute；较长代码、需要反复修改的代码、或用户要求保存代码时，优先使用工作区文件和 execute_file。',
        '- 修改已有工作区文件前，先用 vfs_read 或 vfs_search 定位上下文并获取 hash，再用 vfs_update 提交 replacements。',
        '- Skill 包文件和工作区文件通过虚拟路径区分：/home/skills/<skillId>/<file> 和 /home/workspace/<file> 都统一用 vfs_read/vfs_search；只有 /home/workspace/<file> 可以 vfs_update/vfs_delete。',
        '- 中间验证用 execute/execute_file，最终展示真实结果才用 show；show 的结果视图负责展示数据，工具结果只需说明是否展示成功。',
        '- 能自然语言回答时不要用 show 或 print。',
        '- 需要技能细节时先用 skill_read；需要定位技能文件内容时用 vfs_search，再用 vfs_read 分段读取；需要基于技能文件继续改代码时，用 vfs_copy 复制到 /home/workspace。',
        '',
        '## 调用示例',
        '{',
        '  "tool_call": "doc_search",',
        '  "args": ["loadTable", "20"]',
        '}',
        '',
        '## 另一个示例：',
        '{',
        '  "tool_call": "execute",',
        '  "args": ["data = select * from loadTable(\\"dfs://db\\", \\"tb\\");\\ndata"]',
        '}',
    ].join('\n')
}


export function build_system_prompt (native_tool_calling = false): string {
    try {
        if (native_tool_calling)
            return NATIVE_TOOL_SYSTEM_PROMPT
        const tools_section = build_tools_section()
        return [BASE_SYSTEM_PROMPT, '', tools_section].join('\n')
    } catch (error) {
        console.error('Failed to build system prompt:', error)
        return native_tool_calling ? NATIVE_TOOL_SYSTEM_PROMPT : BASE_SYSTEM_PROMPT
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
        '- 继续使用用户问题的语言；中文语境下思考过程和最终回答都用中文。',
        '- 每完成一个待办，调用 step_update 标记完成。',
        '- 任务全部完成且不再需要追踪时，调用 step_clear。',
    ].join('\n')
}
