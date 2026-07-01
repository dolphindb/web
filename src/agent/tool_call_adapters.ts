import { language } from '@i18n'

import type { IMessage, IToolCall } from './model.ts'
import { build_system_prompt } from './prompt.ts'
import { get_all_tool_definitions } from './scripts/index.ts'
import { parse_tool_calls } from './tool_call_parser.ts'
import type { CompletionToolCalls, ParsedToolCall } from './tool_call_parser.ts'


export type ToolCallAdapterMode = 'legacy_json' | 'native'


export type ToolResultPayload = {
    toolCallId: string
    content: string
}


export interface ChatCompletionOptions {
    append_user?: boolean
    tool_results?: ToolResultPayload[]
}


export interface ToolCallContinuation {
    message: string
    options?: ChatCompletionOptions
}


export interface ToolCallAdapter {
    mode: ToolCallAdapterMode
    build_system_prompt: (doc_search_enabled: boolean, doc_search_enabled_changed?: boolean) => string
    apply_request_body: (body: Record<string, any>, message: string, options: ChatCompletionOptions, doc_search_enabled: boolean) => void
    parse_tool_calls: (tool_calls: CompletionToolCalls | undefined, content: string) => ParsedToolCall[]
    get_natural_text: (content: string) => string
    build_tool_call_message: (parsed_call: ParsedToolCall, msg_id: string, reasoning_content?: string, natural_text?: string) => IMessage
    collect_tool_result: (parsed_call: ParsedToolCall, content: string, tool_results: ToolResultPayload[]) => void
    build_continuation: (tool_result_contents: string[], tool_results: ToolResultPayload[], runtime_context?: string) => ToolCallContinuation | null
}

const CONTINUATION_LANGUAGE_HINT = language === 'en'
    ? 'Continue using the user question language. The English UI language means the conversation is in an English context by default; use English for reasoning and final answers.'
    : '继续使用用户问题的语言；如果用户使用中文或处于中文语境，思考过程和最终回答都必须用中文。'


function strip_json_segments (text: string): string {
    let result = text.replace(/```(?:json)?\s*[\s\S]*?```/gi, '\n\n')
    const ranges: Array<[number, number]> = [ ]
    let start = -1
    let depth = 0
    let in_string = false
    let escape = false
    
    for (let index = 0;  index < result.length;  index += 1) {
        const ch = result[index]
        if (escape) {
            escape = false
            continue
        }
        if (ch === '\\') {
            escape = true
            continue
        }
        if (ch === '"') {
            in_string = !in_string
            continue
        }
        if (in_string)
            continue
        if (ch === '{') {
            if (depth === 0)
                start = index
            depth += 1
            continue
        }
        if (ch === '}' && depth > 0) {
            depth -= 1
            if (depth === 0 && start >= 0) {
                ranges.push([start, index + 1])
                start = -1
            }
        }
    }
    
    for (let index = ranges.length - 1;  index >= 0;  index -= 1) {
        const [from, to] = ranges[index]
        result = `${result.slice(0, from)}\n${result.slice(to)}`
    }
    
    return result
        .split(/\r?\n/)
        .map(line => line.trimEnd())
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
}


function to_envelope_content_text (value: unknown): string {
    if (typeof value === 'string')
        return value
    if (Array.isArray(value))
        return value.map(to_envelope_content_text).filter(Boolean).join('\n')
    if (value && typeof value === 'object') {
        const obj = value as Record<string, unknown>
        const text = obj.text ?? obj.content ?? obj.output_text ?? obj.outputText
        if (typeof text === 'string')
            return text
    }
    if (value === null || value === undefined)
        return ''
    try {
        return JSON.stringify(value)
    } catch {
        return String(value)
    }
}


function parse_response_envelope (content: string): { content: string } | null {
    const trimmed = content.trim()
    if (!trimmed.startsWith('{') || !trimmed.endsWith('}'))
        return null
    
    try {
        const parsed = JSON.parse(trimmed)
        if (parsed && typeof parsed === 'object' && ('toolCalls' in parsed || 'tool_calls' in parsed))
            return { content: to_envelope_content_text((parsed as { content?: unknown }).content) }
    } catch { }
    
    return null
}


function get_native_natural_text (content: string): string {
    return parse_response_envelope(content)?.content ?? content
}


function tool_calls_from_parsed_call (parsed_call: ParsedToolCall): IToolCall[] | undefined {
    if (!parsed_call.id)
        return undefined
    return [{
        id: parsed_call.id,
        type: 'function',
        function: {
            name: parsed_call.type,
            arguments: typeof parsed_call.payload === 'string'
                ? parsed_call.payload
                : JSON.stringify(parsed_call.payload),
        },
    }]
}


function build_tool_call_message (parsed_call: ParsedToolCall, msg_id: string, reasoning_content?: string, natural_text?: string): IMessage {
    const tool_call_payload = {
        tool_call: parsed_call.type,
        args: parsed_call.payload,
        ...(parsed_call.id ? { id: parsed_call.id } : { }),
        ...(natural_text ? { naturalText: natural_text } : { }),
    }
    return {
        msgId: msg_id,
        role: 'assistant',
        messageType: 'tool_call',
        name: parsed_call.type,
        content: JSON.stringify(tool_call_payload),
        reasoning_content: reasoning_content || undefined,
        tool_calls: tool_calls_from_parsed_call(parsed_call),
    }
}


export const legacy_json_tool_call_adapter: ToolCallAdapter = {
    mode: 'legacy_json',
    
    build_system_prompt: doc_search_enabled => 
        build_system_prompt(false, doc_search_enabled),
    
    apply_request_body (body, message) {
        body.message = message
    },
    
    parse_tool_calls,
    
    get_natural_text: strip_json_segments,
    
    build_tool_call_message,
    
    collect_tool_result () { },
    
    build_continuation (tool_result_contents) {
        if (!tool_result_contents.length)
            return null
        return { message: `${CONTINUATION_LANGUAGE_HINT}\n\n${tool_result_contents.join('\n\n')}` }
    },
}


export const native_tool_call_adapter: ToolCallAdapter = {
    mode: 'native',
    
    build_system_prompt: (doc_search_enabled, doc_search_enabled_changed) => 
        build_system_prompt(true, doc_search_enabled, doc_search_enabled_changed),
    
    apply_request_body (body, message, options, doc_search_enabled) {
        body.assemblyConfig.tools = get_all_tool_definitions(doc_search_enabled)
        if (options.tool_results?.length)
            body.toolResults = options.tool_results
        else
            body.message = message
    },
    
    parse_tool_calls: (tool_calls, content) => parse_tool_calls(tool_calls, content),
    
    get_natural_text: get_native_natural_text,
    
    build_tool_call_message,
    
    collect_tool_result (parsed_call, content, tool_results) {
        if (parsed_call.id)
            tool_results.push({
                toolCallId: parsed_call.id,
                content: content || '',
            })
    },
    
    build_continuation (_tool_result_contents, tool_results, runtime_context) {
        if (!tool_results.length)
            return null
        if (runtime_context)
            tool_results[tool_results.length - 1] = {
                ...tool_results[tool_results.length - 1],
                content: `${tool_results[tool_results.length - 1].content}\n\n[web_runtime_context]\n${runtime_context}`,
            }
        else
            tool_results[tool_results.length - 1] = {
                ...tool_results[tool_results.length - 1],
                content: `${tool_results[tool_results.length - 1].content}\n\n[web_runtime_context]\n${CONTINUATION_LANGUAGE_HINT}`,
            }
        return {
            message: '',
            options: {
                append_user: false,
                tool_results,
            },
        }
    },
}
