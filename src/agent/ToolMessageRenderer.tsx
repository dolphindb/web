import type { ChatModel, IMessage } from './model.ts'
import {
    type ToolCallViewModel,
    get_tool_natural_text as get_tool_message_natural_text,
} from './utils/message.ts'
import { NaturalTextBlock, is_outcome_message, resolve_args, type ToolRendererProps } from './tool-message/common.tsx'
import { AgentErrorRenderer, FallbackRenderer, TOOL_RENDERERS } from './tool-message/renderers.tsx'


export interface ToolMessageRendererProps {
    chat: ChatModel
    message: IMessage
    tool_name: string
    current_tool_call: ToolCallViewModel | null
    previous_tool_call: ToolCallViewModel | null
    structured_payload: Record<string, unknown> | unknown[] | null
    collapse_key_suffix: string
}


export function ToolMessageRenderer ({
    chat,
    message,
    tool_name,
    current_tool_call,
    previous_tool_call,
    structured_payload,
    collapse_key_suffix,
}: ToolMessageRendererProps) {
    const normalized = tool_name.trim().toLowerCase()
    const args = resolve_args(current_tool_call, previous_tool_call)
    const is_outcome = is_outcome_message(message.messageType)
    const has_paired_tool_call = is_outcome && Boolean(previous_tool_call)
    const renderer = TOOL_RENDERERS[normalized]
    const natural_text = !is_outcome ? get_tool_message_natural_text(message, structured_payload) : ''
    
    const renderer_props: ToolRendererProps = {
        chat,
        message,
        tool_name,
        current_tool_call,
        previous_tool_call,
        structured_payload,
        collapse_key_suffix,
        args,
        is_outcome,
        has_paired_tool_call,
    }
    
    if (message.messageType === 'agent_error')
        return <AgentErrorRenderer {...renderer_props} />
        
    if (!renderer)
        return <>
            <NaturalTextBlock text={natural_text} />
            <FallbackRenderer {...renderer_props} />
        </>
        
    return <>
        <NaturalTextBlock text={natural_text} />
        {renderer(renderer_props)}
    </>
}
