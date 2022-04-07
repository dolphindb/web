import './shell.old.sass'

import React from 'react'
import { Descriptions } from 'antd'
import { SyncOutlined } from '@ant-design/icons'

import { t } from '../i18n'
import { model } from './model'


export function ShellOld () {
    return <>
        <Perf />
        <iframe src='./nodedetail.html' width='100%' />
    </>
}

function Perf () {
    const { node } = model.use(['node'])
    
    if (!node)
        return null
    
    return <div className='perf'>
        <Descriptions
            className='table'
            column={9}
            bordered
            size='small'
            layout='vertical'
        >
            <Descriptions.Item label={t('内存已用 (已分配) / 最大可用')}>{Number(node.memoryUsed).to_fsize_str()} ({Number(node.memoryAlloc).to_fsize_str()}) / {node.maxMemSize} GB</Descriptions.Item>
            <Descriptions.Item label={t('CPU 用量 (平均负载)')}>{node.cpuUsage.toFixed(1)}% ({node.avgLoad.toFixed(1)})</Descriptions.Item>
            <Descriptions.Item label={t('当前连接 | 最大连接')}>{node.connectionNum} | {node.maxConnections}</Descriptions.Item>
            <Descriptions.Item label={t('硬盘读取 | 硬盘写入')}>{Number(node.diskReadRate).to_fsize_str()}/s | {Number(node.diskWriteRate).to_fsize_str()}/s</Descriptions.Item>
            <Descriptions.Item label={t('网络接收 | 网络发送')}>{Number(node.networkRecvRate).to_fsize_str()}/s | {Number(node.networkSendRate).to_fsize_str()}/s</Descriptions.Item>
            <Descriptions.Item label={t('排队作业 | 运行作业')}>{node.queuedJobs} | {node.runningJobs}</Descriptions.Item>
            <Descriptions.Item label={t('排队任务 | 运行任务')}>{node.queuedTasks} | {node.runningTasks}</Descriptions.Item>
            <Descriptions.Item label='Workers'>{node.workerNum} | {node.executorNum} | {node.jobLoad}</Descriptions.Item>
        </Descriptions>
        
        <div
            className='refresh'
            onClick={() => {
                model.get_cluster_perf()
            }}
        >
            <SyncOutlined className='icon' />
            <div className='text'>{t('刷新')}</div>
        </div>
    </div>
}
