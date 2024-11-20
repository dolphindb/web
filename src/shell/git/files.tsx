import { t } from '@i18n/index.ts'
import { Input, Tree } from 'antd'
import { useState, useDeferredValue, useCallback, useMemo, useEffect } from 'react'

import { shell } from '../model.ts'

import { git_provider as git_provider } from './git-adapter.ts'


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

export function Files ({ repo_id, on_back }: { repo_id: string, on_back: () => void }) {
    const [branch, set_branch] = useState('')
    const [title, set_title] = useState('')
    const [tree_data, set_tree_data] = useState<DataNode[]>([ ])
    const [expanded_keys, set_expanded_keys] = useState<string[]>([ ])
    const deferred_expanded_keys = useDeferredValue(expanded_keys)
    const [search_value, set_search_value] = useState('')
    
    function handle_repo_change (id: string, title: string) {
        set_tree_data([{ title, key: id, isLeaf: false }])
        set_expanded_keys([ ])
    }
    
    useEffect(() => {
        git_provider.get_project(repo_id).then(repo_info => {
            const title = repo_info.name
            handle_repo_change(repo_id, title)
            set_branch(repo_info.default_branch)
            set_title(title)
        })
    }, [repo_id])
    
    function handle_expand (expandedKeys: unknown[]) {
        set_expanded_keys(expandedKeys as string[])
    }
    
    const load_repo_data = useCallback(async (node: DataNode) => {
        if (!repo_id)
            return
            
        const filePath = node.key === repo_id ? '' : node.key.substring(repo_id.length + 1)
        const files = await git_provider.get_files_by_repo(repo_id, filePath)
        
        const children: DataNode[] = files.map(file => ({
            title: file.name,
            key: `${file.path}`, // Use the full path for the key
            isLeaf: file.type === 'blob',
        }))
        
        set_tree_data(origin => updateTreeData(origin, node.key, children))
    }, [repo_id])
    
    async function open_git_file (key: string, file_name: string, repo_id: string) {
        const code = await git_provider.get_file_by_path(repo_id, key)
        shell.add_git_tab(key, code.file_name, repo_id, title, code.content, branch)
    }
    
    function title_render (node: DataNode) {
        if (node.isLeaf)
            return <span onClick={() => { open_git_file(node.key, node.title, repo_id) }}>{node.title}</span>
            
        return <span>{node.title}</span>
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
    
    return <div className='file-explore'>
        <div className='block-title'>{t('文件浏览')}</div>
        
        {is_repo_not_selected && <div className='file-explore-tips'>
            {t('未选择代码仓库，请选个一个代码仓库以查看文件')}
        </div>}
        {!is_repo_not_selected && <>
            <div className='file-explore-search'>
                <Input.Search placeholder={t('搜索仓库文件')} onChange={handle_search_change} allowClear style={{ marginBottom: 8 }} />
            </div>
            
            <div className='file-explore-content'><Tree
                className='file-tree'
                expandAction='click'
                loadData={load_repo_data}
                treeData={filtered_tree_data}
                expandedKeys={deferred_expanded_keys}
                onExpand={handle_expand}
                titleRender={title_render}
            /></div>
        </>}
    </div>
}
