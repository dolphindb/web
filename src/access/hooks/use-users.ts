import useSWR from 'swr'

import { access } from '../model.ts'

export function use_users () {
    return useSWR('users', async () => access.get_user_list())
}
