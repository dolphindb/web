import useSWR from 'swr'

import { access } from '@/access/model.js'
import type { AccessRole } from '@/access/types.js'


export function use_access (role: AccessRole, name: string, final: boolean = false) {
  return useSWR(
    ['accesses', role, name, final],
    async () => {
      if (role === 'user')
          return (await access.get_user_access([name], final))[0]
      
      return (await access.get_group_access([name]))[0] 
    }
  )
}
