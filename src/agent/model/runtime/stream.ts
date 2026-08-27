import { t } from '@i18n'
import type { ChatModel } from '@/agent/model.ts'
import type { ChatCompletionOptions } from '@/agent/tool_call_adapters.ts'
import type { ChatCompletionStreamResult, IMessage, IMessageAttachment } from '@/agent/model/types.ts'
import { get_reasoning_text, parse_sse_event, to_stream_text } from '@/agent/model/helpers.ts'
import { is_no_available_llm_config_error, no_available_llm_config_message } from '@/agent/model/agent.ts'


export function get_agent_bus_error_message (payload: any, fallback: string) {
    const message = payload?.error?.message ||
        payload?.message ||
        payload?.data?.error?.message ||
        payload?.data?.message ||
        fallback
    return is_no_available_llm_config_error(message) ? no_available_llm_config_message() : message
}


export function get_message_attachments (options: ChatCompletionOptions): IMessageAttachment[] {
    if (options.message_attachments)
        return options.message_attachments
    return (options.content || [ ]).flatMap(part => {
        if (part.type !== 'attachment')
            return [ ]
        return [{ attachmentId: part.attachmentId }]
    })
}


export async function read_chat_completion_stream (
    chat: ChatModel,
    response: Response,
    assistant_msg_id: string,
    request_seq: number
): Promise<ChatCompletionStreamResult> {
    const reader = response.body?.getReader()
    if (!reader)
        throw new Error(t('流式响应不可读取'))
    
    const decoder = new TextDecoder()
    let buffer = ''
    let content = ''
    let reasoning_content = ''
    let final_data: any
    let fallback_notice_shown = false
    
    function show_fallback_notice (data: any) {
        const metadata = data?.metadata && typeof data.metadata === 'object' ? data.metadata : data
        if (!(metadata?.fallbackApplied === true || metadata?.fallbackApplied === 'true'))
            return
        
        const target_llm_config_id = metadata?.llmConfigId || data?.llmConfigId || metadata?.fallbackToLlmConfigId
        if (target_llm_config_id && typeof target_llm_config_id === 'string') {
            const use_native_tool_calling = chat.agent.should_use_native_tool_calling(target_llm_config_id)
            chat._active_llm_config_id = target_llm_config_id
            chat._active_use_native_tool_calling = use_native_tool_calling
            chat.set({
                selected_llm_config_id: target_llm_config_id,
                use_native_tool_calling,
            })
        }
        
        if (fallback_notice_shown)
            return
        fallback_notice_shown = true
        
        const parts = [
            t('模型调用失败，已自动切换到备用模型。'),
            metadata?.fallbackFromLlmConfigId && target_llm_config_id
                ? t('模型：{{from}} → {{to}}', { from: metadata.fallbackFromLlmConfigId, to: target_llm_config_id })
                : '',
            metadata?.fallbackStatusCode ? t('状态码：{{status}}', { status: metadata.fallbackStatusCode }) : '',
            metadata?.fallbackReason ? t('原因：{{reason}}', { reason: metadata.fallbackReason }) : '',
        ].filter(Boolean)
        const notice: IMessage = {
            msgId: `fallback_${Date.now()}`,
            role: 'assistant',
            messageType: 'text',
            content: parts.join('\n\n'),
        }
        const index = chat.messages.findIndex(message => message.msgId === assistant_msg_id)
        const messages = index >= 0
            ? [
                ...chat.messages.slice(0, index),
                notice,
                ...chat.messages.slice(index),
            ]
            : [...chat.messages, notice]
        chat.set({ messages })
    }
    
    function apply_event (raw_event: string) {
        const parsed_event = parse_sse_event(raw_event)
        if (!parsed_event || parsed_event.data === '[DONE]')
            return
        
        let payload: any
        try {
            payload = JSON.parse(parsed_event.data)
        } catch (error) {
            throw new Error(t('流式响应 JSON 解析失败: {{error}}', { error: error instanceof Error ? error.message : String(error) }))
        }
        
        const type = payload.type || parsed_event.event
        const data = payload.data || payload
        
        if (payload.action === 'context.compaction') {
            const phase = String(data?.phase || '')
            if (phase === 'start')
                chat.set({ agent_status: { status: 'compacting', message: t('正在压缩上下文...') } })
            else
                chat.runtime.clear_context_compaction_status()
            return
        }
        
        if (type === 'EVENT')
            return
        
        chat.runtime.clear_context_compaction_status()
        
        if (type === 'STREAM_START' || parsed_event.event === 'stream_start') {
            show_fallback_notice(data)
            return
        }
        
        if (type === 'STREAM_CHUNK' || parsed_event.event === 'chunk') {
            const delta = to_stream_text(data.content)
            if (delta) {
                content += delta
                chat.runtime.update_assistant_content(assistant_msg_id, { content })
            }
            return
        }
        
        if (type === 'STREAM_REASONING' || parsed_event.event === 'reasoning_delta') {
            const delta = get_reasoning_text(data)
            if (delta) {
                reasoning_content += delta
                chat.runtime.update_assistant_content(assistant_msg_id, { reasoning_content })
            }
            return
        }
        
        if (type === 'STREAM_END' || parsed_event.event === 'stream_end') {
            final_data = data
            show_fallback_notice(data)
            const final_content = to_stream_text(data.content)
            const final_reasoning = get_reasoning_text(data)
            if (!content && final_content)
                content = final_content
            if (!reasoning_content && final_reasoning)
                reasoning_content = final_reasoning
            chat.runtime.update_assistant_content(assistant_msg_id, {
                content,
                reasoning_content: reasoning_content || undefined,
            })
            return
        }
        
        if (type === 'ERROR' || type === 'STREAM_ERROR')
            throw new Error(get_agent_bus_error_message(payload, t('流式响应返回错误')))
    }
    
    function consume_buffer () {
        buffer = buffer.replace(/\r\n/g, '\n')
        let sep = buffer.indexOf('\n\n')
        while (sep >= 0) {
            const raw_event = buffer.slice(0, sep)
            buffer = buffer.slice(sep + 2)
            apply_event(raw_event)
            sep = buffer.indexOf('\n\n')
        }
    }
    
    while (true) {
        if (chat.runtime.is_request_inactive(request_seq))
            return { content, reasoning_content, final_data }
        
        const { done, value } = await reader.read()
        if (chat.runtime.is_request_inactive(request_seq))
            return { content, reasoning_content, final_data }
        if (done)
            break
        
        buffer += decoder.decode(value, { stream: true })
        consume_buffer()
    }
    
    buffer += decoder.decode()
    if (buffer.trim())
        apply_event(buffer)
    
    return {
        content,
        reasoning_content,
        tool_calls: final_data?.toolCalls ?? final_data?.tool_calls,
        final_data,
    }
}
