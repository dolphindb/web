import useSWR from 'swr'

import { access } from '@/access/model.js'
import type { AccessRole } from '@/access/types.js'


export function useAccess (role: AccessRole, name: string) {
  return useSWR(
    ['accesses', role, name],
    async () => {
      if (role === 'user')
          return (await access.get_user_access([name], true))[0]
      
      return (await access.get_group_access([name]))[0] 
    }
  )
}
