import { t } from '@i18n/index.ts'
import { Input, Button } from 'antd'
import { useState } from 'react'

import { Resizable } from 're-resizable'

import { model } from '@/model.ts'
import { shell } from '../model.ts'

import { git_provider } from './git-adapter.ts'

export function Commit () {
    const { itab, tabs } = shell.use(['itab', 'tabs'])
    const current_tab = tabs.find(t => t.index === itab)
    const is_tab_git_tab = !!current_tab?.git?.file_name
    const is_file_edited = current_tab?.git?.raw_code !== current_tab?.code
    
    const [commit_message, set_commit_message] = useState('')
    
    async function commit_to_git () {
        const result = await git_provider.commit_file(current_tab?.git?.repo_id, current_tab?.git?.file_path, commit_message, current_tab?.code)
        if (result) {
            model.modal.success({ title: t('提交成功') })
            shell.update_git_tab_code(current_tab?.index, current_tab?.code)
        }
        else
            model.modal.error({ title: t('提交失败') })
    }
    
    const is_can_commit = is_tab_git_tab && is_file_edited && commit_message
    
    return <div className='commit'>
        {is_tab_git_tab && <><div className='block-title'>{t('文件提交')}</div>
        <div className='commit-info'>
            {t('提交文件 {{file}} 到 {{repo}} 的分支 {{branch}}', { file: current_tab?.git?.file_name, repo: current_tab?.git?.repo_name, branch: current_tab?.git?.branch })}
        </div>
            <div className='commit-content'>
                <Input disabled={!is_file_edited} 
                value={commit_message} 
                onChange={e => { set_commit_message(e.target.value) }} 
                placeholder={
                    is_file_edited ? t('{{file}} 的提交信息', { file: current_tab?.git?.file_name }) : t('文件未修改')} />
                <Button className='commit-button' onClick={commit_to_git} disabled={!is_can_commit}>{t('提交')}</Button>
            </div></>}
    </div>
}
