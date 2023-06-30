import './index.sass'

import {  default as React, ReactNode, useState, useEffect } from 'react'

import { Layout, Button, Modal, Tooltip, Progress, Tag, Checkbox } from 'antd'
const { Header } = Layout

import { default as _Icon,  SettingOutlined } from '@ant-design/icons'
const Icon: typeof _Icon.default = _Icon as any

import { use_modal } from 'react-object-model/modal.js'

import { delay } from 'xshell/utils.browser.js'

import { t, language } from '../../i18n/index.js'

import { NodeType, DdbNodeState, DdbNode, model } from '../model.js'


import SvgRefresh from './icons/refresh.icon.svg'
import SvgStart from './icons/start.icon.svg'
import SvgStop from './icons/stop.icon.svg'
import SvgExpand from './icons/expand.icon.svg'
import SvgCollapse from './icons/collapse.icon.svg'
import SvgCPU from './icons/cpu.icon.svg'
import SvgMemory from './icons/memory.icon.svg'
import SvgDisk from './icons/disk.icon.svg'
import SvgNetwork from './icons/network.icon.svg'
import SvgTask from './icons/task.icon.svg'


export function Overview () {
    const { nodes, node_type, cdn, logined } = model.use(['nodes', 'node_type', 'cdn', 'logined'])   
    
    useEffect(() => {
        let flag = true
        ;(async () => {
            while (true) {
                await delay(10000)
                if (!flag)
                    break
                await model.get_cluster_perf(false)
            }
        })()
        return () => {
            flag = false
        }
    })
    
    
    let start_modal = use_modal()
    let stop_modal = use_modal()
    
    const [isStartLoading, setIsStartLoading] = useState(false)
    const [isStopLoading, setIsStopLoading] = useState(false)
    
    const [selectedNodes, setSelectedNodes] = useState<DdbNode[]>([ ])
    const [expandedNodes, setExpandedNodes] = useState(nodes.filter(item => (item.name !== model.node.name)))
    const iconClassname = language === 'zh' ? 'icon-area' : 'icon-area-en'
    
    return <Layout>
        <Header className='header-bar'>
            <div className='actions'>
                <div className='operations'>
                    <div className={iconClassname} onClick={() => { model.get_cluster_perf(true) }}><Button type='text' block icon={<Icon className='icon-refresh' component={SvgRefresh}  />}>{t('刷新')}</Button></div>
                    
                    { node_type !== NodeType.single && <>
                        <div
                            className={iconClassname}
                        >
                            <Tooltip title={selectedNodes.length && !logined ? t('当前用户未登录，请登陆后再进行启停操作。') : ''}>
                                <Button
                                    type='text'
                                    disabled={!selectedNodes.length || !logined}
                                    block
                                    icon={<Icon className={'icon-start' + (!selectedNodes.length || !logined ? ' grey-icon' : ' blue-icon')} component={SvgStart} />}
                                    onClick={() => { start_modal.open() }}
                                >
                                    {t('启动')}
                                </Button>
                            </Tooltip>
                        </div>
                        
                        <div
                            className={iconClassname}
                        >
                            <Tooltip title={selectedNodes.length && !logined ? t('当前用户未登录，请登陆后再进行启停操作。') : ''}>
                                <Button
                                    type='text'
                                    disabled={!selectedNodes.length || !logined}
                                    block
                                    icon={<Icon className={'icon-stop' + (!selectedNodes.length || !logined ? ' grey-icon' : ' blue-icon')} component={SvgStop} />}
                                    onClick={() => { stop_modal.open() }}
                                >
                                    {t('停止')}
                                </Button>
                            </Tooltip>
                        </div>
                        
                        <div className={language === 'zh' ? 'icon-expand-area' : 'icon-expand-area-en'} onClick={() =>  setExpandedNodes(nodes.filter(node => node.mode === NodeType.agent))}>
                            <Button type='text' block icon={<Icon className='icon-expand' component={SvgExpand} />}>{t('全部展开')}</Button>
                        </div>
                        
                        <div className={language === 'zh' ? 'icon-collapse-area' : 'icon-collapse-area-en'} onClick={() => setExpandedNodes(nodes)}>
                            <Button type='text' block icon={<Icon className='icon-collapse' component={SvgCollapse} />}>{t('全部折叠')}</Button>
                        </div>
                    </> }
                </div>
                
                { !cdn && node_type === NodeType.controller &&  <div className='configs'>
                    <ButtonIframeModal 
                        class_name='nodes-modal'
                        button_text={t('集群节点配置')}
                        iframe_src='./dialogs/nodesSetup.html'
                    />
                    
                    <ButtonIframeModal 
                        class_name='controller-modal'
                        button_text={t('控制节点配置')}
                        iframe_src='./dialogs/controllerConfig.html'
                    />
                    
                    <ButtonIframeModal 
                        class_name='datanode-modal'
                        button_text={t('数据节点配置')}
                        iframe_src='./dialogs/datanodeConfig.html'
                    />
                </div> }
                
                <Modal title={t('确认启动以下节点')} className='start-nodes-modal' open={start_modal.visible} confirmLoading={isStartLoading} 
                        onOk={ async () => {
                            const startNodes = selectedNodes.filter(node => node.state === DdbNodeState.offline)
                            if (!startNodes.length) {
                                start_modal.close()
                                return            
                            }
                            setIsStartLoading(true)
                            model.start_nodes(selectedNodes)
                            await delay(5000)
                            setIsStartLoading(false)
                            start_modal.close() 
                            await model.get_cluster_perf(false) }
                            } onCancel={() => start_modal.close()}>
                    {selectedNodes.filter(node => node.state === DdbNodeState.offline).map(node => <p className='model-node' key={node.name}>{node.name}</p>)}
                </Modal>
                
                <Modal title={t('确认停止以下节点')} className='stop-nodes-modal' open={stop_modal.visible} confirmLoading={isStopLoading} 
                        onOk={async () => {   
                            const stopNodes = selectedNodes.filter(node => node.state === DdbNodeState.online)
                            if (!stopNodes.length) {
                                stop_modal.close()
                                return
                            }
                            setIsStopLoading(true)
                            model.stop_nodes(selectedNodes)
                            await delay(5000)
                            setIsStopLoading(false)
                            stop_modal.close()
                            await model.get_cluster_perf(false) }
                        } onCancel={() => stop_modal.close()}>
                    {selectedNodes.filter(node => node.state === DdbNodeState.online).map(node => <p className='model-node' key={node.name}>{node.name}</p>)}
                </Modal>
            </div>
        </Header>
        <div className={`content${ node_type === NodeType.single ? ' single-node-content' : '' }`}>{
            node_type === NodeType.single ?
                <Nodes
                    key={NodeType.single} type={NodeType.single} nodes={[ ]}
                    selectedNodes={[ ]} setSelectedNodes={() => { }}
                    expandedNodes={[ ]} setExpandedNodes={() => { }}
                />
            :
                [NodeType.controller, NodeType.data, NodeType.computing, NodeType.agent].map(type => 
                    <Nodes
                        key={type} type={type} nodes={nodes.filter(node => node.mode === type)}
                        selectedNodes={selectedNodes} setSelectedNodes={setSelectedNodes}
                        expandedNodes={expandedNodes} setExpandedNodes={setExpandedNodes}
                />)}
        </div>
    </Layout>
}


function ButtonIframeModal ({
    button_text,
    class_name,
    iframe_src
}: {
    button_text: string
    class_name: string
    iframe_src: string
}) {
    const { visible, open, close } = use_modal()
    
    return <>
        <Button icon={<SettingOutlined />} onClick={open}>{button_text}</Button>
        
        <Modal
            className={class_name}
            open={visible}
            onCancel={close}
            width='80%'
            footer={null}
        >
            <iframe src={iframe_src} />
        </Modal>
    </>
}


const node_type = [t('数据节点'), t('代理节点'), t('控制节点'), ,t('计算节点')]


function Nodes ({
    type,
    nodes,
    selectedNodes,
    setSelectedNodes,
    expandedNodes,
    setExpandedNodes
    
}: {
    type: NodeType
    nodes: DdbNode[]
    selectedNodes: DdbNode[]
    setSelectedNodes: Function
    expandedNodes: DdbNode[]
    setExpandedNodes: Function
}) {
    
    const { node } = model.use(['node'])
    const numOfNodes = nodes.filter(node => node.mode === type).length
    
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
        <Node node={node} type={type} key={node.name} 
        selectedNodes={[ ]} setSelectedNodes={() => { }}
        expanded switchFold={() => { }}  />
    :
        Boolean(nodes.length) && <div>
            <div className='nodes-header'>{node_type[type] + ' (' + nodes.length + ')'}
                { type === NodeType.controller ?
                    <div className='controller-site'>
                        <NodeSite node={node}/>
                    </div>
                :
                    type !== NodeType.agent && <div className='nodes-selectAll'>
                        <Checkbox
                            checked={selectedNodes.filter(node => node.mode === type).length === numOfNodes }
                            indeterminate={selectedNodes.filter(node => node.mode === type).length && selectedNodes.filter(node => node.mode === type).length !== numOfNodes}
                            onChange={() => {
                                let newSlectedNodes = [ ]
                                if (selectedNodes.filter(node => node.mode === type).length < numOfNodes) 
                                    newSlectedNodes = nodes.filter(node => node.mode === type && !selectedNodes.includes(node)).concat(selectedNodes)
                                else
                                    newSlectedNodes = selectedNodes.filter(node => node.mode !== type)        
                                setSelectedNodes(newSlectedNodes)
                            }}
                        >
                            <div className='text-selectAll'>{t('全选')}</div>
                        </Checkbox>
                    </div> }
            </div>
            {nodes.map(node => <Node node={node} type={type} key={node.name} 
                                        selectedNodes={selectedNodes} setSelectedNodes={setSelectedNodes}
                                        expanded={expandedNodes.some(item => item.name === node.name)} switchFold={(node: DdbNode) => switchFold(node)} />)}
        </div>
}


const node_colors = ['data-color', 'agent-color', 'controller-color', 'single-color', 'computing-color']
const title_colors = ['data-title-color', 'agent-title-color', 'controller-title-color', 'single-title-color', 'computing-title-color']
const node_statuses = ['offline', 'online']
const node_backgrounds = ['data-node-background', '', 'controller-node-background', '', 'computing-node-background']
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
    selectedNodes: DdbNode[]
    setSelectedNodes: Function
    expanded: boolean
    switchFold: Function
}) {
    const {
        name,
        state,
        mode,
        agentSite,
        maxConnections,
        maxMemSize,
        workerNum,
        executorNum, 
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
                <div className={'node-header' + ' ' + node_colors[mode]}>
                    <div className={'node-title' + ' ' + title_colors[mode]}><div className='node-name'>{name}</div>{isLeader ? <Tag className='leader-tag' color='#FFF' >leader</Tag> : null}</div>
                    <div className='node-click-single' />
                    <NodeSite node={node}/>
                    <div className={node_statuses[state]}>
                        <span>{state ? t('运行中') : t('未启动')}</span>
                    </div>
                </div>
            :
                <div className={'node-header' + ' ' + node_colors[mode] + (expanded ? ' node-header-fold' : '') }>
                    <div className='node-chosen'>
                        <Tooltip
                            title={
                                node.mode === NodeType.controller || node.mode === NodeType.agent
                                    ? node.mode === NodeType.controller
                                        ? t('控制节点不可停止，停止控制节点会导致当前连接断开，无法重启节点。')
                                        : t('代理节点不可停止，停止代理节点会导致控制节点发出的命令无法执行。')
                                    : ''
                            }
                        >
                            <Checkbox
                                disabled={node.mode === NodeType.controller || node.mode === NodeType.agent}
                                checked={selectedNodes.some(node => node.mode === type && node.name === name)}
                                onChange={() => handeChange()}
                            />
                        </Tooltip>
                    </div>
                    <div className={'node-title' + ' ' + title_colors[mode]}>
                        <div className='node-name'>{name}</div>
                        {isLeader && <Tag className='leader-tag' color='#FFF' >leader</Tag> }
                    </div>
                    <div className='node-click' onClick={() => switchFold(node)} />
                    <NodeSite node={node}/>
                    <div className={node_statuses[state]}><span>{state ? t('运行中') : t('未启动')}</span></div>
                </div>
            }
            <div className={(type !== NodeType.single && expanded ? 'node-body-fold' : 'node-body') + ' ' + node_backgrounds[node.mode]}>
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
                    <InfoItem title={t('executor 线程总数')}>{executorNum}</InfoItem>
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
                    <InfoItem title={t('前一批消息时延')}>{Number(lastMsgLatency) < Number.MIN_VALUE ? 0 + ' s' : Number(lastMsgLatency) + ' s'}</InfoItem>
                    <InfoItem title={t('所有消息平均时延')}>{Number(cumMsgLatency) < Number.MIN_VALUE ? 0 + ' s' : Number(cumMsgLatency) + ' s'}</InfoItem>
                </NodeInfo>
            </div>
            <div className={expanded  ? 'node-footer-fold' : 'node-footer'}>
                {agentNode && <span>{t('代理节点: ') + agentNode}</span> }
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
    return <div className={'info-card' + ' ' + className}>
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
    Progress?: React.JSX.Element
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
    const privateDomain = `${host}:${port}`
    let privateLink = getUrl(host, port)
    let publicDomain = [ ]
    let publicLink = [ ]
    
    if (publicName) {
        publicDomain = publicName.split(/,|;/).map(val => val + ':' + port)
        publicLink = publicName.split(/,|;/).map(val => getUrl(val, port))
    }
    
    function getUrl (hostname: string, port: string | number) {
        const current_params = new URLSearchParams(location.search)
        const is_query_params_mode = current_params.get('hostname') || current_params.get('port')
        
        if (is_query_params_mode) {
            current_params.set('hostname', hostname)
            current_params.set('port', port.toString())
        }
        
        return is_query_params_mode
            ? `${location.protocol}//${location.hostname}:${location.port}${location.pathname}?${current_params.toString()}`
            : `${location.protocol}//${hostname}:${port}`
    }
    
    return <>
        <div className='node-site'>
            {mode === NodeType.agent ? (
                <Tooltip title={t('代理节点不可跳转')}>
                    <div className='control-disable'>
                        <a className='disable-link' href={privateLink} target='_blank'>
                            {privateDomain}
                        </a>
                    </div>
                </Tooltip>
            ) : (
                <a href={privateLink} target='_blank'>
                    {privateDomain}
                </a>
            )}
        </div>
        {publicDomain.map((val, idx) => <div className='node-site' key={val}>
            {mode === NodeType.agent ? (
                <Tooltip title={t('代理节点不可跳转')}>
                    <div className='control-disable'>
                        <a className='disable-link' href={publicLink[idx]} target='_blank'>
                            {val}
                        </a>
                    </div>
                </Tooltip>
            ) : (
                publicLink.length && (
                    <a href={publicLink[idx]} target='_blank'>
                        {val}
                    </a>
                )
            )}
        </div>)}
    </>
}

