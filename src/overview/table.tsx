import { Button, Checkbox, Col, Divider, Dropdown, Input, Modal, Row, Space, Table, Tooltip, type CollapseProps, type InputRef, type MenuProps, type TableColumnsType, Collapse } from 'antd'

import { CheckCircleOutlined, MinusCircleOutlined, PauseCircleOutlined, SearchOutlined, SettingOutlined } from '@ant-design/icons'

import { useEffect, useMemo, useRef, useState } from 'react'

import { use_modal } from 'react-object-model/hooks.js'

import type { ColumnType } from 'antd/es/table/interface.js'

import { NodeType, model, storage_keys, type DdbNode } from '@model'

import { t } from '@i18n'

import { ns2ms, upper } from '@utils'

import { DDBTable } from '@/components/DDBTable/index.tsx'

const node_state_icons = [
    <MinusCircleOutlined style={{ color: 'red' }} />,
    <CheckCircleOutlined style={{ color: 'green' }} />,
    <PauseCircleOutlined style={{ color: 'orange' }} />
]

const node_mode_lables = [t('数据节点'), t('代理节点'), t('控制节点'), t('单机节点'), t('计算节点')]


export function OverviewTable ({
    selectedNodeNames,
    setSelectedNodeNames
}: {
    selectedNodeNames: string[]
    setSelectedNodeNames: (names: string[]) => void
}) {
    const { nodes, node_type } = model.use(['nodes', 'node_type'])
    
    const [search_values_by_group, set_search_values_by_group] = useState<Record<string, string>>({ })
    const [search_value, set_search_value] = useState('')
    
    let groups = useMemo(() =>
        Object.entries(
            Object.groupBy(
                nodes.filter(({ computeGroup }) => computeGroup),
                ({ computeGroup }) => computeGroup)
        ).map(([name, nodes]) => ({ name, nodes }))  
    , [nodes])
    
    groups = groups.map(group => ({ ...group, nodes: group.nodes.filter(node => node.name.includes(search_values_by_group[group.name] ?? '')) }))
    
    const ungrouped_nodes = { name: '', nodes: nodes.filter(node => !node.computeGroup && node.mode !== NodeType.data).filter(node => node.name.includes(search_values_by_group[''] ?? '')) }
    const data_nodes = { name: t('存储集群'), nodes: nodes.filter(node => node.mode === NodeType.data).filter(node => node.name.includes(search_values_by_group[t('存储集群')] ?? '')) }
    const data_nodes_count = nodes.filter(node => node.mode === NodeType.data).length
    const [search_text, set_search_text] = useState('')
    
    const search_input = useRef<InputRef>(null)
    
    const { visible, open, close } = use_modal()
    
    useEffect(() => {
        model.get_cluster_perf(false)
    }, [ ])
    
    function get_columns (group_name: string): ColumnType<DdbNode>[] {
        return [
            {
                title: t('节点别名'),
                dataIndex: 'name',
                fixed: 'left',
                filterDropdown: ({ close }) => <div
                        style={{ padding: 8 }}
                        onKeyDown={e => {
                            e.stopPropagation()
                        }}
                    >
                        <Input
                            ref={search_input}
                            value={search_value}
                            onChange={e => {
                                set_search_value(e.target.value)
                            }}
                            onPressEnter={() => {
                                set_search_values_by_group({ ...search_values_by_group, [group_name]: search_value })
                                set_search_value('')
                                close()
                            }}
                            style={{ marginBottom: 8, display: 'block' }}
                        />
                        <Space>
                            <Button
                                type='primary'
                                onClick={() => {
                                    set_search_values_by_group({ ...search_values_by_group, [group_name]: search_value })
                                    set_search_value('')
                                    close()
                                }}
                                icon={<SearchOutlined />}
                                size='small'
                                style={{ width: 90 }}
                            >
                                搜索
                            </Button>
                            <Button
                                onClick={() => {
                                    set_search_value('')
                                    set_search_values_by_group({ ...search_values_by_group, [group_name]: '' })
                                }}
                                size='small'
                                style={{ width: 90 }}
                            >
                                重置
                            </Button>
                        </Space>
                    </div>,
                filterIcon: (filtered: boolean) => <SearchOutlined style={{ color: filtered ? '#1677ff' : undefined }} />,
                render: (name: string, node: DdbNode) =>
                    <a target='_blank' href={model.get_node_url(node, { pathname: model.assets_root, queries: { view: null } })}>
                        {name}
                    </a>
            },
            {
                title: t('节点类型'),
                dataIndex: 'mode',
                render: (mode: number) => node_mode_lables[Number(mode)]
            },
            {
                title: t('是否 Leader'),
                dataIndex: 'isLeader',
                render: (isLeader: boolean) => isLeader !== null && isLeader.toString()
            },
            {
                title: t('状态'),
                dataIndex: 'state',
                render: state => node_state_icons[Number(state)]
            },
            {
                title: t('连接数'),
                dataIndex: 'connectionNum',
                sorter: (a, b) => Number(a.connectionNum - b.connectionNum)
            },
            {
                title: t('内存已用'),
                dataIndex: 'memoryUsed',
                render: (memoryUsed: bigint) => upper(Number(memoryUsed).to_fsize_str()),
                sorter: (a, b) => Number(a.memoryUsed - b.memoryUsed)
            },
            {
                title: t('内存已分配'),
                dataIndex: 'memoryAlloc',
                render: (memoryAlloc: bigint) => upper(Number(memoryAlloc).to_fsize_str()),
                sorter: (a, b) => Number(a.memoryAlloc - b.memoryAlloc)
            },
            {
                title: t('CPU 占用率'),
                dataIndex: 'cpuUsage',
                render: (cpuUsage: number | null) => (cpuUsage || 0).toFixed(2) + ' %',
                sorter: (a, b) => a.cpuUsage - b.cpuUsage
            },
            {
                title: t('CPU 平均负载'),
                dataIndex: 'avgLoad',
                render: (avgLoad: number | null) => (avgLoad || 0).toFixed(4),
                sorter: (a, b) => a.avgLoad - b.avgLoad
            },
            {
                title: t('前 10 查询耗时中位数'),
                dataIndex: 'medLast10QueryTime',
                render: (medLast10QueryTime: bigint) => (ns2ms(Number(medLast10QueryTime))).toFixed(2) + ' ms',
                sorter: (a, b) => Number(a.medLast10QueryTime - b.medLast10QueryTime)
            },
            {
                title: t('前 10 查询耗时最大值'),
                dataIndex: 'maxLast10QueryTime',
                render: (maxLast10QueryTime: bigint) => (ns2ms(Number(maxLast10QueryTime))).toFixed(2) + ' ms',
                sorter: (a, b) => Number(a.maxLast10QueryTime - b.maxLast10QueryTime)
            },
            {
                title: t('前 100 查询耗时中位数'),
                dataIndex: 'medLast100QueryTime',
                render: (medLast100QueryTime: bigint) => (ns2ms(Number(medLast100QueryTime))).toFixed(2) + ' ms',
                sorter: (a, b) => Number(a.medLast100QueryTime - b.medLast100QueryTime)
            },
            {
                title: t('前 100 查询耗时最大值'),
                dataIndex: 'maxLast100QueryTime',
                render: (maxLast100QueryTime: bigint) => (ns2ms(Number(maxLast100QueryTime))).toFixed(2) + ' ms',
                sorter: (a, b) => Number(a.maxLast100QueryTime - b.maxLast100QueryTime)
            },
            {
                title: t('当前查询耗时最大值'),
                dataIndex: 'maxRunningQueryTime',
                render: (maxRunningQueryTime: bigint) => (ns2ms(Number(maxRunningQueryTime))).toFixed(2) + ' ms',
                sorter: (a, b) => Number(a.maxRunningQueryTime - b.maxRunningQueryTime)
            },
            {
                title: t('运行作业'),
                dataIndex: 'runningJobs',
                sorter: (a, b) => a.runningJobs - b.runningJobs
            },
            {
                title: t('排队作业'),
                dataIndex: 'queuedJobs',
                sorter: (a, b) => a.queuedJobs - b.queuedJobs
            },
            {
                title: t('运行任务'),
                dataIndex: 'runningTasks',
                sorter: (a, b) => a.runningTasks - b.runningTasks
            },
            {
                title: t('排队任务'),
                dataIndex: 'queuedTasks',
                sorter: (a, b) => a.queuedTasks - b.queuedTasks
            },
            {
                title: t('作业负载'),
                dataIndex: 'jobLoad',
                sorter: (a, b) => a.jobLoad - b.jobLoad
            },
            {
                title: t('磁盘总容量'),
                dataIndex: 'diskCapacity',
                render: (diskCapacity: bigint) => upper(Number(diskCapacity).to_fsize_str()),
                sorter: (a, b) => Number(a.diskCapacity - b.diskCapacity)
            },
            {
                title: t('磁盘剩余容量'),
                dataIndex: 'diskFreeSpace',
                render: (diskFreeSpace: bigint) => upper(Number(diskFreeSpace).to_fsize_str()),
                sorter: (a, b) => Number(a.diskFreeSpace - b.diskFreeSpace)
            },
            {
                title: t('磁盘可用空间占比'),
                dataIndex: 'diskFreeSpaceRatio',
                render: (diskFreeSpaceRatio: number) => (diskFreeSpaceRatio * 100).toFixed(2) + ' %',
                sorter: (a, b) => a.diskFreeSpaceRatio - b.diskFreeSpaceRatio
            },
            {
                title: t('磁盘写速率'),
                dataIndex: 'diskWriteRate',
                render: (diskWriteRate: bigint) => upper(Number(diskWriteRate).to_fsize_str()) + '/s',
                sorter: (a, b) => Number(a.diskWriteRate - b.diskWriteRate)
            },
            {
                title: t('磁盘读速率'),
                dataIndex: 'diskReadRate',
                render: (diskReadRate: bigint) => upper(Number(diskReadRate).to_fsize_str()) + '/s',
                sorter: (a, b) => Number(a.diskReadRate - b.diskReadRate)
            },
            {
                title: t('前一分钟写磁盘量'),
                dataIndex: 'lastMinuteWriteVolume',
                render: (lastMinuteWriteVolume: bigint) => upper(Number(lastMinuteWriteVolume).to_fsize_str()),
                sorter: (a, b) => Number(a.lastMinuteWriteVolume - b.lastMinuteWriteVolume)
            },
            {
                title: t('前一分钟读磁盘量'),
                dataIndex: 'lastMinuteReadVolume',
                render: (lastMinuteReadVolume: bigint) => upper(Number(lastMinuteReadVolume).to_fsize_str()),
                sorter: (a, b) => Number(a.lastMinuteReadVolume - b.lastMinuteReadVolume)
            },
            {
                title: t('worker 线程总数'),
                dataIndex: 'workerNum',
                sorter: (a, b) => a.workerNum - b.workerNum
            },
            {
                title: t('最大连接'),
                dataIndex: 'maxConnections',
                sorter: (a, b) => a.maxConnections - b.maxConnections
            },
            {
                title: t('节点内存空间上限'),
                dataIndex: 'maxMemSize',
                render: (maxMemSize: bigint) => maxMemSize + 'GB',
                sorter: (a, b) => Number(a.maxMemSize - b.maxMemSize)
            },
            {
                title: t('网络发送速率'),
                dataIndex: 'networkSendRate',
                render: (networkSendRate: bigint) => upper(Number(networkSendRate).to_fsize_str()) + '/s',
                sorter: (a, b) => Number(a.networkSendRate - b.networkSendRate)
            },
            {
                title: t('网络接收速率'),
                dataIndex: 'networkRecvRate',
                render: (networkRecvRate: bigint) => upper(Number(networkRecvRate).to_fsize_str()) + '/s',
                sorter: (a, b) => Number(a.networkRecvRate - b.networkRecvRate)
            },
            {
                title: t('前一分钟发送字节数'),
                dataIndex: 'lastMinuteNetworkSend',
                render: (lastMinuteNetworkSend: bigint) => upper(Number(lastMinuteNetworkSend).to_fsize_str()),
                sorter: (a, b) => Number(a.lastMinuteNetworkSend - b.lastMinuteNetworkSend)
            },
            {
                title: t('前一分钟接收字节数'),
                dataIndex: 'lastMinuteNetworkRecv',
                render: (lastMinuteNetworkRecv: bigint) => upper(Number(lastMinuteNetworkRecv).to_fsize_str()),
                sorter: (a, b) => Number(a.lastMinuteNetworkRecv - b.lastMinuteNetworkRecv)
            },
            {
                title: t('前一批消息延时'),
                dataIndex: 'lastMsgLatency',
                render: (lastMsgLatency: bigint) => (ns2ms(Number(lastMsgLatency))).toFixed(2) + ' ms',
                sorter: (a, b) => Number(a.lastMsgLatency) - Number(b.lastMsgLatency)
            },
            {
                title: t('所有消息平均延时'),
                dataIndex: 'cumMsgLatency',
                render: (cumMsgLatency: bigint) => (ns2ms(Number(cumMsgLatency))).toFixed(2) + ' ms',
                sorter: (a, b) => Number(a.cumMsgLatency) - Number(b.cumMsgLatency)
            }
        ]
    }
    
    const items: MenuProps['items'] = [
        {
          label: <Button icon={<SettingOutlined />} onClick={open} type='text'>Column Selection</Button>,
          key: 'column',
        },
      ]
      
    const allCols = useMemo(() => get_columns('').map(item => (item as any).dataIndex), [ ])
      
    const [displayCols, setDisplayCols] = useState<string[]>(() => 
        JSON.parse(localStorage.getItem(storage_keys.overview_display_columns)) || allCols)
    
    const getColName = (col: ColumnType<DdbNode>) => col.dataIndex[0].toUpperCase() + String(col.dataIndex).slice(1)
    
    function handleColsChange (cols: string[]) {
        setDisplayCols(cols)
        localStorage.setItem(storage_keys.overview_display_columns, JSON.stringify(cols))
    }
    
    const collapseItems: CollapseProps['items'] = [
        {
            key: 'agent',
            label: <span className='agent-node-title'>{t('代理节点')}</span>,
            children: (
                <div className='agent-node-card' key='agents'>
                    {nodes
                        .filter(({ mode }) => mode === NodeType.agent)
                        .map(({ name, state }) => <div className='agent-node-item' key={name}>
                                {name}
                                {node_state_icons[Number(state)]}
                            </div>)}
                </div>
            )
        }
    ]
    
    const tables = [
        ungrouped_nodes,
        ... data_nodes_count > 0 ? [data_nodes] : [ ], 
        ...groups
    ].map(group => {
        const group_nodes = group.nodes
        return <DDBTable
                    key={group.name}
                    title={group.name}
                    rowSelection={{
                        selectedRowKeys: selectedNodeNames,
                        onChange (_, nodes) {
                            setSelectedNodeNames(nodes.map(node => node.name))
                        },
                        getCheckboxProps (record) {
                            return {
                                disabled: record.mode === NodeType.controller || record.mode === NodeType.agent
                            }
                        }
                    }}
                    columns={get_columns(group.name).filter(col => displayCols.includes((col as any).dataIndex))
                                    .map(col => ({
                                        ...col,
                                        title: <Tooltip title={getColName(col)}>{(col as any).title}</Tooltip>,
                                        showSorterTooltip: false
                            }))}
                    dataSource={group_nodes
                        .filter(({ name, mode }) => name.toLowerCase().includes(search_text.toLowerCase()) && mode !== NodeType.agent)
                        .map(node => ({ ...node, key: node.name }))}
                    pagination={false}
                    scroll={{  x: 'max-content' }}
                />
    })
    
    return <div className='overview-table'>
       { node_type !== NodeType.single &&  <Collapse items={collapseItems} ghost/> }
        <Dropdown menu={{ items }} overlayClassName='table-dropdown' trigger={['contextMenu']}>
            <div className='tables-container'>
                {tables}
            </div>
        </Dropdown>
        <Modal className='col-selection-modal' open={visible} onCancel={close} maskClosable={false} title={t('配置展示列')} footer={false}>
            <Checkbox 
                indeterminate={displayCols.length > 0 && displayCols.length < allCols.length} 
                onChange={e => { handleColsChange(e.target.checked ? allCols : [ ]) }} 
                checked={displayCols.length === allCols.length}>
                {t('全选')}
            </Checkbox>
            <Divider className='col-selection-divider'/>
            <Checkbox.Group value={displayCols} onChange={handleColsChange}>
                <Row >
                    {get_columns('').map(col => 
                        <Col span={12} key={(col as any).dataIndex}>
                            <Checkbox value={(col as any).dataIndex}>
                                {`${col.title}(${getColName(col)})`}
                            </Checkbox>
                        </Col>)
                    }
                </Row>
            </Checkbox.Group>
        </Modal>
    </div>
}
