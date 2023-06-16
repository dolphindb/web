import './index.sass'

import { Children, default as React, ReactNode, useState, useEffect, useRef } from 'react'

import { Button, Modal, Tooltip, Progress, Tag, Checkbox } from 'antd'
import { default as _Icon,  SettingOutlined } from '@ant-design/icons'
const Icon: typeof _Icon.default = _Icon as any

import { t } from '../../i18n/index.js'

import { NodeType, DdbNode, model } from '../model.js'


import SvgRefresh from './icons/refresh.icon.svg'
import SvgStart from './icons/start.icon.svg'
import SvgStop from './icons/stop.icon.svg'
import SvgCPU from './icons/cpu.icon.svg'
import SvgMemory from './icons/memory.icon.svg'
import SvgDisk from './icons/disk.icon.svg'
import SvgNetwork from './icons/network.icon.svg'
import SvgTask from './icons/task.icon.svg'
import SvgExport from './icons/export.icon.svg'


import { t } from '../../i18n/index.js'

import { NodeType, DdbNode, DdbNodeState, model } from '../model.js'
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
    const initExpandedNodes = [ ]
   
    for (let node of nodes) 
        if ((node.mode === NodeType.controller && !node.isLeader) || node.mode !== NodeType.controller)
            initExpandedNodes.push(node)
    
    const numOfNodes = [nodes.filter(node => node.mode === NodeType.data).length, 
                        nodes.filter(node => node.mode === NodeType.agent).length, 
                        nodes.filter(node => node.mode === NodeType.controller).length, 
                        0, 
                        nodes.filter(node => node.mode === NodeType.computing).length]
    const [expandedNodes, setExpandedNodes] = useState(initExpandedNodes)
    
    return <>
        <div className='actions'>
            <div className='operations'>
                <Tooltip title={t('刷新信息')}>
                    <Button icon={<Icon className='icon-refresh' component={SvgRefresh}  onClick={() => { model.get_cluster_perf() }}/>}/> 
                </Tooltip>
                
                <Tooltip title={t('启动节点')}>
                    <Button icon={<Icon className='icon-start' component={SvgStart} onClick={() => { model.start_nodes(selectedNodes) }}/>}/>
                </Tooltip>
                
                <Tooltip title={t('停止节点')}>
                    <Button icon={<Icon className='icon-stop' component={SvgStop} onClick={() => { model.stop_nodes(selectedNodes) }}/>}/>
                </Tooltip>
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
        </div>
        
        <NodeCard numOfNodes={numOfNodes}selectedNodes={selectedNodes} setSelectedNodes={setSelectedNodes} expandedNodes={expandedNodes} setExpandedNodes={setExpandedNodes}/>
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
    numOfNodes,
    selectedNodes,
    setSelectedNodes,
    expandedNodes,
    setExpandedNodes
    
}: {
    node: DdbNode
    type: NodeType
    numOfNodes: number[]
    selectedNodes: DdbNode[]
    setSelectedNodes: Function
    expandedNodes: DdbNode[]
    setExpandedNodes: Function
}) {
    const nodeColor = ['data-color', 'agent-color', 'controller-color', '', 'computing-color']
    const titleColor = ['data-title-color', 'agent-title-color', 'controller-title-color', '', 'computing-title-color']
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
        
    const privateDomain = host + ':' + port
    const publicDomain = publicName.split(',').map(val => val + ':' + port) 
     
    
    function switchFold (event) {
        if (event.target.tagName === 'INPUT' || event.target.className === 'node-site' || event.target.className === 'node-name'  )
            return
        let newExpandedNodes = [ ]
        if (expandedNodes.every(node =>  node.name !== name)) 
            newExpandedNodes = [...expandedNodes, node]
         
        else 
            newExpandedNodes = expandedNodes.filter(node => node.mode !== type || node.name !== name)
        setExpandedNodes(newExpandedNodes)  
        
    }
    
    function handeChange () {
        let newSelectedNodes = [ ]
        if (selectedNodes.every(node => node.name !== name)) 
            newSelectedNodes = [...selectedNodes, node]
        else 
            newSelectedNodes = selectedNodes.filter(node => node.mode !== type || node.name !== name)
        setSelectedNodes(newSelectedNodes)
    }
    
    return <>
        <div className='node'>
            <div className={'node-header' + ' ' + nodeColor[mode] + (expandedNodes.some(node => node.mode === type && node.name === name) ? ' node-header-fold' : '')} onClick={e => switchFold(e)}>
                <div className='node-chosen'><Checkbox disabled={node.mode === NodeType.controller || node.mode === NodeType.agent} 
                                                       checked={selectedNodes.some(node => node.mode === type && node.name === name)} 
                                                       onChange={() => handeChange()}/>
                </div>
                <div className={'node-title' + ' ' + titleColor[mode]}><div className='node-name'>{name}</div>{isLeader ? <Tag className='leader-tag' color='#FFCA2F' >leader</Tag> : null}</div>
                <div className='node-site' ><span className='site-text'>{privateDomain}</span><a href={privateDomain} target='_blank'><Icon component={SvgExport} /></a></div>
                { publicDomain.map(val => <div className='node-site' key={val}><span className='site-text'>{val}</span><a href={val} target='_blank'><Icon component={SvgExport} /></a></div>) }
                <div className={nodeStatus[state]}><span>{state ? t('已启动') : t('未启动')}</span></div>
            </div>
            <div className={expandedNodes.some(node => node.mode === type && node.name === name)  ? 'node-body-fold' : 'node-body'}>
                <NodeInfo title='CPU' icon={SvgCPU} className='cpu-info'  >
                    {/* <InfoItem title={t('占用率')} Progress={() => Progress(cpuUsage, cpuUsage)}>{Math.round(cpuUsage) + '%'}</InfoItem> */}
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
                    <InfoItem title={t('读速率')}>{(Number(diskReadRate)).to_fsize_str() + '/s' }</InfoItem> 
                    <InfoItem title={t('前一分钟读入')}>{(Number(lastMinuteReadVolume)).to_fsize_str()}</InfoItem>
                    <InfoItem title={t('写速率')}>{(Number(diskWriteRate)).to_fsize_str() + '/s' }</InfoItem> 
                    <InfoItem title={t('前一分钟写入')}>{(Number(lastMinuteWriteVolume)).to_fsize_str()}</InfoItem>
                    <InfoItem title={t('用量')} Progress={<Progress percent={(Number(diskCapacity - diskFreeSpace) / (Number(diskCapacity) )) * 100} showInfo={false} strokeColor={(Number(diskCapacity - diskFreeSpace) / (Number(diskCapacity) )) * 100 > 67 ? '#FF8660' : ((Number(diskCapacity - diskFreeSpace) / (Number(diskCapacity) )) * 100 > 33 ? '#FFCE4F' : '#A8EB7F')} size={[100, 7]}/>}>
                        {(Number(diskCapacity - diskFreeSpace) ).to_fsize_str() + ' / ' + ((Number(diskCapacity))).to_fsize_str() }           
                    </InfoItem>
                </NodeInfo>
                <NodeInfo title='网络' icon={SvgNetwork} className='network-info' >
                    <InfoItem title={t('当前连接')}>{connectionNum}</InfoItem> 
                    <InfoItem title={t('最大连接')}>{maxConnections}</InfoItem>
                    <InfoItem title={t('接收速率')}>{(Number(networkRecvRate)).to_fsize_str() + '/s' }</InfoItem>
                    <InfoItem title={t('前一分钟接收')}>{(Number(lastMinuteNetworkRecv)).to_fsize_str()}</InfoItem>
                    <InfoItem title={t('发送速率')}>{(Number(networkSendRate)).to_fsize_str() + '/s' }</InfoItem>
                    <InfoItem title={t('前一分钟发送')}>{(Number(lastMinuteNetworkSend)).to_fsize_str()}</InfoItem>
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
            <div className={expandedNodes.some(node => node.mode === type && node.name === name)  ? 'node-footer-fold' : 'node-footer'}>
                <span>代理节点:a1</span> 
                <span className='node-version'>试用版 v2.00.9.7</span>
            </div>
        </div>
    </>
}


function NodeInfo ({
    title,
    icon,
    className,
    children,
}: {
    title: string
    icon: any
    className: string
    children: ReactNode
}) {
    return <>
        <div className={'info-card' + ' ' + className}>
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
    </>
    
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
    numOfNodes,
    selectedNodes,
    setSelectedNodes,
    expandedNodes,
    setExpandedNodes
    
}: {
    numOfNodes: number[]
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
    
    return <>
        <div className='content'>
            <NodeContainer type={NodeType.controller} nodes={controllerNodes} numOfNodes={numOfNodes}
                            selectedNodes={selectedNodes} setSelectedNodes={setSelectedNodes}
                            expandedNodes={expandedNodes} setExpandedNodes={setExpandedNodes} />
            <NodeContainer type={NodeType.data} nodes={dataNodes} numOfNodes={numOfNodes}
                            selectedNodes={selectedNodes} setSelectedNodes={setSelectedNodes}
                            expandedNodes={expandedNodes} setExpandedNodes={setExpandedNodes}/>
            <NodeContainer type={NodeType.computing} nodes={computingNodes} numOfNodes={numOfNodes}
                            selectedNodes={selectedNodes} setSelectedNodes={setSelectedNodes}
                            expandedNodes={expandedNodes} setExpandedNodes={setExpandedNodes}/>
            <NodeContainer type={NodeType.agent} nodes={agentNodes} numOfNodes={numOfNodes}
                            selectedNodes={selectedNodes} setSelectedNodes={setSelectedNodes}
                            expandedNodes={expandedNodes} setExpandedNodes={setExpandedNodes}/>
        </div>    
    </>
}

function NodeContainer ({
    type,
    nodes,
    numOfNodes,
    selectedNodes,
    setSelectedNodes,
    expandedNodes,
    setExpandedNodes
    
}: {
    type: NodeType
    nodes: DdbNode[]
    numOfNodes: number[]
    selectedNodes: DdbNode[]
    setSelectedNodes: Function
    expandedNodes: DdbNode[]
    setExpandedNodes: Function
}) {
    let leaderNode = null
    let privateDomain = ''
    let publicDomain = [ ]
    
    for (let node of nodes)
        if (node.isLeader) {
            leaderNode = node
            const { host, port, publicName } = leaderNode
            privateDomain = host + ':' + port
            publicDomain =  publicName.split(',').map(val => val + ':' + port)
            break
        }
   
    function handleAllChosen () {
        let newSlectedNodes = [ ]
        if (selectedNodes.filter(node => node.mode === type).length < numOfNodes[type]) 
            newSlectedNodes = nodes.filter(node => node.mode === type && !selectedNodes.includes(node)).concat(selectedNodes)
        else
            newSlectedNodes = selectedNodes.filter(node => node.mode !== type)        
        console.log(newSlectedNodes)
        setSelectedNodes(newSlectedNodes)
        
    }
        
   
    
    const nodeType = [t('数据节点'), t('代理节点'), t('控制节点'),,  t('计算节点'), ]
    return <>
        {nodes.length ? 
        <div>
            <div className='nodes-header'>{nodeType[type] + ' (' + nodes.length + ')'}
                {type === NodeType.controller ? <div className='controller-site'>
                                                <div className='node-site' >{privateDomain}&nbsp;&nbsp;<a href={privateDomain} target='_blank'><Icon component={SvgExport} /></a></div>
                                                { publicDomain.map(val => <div className='node-site' key={val} >{val}&nbsp;&nbsp;<a href={val} target='_blank'><Icon component={SvgExport} /></a></div>) }
                                            </div> 
                                        : (type !== NodeType.agent ? <div className='nodes-selectAll'>
                                                <Checkbox checked={selectedNodes.filter(node => node.mode === type).length === numOfNodes[type] } indeterminate={selectedNodes.filter(node => node.mode === type).length && selectedNodes.filter(node => node.mode === type).length !== numOfNodes[type]} onChange={() => handleAllChosen()} >
                                                    <div className='text-selectAll'>全选</div>
                                                </Checkbox>
                                            </div> : null)}
            </div>
            {nodes.map(node => <Node node={node} type={type} key={node.name} numOfNodes={numOfNodes}
                                        selectedNodes={selectedNodes} setSelectedNodes={setSelectedNodes}
                                        expandedNodes={expandedNodes} setExpandedNodes={setExpandedNodes} />)}
            
        </div> : null}
    </>
}

function use_modal () {
    const [visible, set_visible] = useState(false)
    
    return {
        visible,
        
        open () {
            set_visible(true)
        },
        
        close () {
            set_visible(false)
        }
    }
}

