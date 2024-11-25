import useSWR from 'swr'

import dayjs from 'dayjs'

import { git_provider, type IFileBlame } from './git-adapter.ts'
import { format_friendly_date } from './get-auth-url.ts'

export function FileHistory ({ file_path, repo, branch }: { file_path: string, repo: string, branch: string }) {
    function show_file_history () {
    
    }
    
    const file_history_resp = useSWR(['get_file_blame', repo, file_path, branch], async () => {
        const result = await git_provider.get_file_blame(repo, file_path, branch)
        return result
    })
    
    const commits = (file_history_resp.data ?? [ ])
        .map((item: IFileBlame) => item.commit)
        .sort((a, b) => dayjs(b.committed_date).diff(dayjs(a.committed_date)))
        
    const commit_view = commits.map(commit => <div className='file-history-item' key={commit.id}>
        <div className='message'>{commit.message}</div>{' '}
        <div className='user-date'>{commit.committer_name}, {format_friendly_date(commit.committed_date)}</div>
    </div>)
    
    return <div className='file-history'>
        {commit_view}
    </div>
}
