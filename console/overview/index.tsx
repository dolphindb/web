import './index.sass'

import { Children, default as React, ReactNode, useState } from 'react'

import { Button, Modal, Tooltip, Progress, Tag, Checkbox } from 'antd'
import { default as _Icon,  SettingOutlined } from '@ant-design/icons'
const Icon: typeof _Icon.default = _Icon as any

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

export function Overview () {
    const { node_type, cdn } = model.use(['node_type', 'cdn'])
    setInterval(async () => model.get_cluster_perf(), 1000)
    
    return <>
        <div className='actions'>
            <div className='operations'>
                <Tooltip title={t('刷新信息')}>
                    <Button icon={<Icon className='icon-refresh' component={SvgRefresh}  onClick={() => { model.get_cluster_perf() }}/>}/> 
                </Tooltip>
                
                <Tooltip title={t('启动节点')}>
                    <Button icon={<Icon className='icon-start' component={SvgStart} onClick={() => { model.startNode() }}/>}/>
                </Tooltip>
                
                <Tooltip title={t('停止节点')}>
                    <Button icon={<Icon className='icon-stop' component={SvgStop} onClick={() => { model.stopNode() }}/>}/>
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
        <NodeCard/>
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
    type
}: {
    node: DdbNode
    type: string
}) {
    const nodeColor = ['data-color', 'agent-color', 'controller-color', '', 'computing-color']
    const nodeStatus = [ 'offline', 'online']
    const { nodeChecked, nodeFolded } = model.use(['nodeChecked', 'nodeFolded'])
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
        
        let isFolded  = nodeFolded
        if (isFolded[type].has(name))
            isFolded[type].delete(name)
        else
            isFolded[type].add(name)
        model.set({ nodeFolded: { ...isFolded } })
        
    }
    
    function handeChange () {
        let isChecked = nodeChecked
        if (isChecked[type].has(name))
            isChecked[type].delete(name)
        else
            isChecked[type].add(name)
        model.set({ nodeChecked: { ...isChecked } })
    }
    
    return <>
        <div className='node'>
            <div className={'node-header' + ' ' + nodeColor[mode] + (nodeFolded[type].has(name) ? ' node-header-fold' : '')} onClick={e => switchFold(e)}>
                <div className='node-chosen'><Checkbox  checked={nodeChecked[type].has(name)} onChange={() => handeChange()}/></div>
                <div className='node-title'><div className='node-name'>{name}</div>{isLeader ? <Tag className='leader-tag' color='#FFCA2F' >leader</Tag> : null}</div>
                <div className='node-site' >{privateDomain}&nbsp;&nbsp;<a href={privateDomain} target='_blank'><Icon component={SvgExport} /></a></div>
                { publicDomain.map(val => <div className='node-site' key={val}>{val}&nbsp;&nbsp;<a href={val} target='_blank'><Icon component={SvgExport} /></a></div>) }
                <div className={nodeStatus[state]}><span>{state ? t('已启动') : t('未启动')}</span></div>
            </div>
            <div className={nodeFolded[type].has(name) ? 'node-body-fold' : 'node-body'}>
                <NodeInfo title='CPU' icon={ SvgCPU } className='cpu-info'  >
                    <InfoItem title={t('CPU 占用率')} content={<div><InfoText >{Math.round(cpuUsage) + '%'}</InfoText><Progress percent={cpuUsage} showInfo={false} strokeColor='#FF7373' size={[100, 7]}/></div>}/>
                    <InfoItem title={t('work 线程数')} content={<InfoText>{workerNum}</InfoText>}/>
                    <InfoItem title={t('CPU 平均负载')} content={<div><InfoText>{Math.round(avgLoad) + '%'}</InfoText><Progress percent={avgLoad } showInfo={false} strokeColor='#A8EB7F' size={[100, 7]}/></div>}/>
                    <InfoItem title={t('executor 线程数')} content={<InfoText>{executorNum}</InfoText>}/>
                </NodeInfo>
                <NodeInfo title='内存' icon={ SvgMemory } className='memory-info' >
                    <InfoItem title={t('内存已用')} content={ <div><InfoText>{(Number(memoryUsed)).to_fsize_str() + ' / ' + maxMemSize + ' GB' }</InfoText>
                                                          <Progress percent={(Number(memoryUsed) / (maxMemSize * 1024 * 1024 * 1024)) * 100} showInfo={false} strokeColor='#FF7373' size={[100, 7]}/>
                                                         </div>
                                                        }/>
                    <InfoItem title={t('内存已分配')} content={ <InfoText>{(Number(memoryAlloc)).to_fsize_str()}</InfoText>}/>
                </NodeInfo>
                <NodeInfo title='磁盘' icon={ SvgDisk } className='disk-info'>
                    <InfoItem title={t('读速率')} content={<InfoText>{(Number(diskReadRate)).to_fsize_str() }</InfoText>}/>
                    <InfoItem title={t('前一分钟读入')} content={<InfoText>{(Number(lastMinuteReadVolume)).to_fsize_str()}</InfoText>}/>
                    <InfoItem title={t('写速率')} content={<InfoText>{(Number(diskWriteRate)).to_fsize_str()}</InfoText>}/>
                    <InfoItem title={t('前一分钟写入')} content={<InfoText>{(Number(lastMinuteWriteVolume)).to_fsize_str()}</InfoText>}/>
                    <InfoItem title={t('用量')} content={<div>
                                <InfoText>{(Number(diskCapacity - diskFreeSpace) ).to_fsize_str() + ' / ' + ((Number(diskCapacity))).to_fsize_str() }</InfoText>
                                <Progress percent={(Number(diskCapacity - diskFreeSpace) / (Number(diskCapacity) )) * 100} showInfo={false} strokeColor='#FF7373' size={[100, 7]}/>
                            </div> }/>
                </NodeInfo>
                <NodeInfo title='网络' icon={ SvgNetwork } className='network-info' >
                    <InfoItem title={t('当前连接')} content={<InfoText>{connectionNum}</InfoText>}/>
                    <InfoItem title={t('最大连接')} content={<InfoText>{maxConnections}</InfoText>}/>
                    <InfoItem title={t('接收速率')} content={<InfoText>{(Number(networkRecvRate)).to_fsize_str()}</InfoText>}/>
                    <InfoItem title={t('前一分钟接收')} content={<InfoText>{(Number(lastMinuteNetworkRecv)).to_fsize_str()}</InfoText>}/>
                    <InfoItem title={t('发送速率')} content={<InfoText>{(Number(networkSendRate)).to_fsize_str()}</InfoText>}/>
                    <InfoItem title={t('前一分钟发送')} content={<InfoText>{(Number(lastMinuteNetworkSend)).to_fsize_str()}</InfoText>}/>
                </NodeInfo>        
                <NodeInfo title='任务与作业' icon={ SvgTask } className='task-info' >
                    <InfoItem title={t('运行作业')} content={<InfoText>{runningJobs}</InfoText>}/>
                    <InfoItem title={t('运行任务')} content={<InfoText>{runningJobs}</InfoText>}/>
                    <InfoItem title={t('排队作业')} content={<InfoText>{queuedJobs}</InfoText>}/>
                    <InfoItem title={t('排队任务')} content={<InfoText>{queuedTasks}</InfoText>}/>
                    <InfoItem title={t('前一批消息延时')} content={<InfoText>{Number(lastMsgLatency) < Number.MIN_VALUE ? 0  + ' s' : Number(lastMsgLatency) + ' s'}</InfoText>}/>
                    <InfoItem title={t('所有消息平均延时')} content={<InfoText>{Number(cumMsgLatency) < Number.MIN_VALUE ? 0  + ' s' : Number(cumMsgLatency) + ' s'}</InfoText>}/>     
                </NodeInfo>
            </div>
            <div className={nodeFolded[type].has(name) ? 'node-footer-fold' : 'node-footer'}>
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

function InfoText ({
    children
}: {
   children: ReactNode 
}) {
    return <>
        <div className='info-text'>{children}</div>
    </>
}

function InfoItem ({
    title,
    content
}: {
    title: string
    content: string | number | ReactNode 
}) {
    return <>
        <div className='item-content'>
            <div className='item-title'>{title}</div>
            <div className='item-body'>{content}</div>
        </div>
    </>
}

function NodeCard () {
    const { nodes, nodeChecked, nodeWithType } = model.use(['nodes', 'nodeChecked', 'nodeWithType'])
    const controllerNodes: DdbNode[] = [ ]
    const dataNodes: DdbNode[] = [ ]
    const agentNodes: DdbNode[] = [ ]
    const computingNodes: DdbNode[] = [ ]
    for (let node of nodes)
        switch (node.mode) {
            case (NodeType.controller):
                controllerNodes.push(node)
                break
            case (NodeType.data):
                dataNodes.push(node)
                break
            case (NodeType.agent):
                agentNodes.push(node)
                break        
            case (NodeType.computing):
                computingNodes.push(node)
                break
            default:
                break
        }
        
    let leaderNode = null
    for (let node of controllerNodes)
        if (node.isLeader) {
            leaderNode = node
            break
        }
    const { host, port, publicName } = leaderNode
        
    const privateDomain = host + ':' + port
    const publicDomain =  publicName.split(',').map(val => val + ':' + port)
    
    function handleAllChosen (type) {
        let isChecked = nodeChecked
        if (isChecked[type].size < nodeWithType[type].length)
            for (let node of nodeWithType[type])
                isChecked[type].add(node)
        else if (isChecked[type].size === nodeWithType[type].length)
            isChecked[type].clear()
        model.set({ nodeChecked: { ...isChecked } })
    }
    
    return <>
        <div className='content'>
            <NodeContainer type='controllerNode' nodes={controllerNodes}/>
            <NodeContainer type='dataNode' nodes={dataNodes}/>
            <NodeContainer type='computingNode' nodes={computingNodes}/>
            <NodeContainer type='agentNode' nodes={agentNodes}/>
        </div>    
    </>
}

function NodeContainer ({
    type,
    nodes
}: {
    type: string
    nodes: DdbNode[]
}) {
    const { nodeChecked, nodeWithType } = model.use(['nodeChecked', 'nodeWithType'])
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
   
    function handleAllChosen (type) {
        let isChecked = nodeChecked
        if (isChecked[type].size < nodeWithType[type].length)
            for (let node of nodeWithType[type])
                isChecked[type].add(node)
        else if (isChecked[type].size === nodeWithType[type].length)
            isChecked[type].clear()
        model.set({ nodeChecked: { ...isChecked } })
    }
        
   
    
    const nodeType = { controllerNode: t('控制节点'), dataNode: t('数据节点'), computingNode: t('计算节点'), agentNode: t('代理节点') }
    return <>
        {nodes.length ? 
        <div>
            <div className='nodes-header'>{nodeType[type] + ' (' + nodes.length + ')'}
                {type === 'controllerNode' ? <div className='controller-site'>
                                                <div className='node-site' >{privateDomain}&nbsp;&nbsp;<a href={privateDomain} target='_blank'><Icon component={SvgExport} /></a></div>
                                                { publicDomain.map(val => <div className='node-site' key={val} >{val}&nbsp;&nbsp;<a href={val} target='_blank'><Icon component={SvgExport} /></a></div>) }
                                            </div> 
                                        : <div className='nodes-selectAll'>
                                                <Checkbox checked={nodeChecked[type].size === nodeWithType[type].length } indeterminate={nodeChecked[type].size && nodeChecked[type].size !== nodeWithType[type].length} onChange={() => handleAllChosen(type)} >
                                                    <div className='text-selectAll'>全选</div>
                                                </Checkbox>
                                            </div>}
            </div>
            {nodes.map(node => <Node node={node} type={type} key={node.name}/>)}
            
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

