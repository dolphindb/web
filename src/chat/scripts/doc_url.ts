export const DDB_DOCS_BASE_URL = 'https://docs.dolphindb.cn'

const DOCS_HOST = 'docs.dolphindb.cn'
const DDB_RELATED_HOSTS = new Set(['dolphindb.cn', 'www.dolphindb.cn', DOCS_HOST])


export function resolve_dolphindb_doc_url (raw_url: string): string {
    const text = raw_url.trim()
    if (!text)
        return ''
    
    try {
        if (/^https?:\/\//i.test(text)) {
            const parsed = new URL(text)
            if (DDB_RELATED_HOSTS.has(parsed.hostname.toLowerCase())) {
                parsed.protocol = 'https:'
                parsed.hostname = DOCS_HOST
                parsed.port = ''
            }
            return parsed.toString()
        }
        
        const normalized_path = text.startsWith('/') ? text : `/${text}`
        return new URL(normalized_path, DDB_DOCS_BASE_URL).toString()
    } catch {
        return ''
    }
}
