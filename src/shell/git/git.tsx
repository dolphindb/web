import { useState, useCallback, useDeferredValue, useMemo } from 'react'
import { Tree, Input, Select, Alert, Button } from 'antd'
import useSWR from 'swr'
import './git.sass'

import { t } from '@i18n/index.ts'

import { shell } from '../model.ts'

import { model } from '@/model.ts'

import { gitProvider } from './git-adapter.ts'
import { Repos } from './repos.tsx'

interface DataNode {
    title: string
    key: string
    isLeaf?: boolean
    children?: DataNode[]
}

const updateTreeData = (list: DataNode[], key: React.Key, children: DataNode[]): DataNode[] =>
    list.map(node => {
        if (node.key === key)
            return {
                ...node,
                children,
            }
            
        if (node.children)
            return {
                ...node,
                children: updateTreeData(node.children, key, children),
            }
            
        return node
    })

export function Git () {
    const [selectedRepo, setSelectedRepo] = useState<string | undefined>(undefined)
    const [treeData, setTreeData] = useState<DataNode[]>([ ])
    const [expandedKeys, setExpandedKeys] = useState<string[]>([ ])
    const deferredExpandedKeys = useDeferredValue(expandedKeys)
    const [searchValue, setSearchValue] = useState('')
    const { itab, tabs } = shell.use(['itab', 'tabs'])
    const current_tab = tabs.find(t => t.index === itab)
    const is_tab_git_tab = !!current_tab?.git?.file_name
    const is_file_edited = current_tab?.git?.raw_code !== current_tab?.code
    
    function handleRepoChange (id: string, title: string) {
        setSelectedRepo(id)
        setTreeData([{ title, key: id, isLeaf: false }])
        setExpandedKeys([ ])
    }
    
    function handleExpand (expandedKeys: unknown[]) {
        setExpandedKeys(expandedKeys as string[])
    }
    
    const loadData = useCallback(async (node: DataNode) => {
        if (!selectedRepo)
            return
            
        const filePath = node.key === selectedRepo ? '' : node.key.substring(selectedRepo.length + 1)
        const files = await gitProvider.get_files_by_repo(selectedRepo, filePath)
        
        const children: DataNode[] = files.map(file => ({
            title: file.name,
            key: `${file.path}`, // Use the full path for the key
            isLeaf: file.type === 'blob',
        }))
        
        setTreeData(origin => updateTreeData(origin, node.key, children))
    }, [selectedRepo])
    
    async function open_git_file (key: string, file_name: string, repo_id: string) {
        const code = await gitProvider.get_file_by_path(repo_id, key)
        shell.add_git_tab(key, code.file_name, repo_id, code.content)
    }
    
    function title_render (node: DataNode) {
        if (node.isLeaf)
            return <span onClick={() => { open_git_file(node.key, node.title, selectedRepo) }}>{node.title}</span>
            
        return <span>{node.title}</span>
    }
    
    const filteredTreeData = useMemo(() => {
        const lowercaseValue = searchValue.toLowerCase()
        
        function recursiveFilter (nodes: DataNode[]): DataNode[] {
            return nodes.map(node => {
                if (node.title.toLowerCase().includes(lowercaseValue))
                    return node
                else if (node.children) {
                    const filteredChildren = recursiveFilter(node.children)
                    if (filteredChildren.length > 0)
                        return { ...node, children: filteredChildren }
                        
                }
                return null
            }).filter(Boolean) as DataNode[]
        }
        
        return searchValue ? recursiveFilter(treeData) : treeData
    }, [treeData, searchValue])
    
    function handleSearchChange (e: React.ChangeEvent<HTMLInputElement>) {
        setSearchValue(e.target.value)
    }
    
    function goto_oauth () {
        gitProvider.get_auth_url().then(url => {
            window.location.href = url
        })
    }
    
    const [commit_message, setCommitMessage] = useState('')
    
    async function commit_to_git () {
        const result = await gitProvider.commit_file(current_tab?.git?.repo_id, current_tab?.git?.file_path, commit_message, current_tab?.code)
        if (result) {
            model.modal.success({ title: t('提交成功') })
            shell.update_git_tab_code(current_tab?.index, current_tab?.code)
        }
        else
            model.modal.error({ title: t('提交失败') })
    }
    
    return <div className='git'>
        <Repos on_select_repo={handleRepoChange} />
        {is_tab_git_tab && <div>
            <div>当前文件: {current_tab?.git?.file_name}</div>
            {is_file_edited && <div>
                <div>当前文件已修改</div>
                <Input.TextArea value={commit_message} onChange={e => { setCommitMessage(e.target.value) }} placeholder={t('请输入提交信息')} />
                <Button onClick={commit_to_git}>{t('提交')}</Button>
                </div>}
        </div>}
        {selectedRepo && (
            <>
                <Input.Search placeholder={t('搜索仓库文件')} onChange={handleSearchChange} allowClear style={{ marginBottom: 8 }} />
                <Tree
                    expandAction='click'
                    loadData={loadData}
                    treeData={filteredTreeData}
                    expandedKeys={deferredExpandedKeys}
                    onExpand={handleExpand}
                    titleRender={title_render}
                />
            </>
        )}
        
    </div>
}
