import { access_options } from "../constants.js";

export function filterAccessOptions(category: 'database' | 'shared' | 'stream' | 'function_view' | 'script', role: 'user' | 'group', isAdmin: boolean) {
    return (category === 'script' && role === 'user' && isAdmin
        ? access_options[category].filter((item) => item !== 'VIEW_OWNER')
        : access_options[category]
    )
} 