export function parse_json_string (value: string): unknown {
    const trimmed = value.trim()
    if (!trimmed)
        return value
    if (
        (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))
    )
        try { return JSON.parse(trimmed) } catch { }
    return value
}


export function normalize_json_object (value: unknown): Record<string, unknown> | undefined {
    const parsed = typeof value === 'string' ? parse_json_string(value) : value
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
        return undefined
    return parsed as Record<string, unknown>
}


export function normalize_json_object_string (value: unknown): string | undefined {
    if (typeof value === 'string')
        return value
    if (!normalize_json_object(value))
        return undefined
    try { return JSON.stringify(value) } catch { }
    return undefined
}


export function optional_positive_number (value: unknown) {
    const num = Number(value)
    return Number.isFinite(num) && num > 0 ? num : undefined
}


export function get_stored_boolean (key: string, fallback: boolean) {
    const value = localStorage.getItem(key)
    if (value === null)
        return fallback
    return value !== 'false'
}


export function get_enabled (item: any): boolean {
    if (typeof item?.enabled === 'boolean')
        return item.enabled
    if (item?.statusName)
        return item.statusName === 'ACTIVE'
    return true
}


export function get_status_name (item: any): string {
    if (item?.statusName)
        return item.statusName
    return get_enabled(item) ? 'ACTIVE' : 'DISABLED'
}


export function get_status (item: any): number {
    return item?.status ?? (get_enabled(item) ? 1 : 0)
}


export function stable_json_value (value: unknown): unknown {
    if (Array.isArray(value))
        return value.map(stable_json_value)
    if (value && typeof value === 'object') {
        const obj = value as Record<string, unknown>
        return Object.fromEntries(
            Object.keys(obj)
                .sort()
                .map(key => [key, stable_json_value(obj[key])])
        )
    }
    return value
}


export function stable_json_stringify (value: unknown): string {
    try {
        return JSON.stringify(stable_json_value(value))
    } catch {
        return String(value)
    }
}


export function to_stream_text (value: unknown): string {
    if (typeof value === 'string')
        return value
    if (value === null || value === undefined)
        return ''
    return String(value)
}


export function get_reasoning_text (data: any): string {
    return to_stream_text(data?.reasoning ?? data?.reasoning_content ?? data?.reasoningContent)
}


export function parse_sse_event (raw_event: string): { event: string, data: string } | null {
    const lines = raw_event.split('\n')
    let event = ''
    const data_lines: string[] = [ ]
    
    for (const raw_line of lines) {
        const line = raw_line.trimEnd()
        if (!line || line.startsWith(':'))
            continue
        if (line.startsWith('event:'))
            event = line.slice('event:'.length).trim()
        else if (line.startsWith('data:'))
            data_lines.push(line.slice('data:'.length).trimStart())
    }
    
    if (data_lines.length === 0)
        return null
    
    return { event, data: data_lines.join('\n') }
}
