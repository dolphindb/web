
import useSWR from 'swr'

import { model } from '@model'

import { unique } from 'xshell/utils.browser'

import { access } from '../model.ts'
import type { AccessCategory, AccessRole } from '../types.ts'
import { config } from '@/config/model.ts'
import { strs_2_nodes } from '@/config/utils.ts'
import { ACCESS_TYPE } from '@/access/constants.tsx'

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
                case 'compute_group':
                    return unique(
                        strs_2_nodes(
                            await config.get_cluster_nodes() 
                        ).map(node => node.computeGroup)
                        .filter(Boolean))
                case 'script':
                    return role === 'user' ? ACCESS_TYPE.script : ACCESS_TYPE.script.filter(ac => !ac.endsWith('_LIMIT'))
            }
        }
    )
}
