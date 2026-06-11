import { DdbObj } from 'dolphindb/browser.js'


function base64_to_uint8array (base64: string): Uint8Array {
    const normalized = base64.trim()
    if (!normalized)
        return new Uint8Array()
    
    const binary = window.atob(normalized)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0;  i < binary.length;  i++)
        bytes[i] = binary.charCodeAt(i)
    return bytes
}


export function parse_ddb_obj_from_content_object (content_object: unknown): DdbObj | null {
    if (typeof content_object !== 'string' || !content_object.trim())
        return null
    
    try {
        const uint8 = base64_to_uint8array(content_object)
        if (!uint8.length)
            return null
        return DdbObj.parse(uint8, true)
    } catch {
        return null
    }
}
