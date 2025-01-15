import { ACCESS_OPTIONS } from '../constants.tsx'
import type { AccessCategory } from '../types.ts'

export function filter_access_options (
    category: AccessCategory,
    role: 'user' | 'group',
    isAdmin: boolean,
    type?: string
) {
    let options = ACCESS_OPTIONS[category]
    
    if (category === 'script') 
        if (role === 'user' && isAdmin)
            // 对于当前用户是管理员，不能赋予 VIEW_OWNER 权限
            options = options.filter(item => item !== 'VIEW_OWNER')
        else if (role === 'group' || type === 'deny') 
            // QUERY_RESULT_MEM_LIMIT 和 TASK_GROUP_MEM_LIMIT 暂不支持组
            // deny 不支持 QUERY_RESULT_MEM_LIMIT 和 TASK_GROUP_MEM_LIMIT
            options = options.filter(item => item !== 'QUERY_RESULT_MEM_LIMIT' && item !== 'TASK_GROUP_MEM_LIMIT')
        
    return options
} 
