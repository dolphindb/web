import useSWR from 'swr'

import { gitProvider } from './git-adapter.ts'

export function Repos ({ on_select_repo }: { on_select_repo: (repo_id: string, title: string) => void }) {
    
    const reposResp = useSWR('git_repos', async () => {
        const result = await gitProvider.get_projects()
        return result
    })
    
    return <div>Repos</div>
}
