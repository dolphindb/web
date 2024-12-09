import { t } from '@i18n/index.ts'
import { Input, Button } from 'antd'
import { useState } from 'react'

import dayjs from 'dayjs'

import useSWR from 'swr'

import { isArray } from 'lodash'

import { model } from '@/model.ts'
import { shell } from '../model.ts'

import { git_provider } from './git-adapter.ts'
import { FileHistory } from './file-history.tsx'

export function Commit ({ current_select_repo, current_select_branch, repo_name }: { current_select_repo: string, current_select_branch: string, repo_name: string }) {
    const { itab, tabs } = shell.use(['itab', 'tabs'])
    const current_tab = tabs.find(t => t.index === itab)
    const is_tab_git_tab = !!current_tab?.git?.file_name
    const is_file_edited = current_tab?.git?.raw_code !== current_tab?.code
    
    const [commit_message, set_commit_message] = useState('')
    const [show_history, set_show_history] = useState(false)
    let select_repo = current_select_repo
    if (is_tab_git_tab)
        select_repo = current_tab?.git?.repo_id
        
    const commit_non_git_file = (!is_tab_git_tab && current_select_repo)
    const is_can_commit = Boolean((is_tab_git_tab && is_file_edited && commit_message) || (commit_non_git_file && commit_message))
    const [commit_file_name, set_commit_file_name] = useState('')
    const repo_id = is_tab_git_tab ? current_tab?.git?.repo_id : current_select_repo
    const branch = is_tab_git_tab ? current_tab?.git?.branch : current_select_branch
    const path = is_tab_git_tab ? current_tab?.git?.file_path : commit_file_name
    const file_name = is_tab_git_tab ? current_tab?.git?.file_name : commit_file_name
    const commit_repo_name = is_tab_git_tab ? current_tab?.git?.repo_name : repo_name
    const content = is_tab_git_tab ? current_tab?.code : undefined
    const read_only = is_tab_git_tab && current_tab?.read_only
    
    async function open_git_file (file_path: string, repo_path: string) {
        const code = await git_provider.get_file_by_path(repo_path, file_path, branch)
        shell.add_git_tab(file_path, code.file_name, code.content, {
            repo_id,
            repo_name,
            branch,
            sha: code.content_sha256,
            commit_id: code.commit_id
        })
    }
    
    let commit_message_placeholder = is_file_edited || commit_non_git_file ? t('{{file}} 的提交信息', { file: file_name }) : t('文件未修改')
    
    if (!commit_file_name && !is_tab_git_tab)
        commit_message_placeholder = t('请输入文件提交路径')
        
    const file_history_resp = useSWR(['get_file_commit_history', repo_id, path, branch], async () => {
        const result = await git_provider.get_commit_history(repo_id, path, branch)
        return result
    }, { refreshInterval: 1000 * 60 * 3 })
    
    const file_commit_history = (isArray(file_history_resp.data) ? file_history_resp.data : [ ])
        .sort((a, b) => dayjs(b.committed_date).diff(dayjs(a.committed_date)))
        
    const current_file_commit_id = is_tab_git_tab ? current_tab?.git?.commit_id : undefined
    const current_file_in_repo_last_commit_id = file_commit_history[0]?.id
    
    let is_have_update = false
    
    if (current_file_commit_id && current_file_in_repo_last_commit_id && current_file_commit_id !== current_file_in_repo_last_commit_id) {
        const current_commit = file_commit_history.find(c => c.id === current_file_commit_id)
        const repo_last_commit = file_commit_history.find(c => c.id === current_file_in_repo_last_commit_id)
        if (current_commit && repo_last_commit)
            is_have_update = dayjs(current_commit.committed_date).isBefore(dayjs(repo_last_commit.committed_date))
    }
    
    
    async function commit_to_git () {
        const content_to_commit = content ?? shell.editor.getValue()
        const result = await git_provider.commit_file(
            repo_id,
            path,
            commit_message,
            content_to_commit,
            branch,
            current_tab?.git?.sha,
            !is_tab_git_tab
        )
        if (result) {
            model.modal.success({ title: t('提交成功') })
            if (is_tab_git_tab)
            {
                const updated_file = await git_provider.get_file_by_path(repo_id, path, branch)
                shell.update_git_tab_code(current_tab?.index, updated_file.content, updated_file.commit_id)
            }
                
            else
                open_git_file(commit_file_name, repo_id)
                
        }
        else
            model.modal.error({ title: t('提交失败') })
    }
    
    async function get_file_update () {
        const result = await git_provider.get_file_by_path(repo_id, path, branch)
        shell.update_git_tab_code(current_tab?.index, result.content, result.commit_id)
    }
    
    return <div className='commit'>
        <>
            <div className='block-title'>
                {show_history ? t('提交历史') : t('提交')}
                <div className='button-logout'>
                    <Button type='text' onClick={() => { set_show_history(!show_history) }} >
                        {show_history ? t('关闭提交历史') : t('查看提交历史')}
                    </Button>
                </div>
            </div>
            {select_repo && <>
                {show_history && is_tab_git_tab && <FileHistory
                    repo={repo_id}
                    file_path={path}
                    branch={branch}
                />}
                {
                    show_history && !is_tab_git_tab && <div className='tips'>
                        {t('本地文件，无提交历史')}
                    </div>
                }
                {!show_history && <>
                    {commit_non_git_file && <div className='commit-info'>
                        <Input
                            placeholder={t('文件提交路径')}
                            value={commit_file_name}
                            onChange={e => { set_commit_file_name(e.target.value) }}
                        />
                    </div>
                    }
                    {is_have_update && <div className='commit-content'>
                        {t('远程文件有更新，是否获取并覆盖当前编辑的内容')}
                        <Button type='primary' className='commit-button' onClick={get_file_update} >{t('更新文件')}</Button>
                    </div>}
                    <div className='commit-info'>
                        {t(is_tab_git_tab ? '提交文件 {{file}} 到 {{repo}} 的分支 {{branch}}' :
                            '提交当前正在编辑的文件 {{file}} 到 {{repo}} 的分支 {{branch}}',
                            {
                                file: file_name,
                                repo: commit_repo_name,
                                branch: branch
                            })
                        }
                    </div>
                    <div className='commit-content'>
                        <Input disabled={(!is_file_edited && !commit_non_git_file) || !file_name}
                            value={commit_message}
                            onChange={e => { set_commit_message(e.target.value) }}
                            placeholder={
                                commit_message_placeholder
                            }
                        />
                        <Button className='commit-button' onClick={commit_to_git} disabled={!is_can_commit || read_only}>{t('提交')}</Button>
                    </div>
                </>}
            </>}
            {!select_repo && <div className='tips'>
                {t('未选择代码仓库，请选择一个代码仓库')}
            </div>}
        </>
    </div>
}
