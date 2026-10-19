import { language } from '@i18n'
import { TOOL_RESULT_SPILL_THRESHOLD_CHARS } from '@/agent/scripts/helpers.ts'
import type { ToolContext } from '@/agent/scripts/types.ts'


const TOOL_RESULT_PREVIEW_CHARS = 2000


function hash_string (value: string) {
    let hash = 0x811c9dc5
    for (let index = 0;  index < value.length;  index += 1) {
        hash ^= value.charCodeAt(index)
        hash = Math.imul(hash, 0x01000193)
    }
    return (hash >>> 0).toString(16).padStart(8, '0')
}


function build_reference (original_chars: number, file: string, preview: string) {
    return language === 'en' ? [
        '<persisted-output>',
        `Tool output is too large (${original_chars} characters). The full output has been saved to the current workspace file: ${file}`,
        '',
        'Do not read the entire file at once. Use vfs_search to locate relevant text, or use vfs_read with startLine and endLine to read specific line ranges.',
        'If sequential reading is necessary, read at most 200 lines at a time.',
        '',
        'Preview:',
        preview,
        '</persisted-output>',
    ].join('\n') : [
        '<persisted-output>',
        `工具结果过大：${original_chars} 字符。完整输出已保存到当前工作区文件：${file}`,
        '',
        '不要一次性读取整个文件。请优先使用 vfs_search 查找相关文本，或使用带 startLine/endLine 的 vfs_read 读取指定行范围。',
        '如果需要顺序读取，每次最多读取 200 行。',
        '',
        '预览：',
        preview,
        '</persisted-output>',
    ].join('\n')
}


function build_failed_reference (original_chars: number, error: unknown, preview: string) {
    return language === 'en' ? [
        '<persisted-output>',
        `Tool output is too large (${original_chars} characters), but failed to save to workspace: ${error instanceof Error ? error.message : String(error)}`,
        'Only the preview below is retained.',
        '',
        'Preview:',
        preview,
        '</persisted-output>',
    ].join('\n') : [
        '<persisted-output>',
        `工具结果过大：${original_chars} 字符，但保存到工作区失败：${error instanceof Error ? error.message : String(error)}`,
        '当前只保留下方预览内容。',
        '',
        '预览：',
        preview,
        '</persisted-output>',
    ].join('\n')
}


export async function spill_large_tool_result_content_if_needed (
    content: string,
    tool_type: string,
    context: ToolContext,
    max_chars = TOOL_RESULT_SPILL_THRESHOLD_CHARS,
    preview_chars = TOOL_RESULT_PREVIEW_CHARS,
) {
    if (content.length <= max_chars)
        return content
    
    const preview = content.slice(0, preview_chars)
    const file = `tool_result_${tool_type}_${hash_string(`${tool_type}:${content}`)}.txt`
    
    try {
        await context.workspace_store.write_file(context.session_id, context.api_fetch, file, content)
        return build_reference(content.length, file, preview)
    } catch (error) {
        return build_failed_reference(content.length, error, preview)
    }
}


export async function spill_large_tool_result_print_if_needed (
    print_messages: string[],
    tool_type: string,
    context: ToolContext,
) {
    const content = print_messages.join('\n')
    if (content.length <= TOOL_RESULT_SPILL_THRESHOLD_CHARS)
        return print_messages
    return [await spill_large_tool_result_content_if_needed(content, `${tool_type}_print`, context)]
}
