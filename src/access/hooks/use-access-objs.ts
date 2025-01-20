
import useSWR from 'swr'

import { ACCESS_TYPE, NEED_INPUT_ACCESS } from '../constants.tsx'
import { model } from '@/model.ts'
import { access } from '../model.ts'
import type { AccessCategory, AccessRole } from '../types.ts'

export function use_access_objs (role: AccessRole, category: AccessCategory) {
    const { v3 } = model
    return useSWR(
        ['access_objs', category, role],
        async () => {
            switch (category) {
                case 'catalog':
                    return  v3 ? access.get_catelog_with_schemas() : access.get_catelog_with_schemas_v2()
                case 'database':
                    return v3 ? access.get_catelog_with_schemas() : access.get_databases_with_tables()
                case 'shared':
                    return access.get_share_tables()
                case 'function_view':
                    return access.get_function_views()
                case 'stream':
                    return access.get_stream_tables()
                case 'script':
                    return role === 'group' ? ACCESS_TYPE.script.filter(ac => !NEED_INPUT_ACCESS.includes(ac)) : ACCESS_TYPE.script
            }
        }
    )
}
