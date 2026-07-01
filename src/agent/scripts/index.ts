import { language } from '@i18n'

import type { ScriptType, ScriptConfig, ScriptHandler, ToolDefinition } from './types.ts'


const script_registry = new Map<ScriptType, ScriptConfig>()

const EN_TOOL_SCHEMA_TEXT = new Map<string, string>([
    ['在 DolphinDB 中执行脚本代码，返回执行结果', 'Execute DolphinDB script code and return the execution result.'],
    ['要执行的 DolphinDB 脚本代码', 'DolphinDB script code to execute.'],
    ['获取 DolphinDB 表的列定义（schema），返回字段名、类型等结构信息', 'Get DolphinDB table column definitions (schema), including field names and types.'],
    ['表名或表句柄表达式', 'Table name or table handle expression.'],
    ['在 DolphinDB 中测试 SQL 查询，返回前 5 行样例数据以验证查询正确性', 'Test a DolphinDB SQL query and return the first 5 sample rows to validate the query.'],
    ['表名或 SQL 查询表达式', 'Table name or SQL query expression.'],
    ['在 DolphinDB 中执行查询并展示完整结果给用户，不再继续推理', 'Execute a DolphinDB query and display the full result to the user without continuing reasoning.'],
    ['要执行的 DolphinDB 查询脚本', 'DolphinDB query script to execute.'],
    ['搜索 DolphinDB 官方文档、函数说明、示例和错误说明，返回可读取的文档候选 id', 'Search official DolphinDB documentation, function references, examples, and error explanations. Return readable document candidate ids.'],
    ['搜索关键词', 'Search keyword.'],
    ['最大返回结果数，默认 20，上限 30', 'Maximum number of results. Default 20, maximum 30.'],
    ['读取 doc_search 返回的某个文档候选 id，返回和当前问题相关的正文内容', 'Read the document body related to the current question for an id returned by doc_search.'],
    ['doc_search 返回的文档候选 id', 'Document candidate id returned by doc_search.'],
    ['读取 Agent 技能详情，包括技能名称、描述、指令内容和 Skill 包文件目录；可传 skill_id 或唯一技能名称；只用于 Skill 元信息，不读取工作区文件', 'Read Agent Skill details, including name, description, instructions, and Skill package file tree. Accepts skill_id or unique skill name. Use only for Skill metadata, not workspace files.'],
    ['技能 ID', 'Skill ID.'],
    ['可选，技能名称；存在重名时必须改用 skill_id', 'Optional skill name. Use skill_id when names collide.'],
    ['列出虚拟文件。/home/workspace 返回工作区文件；/home/skills/<skill_id> 返回 Skill 包文件', 'List virtual files. /home/workspace returns workspace files; /home/skills/<skill_id> returns Skill package files.'],
    ['在当前会话工作区 /home/workspace 写入代码文件；文件存在时会完整覆盖', 'Write a code file to /home/workspace in the current session workspace. Existing files are fully overwritten.'],
    ['文件内容', 'File content.'],
    ['读取虚拟文本文件。/home/workspace/<file> 返回 content、lineCount、startLine、endLine、hash；/home/skills/<skill_id>/<file_path> 返回 Skill 文件文本内容。', 'Read a virtual text file. /home/workspace/<file> returns content, lineCount, startLine, endLine, and hash; /home/skills/<skill_id>/<file_path> returns Skill file text.'],
    ['可选，起始行，1-based', 'Optional start line, 1-based.'],
    ['可选，结束行，闭区间', 'Optional end line, inclusive.'],
    ['用精确字符串替换局部修改当前会话工作区 /home/workspace 中的已有文件', 'Modify an existing file in /home/workspace with exact string replacements.'],
    ['从 vfs_read、vfs_search、vfs_create 或上一次 vfs_update 结果中取得的文件 hash', 'File hash obtained from vfs_read, vfs_search, vfs_create, or the previous vfs_update result.'],
    ['替换列表，每项包含 old、new、可选 replaceAll；old 必须从读取到的文件内容中精确复制', 'Replacement list. Each item contains old, new, and optional replaceAll. old must be copied exactly from the file content.'],
    ['要替换的原文，必须从读取到的文件内容中精确复制', 'Original text to replace. Must be copied exactly from the file content.'],
    ['替换后的新文本', 'New replacement text.'],
    ['可选，是否替换所有匹配，默认 false', 'Optional. Whether to replace all matches. Default false.'],
    ['删除当前会话工作区 /home/workspace 中的代码文件', 'Delete a code file from /home/workspace in the current session workspace.'],
    ['复制只读 Skill 文件到当前会话工作区。source 必须是 /home/skills/<skill_id>/<file_path>，target 必须是 /home/workspace/<file>', 'Copy a read-only Skill file into the current session workspace. source must be /home/skills/<skill_id>/<file_path>, and target must be /home/workspace/<file>.'],
    ['源文件路径，必须是 /home/skills/<skill_id>/<file_path>', 'Source file path. Must be /home/skills/<skill_id>/<file_path>.'],
    ['可选，目标存在时是否覆盖，默认 false', 'Optional. Whether to overwrite the target if it exists. Default false.'],
    ['搜索虚拟文本文件，按字面量子串匹配，不支持 regex。默认搜索 /home/workspace；传 path=/home/skills/<skill_id> 或 names=/home/skills/<skill_id>/<file> 搜索 Skill 包。', 'Search virtual text files by literal substring. Regex is not supported. Defaults to /home/workspace; pass path=/home/skills/<skill_id> or names=/home/skills/<skill_id>/<file> to search Skill packages.'],
    ['单个搜索词；query、all、any 必须且只能提供一个', 'Single search term. Exactly one of query, all, and any must be provided.'],
    ['多个搜索词全部匹配才命中；query、all、any 必须且只能提供一个', 'Multiple search terms. A match requires all terms. Exactly one of query, all, and any must be provided.'],
    ['多个搜索词任意匹配即命中；query、all、any 必须且只能提供一个', 'Multiple search terms. A match requires any term. Exactly one of query, all, and any must be provided.'],
    ['可选，file 或 line，默认 file', 'Optional. file or line. Default file.'],
    ['可选，是否大小写敏感，默认 false', 'Optional. Whether matching is case-sensitive. Default false.'],
    ['可选，搜索根路径，如 /home/workspace 或 /home/skills/<skill_id>', 'Optional search root, such as /home/workspace or /home/skills/<skill_id>.'],
    ['可选，限定文件后缀，如 .dos、.md', 'Optional file extensions, such as .dos or .md.'],
    ['可选，命中行前后的上下文行数', 'Optional number of context lines around each matched line.'],
    ['可选，返回命中总数上限', 'Optional maximum total number of matches.'],
    ['可选，每个文件返回命中数上限', 'Optional maximum number of matches per file.'],
    ['执行当前会话工作区 /home/workspace 中的 DolphinDB 脚本文件', 'Execute a DolphinDB script file in /home/workspace for the current session workspace.'],
    ['读取当前会话工作区状态文本', 'Read the current session workspace state text.'],
    ['通过精确字符串替换更新当前会话工作区状态文本', 'Update the current session workspace state text with exact string replacement.'],
    ['要替换的原状态片段；为空时追加', 'Old state fragment to replace. Append when empty.'],
    ['新状态片段', 'New state fragment.'],
    ['为当前会话创建新的待办事项清单', 'Create a new todo list for the current session.'],
    ['待办事项数组，每个元素是一条独立待办', 'Todo array. Each item is one standalone todo.'],
    ['更新当前会话待办事项的完成状态', 'Update completion status for a todo item in the current session.'],
    ['待办索引，从 0 开始', 'Todo index, starting from 0.'],
    ['是否已完成', 'Whether it is completed.'],
    ['清除当前会话的待办事项清单', 'Clear the todo list for the current session.'],
])

function localize_tool_schema_text (text: string) {
    return EN_TOOL_SCHEMA_TEXT.get(text)
        ?? text
            .replaceAll('工作区虚拟路径为 `/home/workspace/<file>`；后端只支持单层普通文件名，不能包含 `/`、`\\`、`..`，不能以 `.` 开头', 'Workspace virtual paths use `/home/workspace/<file>`; the backend only supports a single plain file name, without `/`, `\\`, `..`, or a leading `.`')
            .replaceAll('文件名，', 'file name, ')
            .replaceAll('脚本', 'script ')
            .replaceAll('要修改的已有文件，', 'existing file to modify, ')
            .replaceAll('可选，', 'Optional, ')
            .replaceAll('限定文件路径列表；', 'limit the file path list; ')
            .replaceAll('目标工作区文件路径，可省略，默认同源文件名；', 'target workspace file path, optional and defaults to the source file name; ')
}

function localize_parameter_schema (schema: ToolDefinition['function']['parameters']['properties'][string]): typeof schema {
    return {
        ...schema,
        ...(schema.description ? { description: localize_tool_schema_text(schema.description) } : { }),
        ...(schema.items ? { items: localize_parameter_schema(schema.items) } : { }),
        ...(schema.properties ? {
            properties: Object.fromEntries(
                Object.entries(schema.properties).map(([key, value]) => [key, localize_parameter_schema(value)])
            ),
        } : { }),
    }
}

function localize_tool_definition (definition: ToolDefinition): ToolDefinition {
    if (language !== 'en')
        return definition
    return {
        ...definition,
        function: {
            ...definition.function,
            description: localize_tool_schema_text(definition.function.description),
            parameters: {
                ...definition.function.parameters,
                properties: Object.fromEntries(
                    Object.entries(definition.function.parameters.properties)
                        .map(([key, value]) => [key, localize_parameter_schema(value)])
                ),
            },
        },
    }
}


export function register_script (config: ScriptConfig) {
    script_registry.set(config.function, config)
}


export function get_script_handler (type: ScriptType): ScriptHandler | undefined {
    return script_registry.get(type)?.handler
}


export function get_all_scripts (): ScriptConfig[] {
    return Array.from(script_registry.values())
}


export function get_all_tool_definitions (doc_search_enabled = true): ToolDefinition[] {
    const doc_tools = new Set(['doc_search', 'doc_read'])
    return Array.from(script_registry.values())
        .filter(s => doc_search_enabled || !doc_tools.has(String(s.function)))
        .map(s => localize_tool_definition(s.definition))
}
