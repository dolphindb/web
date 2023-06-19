import './index.sass'

import {  default as React, ReactNode, useState, useEffect } from 'react'

import { Button, Modal, Tooltip, Progress, Tag, Checkbox } from 'antd'
import { default as _Icon,  SettingOutlined } from '@ant-design/icons'
const Icon: typeof _Icon.default = _Icon as any

import { use_modal } from 'react-object-model/modal.js'

import { t } from '../../i18n/index.js'

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
import SvgExport from './icons/export.icon.svg'

import { delay } from 'xshell/utils.browser.js'


export function Overview () {
    const { nodes, node_type, cdn } = model.use(['nodes', 'node_type', 'cdn'])
    useEffect(() => {
        let flag = true
        ;(async () => {
            while (true) {
                await delay(10000)
                if (!flag)
                    break
                await model.get_cluster_perf()
            }
        })()
        return () => {
            flag = false
        }
    })
    
    const [selectedNodes, setSelectedNodes] = useState([ ])
    const [isStartModalOpen, setIsStartModalOpen] = useState(false)
    const [isStopModalOpen, setIsStopModalOpen] = useState(false)
    
    const initExpandedNodes = nodes.filter(node => (node.mode === NodeType.controller && !node.isLeader) || node.mode !== NodeType.controller)
    
    const [expandedNodes, setExpandedNodes] = useState(initExpandedNodes)
    
    function expandAll () {
        setExpandedNodes(nodes.filter(node => node.mode === NodeType.agent))
    }
    
    function collapseAll () {
        setExpandedNodes(nodes)
    }
    
    return <>
        <div className='actions'>
            {node_type === NodeType.single ? 
            <div className='operations'>
            <Tooltip title={t('刷新信息')}>
                <div className='icon-area' onClick={() => { model.get_cluster_perf() }}><Button type='text' block icon={<Icon className='icon-refresh' component={SvgRefresh}  />}>{t('刷新')}</Button></div>
            </Tooltip>
            </div>
            :
            <div className='operations'>
                <Tooltip title={t('刷新信息')}>
                    <div className='icon-area' onClick={() => { model.get_cluster_perf() }}><Button type='text' block icon={<Icon className='icon-refresh' component={SvgRefresh}  />}>{t('刷新')}</Button></div>
                </Tooltip>
                
                <Tooltip title={t('启动节点')}>
                    <div className='icon-area'  onClick={() => setIsStartModalOpen(true)}><Button type='text' block icon={<Icon className='icon-start' component={SvgStart}/>}>{t('启动')}</Button></div>
                </Tooltip>
                
                <Tooltip title={t('停止节点')}>
                    <div className='icon-area' onClick={() => setIsStopModalOpen(true)}><Button type='text' block icon={<Icon className='icon-stop' component={SvgStop} />}>{t('停止')}</Button></div>
                </Tooltip>
                
                <Tooltip title={t('全部展开')}>
                    <div className='icon-expand-area' onClick={() => expandAll()}><Button type='text' block icon={<Icon className='icon-expand' component={SvgExpand} />}>{t('全部展开')}</Button></div>
                </Tooltip>
                
                <Tooltip title={t('全部折叠')}>
                    <div className='icon-collapse-area' onClick={() => collapseAll()}><Button type='text' block icon={<Icon className='icon-collapse' component={SvgCollapse} />}>{t('全部折叠')}</Button></div>
                </Tooltip>
            </div>
            }
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
            <Modal title='确定启动以下节点' className='start-nodes-modal' open={isStartModalOpen} onOk={() => { model.start_nodes(selectedNodes), setIsStartModalOpen(false) }} onCancel={() => setIsStartModalOpen(false)}>
                {selectedNodes.filter(node => node.state === DdbNodeState.offline).map(node => <p className='model-node' key={node.name}>{node.name}</p>)}
            </Modal>
            <Modal title='确定停止以下节点' className='stop-nodes-modal' open={isStopModalOpen} onOk={() => { model.stop_nodes(selectedNodes), setIsStopModalOpen(false) }} onCancel={() => setIsStopModalOpen(false)}>
                {selectedNodes.filter(node => node.state === DdbNodeState.online).map(node => <p className='model-node' key={node.name}>{node.name}</p>)}
            </Modal>
        </div>
        
        <NodeCard isSingleNode={node_type === NodeType.single} selectedNodes={selectedNodes} setSelectedNodes={setSelectedNodes} expandedNodes={expandedNodes} setExpandedNodes={setExpandedNodes}/>
    </>
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
    const { license } = model.use(['license'])
    const nodeColor = ['data-color', 'agent-color', 'controller-color', 'single-color', 'computing-color']
    const titleColor = ['data-title-color', 'agent-title-color', 'controller-title-color', 'single-title-color', 'computing-title-color']
    const nodeStatus = [ 'offline', 'online']
    
    const { name,
        state,
        mode,
        host,
        port,
        site,
        publicName,
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
        runningTasks, 
        jobLoad,
    
        isLeader, 
    
        lastMsgLatency,
        cumMsgLatency } = node
        
    const authorizations = {
        trial: t('试用版'),
        community: t('社区版'),
        commercial: t('商业版'),
        test: t('测试版'),
    }
    
    const privateDomain = host + ':' + port
    let auth = ''
    if (license)
        auth = authorizations[license.authorization] || license.authorization
    let publicDomain = [ ]
    let agentNode = ''
    if (type === NodeType.single)
        publicDomain = publicName.split(';').map(val =>   val +  ':' + port) 
    else
        publicDomain = publicName.split(',').map(val =>   val + ':' + port) 
    if (node.agentSite)
        agentNode = agentSite.split(':')[2]
    
    function handeChange () {
        let newSelectedNodes = [ ]
        if (selectedNodes.every(node => node.name !== name)) 
            newSelectedNodes = [...selectedNodes, node]
        else 
            newSelectedNodes = selectedNodes.filter(node => node.mode !== type || node.name !== name)
        setSelectedNodes(newSelectedNodes)
    }
    
    return <div className={'node' + (node.name === model.node.name ? ' current-node' : '')}>{
            type === NodeType.single ? 
            <div className={'node-header' + ' ' + nodeColor[mode]}>
                <div className={'node-title' + ' ' + titleColor[mode]}><div className='node-name'>{name}</div>{isLeader ? <Tag className='leader-tag' color='#FFF' >leader</Tag> : null}</div>
                <div className='node-site' ><span className='site-text'>{privateDomain}</span><a href={'//' + privateDomain} target='_blank'><Icon component={SvgExport} /></a></div>
                { publicDomain.map(val => <div className='node-site' key={val}><span className='site-text'>{val}</span><a href={'//' + val} target='_blank'><Icon component={SvgExport} /></a></div>) }
                <div className={nodeStatus[state]}><span>{state ? t('已启动') : t('未启动')}</span></div>
            </div>
            :
            <div className={'node-header' + ' ' + nodeColor[mode] + (expanded ? ' node-header-fold' : '') }>
                <div className='node-chosen'>{node.mode === NodeType.controller || node.mode === NodeType.agent ? <Tooltip title={(node.mode === NodeType.controller ? t('控制') : t('代理')) + t('节点不可停止')}><Checkbox disabled={node.mode === NodeType.controller || node.mode === NodeType.agent} 
                                                       checked={selectedNodes.some(node => node.mode === type && node.name === name)} 
                                                       onChange={() => handeChange()}/></Tooltip> :
                                                       <Checkbox  
                                                       checked={selectedNodes.some(node => node.mode === type && node.name === name)} 
                                                       onChange={() => handeChange()}/>
                                                       }
                </div>
                <div className={'node-title' + ' ' + titleColor[mode]}><div className='node-name'>{name}</div>{isLeader ? <Tag className='leader-tag' color='#FFF' >leader</Tag> : null}</div>
                <div className='node-click'  onClick={() => switchFold(node)}/>
                <div className='node-site' ><span className='site-text'>{privateDomain}</span><a href={'//' + privateDomain} target='_blank'><Icon component={SvgExport} /></a></div>
                { publicDomain.map(val => <div className='node-site' key={val}><span className='site-text'>{val}</span><a href={'//' + val} target='_blank'><Icon component={SvgExport} /></a></div>) }
                <div className={nodeStatus[state]}><span>{state ? t('已启动') : t('未启动')}</span></div>
            </div>
            }
            <div className={(type !== NodeType.single && expanded  ? 'node-body-fold' : 'node-body')  + (node.mode === NodeType.data ? ' data-node-background' : '')}>
                <NodeInfo title='CPU' icon={SvgCPU} className='cpu-info'  >
                    <InfoItem title={t('占用率')} Progress={<Progress percent={cpuUsage} showInfo={false} 
                                                            strokeColor={cpuUsage > 67 ? '#FF8660' : (cpuUsage > 33 ? '#FFCE4F' : '#A8EB7F')} 
                                                            size={[100, 7]}/>}>{Math.round(cpuUsage) + '%'}</InfoItem>
                    <InfoItem title={t('worker 线程总数') }>{workerNum}</InfoItem> 
                    <InfoItem title={t('平均负载')} Progress={<Progress percent={avgLoad } showInfo={false} 
                                                   strokeColor={avgLoad > 67 ? '#FF8660' : (avgLoad > 33 ? '#FFCE4F' : '#A8EB7F')} 
                                                   size={[100, 7]}/>}>{Math.round(avgLoad) + '%'}</InfoItem> 
                    <InfoItem title={t('executor 线程总数')}>{executorNum}</InfoItem> 
                </NodeInfo>
                <NodeInfo title='内存' icon={SvgMemory} className='memory-info' >
                    <InfoItem title={t('用量')} Progress={<Progress percent={(Number(memoryUsed) / (maxMemSize * 1024 * 1024 * 1024)) * 100} 
                                                                    showInfo={false} 
                                                                    strokeColor={(Number(memoryUsed) / (maxMemSize * 1024 * 1024 * 1024)) * 100 > 67 ? '#FF8660' : ((Number(memoryUsed) / (maxMemSize * 1024 * 1024 * 1024)) * 100 > 33 ? '#FFCE4F' : '#A8EB7F')} size={[100, 7]} />}>{(Number(memoryUsed)).to_fsize_str() + ' / ' + maxMemSize + ' GB' }</InfoItem> 
                    <InfoItem title={t('已分配')}>{(Number(memoryAlloc)).to_fsize_str()}</InfoItem>  
                </NodeInfo>
                <NodeInfo title={t('磁盘')} icon={SvgDisk} className='disk-info'>
                    <InfoItem title={t('读')}>{(Number(diskReadRate)).to_fsize_str() + '/s' }</InfoItem> 
                    <InfoItem title={t('前一分钟读')}>{(Number(lastMinuteReadVolume)).to_fsize_str()}</InfoItem>
                    <InfoItem title={t('写')}>{(Number(diskWriteRate)).to_fsize_str() + '/s' }</InfoItem> 
                    <InfoItem title={t('前一分钟写')}>{(Number(lastMinuteWriteVolume)).to_fsize_str()}</InfoItem>
                    <InfoItem title={t('用量')} Progress={<Progress percent={(Number(diskCapacity - diskFreeSpace) / (Number(diskCapacity) )) * 100} showInfo={false} strokeColor={(Number(diskCapacity - diskFreeSpace) / (Number(diskCapacity) )) * 100 > 67 ? '#FF8660' : ((Number(diskCapacity - diskFreeSpace) / (Number(diskCapacity) )) * 100 > 33 ? '#FFCE4F' : '#A8EB7F')} size={[100, 7]}/>}>
                        {(Number(diskCapacity - diskFreeSpace) ).to_fsize_str() + ' / ' + ((Number(diskCapacity))).to_fsize_str() }           
                    </InfoItem>
                </NodeInfo>
                <NodeInfo title='网络' icon={SvgNetwork} className='network-info' >
                    <InfoItem title={t('收')}>{(Number(networkRecvRate)).to_fsize_str() + '/s' }</InfoItem>
                    <InfoItem title={t('前一分钟收')}>{(Number(lastMinuteNetworkRecv)).to_fsize_str()}</InfoItem>
                    <InfoItem title={t('发')}>{(Number(networkSendRate)).to_fsize_str() + '/s' }</InfoItem>
                    <InfoItem title={t('前一分钟发')}>{(Number(lastMinuteNetworkSend)).to_fsize_str()}</InfoItem>
                    <InfoItem title={t('当前连接')}>{connectionNum}</InfoItem> 
                    <InfoItem title={t('最大连接')}>{maxConnections}</InfoItem>
                    
                </NodeInfo>        
                <NodeInfo title='任务与作业' icon={SvgTask} className='task-info' >
                    <InfoItem title={t('运行作业')}>{runningJobs}</InfoItem>
                    <InfoItem title={t('运行任务')}>{runningJobs}</InfoItem>
                    <InfoItem title={t('排队作业')}>{queuedJobs}</InfoItem>
                    <InfoItem title={t('排队任务')}>{queuedTasks}</InfoItem>
                    <InfoItem title={t('前一批消息延时')}>{Number(lastMsgLatency) < Number.MIN_VALUE ? 0  + ' s' : Number(lastMsgLatency) + ' s'}</InfoItem>
                    <InfoItem title={t('所有消息平均延时')}>{Number(cumMsgLatency) < Number.MIN_VALUE ? 0  + ' s' : Number(cumMsgLatency) + ' s'}</InfoItem>     
                </NodeInfo>
            </div>
            <div className={expanded  ? 'node-footer-fold' : 'node-footer'}>
                {agentNode && <span>{t('代理节点: ') + agentNode}</span> }
                {license && <span className='node-version'>{auth + ' ' + license.version}</span>}
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
            <div className='item-title'>{title}</div>
            <div className='item-body'>
                <div className='info-text'>{children}</div>
                {Progress}
            </div>
        </div>
    
}

function NodeCard ({
    isSingleNode, 
    selectedNodes,
    setSelectedNodes,
    expandedNodes,
    setExpandedNodes
}: {
    isSingleNode: boolean
    selectedNodes: DdbNode[]
    setSelectedNodes: Function
    expandedNodes: DdbNode[]
    setExpandedNodes: Function
}) {
    const { nodes } = model.use(['nodes'])
    const controllerNodes: DdbNode[] = nodes.filter(node => node.mode === NodeType.controller)
    const dataNodes: DdbNode[] = nodes.filter(node => node.mode === NodeType.data)
    const agentNodes: DdbNode[] = nodes.filter(node => node.mode === NodeType.agent)
    const computingNodes: DdbNode[] = nodes.filter(node => node.mode === NodeType.computing)
    
    return <>{isSingleNode ?
        <div className='content single-node-content'>
            <NodeContainer type={NodeType.single} nodes={[ ]}
                            selectedNodes={[ ]} setSelectedNodes={() => { }}
                            expandedNodes={[ ]} setExpandedNodes={() => { }} />
        </div> :
        <div className='content'>
            <NodeContainer type={NodeType.controller} nodes={controllerNodes}
                            selectedNodes={selectedNodes} setSelectedNodes={setSelectedNodes}
                            expandedNodes={expandedNodes} setExpandedNodes={setExpandedNodes} />
            <NodeContainer type={NodeType.data} nodes={dataNodes} 
                            selectedNodes={selectedNodes} setSelectedNodes={setSelectedNodes}
                            expandedNodes={expandedNodes} setExpandedNodes={setExpandedNodes}/>
            <NodeContainer type={NodeType.computing} nodes={computingNodes} 
                            selectedNodes={selectedNodes} setSelectedNodes={setSelectedNodes}
                            expandedNodes={expandedNodes} setExpandedNodes={setExpandedNodes}/>
            <NodeContainer type={NodeType.agent} nodes={agentNodes} 
                            selectedNodes={selectedNodes} setSelectedNodes={setSelectedNodes}
                            expandedNodes={expandedNodes} setExpandedNodes={setExpandedNodes}/>
        </div>   
    } 
    </>
}

function NodeContainer ({
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
    const { node,  dev } = model.use(['node',  'dev'])
    
    let leaderNode = null
    let privateDomain = ''
    let publicDomain = [ ]
    const numOfNodes = nodes.filter(node => node.mode === type).length
    
    for (let node of nodes)
        if (node.isLeader) {
            leaderNode = node
            const { host, port, publicName } = leaderNode
            privateDomain = host + ':' + port
            publicDomain =  publicName.split(',').map((val: string) => val + ':' + port)
            break
        }
   
    if (!dev) {
        const { host, port, publicName } = node
        const url = window.location
        const urlArr = url.search.split('&')
        urlArr[1] =  'hostname=' + publicName.split(',')[0]
        urlArr[2] = 'port=' + port
        const newUrl = url.origin + url.pathname + urlArr.join('&')
        history.pushState(',', newUrl)
    }
          
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
    
    function handleAllChosen () {
        let newSlectedNodes = [ ]
        if (selectedNodes.filter(node => node.mode === type).length < numOfNodes) 
            newSlectedNodes = nodes.filter(node => node.mode === type && !selectedNodes.includes(node)).concat(selectedNodes)
        else
            newSlectedNodes = selectedNodes.filter(node => node.mode !== type)        
        setSelectedNodes(newSlectedNodes)
        
    }
        
    const nodeType = [t('数据节点'), t('代理节点'), t('控制节点'),,  t('计算节点') ]
    return <>
        {type === NodeType.single ? 
            <Node node={node} type={type} key={node.name} 
            selectedNodes={[ ]} setSelectedNodes={() => { }}
            expanded switchFold={node => switchFold(node)}  />
        : (nodes.length ? 
        <div>
            <div className='nodes-header'>{nodeType[type] + ' (' + nodes.length + ')'}
                {type === NodeType.controller ? <div className='controller-site'>
                                                <div className='node-site' >{privateDomain}&nbsp;&nbsp;<a href={'//' + privateDomain} target='_blank'><Icon component={SvgExport} /></a></div>
                                                { publicDomain.map(val => <div className='node-site' key={val} ><span className='site-text'>{val}</span><a href={'//' + val} target='_blank'><Icon component={SvgExport} /></a></div>) }
                                            </div> 
                                        : (type !== NodeType.agent ? <div className='nodes-selectAll'>
                                                <Checkbox checked={selectedNodes.filter(node => node.mode === type).length === numOfNodes } indeterminate={selectedNodes.filter(node => node.mode === type).length && selectedNodes.filter(node => node.mode === type).length !== numOfNodes} onChange={() => handleAllChosen()} >
                                                    <div className='text-selectAll'>{t('全选')}</div>
                                                </Checkbox>
                                            </div> : null)}
            </div>
            {nodes.map(node => <Node node={node} type={type} key={node.name} 
                                        selectedNodes={selectedNodes} setSelectedNodes={setSelectedNodes}
                                        expanded={expandedNodes.some(item => item.name === node.name)} switchFold={node => switchFold(node)} />)}
            
        </div> : null)}
    </>
}

