const WORKSPACE_ROOT = '/home/workspace'
const SKILLS_ROOT = '/home/skills'

type JsonRecord = Record<string, unknown>


function is_record (value: unknown): value is JsonRecord {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}


function normalize_path (path: string) {
    return path.replace(/\\/g, '/').replace(/\/+/g, '/').trim()
}


function trim_slashes (path: string) {
    return normalize_path(path).replace(/^\/+|\/+$/g, '')
}


function is_workspace_path (path: string) {
    const normalized = `/${trim_slashes(path)}`
    return normalized === WORKSPACE_ROOT || normalized.startsWith(`${WORKSPACE_ROOT}/`)
}


export function is_skill_path (path: string) {
    const normalized = `/${trim_slashes(path)}`
    return normalized === SKILLS_ROOT || normalized.startsWith(`${SKILLS_ROOT}/`)
}


export function to_workspace_display_path (name: string) {
    const normalized = trim_slashes(name)
    return normalized.startsWith('home/workspace/') ? `/${normalized}` : `${WORKSPACE_ROOT}/${normalized}`
}


export function to_skill_display_path (skill_id: string, file_path: string) {
    const normalized = trim_slashes(file_path)
    return normalized.startsWith('home/skills/') ? `/${normalized}` : `${SKILLS_ROOT}/${skill_id}/${normalized}`
}


export function normalize_workspace_tool_path (path: string, allow_empty = false) {
    const normalized = trim_slashes(path)
    if (!normalized) {
        if (allow_empty)
            return ''
        throw new Error('File path is required. Use /home/workspace/<file> and run vfs_list if you need available files.')
    }
    if (is_skill_path(normalized))
        throw new Error(`Skill paths are read-only: /${normalized}. Use vfs_copy to copy the file into /home/workspace, then modify the workspace copy.`)
    
    const name = is_workspace_path(normalized)
        ? normalized.slice('home/workspace'.length).replace(/^\/+/, '')
        : normalized
    if (!name) {
        if (allow_empty)
            return ''
        throw new Error('Workspace root is not a file. Use /home/workspace/<file> or run vfs_list.')
    }
    if (name.includes('/') || name.includes('..') || name.startsWith('.'))
        throw new Error(`Invalid workspace file path: ${path}. Workspace only supports single-level files. Use /home/workspace/<file>; run vfs_list to see existing files.`)
    return name
}


export function normalize_vfs_path (path: string, allow_empty = false) {
    const normalized = trim_slashes(path)
    if (!normalized) {
        if (allow_empty)
            return ''
        throw new Error('File path is required. Use /home/workspace/<file> or /home/skills/<skill_id>/<file_path>.')
    }
    return `/${normalized}`
}


export function parse_skill_file_path (path: string, fallback_skill_id = '') {
    const normalized = trim_slashes(path)
    if (!normalized)
        throw new Error('Skill file path is required. Use /home/skills/<skill_id>/<file_path> or provide skill_id plus a relative file path.')
    if (is_workspace_path(normalized))
        throw new Error(`Path /${normalized} is under /home/workspace. Use vfs_read/vfs_search for workspace files.`)
    
    if (!is_skill_path(normalized))
        return { skill_id: fallback_skill_id, file_path: normalized }
    
    const rest = normalized.slice('home/skills'.length).replace(/^\/+/, '')
    const [skill_id, ...file_parts] = rest.split('/').filter(Boolean)
    const file_path = file_parts.join('/')
    if (!skill_id || !file_path)
        throw new Error('Skill virtual path must be /home/skills/<skill_id>/<file_path>. Run skill_read to list files.')
    if (fallback_skill_id && fallback_skill_id !== skill_id)
        throw new Error(`Skill path /${normalized} belongs to ${skill_id}, but skill_id is ${fallback_skill_id}. Use the matching skill_id or a relative path.`)
    return { skill_id, file_path }
}


export function parse_skill_scope_path (path: string) {
    const normalized = trim_slashes(path)
    if (!is_skill_path(normalized))
        throw new Error('Skill path must be /home/skills/<skill_id> or /home/skills/<skill_id>/<file_path>.')
    const rest = normalized.slice('home/skills'.length).replace(/^\/+/, '')
    const [skill_id, ...file_parts] = rest.split('/').filter(Boolean)
    return { skill_id: skill_id || '', file_path: file_parts.join('/') }
}


export function normalize_skill_file_args (skill_id: string, file_paths: string[]) {
    const normalized = file_paths.map(file_path => parse_skill_file_path(file_path, skill_id))
    const inferred_skill_id = skill_id || normalized.find(item => item.skill_id)?.skill_id || ''
    if (!inferred_skill_id)
        return { skill_id: '', file_paths: normalized.map(item => item.file_path) }
    if (normalized.some(item => item.skill_id && item.skill_id !== inferred_skill_id))
        throw new Error('All Skill file paths in one call must belong to the same skill_id.')
    return { skill_id: inferred_skill_id, file_paths: normalized.map(item => item.file_path) }
}


export function normalize_workspace_result_paths<T> (value: T): T {
    if (Array.isArray(value))
        return value.map(normalize_workspace_result_paths) as T
    if (!is_record(value))
        return value
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [
        key,
        (key === 'name' || key === 'path') && typeof item === 'string' && item
            ? to_workspace_display_path(item)
            : normalize_workspace_result_paths(item),
    ])) as T
}


export function normalize_skill_result_paths<T> (value: T, skill_id: string): T {
    if (Array.isArray(value))
        return value.map(item => normalize_skill_result_paths(item, skill_id)) as T
    if (!is_record(value))
        return value
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [
        key,
        (key === 'filePath' || key === 'file_path' || key === 'path') && typeof item === 'string' && item
            ? to_skill_display_path(skill_id, item)
            : normalize_skill_result_paths(item, skill_id),
    ])) as T
}


export function virtual_copy_hint (script: string) {
    const trimmed = script.trim()
    if (/^(cp|copy)\s+/i.test(trimmed) && trimmed.includes(SKILLS_ROOT) && trimmed.includes(WORKSPACE_ROOT))
        return `This environment does not support shell cp/copy for virtual files. Use vfs_copy with source ${SKILLS_ROOT}/<skill_id>/<file_path> and target ${WORKSPACE_ROOT}/<file>.`
    return ''
}
