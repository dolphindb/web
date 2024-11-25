import useSWR from 'swr'

import { git_provider, type IFileBlame } from './git-adapter.ts'

export function FileHistory ({ file_path, repo, branch }: { file_path: string, repo: string, branch: string }) {
    function show_file_history () {
    
    }
    
    const file_history_resp = useSWR(['get_file_blame', repo, file_path, branch], async () => {
        const result = await git_provider.get_file_blame(repo, file_path, branch)
        console.log(result)
        return result
    })
    
    const commits = (file_history_resp.data ?? [ ]).map((item: IFileBlame) => item.commit)
    
    const commit_view = commits.map(commit => {
        
    })
    
    return <div>
        123
    </div>
}
