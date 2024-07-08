import { Tag, Popover, Descriptions, Card, Tooltip } from 'antd'
import { SyncOutlined } from '@ant-design/icons'

import { t } from '../../i18n/index.js'

import { model, NodeType } from '../model.js'


const uppercase_node_types = {
    [NodeType.data]: t('数据节点', { context: 'node_type_title' }),
    [NodeType.controller]: t('控制节点', { context: 'node_type_title' }),
    [NodeType.single]: t('单机节点', { context: 'node_type_title' }),
    [NodeType.computing]: t('计算节点', { context: 'node_type_title' }),
}

const lowercase_node_types = {
    [NodeType.data]: t('数据节点', { context: 'node_type' }),
    [NodeType.controller]: t('控制节点', { context: 'node_type' }),
    [NodeType.single]: t('单机节点', { context: 'node_type' }),
    [NodeType.computing]: t('计算节点', { context: 'node_type' }),
}


export function Status () {
    const { node_type, node_alias } = model.use(['node_type', 'node_alias'])
    
    return <Popover
        placement='bottomRight'
        zIndex={1060}
        trigger='hover'
        content={
            <div className='head-bar-info'>
                <Card
                    size='small'
                    title={uppercase_node_types[node_type] + t('状态', { context: 'node_type' })}
                    bordered={false}
                    extra={
                        <div
                            className='refresh'
                            onClick={() => { model.get_cluster_perf(true) }}
                        >
                            <Tooltip title={t('刷新')} color='grey'>
                                <SyncOutlined className='icon' />
                            </Tooltip>
                        </div>
                    }
                >
                    <div className='status-description'>
                        <Performance />
                    </div>
                </Card>
            </div>
        }
    >
        <Tag
            className='node-info'
            color='#f2f2f2'
            onMouseOver={() => { model.get_cluster_perf(true) }}
        >{lowercase_node_types[node_type]} {node_alias}</Tag>
    </Popover>
}


function Performance () {
    const { node } = model.use(['node'])
    
    if (!node)
        return null
        
    return <div className='perf'>
        <Descriptions className='table' column={2} bordered size='small' title={t('内存', { context: 'perf' })}>
            <Descriptions.Item label={t('内存已用')}>
                {Number(node.memoryUsed).to_fsize_str()}
            </Descriptions.Item>
            <Descriptions.Item label={t('内存已分配')}>
                {Number(node.memoryAlloc).to_fsize_str()}
            </Descriptions.Item>
            <Descriptions.Item label={t('节点内存空间上限')}>
                {node.maxMemSize} GB
            </Descriptions.Item>
        </Descriptions >
        <Descriptions className='table' column={2} bordered size='small' title='CPU'>
            < Descriptions.Item label={t('CPU 占用率')} >
                {node.cpuUsage.toFixed(1)} %
            </Descriptions.Item >
            <Descriptions.Item label={t('CPU 平均负载')}>
                {node.avgLoad.toFixed(1)}
            </Descriptions.Item>
            <Descriptions.Item label={t('worker 线程总数')}>
                {node.workerNum}
            </Descriptions.Item>
        </Descriptions >
        <Descriptions className='table' column={2} bordered size='small' title={t('磁盘')}>
            <Descriptions.Item label={t('磁盘读速率')}>
                {Number(node.diskReadRate).to_fsize_str()}/s
            </Descriptions.Item>
            <Descriptions.Item label={t('磁盘写速率')}>
                {Number(node.diskWriteRate).to_fsize_str()}/s
            </Descriptions.Item>
            <Descriptions.Item label={t('前一分钟读磁盘量')}>
                {Number(node.lastMinuteReadVolume).to_fsize_str()}
            </Descriptions.Item>
            <Descriptions.Item label={t('前一分钟写磁盘量')}>
                {Number(node.lastMinuteWriteVolume).to_fsize_str()}
            </Descriptions.Item>
            { (node.mode !== NodeType.controller && node.mode !== NodeType.computing) && <>
                <Descriptions.Item label={t('磁盘剩余容量')}>
                    {Number(node.diskFreeSpace).to_fsize_str()}
                </Descriptions.Item>
                <Descriptions.Item label={t('磁盘总容量')}>
                    {Number(node.diskCapacity).to_fsize_str()}
                </Descriptions.Item>
                <Descriptions.Item label={t('磁盘可用空间占比')}>
                    {(node.diskFreeSpaceRatio * 100).toFixed(2)}%
                </Descriptions.Item>
            </> }
        </Descriptions >
        <Descriptions className='table' column={2} bordered size='small' title={t('网络', { context: 'perf' })}>
            <Descriptions.Item label={t('当前连接')}>
                {node.connectionNum}
            </Descriptions.Item>
            <Descriptions.Item label={t('最大连接')}>
                {node.maxConnections}
            </Descriptions.Item>
            <Descriptions.Item label={t('网络接收速率')}>
                {Number(node.networkRecvRate).to_fsize_str()}/s
            </Descriptions.Item>
            <Descriptions.Item label={t('网络发送速率')}>
                {Number(node.networkSendRate).to_fsize_str()}/s
            </Descriptions.Item>
            <Descriptions.Item label={t('前一分钟接收字节数')}>
                {Number(node.lastMinuteNetworkRecv).to_fsize_str()}
            </Descriptions.Item>
            <Descriptions.Item label={t('前一分钟发送字节数')}>
                {Number(node.lastMinuteNetworkSend).to_fsize_str()}
            </Descriptions.Item>
        </Descriptions >
        <Descriptions className='table' column={2} bordered size='small' title={t('任务与作业')}>
            <Descriptions.Item label={t('排队作业')}>
                {node.queuedJobs}
            </Descriptions.Item>
            <Descriptions.Item label={t('运行作业')}>
                {node.runningJobs}
            </Descriptions.Item>
            <Descriptions.Item label={t('排队任务')}>
                {node.queuedTasks}
            </Descriptions.Item>
            <Descriptions.Item label={t('运行任务')}>
                {node.runningTasks}
            </Descriptions.Item>
            {
                Number(node.lastMsgLatency) >= 0 ? <Descriptions.Item label={t('前一批消息延时')}>
                    {Number(node.lastMsgLatency).to_fsize_str()} s
                </Descriptions.Item> : null
            }
            {
                Number(node.cumMsgLatency) >= 0 ? <Descriptions.Item label={t('所有消息平均延时')}>
                    {Number(node.cumMsgLatency).to_fsize_str()} s
                </Descriptions.Item> : null
            }
            <Descriptions.Item label={t('作业负载')}>
                {node.jobLoad}
            </Descriptions.Item>
        </Descriptions >
    </div>
}
