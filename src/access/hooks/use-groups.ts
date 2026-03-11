import useSWR from 'swr'

import { access } from '@/access/model.ts'

export function use_groups () {
    return useSWR('groups', async () => access.get_group_list())
}
