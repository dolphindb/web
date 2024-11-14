import { useState, useCallback, useDeferredValue, useMemo } from 'react'
import { Tree, Input, Select } from 'antd'
import useSWR from 'swr'

import { gitProvider } from './git-adapter.ts'

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
    
    const reposResp = useSWR('git_repos', async () => {
        const result = await gitProvider.get_projects()
        return result
    })
    
    function handleRepoChange (value: string) {
        setSelectedRepo(value)
        setTreeData([{ title: value, key: value, isLeaf: false }])
        setExpandedKeys([value])
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
    
    return <div>
        <div>
            <a onClick={goto_oauth}>
                授权
            </a>
        </div>
        {reposResp.data && (
            <Select
                placeholder='Select a repo'
                onChange={handleRepoChange}
                style={{ width: 200, marginBottom: 16 }}
                value={selectedRepo}
                allowClear
            >
                {reposResp.data.map(repo => <Select.Option key={repo.id} value={repo.id}>
                    {repo.name}
                </Select.Option>)}
            </Select>
        )}
        {selectedRepo && (
            <>
                <Input.Search placeholder='Search' onChange={handleSearchChange} allowClear style={{ marginBottom: 8 }} />
                <Tree
                    loadData={loadData}
                    treeData={filteredTreeData}
                    expandedKeys={deferredExpandedKeys}
                    onExpand={handleExpand}
                />
            </>
        )}
        
    </div>
}
