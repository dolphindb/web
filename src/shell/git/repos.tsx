import useSWR from 'swr'

import { t } from '@i18n/index.ts'

import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import localizedFormat from 'dayjs/plugin/localizedFormat'

import { Alert } from 'antd'

import { git_provider } from './git-adapter.ts'


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
    
    const repos = (reposResp.data ?? [ ]).map(repo => {
        return <div className='repo' onClick={() => { on_select_repo(repo.id, repo.name) }}>
            <div className='title'>
                {repo.path_with_namespace}
            </div>
            <div className='content'>
                {repo.description}
            </div>
            <div className='time'>
                {formatFriendlyDate(repo.last_activity_at)}
            </div>
        </div>
    })
    
    const is_repos_empty = repos.length <= 0
    
    function goto_oauth () {
        git_provider.get_auth_url().then(url => {
            window.location.href = url
        })
    }
    
    return <div className='repos'>
        <div className='block-title'>{t('代码仓库')}</div>
        {is_repos_empty && (!reposResp.isLoading) && <div className='info'>
            <Alert message={<>
                无法获取仓库列表，请检查权限或{' '}
                <a onClick={goto_oauth}>
                    登录到 Git
                </a>
            </>} type='info' />
        </div>}
        {!is_repos_empty && <div className='repos-wrapper'>
            {repos}
        </div>}
    </div>
}
