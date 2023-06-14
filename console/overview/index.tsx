import './index.sass'

import { default as React, ReactNode, useState } from 'react'

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
    const { nodes } = model.use(['nodes'])
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
        
    const isChecked = {
        [t('控制节点')]: { allChosen: false, halfChosen: false, oneChosen: new Map() },
        [t('数据节点')]: { allChosen: false, halfChosen: false, oneChosen: new Map() },
        [t('计算节点')]: { allChosen: false, halfChosen: false, oneChosen: new Map() },
        [t('代理节点')]: { allChosen: false, halfChosen: false, oneChosen: new Map() }
    }
    
    const isFolded = {
        [t('控制节点')]:  new Map(),
        [t('数据节点')]:  new Map(),
        [t('计算节点')]:  new Map(),
        [t('代理节点')]:  new Map() 
    }
    
    controllerNodes.map(node => { isChecked[t('控制节点')].oneChosen.set(node.name, false), isFolded[t('控制节点')].set(node.name, node.isLeader ? true : false) })
    dataNodes.map(node => { isChecked[t('数据节点')].oneChosen.set(node.name, false), isFolded[t('数据节点')].set(node.name, true) })
    agentNodes.map(node => { isChecked[t('代理节点')].oneChosen.set(node.name, false), isFolded[t('代理节点')].set(node.name, true) })
    computingNodes.map(node => { isChecked[t('计算节点')].oneChosen.set(node.name, false), isFolded[t('计算节点')].set(node.name, true) })
    model.set({ nodeChecked: isChecked, nodeFolded: isFolded })
    
    return <>
        <div className='actions'>
            <div className='operations'>
                <Tooltip title={t('刷新信息')}>
                    <Button icon={<Icon className='icon-refresh' component={SvgRefresh} />}/> 
                </Tooltip>
                
                <Tooltip title={t('启动节点')}>
                    <Button icon={<Icon className='icon-start' component={SvgStart} />}/>
                </Tooltip>
                
                <Tooltip title={t('停止节点')}>
                    <Button icon={<Icon className='icon-stop' component={SvgStop} />}/>
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
    const publicDomain = Array.isArray(publicName) ? publicName.map(val => val + ':' + port) : publicName + ':' + port 
    
    
    const cpuInfo = { [t('占用')]: <div><div className='info-text'>{Math.round(cpuUsage) + '%'}</div><Progress percent={cpuUsage} showInfo={false} strokeColor='#FF7373' size={[100, 7]}/></div>,  
                        [t('work线程总数')]: <div className='info-text'>{workerNum}</div>, 
                        [t('平均负载')]: <div><div className='info-text'>{Math.round(avgLoad) + '%'}</div><Progress percent={avgLoad } showInfo={false} strokeColor='#A8EB7F' size={[100, 7]}/></div>,  
                        [t('executor线程总数')]: <div className='info-text'>{executorNum}</div> }
    const memoryInfo = { [t('用量')]: Number(memoryUsed) / (1024 * 1024) < 1024 ? <div>
                                <div className='info-text'>{(Number(memoryUsed) / (1024 * 1024)).toFixed(1) + ' MB / ' + maxMemSize + ' GB' }</div>
                                <Progress percent={(Number(memoryUsed) / (maxMemSize * 1024 * 1024 * 1024)) * 100} showInfo={false} strokeColor='#FF7373' size={[100, 7]}/>
                                </div> : <div>
                                <div className='info-text'>{(Number(memoryUsed) / (1024 * 1024 * 1024)).toFixed(1) + ' GB / ' + maxMemSize + ' GB' }</div>
                                <Progress percent={(Number(memoryUsed) / (maxMemSize * 1024 * 1024 * 1024)) * 100} showInfo={false} strokeColor='#FF7373' size={[100, 7]}/>
                                </div> 
                                , 
                            [t('已分配')]: <div className='info-text'>{(Number(memoryAlloc) / (1024 * 1024)).toFixed(1) + ' MB'}</div> }
    const diskInfo = {  [t('读取')]: <div className='info-text'>{(Number(diskReadRate) / 1024 ).toFixed(2) + ' KB/s'}</div>, 
                        [t('前一分钟读取')]: <div className='info-text'>{(Number(lastMinuteReadVolume) / 1024 ).toFixed(2) + ' KB'}</div>,
                        [t('写入')]:  <div className='info-text'>{(Number(diskWriteRate) / 1024 ).toFixed(2) + ' KB/s'}</div>,  
                        [t('前一分钟写入')]: <div className='info-text'>{(Number(lastMinuteWriteVolume) / 1024 ).toFixed(2) + ' KB'}</div>, 
                        [t('用量')]: Number(diskCapacity - diskFreeSpace) / (1024 * 1024) < 1024 ? <div>
                                <div className='info-text'>{(Number(diskCapacity - diskFreeSpace) / (1024 * 1024)).toFixed(1) + ' MB / ' + Math.round((Number(diskCapacity) / (1024 * 1024 * 1024))) + ' GB' }</div>
                                <Progress percent={(Number(diskCapacity - diskFreeSpace) / (Number(diskCapacity) * 1024 * 1024 * 1024)) * 100} showInfo={false} strokeColor='#FF7373' size={[100, 7]}/>
                            </div> : <div>
                                <div className='info-text'>{(Number(diskCapacity - diskFreeSpace) / (1024 * 1024 * 1024)).toFixed(1) + ' GB / ' + Math.round((Number(diskCapacity) / (1024 * 1024 * 1024))) + ' GB' }</div>
                                <Progress percent={(Number(diskCapacity - diskFreeSpace) / (Number(diskCapacity) * 1024 * 1024 * 1024)) * 100} showInfo={false} strokeColor='#FF7373' size={[100, 7]}/>
                            </div> }
    const newworkInfo = { [t('当前连接')]: <div className='info-text'>{connectionNum}</div>, 
                          [t('最大连接')]: <div className='info-text'>{maxConnections}</div>, 
                          [t('接收')]: <div className='info-text'>{(Number(networkRecvRate) / 1024 ).toFixed(2) + ' KB'}</div>, 
                          [t('前一分钟接收')]: <div className='info-text'>{(Number(lastMinuteNetworkRecv) / 1024 ).toFixed(2) + ' KB'}</div>, 
                          [t('发送')]: <div className='info-text'>{(Number(networkSendRate) / 1024 ).toFixed(2) + ' KB'}</div>, 
                          [t('前一分钟发送')]: <div className='info-text'>{(Number(lastMinuteNetworkSend) / 1024 ).toFixed(2) + ' KB'}</div> } 
    const taskInfo = { [t('运行作业')]: <div className='info-text'>{runningJobs}</div>,
                       [t('运行任务')]: <div className='info-text'>{runningTasks}</div>,  
                       [t('排队作业')]: <div className='info-text'>{queuedJobs}</div>, 
                       [t('排队任务')]: <div className='info-text'>{queuedTasks}</div>, 
                       [t('前一批消息延时')]: <div className='info-text'>{Number(lastMsgLatency) < Number.MIN_VALUE ? 0  + ' s' : Number(lastMsgLatency) + ' s'}</div>,  
                       [t('所有消息平均延时')]: <div className='info-text'>{Number(cumMsgLatency) < Number.MIN_VALUE ? 0  + ' s' : Number(cumMsgLatency) + ' s'}</div> }
                        
    function switchFold (event) {
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'A')
            return
        console.log(event.currentTarget.children[1].innerHTML)
        let currentNode = event.currentTarget.children[1].innerHTML
        let isFolded = model.nodeFolded
        isFolded[type].set(currentNode, !isFolded[type].get(currentNode))
        model.set({ nodeFolded: { ...isFolded } })
        // let parentNode = event.currentTarget.parentNode
        // let brotherNode = parentNode.children[1]
        // console.log(parentNode.children[1], parentNode.children[1].lastChild)
        // if (brotherNode.className === 'node-body')
        //     event.currentTarget.parentNode.children[1].className = 'node-body-fold'
        // else 
        //     event.currentTarget.parentNode.children[1].className = 'node-body'
    }
    
    function handeChange () {
        let isChecked = nodeChecked
        isChecked[type].oneChosen.set(name, !isChecked[type].oneChosen.get(name))
        let isHalfChecked = false
        let isAllChoosen = true
        let chosen = Array.from(isChecked[type].oneChosen.values())
        isHalfChecked = chosen.every(val => val === chosen[0])
        isAllChoosen = chosen.every(val => val)
        isChecked[type].halfChosen = !isHalfChecked
        isChecked[type].allChosen = isAllChoosen
        model.set({ nodeChecked: { ...isChecked } })
    }
    
    return <>
        <div className='node'>
            <div className={'node-header' + ' ' + nodeColor[mode]} onClick={e => switchFold(e)}>
                <div className='node-chosen'><Checkbox  checked={nodeChecked[type].oneChosen.get(name)} onChange={() => handeChange()}/></div>
                <div className='node-title'>{name}{isLeader ? <Tag className='leader-tag' color='#FFCA2F' >leader</Tag> : null}</div>
                <a className='node-site' href={privateDomain} target='_blank'>{privateDomain}&nbsp;&nbsp;<Icon component={SvgExport} /></a>
                { Array.isArray(publicDomain) ? 
                    publicDomain.map(val => <a className='node-site' href={val} target='_blank'>{val}&nbsp;&nbsp;<Icon component={SvgExport} /></a>) :  
                    <a className='node-site' href={publicDomain} target='_blank'>{publicDomain}&nbsp;&nbsp;<Icon component={SvgExport} /></a>}
                <div className={nodeStatus[state]}> </div>
            </div>
            <div className={nodeFolded[type].get(name) ? 'node-body' : 'node-body-fold'}>
                <NodeInfo title='CPU' icon={ SvgCPU } info={ cpuInfo }/>
                <NodeInfo title='内存' icon={ SvgMemory } info={ memoryInfo }/>
                <NodeInfo title='磁盘' icon={ SvgDisk } info={ diskInfo }/>
                <NodeInfo title='网络' icon={ SvgNetwork } info={ newworkInfo }/>
                <NodeInfo title='任务与作业' icon={ SvgTask } info={ taskInfo }/>
            </div>
        </div>
    </>
}

function NodeInfo ({
    title,
    icon,
    info
}: {
    title: string
    icon: any
    info: object
}) {
    return <>
        <div className='info-card'>
            <div className='info-title'>
                <Icon component={icon} />
                <div className='title-text'>{title}</div>
            </div>
            <div className='info-body'>
                <div className='info-table' >
                    {Object.keys(info).map((val, idx) => <InfoItem title={val} content={info[val]}/>)}
                </div>
            </div>
        </div>
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
    const { nodes } = model.use(['nodes'])
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
    const publicDomain = Array.isArray(publicName) ? publicName.map(val => val + ':' + port) : publicName + ':' + port 
    
    const { nodeChecked } = model.use(['nodeChecked'])
    function handleAllChosen (type) {
        let isChecked = nodeChecked
        let isHalfChecked = false
        let currentChecked = !isChecked[type].allChosen
        for (let [node, checked] of isChecked[type].oneChosen)
            isChecked[type].oneChosen.set(node, currentChecked)
        let chosen = Array.from(isChecked[type].oneChosen.values())
        isHalfChecked = chosen.every(val => val === chosen[0])
        isChecked[type].allChosen = !isChecked[type].allChosen
        isChecked[type].halfChosen = !isHalfChecked
        model.set({ nodeChecked: { ...isChecked } })
    }
    
    return <>
        <div className='content'>
            <div >{controllerNodes.length ? <div>
                    <div className='nodes-header'>{'控制节点' + ' (' + controllerNodes.length + ')'}
                    <a className='node-site' href={privateDomain} target='_blank'>{privateDomain}&nbsp;&nbsp;<Icon component={SvgExport} /></a>
                    { Array.isArray(publicDomain) ? 
                    publicDomain.map(val => <a className='node-site' href={val} target='_blank'>{val}&nbsp;&nbsp;<Icon component={SvgExport} /></a>) :  
                    <a className='node-site' href={publicDomain} target='_blank'>{publicDomain}&nbsp;&nbsp;<Icon component={SvgExport} /></a>}
                    </div>
                    {controllerNodes.map(node => <Node node={node} type='控制节点' key={node.name}/>)}
                </div> : null
                }
            </div>
            <div >{dataNodes.length ? <div>
                    <div className='nodes-header'>{'数据节点' + ' (' + dataNodes.length + ')'}<div className='nodes-selectAll'><Checkbox checked={model.nodeChecked['数据节点'].allChosen} indeterminate={model.nodeChecked['数据节点'].halfChosen} onChange={() => handleAllChosen('数据节点')} /></div><div className='text-selectAll'>全选</div></div>
                    {dataNodes.map(node => <Node node={node} type='数据节点' key={node.name}/>)}
                </div> : null
                }
            </div>
            <div >{computingNodes.length ? <div>
                    <div className='nodes-header'>{'计算节点' + ' (' + computingNodes.length + ')'}<div className='nodes-selectAll'><Checkbox checked={model.nodeChecked['计算节点'].allChosen} indeterminate={model.nodeChecked['计算节点'].halfChosen} onChange={() => handleAllChosen('计算节点')}/></div><div className='text-selectAll'>全选</div></div>
                    {computingNodes.map(node => <Node node={node} type='计算节点' key={node.name}/>)}
                </div> : null
                }
            </div>
            <div >{agentNodes.length ? <div>
                    <div className='nodes-header'>{'代理节点' + ' (' + agentNodes.length + ')'}<div className='nodes-selectAll'><Checkbox checked={model.nodeChecked['代理节点'].allChosen} indeterminate={model.nodeChecked['代理节点'].halfChosen} onChange={() => handleAllChosen('代理节点')}/></div><div className='text-selectAll'>全选</div></div>
                    {agentNodes.map(node => <Node node={node} type='代理节点' key={node.name}/>)}
                </div> : null
                }
            </div>
            
        </div>    
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

