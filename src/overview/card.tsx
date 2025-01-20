import './index.sass'

import { type ReactNode, type JSX } from 'react'

import { Tooltip, Progress, Tag, Checkbox } from 'antd'

import { default as Icon } from '@ant-design/icons'


import { t, language } from '../../i18n/index.js'

import { NodeType, type DdbNode, model } from '../model.js'



import SvgCPU from './icons/cpu.icon.svg'
import SvgMemory from './icons/memory.icon.svg'
import SvgDisk from './icons/disk.icon.svg'
import SvgNetwork from './icons/network.icon.svg'
import SvgTask from './icons/task.icon.svg'
import { ns2ms } from './utils.ts'


export function OverviewCard ({
    selectedNodeNames,
    setSelectedNodeNames,
    expandedNodes,
    setExpandedNodes,
}: {
    selectedNodeNames: string[]
    setSelectedNodeNames: (names: string[]) => void
    expandedNodes: DdbNode[]
    setExpandedNodes: (nodes: DdbNode[]) => void
}) {
    const { nodes, node_type } = model.use(['nodes', 'node_type', 'logined'])   
    
    const selecteNodeNamesSet = new Set(selectedNodeNames)
    const selectedNodes = nodes.filter(node => selecteNodeNamesSet.has(node.name))
    
    return  <div className={`card content${node_type === NodeType.single ? ' single-node-content' : ''}`}>
        {node_type === NodeType.single ?
            <Nodes
                key={NodeType.single}
                type={NodeType.single}
            />
        :
            [NodeType.controller, NodeType.data, NodeType.computing, NodeType.agent].map(type =>
                <Nodes
                    key={type}
                    type={type}
                    nodes={nodes.filter(node => node.mode === type)}
                    selectedNodes={selectedNodes}
                    setSelectedNodes={(nodes: DdbNode[]) => {
                        setSelectedNodeNames(nodes.map(node => node.name))
                    }}
                    expandedNodes={expandedNodes}
                    setExpandedNodes={setExpandedNodes}
                />)
        }
    </div>
}

const node_types = [t('数据节点'), t('代理节点'), t('控制节点'), ,t('计算节点')]


function Nodes ({
    type,
    nodes,
    selectedNodes,
    setSelectedNodes,
    expandedNodes,
    setExpandedNodes
    
}: {
    type: NodeType
    nodes?: DdbNode[]
    selectedNodes?: DdbNode[]
    setSelectedNodes?: (names: DdbNode[]) => void
    expandedNodes?: DdbNode[]
    setExpandedNodes?: (nodes: DdbNode[]) => void
}) {
    const { node } = model.use(['node'])
    const numOfNodes = nodes ? nodes.filter(node => node.mode === type).length : 0
    
    function switchFold (node: DdbNode) {
        if (node.mode === NodeType.agent )
            return
        let newExpandedNodes = [ ]
        if (expandedNodes.every(item =>  item.name !== node.name)) 
            newExpandedNodes = [...expandedNodes, node]
        else 
            newExpandedNodes = expandedNodes.filter(item => item.mode !== node.mode || item.name !== node.name)
        setExpandedNodes(newExpandedNodes)    
    }
    
    
    
    return type === NodeType.single ? 
            <Node node={node} type={type} key={node.name} />
        :
            Boolean(nodes.length) && <div>
                <div className='nodes-header'>{node_types[type] + ' (' + nodes.length + ')'}
                    { type === NodeType.controller ?
                        <div className='controller-site'>
                            <NodeSite node={node}/>
                        </div>
                    :
                        type !== NodeType.agent && <div className='nodes-select-all'>
                            <Checkbox
                                checked={selectedNodes.filter(node => node.mode === type).length === numOfNodes }
                                indeterminate={selectedNodes.filter(node => node.mode === type).length && selectedNodes.filter(node => node.mode === type).length !== numOfNodes}
                                onChange={() => {
                                    let newSlectedNodes: DdbNode[] = [ ]
                                    if (selectedNodes.filter(node => node.mode === type).length < numOfNodes) 
                                        newSlectedNodes = nodes.filter(node => node.mode === type && !selectedNodes.includes(node)).concat(selectedNodes)
                                    else
                                        newSlectedNodes = selectedNodes.filter(node => node.mode !== type)        
                                    setSelectedNodes(newSlectedNodes)
                                }}
                            >
                                <div className='text-select-all'>{t('全选')}</div>
                            </Checkbox>
                        </div> }
                </div>
                {
                    nodes.map(node => <Node
                        node={node}
                        type={type}
                        key={node.name}
                        selectedNodes={selectedNodes}
                        setSelectedNodes={setSelectedNodes}
                        expanded={expandedNodes.some(item => item.name === node.name)}
                        switchFold={(node: DdbNode) => { switchFold(node) }}
                    />)
                }
        </div>
}


const node_colors = ['data-color', 'agent-color', 'controller-color', 'single-color', 'computing-color']
const title_colors = ['data-title-color', 'agent-title-color', 'controller-title-color', 'single-title-color', 'computing-title-color']
const node_statuses = ['offline', 'online']
const node_backgrounds = ['data-background', '', 'controller-background', '', 'computing-background']
const current_node_borders = ['data-current-node', '', 'controller-current-node', '', '', '']


function Node ({
    node,
    type,
    selectedNodes,
    setSelectedNodes,
    expanded,
    switchFold
}: {
    node: DdbNode
    type: NodeType
    selectedNodes?: DdbNode[]
    setSelectedNodes?: (names: DdbNode[]) => void
    expanded?: boolean
    switchFold?: (node: DdbNode) => void
}) {
    const {
        name,
        state,
        mode,
        agentSite,
        maxConnections,
        maxMemSize,
        workerNum,
        connectionNum, 
        memoryUsed, 
        memoryAlloc, 
        diskReadRate, 
        diskWriteRate, 
        diskCapacity,
        diskFreeSpace,
        lastMinuteReadVolume,
        lastMinuteWriteVolume,
        
        networkRecvRate,
        networkSendRate,
        lastMinuteNetworkRecv,
        lastMinuteNetworkSend,
        
        cpuUsage,
        avgLoad,
        
        queuedJobs,
        queuedTasks,
        runningJobs, 
        isLeader, 
    
        lastMsgLatency,
        cumMsgLatency
    } = node
    
    
    const agentNode = agentSite ? agentSite.split(':')[2] : ''
    
    function handeChange () {
        let newSelectedNodes = [ ]
        if (selectedNodes.every(node => node.name !== name)) 
            newSelectedNodes = [...selectedNodes, node]
        else 
            newSelectedNodes = selectedNodes.filter(node => node.mode !== type || node.name !== name)
        setSelectedNodes(newSelectedNodes)
    }
    
    
    return <div className={'node' + ' ' + (type !== NodeType.single && node.name === model.node.name ? current_node_borders[node.mode] : '')}>{
            type === NodeType.single ? 
                <div className={`single-node-header ${node_colors[mode]}`}>
                    <div className={'node-title' + ' ' + title_colors[mode]}><div className='node-name'>{name}</div>{isLeader ? <Tag className='leader-tag' color='#FFF' >leader</Tag> : null}</div>
                    <div className='single-node-site'>
                        <NodeSite node={node}/>
                        <div className={node_statuses[state]} style={{ backgroundImage: `url(${model.assets_root}overview/${state ? 'online' : 'offline'}.png)` }}>
                            <span>{state ? t('运行中') : t('未启动')}</span>
                        </div>
                    </div>
                </div>
            :
                <div className={'node-header' + ' ' + node_colors[mode] + (expanded ? ' node-header-fold' : '') }>
                    <div className='node-chosen'>
                        <Tooltip
                            title={
                                node.mode === NodeType.controller || node.mode === NodeType.agent
                                    ? node.mode === NodeType.controller
                                        ? t('控制节点不可停止，停止控制节点将无法对集群节点进行启停操作。')
                                        : t('代理节点不可停止，停止代理节点会导致控制节点发出的命令无法执行。')
                                    : ''
                            }
                        >
                            <Checkbox
                                disabled={node.mode === NodeType.controller || node.mode === NodeType.agent}
                                checked={selectedNodes.some(node => node.mode === type && node.name === name)}
                                onChange={() => { handeChange() }}
                            />
                        </Tooltip>
                    </div>
                    <div className={`node-title ${title_colors[mode]}`}>
                        <a className={`node-name ${title_colors[mode]}`} target='_blank' href={model.get_node_url(node, { pathname: `${model.assets_root}shell/`, queries: { view: null } })}>
                            {name}
                        </a>
                        {isLeader && <Tag className='leader-tag' color='#FFF' >leader</Tag> }
                    </div>
                    <div className='node-click' onClick={() => { switchFold(node) }} />
                    <NodeSite node={node} />
                    <div className={node_statuses[state]} style={{ backgroundImage: `url(${model.assets_root}overview/${state ? 'online' : 'offline'}.png)` }}><span>{state ? t('运行中') : t('未启动')}</span></div>
                </div>
            }
            <div 
                className={(type !== NodeType.single && expanded ? 'node-body-fold' : 'node-body') }
                style={{ backgroundImage: `url(${model.assets_root}overview/icons/${node_backgrounds[node.mode]}.svg)` }}
            >
                <NodeInfo title='CPU' icon={SvgCPU} className='cpu-info'>
                    <InfoItem
                        title={t('占用率')}
                        Progress={
                            <Progress
                                percent={cpuUsage}
                                showInfo={false}
                                strokeColor={cpuUsage > 67 ? '#FF8660' : cpuUsage > 33 ? '#FFCE4F' : '#A8EB7F'}
                                size={[100, 7]}
                            />
                        }
                    >
                        {Math.round(cpuUsage) + '%'}
                    </InfoItem>
                    <InfoItem title={t('worker 线程总数')}>{workerNum}</InfoItem>
                    <InfoItem
                        title={t('平均负载')}
                        Progress={
                            <Progress
                                percent={avgLoad}
                                showInfo={false}
                                strokeColor={avgLoad > 67 ? '#FF8660' : avgLoad > 33 ? '#FFCE4F' : '#A8EB7F'}
                                size={[100, 7]}
                            />
                        }
                    >
                        {Math.round(avgLoad) + '%'}
                    </InfoItem>
                </NodeInfo>
                <NodeInfo title={t('内存')} icon={SvgMemory} className='memory-info'>
                    <InfoItem
                        title={t('用量')}
                        Progress={
                            <Progress
                                percent={(Number(memoryUsed) / (maxMemSize * 1024 * 1024 * 1024)) * 100}
                                showInfo={false}
                                strokeColor={
                                    (Number(memoryUsed) / (maxMemSize * 1024 * 1024 * 1024)) * 100 > 67
                                        ? '#FF8660'
                                        : (Number(memoryUsed) / (maxMemSize * 1024 * 1024 * 1024)) * 100 > 33
                                        ? '#FFCE4F'
                                        : '#A8EB7F'
                                }
                                size={[150, 7]}
                            />
                        }
                    >
                        {Number(memoryUsed).to_fsize_str() + ' / ' + maxMemSize + ' GB'}
                    </InfoItem>
                    <InfoItem title={t('已分配')}>{Number(memoryAlloc).to_fsize_str()}</InfoItem>
                </NodeInfo>
                <NodeInfo title={t('磁盘')} icon={SvgDisk} className='disk-info'>
                    <InfoItem title={t('读')}>{Number(diskReadRate).to_fsize_str() + '/s'}</InfoItem>
                    <InfoItem title={t('前一分钟读')}>{Number(lastMinuteReadVolume).to_fsize_str()}</InfoItem>
                    <InfoItem title={t('写')}>{Number(diskWriteRate).to_fsize_str() + '/s'}</InfoItem>
                    <InfoItem title={t('前一分钟写')}>{Number(lastMinuteWriteVolume).to_fsize_str()}</InfoItem>
                    <InfoItem
                        title={t('用量')}
                        Progress={
                            <Progress
                                percent={(Number(diskCapacity - diskFreeSpace) / Number(diskCapacity)) * 100}
                                showInfo={false}
                                strokeColor={
                                    (Number(diskCapacity - diskFreeSpace) / Number(diskCapacity)) * 100 > 67
                                        ? '#FF8660'
                                        : (Number(diskCapacity - diskFreeSpace) / Number(diskCapacity)) * 100 > 33
                                        ? '#FFCE4F'
                                        : '#A8EB7F'
                                }
                                size={language === 'zh' ? [200, 7] : [160, 7]}
                            />
                        }
                    >
                        {`${Number(diskCapacity - diskFreeSpace).to_fsize_str()} / ${Number(diskCapacity).to_fsize_str()}`}
                    </InfoItem>
                </NodeInfo>
                <NodeInfo title={t('网络')} icon={SvgNetwork} className='network-info'>
                    <InfoItem title={t('收')}>{Number(networkRecvRate).to_fsize_str() + '/s'}</InfoItem>
                    <InfoItem title={t('前一分钟收')}>{Number(lastMinuteNetworkRecv).to_fsize_str()}</InfoItem>
                    <InfoItem title={t('发')}>{Number(networkSendRate).to_fsize_str() + '/s'}</InfoItem>
                    <InfoItem title={t('前一分钟发')}>{Number(lastMinuteNetworkSend).to_fsize_str()}</InfoItem>
                    <InfoItem title={t('当前连接数')}>{connectionNum}</InfoItem>
                    <InfoItem title={t('最大连接数')}>{maxConnections}</InfoItem>
                </NodeInfo>
                <NodeInfo title={t('任务与作业')} icon={SvgTask} className='task-info'>
                    <InfoItem title={t('运行作业')}>{runningJobs}</InfoItem>
                    <InfoItem title={t('运行任务')}>{runningJobs}</InfoItem>
                    <InfoItem title={t('排队作业')}>{queuedJobs}</InfoItem>
                    <InfoItem title={t('排队任务')}>{queuedTasks}</InfoItem>
                    <InfoItem title={t('前一批消息时延')}>{Number(lastMsgLatency) < Number.MIN_VALUE ? 0  : (ns2ms(Number(cumMsgLatency))).toFixed(2) + ' ns'}</InfoItem>
                    <InfoItem title={t('所有消息平均时延')}>{Number(cumMsgLatency) < Number.MIN_VALUE ? 0 :  (ns2ms(Number(cumMsgLatency))).toFixed(2) + ' ns'}</InfoItem>
                </NodeInfo>
            </div>
            <div className={expanded  ? 'node-footer-fold' : 'node-footer'}>
                {agentNode && <span>{t('代理节点') + ': ' + agentNode}</span> }
            </div>
        </div>
}


function NodeInfo ({
    title,
    icon,
    className,
    children
}: {
    title: string
    icon: any
    className: string
    children: ReactNode
}) {
    return <div className={`info-card ${className}`}>
        <div className='info-title'>
            <Icon component={icon} />
            <div className='title-text'>{title}</div>
        </div>
        <div className='info-body'>
            <div className='info-table' >
                {children}
            </div>
        </div>
    </div>
}


function InfoItem ({
    title,
    children,
    Progress
}: {
    title: string
    children: ReactNode
    Progress?: JSX.Element
}) {
    return <div className='item-content'>
        <div className={language === 'zh' ? 'item-title' : 'item-title-en'}>{title}</div>
        <div className='item-body'>
            <div className='info-text'>{children}</div>
            {Progress}
        </div>
    </div>
}

function NodeSite ({ node }: { node: DdbNode }) {
    const { host, port, mode, publicName } = node
    const private_host = `${host}:${port}`
    const private_link = model.get_url(host, port, { queries: { view: null } })
    let public_hosts = [ ]
    let public_link = [ ]
    
    if (publicName) {
        public_hosts = publicName.split(/,|;/).map(hostname => `${hostname}:${port}`)
        public_link = publicName.split(/,|;/).map(hostname => 
            model.get_url(
                hostname, 
                port,
                { queries: { view: null } }))
    }
    
    return <>
        <div className='node-site'>
            {mode === NodeType.agent ?
                <Tooltip title={t('代理节点不可跳转')}>
                    <div className='control-disable'>
                        <a className='disable-link' href={private_link} target='_blank'>
                            {private_host}
                        </a>
                    </div>
                </Tooltip>
            : 
                <a href={private_link} target='_blank'>
                    {private_host}
                </a>
            }
        </div>
        {public_hosts.map((val, idx) => <div className='node-site' key={val}>
            {mode === NodeType.agent ?
                <Tooltip title={t('代理节点不可跳转')}>
                    <div className='control-disable'>
                        <a className='disable-link' href={public_link[idx]} target='_blank'>
                            {val}
                        </a>
                    </div>
                </Tooltip>
            :
                Boolean(public_link.length) && 
                    <a href={public_link[idx]} target='_blank'>
                        {val}
                    </a>
            }
        </div>)}
    </>
}

