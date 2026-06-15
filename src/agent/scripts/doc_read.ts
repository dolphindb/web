import type { ScriptConfig, ScriptResult } from './types.ts'
import { normalize_script_args } from './helpers.ts'
import { resolve_dolphindb_doc_url } from './doc_url.ts'
import { network_fetch } from './network_fetch.ts'


const DEFAULT_MAX_CHARS = 50000
const MAX_ALLOWED_CHARS = 150000
const REQUEST_TIMEOUT_MS = 30_000
const MAX_BODY_BYTES = 2_097_152


function to_positive_int (value: unknown, fallback: number) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        const integer = Math.trunc(value)
        return integer > 0 ? integer : fallback
    }
    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value)
        if (Number.isFinite(parsed)) {
            const integer = Math.trunc(parsed)
            return integer > 0 ? integer : fallback
        }
    }
    return fallback
}

function clamp_max_chars (value: unknown) {
    const max_chars = to_positive_int(value, DEFAULT_MAX_CHARS)
    return Math.min(max_chars, MAX_ALLOWED_CHARS)
}


const DROP_SELECTORS = [
    'script', 'style', 'noscript', 'svg', 'iframe', 'button', 'input', 'select', 'textarea',
    'nav', 'header', 'footer',
    '.wh_topic_toc', '.wh_related_links', '.wh_topic_breadcrumb', '.wh_breadcrumb',
    '.wh_print_link', '.wh_navigation_links', '.navheader', '.navfooter',
]

const BLOCK_TAGS = new Set([
    'div', 'section', 'article', 'main', 'aside', 'details', 'summary',
    'p', 'pre', 'ul', 'ol', 'table', 'blockquote', 'hr',
])


function render_node (node: Node, page_url: string): string {
    if (node.nodeType === Node.TEXT_NODE)
        return (node.textContent || '').replace(/\s+/g, ' ')
    
    if (node.nodeType !== Node.ELEMENT_NODE)
        return ''
    
    const el = node as Element
    const tag = el.tagName.toLowerCase()
    
    if (tag === 'br')
        return '\n'
    
    const children_text = () => Array.from(node.childNodes).map(c => render_node(c, page_url)).join('')
    
    if (/^h[1-6]$/.test(tag)) {
        const level = Number(tag.slice(1))
        const text = children_text().replace(/[ \t]+\n/g, '\n').replace(/\n[ \t]+/g, '\n').replace(/[ \t]{2,}/g, ' ').trim()
        return text ? `${'#'.repeat(level)} ${text}\n\n` : ''
    }
    
    if (tag === 'p') {
        const text = children_text().replace(/[ \t]{2,}/g, ' ').trim()
        return text ? `${text}\n\n` : ''
    }
    
    if (tag === 'pre') {
        const code = (el.textContent || '').replace(/\r\n/g, '\n').trimEnd()
        return code ? `\`\`\`\n${code}\n\`\`\`\n\n` : ''
    }
    
    if (tag === 'code') {
        const code = (el.textContent || '').replace(/\s+/g, ' ').trim()
        return code ? `\`${code.replace(/`/g, '\\`')}\`` : ''
    }
    
    if (tag === 'a') {
        const label = children_text().trim()
        const href = (el.getAttribute('href') || '').trim()
        if (!href || href.startsWith('#') || href.toLowerCase().startsWith('javascript:'))
            return label
        
        let resolved = ''
        try {
            resolved = /^https?:\/\//i.test(href) || href.startsWith('/')
                ? resolve_dolphindb_doc_url(href)
                : new URL(href, page_url).toString()
        } catch { }
        
        return resolved ? `[${label || resolved}](${resolved})` : label
    }
    
    if (tag === 'strong' || tag === 'b') {
        const text = children_text().trim()
        return text ? `**${text}**` : ''
    }
    
    if (tag === 'em' || tag === 'i') {
        const text = children_text().trim()
        return text ? `*${text}*` : ''
    }
    
    if (tag === 'blockquote') {
        const content = children_text().trim()
        if (!content)
            return ''
        return content.split('\n').map(l => `> ${l}`).join('\n') + '\n\n'
    }
    
    if (tag === 'ul' || tag === 'ol') {
        const items = Array.from(el.children).filter(c => c.tagName.toLowerCase() === 'li')
        const lines: string[] = [ ]
        items.forEach((item, i) => {
            const text = Array.from(item.childNodes).map(c => render_node(c, page_url)).join('').trim()
            if (!text)
                return
            const prefix = tag === 'ol' ? `${i + 1}. ` : '- '
            lines.push(`${prefix}${text}`)
        })
        return lines.length > 0 ? lines.join('\n') + '\n\n' : ''
    }
    
    if (tag === 'table') {
        const rows = Array.from(el.querySelectorAll('tr'))
        const parsed_rows = rows.map(row =>
            Array.from(row.children)
                .filter(c => c.tagName.toLowerCase() === 'th' || c.tagName.toLowerCase() === 'td')
                .map(cell => Array.from(cell.childNodes).map(c => render_node(c, page_url)).join('').trim().replace(/\|/g, '\\|'))
        ).filter(row => row.length > 0)
        
        if (parsed_rows.length === 0)
            return ''
        
        const col_count = Math.max(...parsed_rows.map(r => r.length))
        const normalize_row = (row: string[]) => row.length >= col_count ? row : [...row, ...new Array(col_count - row.length).fill('')]
        const normalized = parsed_rows.map(normalize_row)
        
        const header = `| ${normalized[0].join(' | ')} |`
        const sep = `| ${new Array(col_count).fill('---').join(' | ')} |`
        const body = normalized.slice(1).map(row => `| ${row.join(' | ')} |`)
        return [header, sep, ...body].join('\n') + '\n\n'
    }
    
    const content = children_text()
    if (BLOCK_TAGS.has(tag)) {
        const text = content.replace(/[ \t]{2,}/g, ' ').trim()
        return text ? `${text}\n\n` : ''
    }
    
    return content
}


function extract_doc_content (html: string, page_url: string): { title: string, markdown: string } {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    
    const content_root = doc.querySelector('div.wh_topic_content.body') ?? doc.querySelector('div.wh_topic_content')
    if (!content_root)
        throw new Error('Cannot find content node: div.wh_topic_content.body')
    
    // 移除不需要的元素
    for (const selector of DROP_SELECTORS)
        content_root.querySelectorAll(selector).forEach(node => { node.remove() })
    
    const title = content_root.querySelector('h1')?.textContent?.trim()
        || doc.querySelector('title')?.textContent?.trim()
        || ''
    
    const markdown = Array.from(content_root.childNodes).map(c => render_node(c, page_url)).join('')
        .replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
    
    return { title, markdown }
}


function trim_by_max_chars (text: string, max_chars: number): { content: string, truncated: boolean } {
    if (text.length <= max_chars)
        return { content: text, truncated: false }
    
    const cutoff = Math.max(0, max_chars - 24)
    return {
        content: `${text.slice(0, cutoff).trimEnd()}\n\n[内容过长，已截断]`,
        truncated: true,
    }
}


export const doc_read_config: ScriptConfig = {
    function: 'doc_read',
    definition: {
        type: 'function',
        function: {
            name: 'doc_read',
            description: '读取 DolphinDB 官方文档页面内容，支持 URL 或文档路径；不能读取 Skill 包内文件或 references，Skill 包文件请用 skill_file_read',
            parameters: {
                type: 'object',
                properties: {
                    url: { type: 'string', description: '文档 URL 或路径' },
                    max_chars: { type: 'number', description: '最大返回字符数，默认 50000' },
                },
                required: ['url'],
            },
        },
    },
    handler: async (type, content, context): Promise<ScriptResult> => {
        try {
            const args = normalize_script_args(content)
            const raw_doc_url = (args[0] || '').trim()
            const max_chars = clamp_max_chars(args[1])
            
            if (!raw_doc_url)
                return {
                    next_loop: true,
                    save_message: {
                        msgId: `tool_${Date.now()}`,
                        role: 'tool',
                        messageType: 'tool_error',
                        name: type,
                        content: 'doc_read requires args[0] as doc path or URL.',
                    },
                }
            
            const page_url = resolve_dolphindb_doc_url(raw_doc_url)
            if (!page_url)
                return {
                    next_loop: true,
                    save_message: {
                        msgId: `tool_${Date.now()}`,
                        role: 'tool',
                        messageType: 'tool_error',
                        name: type,
                        content: `doc_read failed: invalid doc URL/path: ${raw_doc_url}`,
                    },
                }
            
            const response = await network_fetch(context, {
                method: 'GET',
                url: page_url,
                timeoutMs: REQUEST_TIMEOUT_MS,
                maxBodyBytes: MAX_BODY_BYTES,
            })
            
            const raw_html = response.body || ''
            if (response.statusCode < 200 || response.statusCode >= 300)
                return {
                    next_loop: true,
                    save_message: {
                        msgId: `tool_${Date.now()}`,
                        role: 'tool',
                        messageType: 'tool_error',
                        name: type,
                        content: `doc_read failed (${response.statusCode}): ${(raw_html || response.statusText).slice(0, 200)}`,
                    },
                }
            
            if (response.bodyOmitted)
                return {
                    next_loop: true,
                    save_message: {
                        msgId: `tool_${Date.now()}`,
                        role: 'tool',
                        messageType: 'tool_error',
                        name: type,
                        content: `doc_read failed: response body omitted by network proxy (${response.contentType || 'unknown content type'}).`,
                    },
                }
            
            const extracted = extract_doc_content(raw_html, page_url)
            const trimmed = trim_by_max_chars(extracted.markdown, max_chars)
            
            return {
                next_loop: true,
                save_message: {
                    msgId: `tool_${Date.now()}`,
                    role: 'tool',
                    messageType: 'tool_result',
                    name: type,
                    content: JSON.stringify({
                        url: page_url,
                        title: extracted.title,
                        maxChars: max_chars,
                        truncated: trimmed.truncated,
                        content: trimmed.content,
                    }),
                },
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            return {
                next_loop: true,
                save_message: {
                    msgId: `tool_${Date.now()}`,
                    role: 'tool',
                    messageType: 'tool_error',
                    name: type,
                    content: `doc_read failed: ${message}`,
                },
            }
        }
    },
}
