import { t } from '@i18n/index.ts'
import { Button, Input, Select, Tree } from 'antd'
import { useState, useDeferredValue, useCallback, useMemo, useEffect } from 'react'

import { shell } from '@/shell/model.ts'

import { git_provider } from './git-provider.ts'


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

export function Files ({ repo_id, on_change_branch }: { repo_id: string, on_change_branch: (branch: string) => void }) {
    const [branch, set_branch] = useState('')
    const [title, set_title] = useState('')
    const [tree_data, set_tree_data] = useState<DataNode[]>([ ])
    const [expanded_keys, set_expanded_keys] = useState<string[]>([ ])
    const deferred_expanded_keys = useDeferredValue(expanded_keys)
    const [search_value, set_search_value] = useState('')
    const [repo_path, set_repo_path] = useState('')
    const [branches, set_branches] = useState<string[]>([ ])
    const [loaded_keys, set_loaded_keys] = useState<string[]>([ ])
    
    function handle_repo_change (id: string, title: string) {
        set_tree_data([{ title, key: id, isLeaf: false }])
        set_expanded_keys([ ])
        set_loaded_keys([ ])
    }
    
    useEffect(() => {
        if (repo_id)
            git_provider.get_project(repo_id).then(repo_info => {
                const title = repo_info.name
                handle_repo_change(repo_id, title)
                set_branch(repo_info.default_branch)
                set_title(title)
                set_repo_path(repo_info.path_with_namespace)
                git_provider.get_branches(repo_info.path_with_namespace).then(branches => {
                    set_branches(branches)
                })
            })
    }, [repo_id])
    
    function reset_file_tree () {
        set_tree_data([{ title, key: repo_id, isLeaf: false }])
    }
    
    useEffect(() => {
        if (!repo_id)
            return
        set_loaded_keys([ ])
        reset_file_tree()
        on_change_branch(branch)
    }, [branch])
    
    function handle_expand (expandedKeys: unknown[]) {
        set_expanded_keys(expandedKeys as string[])
    }
    
    const load_repo_data = useCallback(async (node: DataNode) => {
        if (!repo_id)
            return
            
        const filePath = node.key === repo_id ? '' : node.key
        const files = await git_provider.get_files_by_repo(repo_path, filePath, branch)
        
        const children: DataNode[] = files.map(file => ({
            title: file.name,
            key: `${file.path}`, // Use the full path for the key
            isLeaf: file.type === 'file' || file.type === 'blob',
        }))
        
        set_tree_data(origin => updateTreeData(origin, node.key, children))
        set_loaded_keys(origin => [...origin, node.key])
    }, [repo_id, repo_path, branch])
    
    async function open_git_file (key: string, repo_path: string) {
        const code = await git_provider.get_file_by_path(repo_path, key, branch)
        shell.add_git_tab(key, code.file_name, code.content, {
            repo_id,
            repo_path,
            repo_name: title,
            branch,
            sha: code.content_sha256,
            commit_id: code.commit_id
        })
    }
    
    function title_render (node: DataNode) {
        if (node.isLeaf)
            return <div className='title-render' onClick={() => { open_git_file(node.key, repo_path) }}>{node.title}</div>
            
        return <div className='title-render'>{node.title}</div>
    }
    
    const filtered_tree_data = useMemo(() => {
        const lowercase_value = search_value.toLowerCase()
        
        function recursive_filter (nodes: DataNode[]): DataNode[] {
            return nodes.map(node => {
                if (node.title.toLowerCase().includes(lowercase_value))
                    return node
                else if (node.children) {
                    const filtered_children = recursive_filter(node.children)
                    if (filtered_children.length > 0)
                        return { ...node, children: filtered_children }
                        
                }
                return null
            }).filter(Boolean) as DataNode[]
        }
        
        return search_value ? recursive_filter(tree_data) : tree_data
    }, [tree_data, search_value])
    
    function handle_search_change (e: React.ChangeEvent<HTMLInputElement>) {
        set_search_value(e.target.value)
    }
    
    const is_repo_not_selected = !repo_id
    
    function refresh () {
        set_loaded_keys([ ])
        reset_file_tree()
    }
    
    return <div className='file-explore'>
        <div className='block-title'>{t('文件浏览')}
            <div className='button-logout'>
                <Button className='segment-button' type='text' onClick={refresh}>
                    {t('刷新')}
                </Button>
            </div>
        </div>
        
        {is_repo_not_selected && <div className='file-explore-tips'>
            {t('未选择代码仓库，请选择一个代码仓库以查看文件')}
        </div>}
        {!is_repo_not_selected && <>
            <div className='file-explore-search'>
                <Input.Search placeholder={t('搜索仓库文件')} onChange={handle_search_change} allowClear />
            </div>
            <div className='file-explore-branch'>
                <Select value={branch} options={branches.map(b => ({ label: t('分支：{{b}}', { b }), value: b }))} onChange={set_branch} style={{ width: '100%' }} />
            </div>
            <div className='file-explore-content'>
                <Tree
                    className='file-tree'
                    expandAction='click'
                    loadedKeys={loaded_keys}
                    loadData={load_repo_data}
                    treeData={filtered_tree_data}
                    expandedKeys={deferred_expanded_keys}
                    onExpand={handle_expand}
                    titleRender={title_render}
                />
            </div>
        </>}
    </div>
}
