type DocProvider = 'official' | 'dolphinmind'

export type DocCandidate = {
    id: string
    provider: DocProvider
    providerRank: number
    title: string
    snippet: string
    summary: string
    locator: string
    fallbackContent?: string
}

export type DocReference = {
    provider: DocProvider
    locator: string
    title: string
    fallbackContent?: string
}

const RERANK_RECALL_LIMIT = 30
const SUMMARY_CHARS = 220
const DOC_READ_MAX_CHARS = 12000
const MAX_DOC_REF_SESSIONS = 20
const MAX_DOC_REFS_PER_SESSION = 100

const session_doc_refs = new Map<string, Map<string, DocReference>>()

function as_record (value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : { }
}

function as_array (value: unknown): unknown[] {
    return Array.isArray(value) ? value : [ ]
}

function string_value (value: unknown): string {
    if (typeof value === 'string')
        return value
    if (value === null || value === undefined)
        return ''
    return String(value)
}

function number_value (value: unknown, fallback = 0): number {
    if (typeof value === 'number' && Number.isFinite(value))
        return value
    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value)
        if (Number.isFinite(parsed))
            return parsed
    }
    return fallback
}

function normalize_space (text: string): string {
    return text.replace(/\s+/g, ' ').trim()
}

function strip_html (text: string): string {
    return normalize_space(text
        .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;|&apos;/g, "'"))
}

function clamp_text (text: string, max_chars: number): string {
    return text.length <= max_chars ? text : text.slice(0, max_chars).trimEnd()
}

function delete_oldest_entry<T> (map: Map<string, T>) {
    const oldest = map.keys().next()
    if (!oldest.done)
        map.delete(oldest.value)
}

function hash_string (value: string): string {
    let hash = 0x811c9dc5
    for (let i = 0;  i < value.length;  i++) {
        hash ^= value.charCodeAt(i)
        hash = Math.imul(hash, 0x01000193)
    }
    return (hash >>> 0).toString(16).padStart(8, '0')
}

function basename_title (locator: string): string {
    const without_query = locator.split('?')[0] || locator
    const last = without_query.split('/').filter(Boolean).pop() || locator
    return last.replace(/\.[^.]+$/, '') || locator
}

function normalize_provider (raw: unknown, record: Record<string, unknown>): DocProvider | null {
    const provider = string_value(raw).trim().toLowerCase()
    if (provider === 'official')
        return 'official'
    if (provider === 'dolphinmind' || provider === 'dolphin_mind')
        return 'dolphinmind'
    if (string_value(record.source).trim())
        return 'dolphinmind'
    if (string_value(record.url).trim())
        return 'official'
    return null
}

function candidate_locator (provider: DocProvider, record: Record<string, unknown>): string {
    return string_value(record.locator || (provider === 'dolphinmind' ? record.source : record.url)).trim()
}

function candidate_id (provider: DocProvider, locator: string): string {
    return `doc_${hash_string(`${provider}:${locator}`)}`
}

function normalize_raw_candidate (value: unknown, fallback_provider: DocProvider | null, index: number): DocCandidate | null {
    const record = as_record(value)
    const provider = fallback_provider || normalize_provider(record.provider, record)
    if (!provider)
        return null
    
    const locator = candidate_locator(provider, record)
    if (!locator)
        return null
    
    const raw_title = string_value(record.title).trim() || basename_title(locator)
    const snippet = string_value(record.snippet || record.summary || record.content)
    const title = strip_html(raw_title)
    const clean_snippet = strip_html(snippet)
    
    return {
        id: candidate_id(provider, locator),
        provider,
        providerRank: Math.max(1, Math.trunc(number_value(record.providerRank, index + 1))),
        title,
        snippet,
        summary: clamp_text(clean_snippet, SUMMARY_CHARS),
        locator,
        fallbackContent: string_value(record.fallbackContent || '').trim() || undefined,
    }
}

export function normalize_doc_search_response (response: unknown): DocCandidate[] {
    const record = as_record(response)
    const result_candidates = as_array(record.results)
        .map((item, index) => normalize_raw_candidate(item, null, index))
        .filter(Boolean) as DocCandidate[]
    const candidates = result_candidates.length ? result_candidates : [
        ...as_array(record.dolphinMind).map((item, index) => normalize_raw_candidate(item, 'dolphinmind', index)),
        ...as_array(record.official).map((item, index) => normalize_raw_candidate(item, 'official', index)),
    ].filter(Boolean) as DocCandidate[]
    
    const seen = new Set<string>()
    const merged: DocCandidate[] = [ ]
    for (const candidate of candidates) {
        const key = `${candidate.provider}:${candidate.locator}`
        if (seen.has(key))
            continue
        seen.add(key)
        merged.push(candidate)
    }
    
    return merged.slice(0, RERANK_RECALL_LIMIT)
}

export function store_doc_references (session_id: string, candidates: DocCandidate[]) {
    const refs = session_doc_refs.get(session_id) || new Map<string, DocReference>()
    for (const candidate of candidates) {
        refs.delete(candidate.id)
        refs.set(candidate.id, {
            provider: candidate.provider,
            locator: candidate.locator,
            title: candidate.title,
            fallbackContent: candidate.fallbackContent,
        })
    }
    while (refs.size > MAX_DOC_REFS_PER_SESSION)
        delete_oldest_entry(refs)
    
    session_doc_refs.delete(session_id)
    session_doc_refs.set(session_id, refs)
    while (session_doc_refs.size > MAX_DOC_REF_SESSIONS)
        delete_oldest_entry(session_doc_refs)
}

export function get_doc_reference (session_id: string, id: string): DocReference | null {
    return session_doc_refs.get(session_id)?.get(id) || null
}

export function candidate_for_rerank (candidate: DocCandidate): Record<string, unknown> {
    return {
        id: candidate.id,
        provider: candidate.provider,
        providerRank: candidate.providerRank,
        title: candidate.title,
        snippet: candidate.summary,
        summary: candidate.summary,
        locator: candidate.locator,
        ...(candidate.provider === 'dolphinmind' ? { source: candidate.locator } : { url: candidate.locator }),
    }
}

export function order_by_rerank_response (response: unknown, fallback: DocCandidate[]): DocCandidate[] {
    const by_id = new Map(fallback.map(candidate => [candidate.id, candidate]))
    const used = new Set<string>()
    const ordered: DocCandidate[] = [ ]
    for (const item of as_array(as_record(response).results)) {
        const id = string_value(as_record(item).id).trim()
        const candidate = by_id.get(id)
        if (candidate && !used.has(id)) {
            ordered.push(candidate)
            used.add(id)
        }
    }
    for (const candidate of fallback)
        if (!used.has(candidate.id))
            ordered.push(candidate)
    return ordered.length ? ordered : fallback
}

export function doc_search_tool_result (query: string, candidates: DocCandidate[], max_results: number) {
    return {
        query,
        results: candidates.slice(0, max_results).map(candidate => ({
            id: candidate.id,
            title: candidate.title,
            summary: candidate.summary,
        })),
    }
}

const DROP_SELECTORS = [
    'script', 'style', 'noscript', 'svg', 'iframe', 'button', 'input', 'select', 'textarea',
    'nav', 'header', 'footer',
    '.wh_topic_toc', '.wh_related_links', '.wh_topic_breadcrumb', '.wh_breadcrumb',
    '.wh_print_link', '.wh_navigation_links', '.navheader', '.navfooter',
]

const BLOCK_TAGS = new Set([
    'article', 'section', 'div', 'main', 'p', 'pre', 'blockquote', 'table',
    'ul', 'ol', 'dl', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
])

function inline_markdown (node: Node): string {
    if (node.nodeType === Node.TEXT_NODE)
        return string_value(node.textContent).replace(/\s+/g, ' ')
    if (node.nodeType !== Node.ELEMENT_NODE)
        return ''
    
    const element = node as Element
    const tag = element.tagName.toLowerCase()
    if (tag === 'br')
        return '\n'
    if (tag === 'code' && element.parentElement?.tagName.toLowerCase() !== 'pre') {
        const code = normalize_space(element.textContent || '')
        return code ? `\`${code.replace(/`/g, '\\`')}\`` : ''
    }
    if (tag === 'pre')
        return normalize_space(element.textContent || '')
    
    return Array.from(element.childNodes).map(inline_markdown).join('')
}

function direct_children (element: Element, tag: string): Element[] {
    return Array.from(element.children).filter(child => child.tagName.toLowerCase() === tag)
}

function clean_markdown_block (text: string): string {
    return text
        .split('\n')
        .map(line => line.replace(/[ \t]+$/g, ''))
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
}

function table_to_markdown (table: Element): string {
    const rows = Array.from(table.querySelectorAll('tr'))
        .map(row => Array.from(row.querySelectorAll('th,td'))
            .map(cell => normalize_space(cell.textContent || '').replace(/\|/g, '\\|')))
        .filter(row => row.length)
    if (!rows.length)
        return ''
    
    const columns = Math.max(...rows.map(row => row.length))
    const padded = rows.map(row => [...row, ...Array(columns - row.length).fill('')])
    const header = padded[0]
    const body = padded.slice(1)
    return [
        `| ${header.join(' | ')} |`,
        `| ${header.map(() => '---').join(' | ')} |`,
        ...body.map(row => `| ${row.join(' | ')} |`),
    ].join('\n')
}

function list_to_markdown (element: Element, ordered: boolean): string {
    return direct_children(element, 'li').map((item, index) => {
        const marker = ordered ? `${index + 1}.` : '-'
        const text = clean_markdown_block(inline_markdown(item))
        return text ? `${marker} ${text.replace(/\n/g, '\n  ')}` : ''
    }).filter(Boolean).join('\n')
}

function element_to_markdown_blocks (element: Element): string[] {
    const tag = element.tagName.toLowerCase()
    
    if (/^h[1-6]$/.test(tag)) {
        const level = Number(tag.slice(1))
        const text = normalize_space(element.textContent || '')
        return text ? [`${'#'.repeat(level)} ${text}`] : [ ]
    }
    if (tag === 'p' || tag === 'blockquote') {
        const text = clean_markdown_block(inline_markdown(element))
        if (!text)
            return [ ]
        return [tag === 'blockquote' ? text.split('\n').map(line => `> ${line}`).join('\n') : text]
    }
    if (tag === 'pre') {
        const code = (element.textContent || '').replace(/\r\n/g, '\n').trim()
        return code ? [`\`\`\`\n${code}\n\`\`\``] : [ ]
    }
    if (tag === 'ul' || tag === 'ol') {
        const text = list_to_markdown(element, tag === 'ol')
        return text ? [text] : [ ]
    }
    if (tag === 'table') {
        const text = table_to_markdown(element)
        return text ? [text] : [ ]
    }
    if (tag === 'li') {
        const text = clean_markdown_block(inline_markdown(element))
        return text ? [`- ${text}`] : [ ]
    }
    
    const children = Array.from(element.children)
    if (children.some(child => BLOCK_TAGS.has(child.tagName.toLowerCase())))
        return children.flatMap(element_to_markdown_blocks)
    
    const text = clean_markdown_block(inline_markdown(element))
    return text ? [text] : [ ]
}

function html_to_text (html: string): { title: string, content: string } {
    try {
        const doc = new DOMParser().parseFromString(html, 'text/html')
        const root = doc.querySelector('div.wh_topic_content.body') ||
            doc.querySelector('div.wh_topic_content') ||
            doc.querySelector('main') ||
            doc.body
        for (const selector of DROP_SELECTORS)
            root.querySelectorAll(selector).forEach(node => { node.remove() })
        
        const title = normalize_space(root.querySelector('h1')?.textContent || doc.querySelector('title')?.textContent || '')
        const content = clean_markdown_block(element_to_markdown_blocks(root).join('\n\n')) ||
            strip_html(root.innerHTML || html)
        return { title, content }
    } catch {
        return { title: '', content: strip_html(html) }
    }
}

function trim_doc_content (content: string): { content: string, truncated: boolean } {
    if (content.length <= DOC_READ_MAX_CHARS)
        return { content, truncated: false }
    return {
        content: `${content.slice(0, Math.max(0, DOC_READ_MAX_CHARS - 24)).trimEnd()}\n\n[内容过长，已截断]`,
        truncated: true,
    }
}

export function clean_doc_read_response (response: unknown, reference: DocReference) {
    const record = as_record(response)
    const raw_content = string_value(record.content || reference.fallbackContent || '')
    const content_type = string_value(record.contentType).toLowerCase()
    const body_truncated = Boolean(record.bodyTruncated)
    
    const extracted = content_type.includes('html') || /<html[\s>]/i.test(raw_content) || /<body[\s>]/i.test(raw_content)
        ? html_to_text(raw_content)
        : { title: '', content: raw_content.replace(/\r\n/g, '\n').trim() }
    const title = normalize_space(extracted.title || string_value(record.title) || reference.title)
    const trimmed = trim_doc_content(extracted.content)
    
    return {
        title,
        content: trimmed.content,
        truncated: trimmed.truncated || body_truncated,
    }
}
