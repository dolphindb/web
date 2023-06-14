import './cluster.sass'

import { default as React, ReactNode, useState } from 'react'

import { Button, Modal, Tooltip, Progress, Tag, Checkbox } from 'antd'
import { default as _Icon,  SettingOutlined } from '@ant-design/icons'
const Icon: typeof _Icon.default = _Icon as any

import SvgRefresh from './refresh.icon.svg'
import SvgStart from './start.icon.svg'
import SvgStop from './stop.icon.svg'
import SvgCPU from './cpu.icon.svg'
import SvgMemory from './memory.icon.svg'
import SvgDisk from './disk.icon.svg'
import SvgNetwork from './network.icon.svg'
import SvgTask from './task.icon.svg'
import SvgExport from './export.icon.svg'


import { t } from '../i18n/index.js'

import { NodeType, DdbNode, DdbNodeState, model } from './model.js'

export function Cluster () {
    const { node_type, cdn } = model.use(['node_type', 'cdn'])
    
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
    node
}: {
    node: DdbNode
}) {
    const nodeColor = ['data-color', 'agent-color', 'controller-color', '', 'computing-color']
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
        const publicDomain = Array.isArray(publicName) ? publicName.map(val => val + ':' + port) : publicName + ':' + port 
        
        function selectOne (event) {
            let parentNode = event.target.parentNode.parentNode.parentNode
            console.log(parentNode)
            let selectAllBox = parentNode.getElementsByClassName('nodes-selectAll')
            let selectBoxs = parentNode.getElementsByClassName('node-chosen')
            console.log(selectAllBox)
            console.log(selectBoxs)
            let isAllChosen = true
            let isOneChosen = false
            for (let selectBox of selectBoxs) {
                if (!selectBox.checked) {
                    isAllChosen = false
                    console.log(selectBox.checked)
                    break
                }
                if (selectBox.checked) 
                    isOneChosen = true
                
            }
            selectAllBox[0].checked = isAllChosen
            selectAllBox[0].indeterminate = true
            console.log(selectAllBox)
        }
        
        const cpuInfo = { 占用: <div><div className='info-text'>{Math.round(cpuUsage) + '%'}</div><Progress percent={cpuUsage} showInfo={false} strokeColor='#FF7373' size={[100, 7]}/></div>,  
                          work线程总数: <div className='info-text'>{workerNum}</div>, 
                          平均负载: <div><div className='info-text'>{Math.round(avgLoad) + '%'}</div><Progress percent={avgLoad } showInfo={false} strokeColor='#A8EB7F' size={[100, 7]}/></div>,  
                          executor线程总数: <div className='info-text'>{executorNum}</div> }
        const memoryInfo = { 用量: Number(memoryUsed) / (1024 * 1024) < 1024 ? <div>
                                    <div className='info-text'>{(Number(memoryUsed) / (1024 * 1024)).toFixed(1) + ' MB / ' + maxMemSize + ' GB' }</div>
                                    <Progress percent={(Number(memoryUsed) / (maxMemSize * 1024 * 1024 * 1024)) * 100} showInfo={false} strokeColor='#FF7373' size={[100, 7]}/>
                                  </div> : <div>
                                    <div className='info-text'>{(Number(memoryUsed) / (1024 * 1024 * 1024)).toFixed(1) + ' GB / ' + maxMemSize + ' GB' }</div>
                                    <Progress percent={(Number(memoryUsed) / (maxMemSize * 1024 * 1024 * 1024)) * 100} showInfo={false} strokeColor='#FF7373' size={[100, 7]}/>
                                  </div> 
                                  , 
                             已分配: <div className='info-text'>{(Number(memoryAlloc) / (1024 * 1024)).toFixed(1) + ' MB'}</div> }
        const diskInfo = { 读取: <div className='info-text'>{(Number(diskReadRate) / 1024 ).toFixed(2) + ' KB/s'}</div>, 
                           前一分钟读取: <div className='info-text'>{(Number(lastMinuteReadVolume) / 1024 ).toFixed(2) + ' KB'}</div>,
                           写入:  <div className='info-text'>{(Number(diskWriteRate) / 1024 ).toFixed(2) + ' KB/s'}</div>,  
                           前一分钟写入: <div className='info-text'>{(Number(lastMinuteWriteVolume) / 1024 ).toFixed(2) + ' KB'}</div>, 
                           用量: Number(diskCapacity - diskFreeSpace) / (1024 * 1024) < 1024 ? <div>
                                    <div className='info-text'>{(Number(diskCapacity - diskFreeSpace) / (1024 * 1024)).toFixed(1) + ' MB / ' + Math.round((Number(diskCapacity) / (1024 * 1024 * 1024))) + ' GB' }</div>
                                    <Progress percent={(Number(diskCapacity - diskFreeSpace) / (Number(diskCapacity) * 1024 * 1024 * 1024)) * 100} showInfo={false} strokeColor='#FF7373' size={[100, 7]}/>
                                </div> : <div>
                                    <div className='info-text'>{(Number(diskCapacity - diskFreeSpace) / (1024 * 1024 * 1024)).toFixed(1) + ' GB / ' + Math.round((Number(diskCapacity) / (1024 * 1024 * 1024))) + ' GB' }</div>
                                    <Progress percent={(Number(diskCapacity - diskFreeSpace) / (Number(diskCapacity) * 1024 * 1024 * 1024)) * 100} showInfo={false} strokeColor='#FF7373' size={[100, 7]}/>
                                </div> }
        const newworkInfo = { 当前连接: <div className='info-text'>{connectionNum}</div>, 
                              最大连接: <div className='info-text'>{maxConnections}</div>, 
                              接收: <div className='info-text'>{(Number(networkRecvRate) / 1024 ).toFixed(2) + ' KB'}</div>, 
                              前一分钟接收: <div className='info-text'>{(Number(lastMinuteNetworkRecv) / 1024 ).toFixed(2) + ' KB'}</div>, 
                              发送: <div className='info-text'>{(Number(networkSendRate) / 1024 ).toFixed(2) + ' KB'}</div>, 
                              前一分钟发送: <div className='info-text'>{(Number(lastMinuteNetworkSend) / 1024 ).toFixed(2) + ' KB'}</div> } 
        const taskInfo = { 运行作业: <div className='info-text'>{runningJobs}</div>,
                           运行任务: <div className='info-text'>{runningTasks}</div>,  
                           排队作业: <div className='info-text'>{queuedJobs}</div>, 
                           排队任务: <div className='info-text'>{queuedTasks}</div>, 
                           前一批消息延时: <div className='info-text'>{Number(lastMsgLatency) < Number.MIN_VALUE ? 0  + ' s' : Number(lastMsgLatency) + ' s'}</div>,  
                           所有消息平均延时: <div className='info-text'>{Number(cumMsgLatency) < Number.MIN_VALUE ? 0  + ' s' : Number(cumMsgLatency) + ' s'}</div> }
    
    function switchFold (event) {
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'A')
            return
        let parentNode = event.currentTarget.parentNode
        let brotherNode = parentNode.children[1]
        console.log(brotherNode.classList)
        if (brotherNode.className === 'node-body')
            event.currentTarget.parentNode.children[1].className = 'node-body-fold'
        else 
            event.currentTarget.parentNode.children[1].className = 'node-body'
    }
    return <>
        <div className='node'>
            <div className={'node-header' + ' ' + nodeColor[mode]} onClick={e => switchFold(e)}>
                <div className='node-chosen'><Checkbox  onClick={e => selectOne(e)}/></div>
                <div className='node-title'>{name}{isLeader ? <Tag className='leader-tag' color='#FFCA2F' >leader</Tag> : null}</div>
                <a className='node-site' href={privateDomain} target='_blank'>{privateDomain}&nbsp;&nbsp;<Icon component={SvgExport} /></a>
                { Array.isArray(publicDomain) ? 
                    publicDomain.map(val => <a className='node-site' href={val} target='_blank'>{val}&nbsp;&nbsp;<Icon component={SvgExport} /></a>) :  
                    <a className='node-site' href={publicDomain} target='_blank'>{publicDomain}&nbsp;&nbsp;<Icon component={SvgExport} /></a>}
                <div className={nodeStatus[state]}> </div>
            </div>
            <div className={isLeader ? 'node-body' : 'node-body-fold'}>
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
        
    function selectAll (event) {
        let element = event.currentTarget
        while (element && !element.classList.contains('nodes-header')) 
            element = element.parentNode
        
        console.log(element.parentNode)
        let selectBoxs = element.parentNode.getElementsByClassName('node-chosen')
        console.log(selectBoxs)
        for (let selectBox of selectBoxs) {
            // let checkbox = selectBox.getElementsByTagName('input')
            let checkbox = selectBox.children[0]
            console.log(checkbox)
            checkbox.checked =  event.currentTarget.checked
            console.log(checkbox.checked, event.currentTarget.checked)
        }
            
    }
          
    return <>
        <div className='content'>
            <div >{controllerNodes.length ? <div>
                    <div className='nodes-header'>{'控制节点' + ' (' + controllerNodes.length + ')'}</div>
                    {controllerNodes.map(node => <Node node={node} key={node.name}/>)}
                </div> : null
                }
            </div>
            <div >{dataNodes.length ? <div>
                    <div className='nodes-header'>{'数据节点' + ' (' + dataNodes.length + ')'}<div className='nodes-selectAll'><Checkbox  onClick={ e => selectAll(e)}/></div><div className='text-selectAll'>全选</div></div>
                    {dataNodes.map(node => <Node node={node} key={node.name}/>)}
                </div> : null
                }
            </div>
            <div >{computingNodes.length ? <div>
                    <div className='nodes-header'>{'计算节点' + ' (' + computingNodes.length + ')'}<Checkbox className='nodes-selectAll' onClick={ e => selectAll(e)}/><div className='text-selectAll'>全选</div></div>
                    {computingNodes.map(node => <Node node={node} key={node.name}/>)}
                </div> : null
                }
            </div>
            <div >{agentNodes.length ? <div>
                    <div className='nodes-header'>{'代理节点' + ' (' + agentNodes.length + ')'}<Checkbox className='nodes-selectAll' onClick={ e => selectAll(e)}/><div className='text-selectAll'>全选</div></div>
                    {agentNodes.map(node => <Node node={node} key={node.name}/>)}
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

