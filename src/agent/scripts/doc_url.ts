export const DDB_DOCS_BASE_URL = 'https://docs.dolphindb.cn'

const DOCS_HOSTS = new Set(['docs.dolphindb.cn', 'docs.dolphindb.com'])


export function resolve_dolphindb_doc_url (raw_url: string): string {
    const text = raw_url.trim()
    if (!text)
        return ''
    
    try {
        if (/^https?:\/\//i.test(text)) {
            const parsed = new URL(text)
            if (!DOCS_HOSTS.has(parsed.hostname.toLowerCase()))
                return ''
            
            parsed.protocol = 'https:'
            parsed.port = ''
            return parsed.toString()
        }
        
        const normalized_path = text.startsWith('/') ? text : `/${text}`
        return new URL(normalized_path, DDB_DOCS_BASE_URL).toString()
    } catch {
        return ''
    }
}
