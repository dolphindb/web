import useSWR from 'swr'

import dayjs from 'dayjs'

import { isArray } from 'lodash'

import { useEffect, useState } from 'react'

import { shell } from '../model.ts'

import { git_provider, type ICommitHistoryItem } from './git-adapter.ts'
import { format_friendly_date } from './get-auth-url.ts'

export function FileHistory ({ file_path, repo, branch }: { file_path: string, repo: string, branch: string }) {
    const [repo_path, set_repo_path] = useState('')
    const repo_id = repo
    useEffect(() => {
        if (repo_id)
            git_provider.get_project(repo_id).then(repo_info => {
                set_repo_path(repo_info.path_with_namespace)
            })
    }, [repo_id])
    
    async function show_file_history (commit_id: string) {
        const code = await git_provider.get_file_by_path(repo_path, file_path, commit_id)
        shell.add_git_tab(file_path, code.file_name + ` (${String(code.commit_id).slice(0, 7)})`, code.content, {
            repo_id: repo,
            repo_path,
            repo_name: repo,
            branch,
            sha: code.content_sha256,
            is_history: true,
            commit_id
        })
    }
    
    const file_history_resp = useSWR(['get_file_commit_history', repo_path, file_path, branch], async () => {
        if (!repo_path)
            return [ ]
        const result = await git_provider.get_commit_history(repo_path, file_path, branch)
        return result
    }, { refreshInterval: 1000 * 60 * 3 })
    
    const commits = (isArray(file_history_resp.data) ? file_history_resp.data : [ ])
        .sort((a, b) => dayjs(b.committed_date).diff(dayjs(a.committed_date)))
        
    const commit_view = commits.map(commit => <div className='file-history-item' key={commit.id} onClick={() => { show_file_history(commit.id) }}>
        <div className='message'>{commit.message}</div>{' '}
        <div className='user-date'>{commit.committer_name}, {format_friendly_date(commit.committed_date)}</div>
    </div>)
    
    return <div className='file-history'>
        {commit_view}
    </div>
}
