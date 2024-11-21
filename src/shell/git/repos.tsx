import useSWR from 'swr'

import { t } from '@i18n/index.ts'

import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import localizedFormat from 'dayjs/plugin/localizedFormat'

import { Alert, Button } from 'antd'

import NiceModal from '@ebay/nice-modal-react'

import { git_provider } from './git-adapter.ts'
import { GitHubAccessTokenModal, GitLabAccessTokenModal, GitLabOauthModal } from './git-modals.tsx'


dayjs.extend(relativeTime)
dayjs.extend(localizedFormat)

export function Repos ({ on_select_repo }: { on_select_repo: (repo_id: string, title: string) => void }) {

    const reposResp = useSWR('git_repos', async () => {
        const result = await git_provider.get_projects()
        return result
    })
    
    function formatFriendlyDate (isoString: string): string {
        if (!isoString)
            throw new Error('Invalid date string.')
        const date = dayjs(isoString)
        
        // 检查是否是有效日期
        if (!date.isValid())
            throw new Error('Invalid date format.')
        if (date.isSame(dayjs(), 'day'))
            return t('今天 {{time}}', { time: date.format('HH:mm') })
            
            
        if (date.isSame(dayjs().subtract(1, 'day'), 'day'))
            // 昨天 
            return t('昨天 {{time}}', { time: date.format('HH:mm') })
            
            
        if (date.isAfter(dayjs().subtract(7, 'day'))) {
            // 最近7天内
            const relative = date.fromNow()
            return t('{{relativeTime}}', { relativeTime: relative })
        }
        
        // 更久以前
        return t('{{date}} {{time}}', {
            date: date.format('YYYY/MM/DD'),
            time: date.format('HH:mm'),
        })
    }
    
    const repos = (reposResp.data ?? [ ]).map(repo => <div className='repo' onClick={() => { on_select_repo(repo.id, repo.name) }}>
        <div className='title'>
            {repo.path_with_namespace}
        </div>
        <div className='content'>
            {repo.description}
        </div>
        <div className='time'>
            {formatFriendlyDate(repo.last_activity_at)}
        </div>
    </div>)
    
    const is_repos_empty = repos.length <= 0
    
    function goto_auth (type: 'gitlab' | 'github' | 'gitlab-access-token' | 'github-access-token') {
        if (type === 'gitlab')
            NiceModal.show(GitLabOauthModal)
        if (type === 'gitlab-access-token')
            NiceModal.show(GitLabAccessTokenModal)
        if (type === 'github-access-token')
            NiceModal.show(GitHubAccessTokenModal)
    }
    
    return <div className='repos'>
        <div className='block-title'>
            <div>{t('代码仓库')}</div>
            {!reposResp.error && <div className='button-logout'><Button type='text' onClick={() => {
                localStorage.removeItem('git-access-token')
                reposResp.mutate()
            }}>{t('登出')}</Button></div>}
        </div>
        {is_repos_empty && (!reposResp.isLoading) && <div className='info'>
            <Alert message={<>
                无法获取仓库列表，请检查权限或：
                <div>
                    <a onClick={() => { goto_auth('github-access-token') }}>
                        使用 Access Token 登录到 GitHub
                    </a><br />
                    <a onClick={() => { goto_auth('gitlab-access-token') }}>
                        使用 Access Token 登录到 GitLab
                    </a><br />
                    <a onClick={() => { goto_auth('github') }}>
                        使用 SSO 登录到 GitHub
                    </a><br />
                    <a onClick={() => { goto_auth('gitlab') }}>
                        使用 SSO 登录到 GitLab
                    </a>
                </div>
                
            </>} type='info' />
        </div>}
        {!is_repos_empty && <div className='repos-wrapper'>
            {repos}
        </div>}
    </div>
}
