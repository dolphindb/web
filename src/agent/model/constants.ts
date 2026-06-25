export const AGENT_ID_KEY = 'ddb.chat.agent_id'
export const TOOL_CALL_LIMIT_ENABLED_KEY = 'ddb.chat.tool_call_limit_enabled'

/** 最大工具调用轮次，防止无限循环 */
export const MAX_TOOL_TURNS = 200

export const MAX_REPEATED_TOOL_CALLS = 2

export const MAX_CONSECUTIVE_DDB_FAILURES_BEFORE_HINT = 2

export const DDB_RESULT_TOOLS = new Set<string>(['execute', 'show', 'coldefs', 'testsql'])

export const SCRIPT_APPROVAL_TOOLS = new Set<string>(['execute', 'execute_file', 'show'])

export const REPEAT_GUARD_EXEMPT_TOOLS = new Set<string>(['execute_file'])


