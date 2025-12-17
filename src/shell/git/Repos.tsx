import { t } from '@i18n'

import { Alert, Button, Spin } from 'antd'

import NiceModal from '@ebay/nice-modal-react'

import { useEffect, useState, useRef, useCallback } from 'react'
 
import { storage_keys } from '@model'

import { shell } from '@/shell/model.ts'
 
 
import { git_provider } from './git-provider.ts'
import { GitHubAccessTokenModal, GitHubOauthModal, GitLabAccessTokenModal, GitLabOauthModal } from './GitModals.tsx'
import { format_friendly_date } from './get-auth-url.ts'
import type { IProject } from './git-adapter.ts'

export function Repos ({ on_select_repo }: { on_select_repo: (repo_id: string, title: string) => void }) {
    const [repos, set_repos] = useState<IProject[]>([ ])
    const [error, set_error] = useState<boolean>(false)
    const [loading, set_loading] = useState<boolean>(false)
    const [has_next_page, set_has_next_page] = useState<boolean>(true)
    const [current_page, set_current_page] = useState<number>(1)
    const repos_wrapper_ref = useRef<HTMLDivElement>(null)
    
    const per_page = 50 // 每页加载50个项目
    
    async function fetch_repos (page: number = 1, append: boolean = false) {
        if (loading)
            return
        
        try {
            set_loading(true)
            const result = await git_provider.get_projects(page, per_page)
            
            if (append) 
                set_repos(prev => [...prev, ...result.projects])
             else 
                set_repos(result.projects)
            
            
            set_has_next_page(result.has_next_page)
            set_current_page(page)
            set_error(false)
        } catch (error) {
            set_error(true)
            throw error
        } finally {
            set_loading(false)
        }
    }
    
    const handle_scroll = useCallback(() => {
        const wrapper = repos_wrapper_ref.current
        if (!wrapper || loading || !has_next_page)
            return
        
        const { scrollTop, scrollHeight, clientHeight } = wrapper
        // 当滚动到距离底部100px时加载下一页
        if (scrollTop + clientHeight >= scrollHeight - 100) 
            fetch_repos(current_page + 1, true)
        
    }, [loading, has_next_page, current_page])
    
    useEffect(() => {
        fetch_repos(1, false)
    }, [ ])
    
    useEffect(() => {
        const wrapper = repos_wrapper_ref.current
        if (wrapper) {
            wrapper.addEventListener('scroll', handle_scroll)
            return () => { wrapper.removeEventListener('scroll', handle_scroll) }
        }
    }, [handle_scroll])
        
    const repos_view = repos.map(repo => <div className='repo' key={repo.id} onClick={() => { on_select_repo(repo.id, repo.name) }}>
        <div className='title'>
            {repo.path_with_namespace}
        </div>
        <div className='content'>
            {repo.description}
        </div>
        <div className='time'>
            {format_friendly_date(repo.last_activity_at)}
        </div>
    </div>)
    
    const is_repos_empty = repos.length <= 0 && !loading
    
    function goto_auth (type: 'gitlab' | 'github' | 'gitlab-access-token' | 'github-access-token') {
        if (type === 'gitlab')
            NiceModal.show(GitLabOauthModal)
        if (type === 'gitlab-access-token')
            NiceModal.show(GitLabAccessTokenModal)
        if (type === 'github-access-token')
            NiceModal.show(GitHubAccessTokenModal)
        if (type === 'github')
            NiceModal.show(GitHubOauthModal)
    }
    
    async function logout () {
        localStorage.removeItem(storage_keys.git_access_token)
        shell.remove_git_tabs()
        on_select_repo('', '')
        set_repos([ ])
        set_error(true)
        set_has_next_page(true)
        set_current_page(1)
    }
    
    return <div className='repos'>
        <div className='block-title'>
            <div>{t('代码仓库')}</div>
            {!error && <div className='button-logout'><Button className='segment-button' type='text' onClick={logout}>{t('登出')}</Button></div>}
        </div>
        {error && <div className='info'>
            <Alert title={<>
                {t('无法获取仓库列表，请检查权限或：')}
                <div>
                    <a onClick={() => { goto_auth('github-access-token') }}>
                        {t('使用 Access Token 登录到 GitHub')}
                    </a><br />
                    <a onClick={() => { goto_auth('gitlab-access-token') }}>
                        {t('使用 Access Token 登录到 GitLab')}
                    </a><br />
                    <a onClick={() => { goto_auth('github') }}>
                        {t('使用 Oauth 登录到 GitHub')}
                    </a><br />
                    <a onClick={() => { goto_auth('gitlab') }}>
                        {t('使用 Oauth 登录到 GitLab')}
                    </a>
                </div>
                
            </>} type='info' />
        </div>}
        {!is_repos_empty && <div className='repos-wrapper' ref={repos_wrapper_ref} style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {repos_view}
            {loading && <div style={{ textAlign: 'center', padding: '20px' }}>
                <Spin size='small' />
                <span style={{ marginLeft: '8px' }}>{t('加载中...')}</span>
            </div>}
            {!has_next_page && repos.length > 0 && <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                {t('已加载全部仓库')}
            </div>}
        </div>}
        {is_repos_empty && !error && loading && <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin size='large' />
            <div style={{ marginTop: '16px' }}>{t('正在加载仓库列表...')}</div>
        </div>}
    </div>
}

