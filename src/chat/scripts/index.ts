import type { ScriptType, ScriptConfig, ScriptHandler, ToolDefinition } from './types.ts'


const script_registry = new Map<ScriptType, ScriptConfig>()


export function register_script (config: ScriptConfig) {
    script_registry.set(config.function, config)
}


export function get_script_handler (type: ScriptType): ScriptHandler | undefined {
    return script_registry.get(type)?.handler
}


export function get_all_scripts (): ScriptConfig[] {
    return Array.from(script_registry.values())
}


export function get_all_tool_definitions (): ToolDefinition[] {
    return Array.from(script_registry.values()).map(s => s.definition)
}
