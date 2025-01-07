import useSWR from 'swr'

import { access } from '../model.ts'

export function useUsers () {
    return useSWR('users', async () => access.get_user_list())
}
    
