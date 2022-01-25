import './shell.old.sass'

import React from 'react'
import { Descriptions } from 'antd'

import { t } from '../i18n'
import model from './model'


export function ShellOld () {
    const { node } = model.use(['node'])
    
    return <>
        { node && <Descriptions
            column={8}
            bordered
            size='small'
            contentStyle={{
                color: 'rgb(106, 90, 205)'
            }}
        >
            <Descriptions.Item label={t('内存使用量')}>{Number(node.memoryUsed).to_fsize_str()}</Descriptions.Item>
            <Descriptions.Item label={t('CPU 使用量')}>{node.cpuUsage.toFixed(1)}%</Descriptions.Item>
            <Descriptions.Item label={t('当前连接 | 最大连接')}>{node.connectionNum} | {node.maxConnections}</Descriptions.Item>
            <Descriptions.Item label={t('硬盘读取 | 硬盘写入')}>{node.diskReadRate} | {node.diskWriteRate}</Descriptions.Item>
            <Descriptions.Item label={t('网络接收 | 网络发送')}>{node.networkRecvRate} | {node.networkSendRate}</Descriptions.Item>
            <Descriptions.Item label={t('排队作业 | 运行作业')}>{node.queuedJobs} | {node.runningJobs}</Descriptions.Item>
            <Descriptions.Item label={t('排队任务 | 运行任务')}>{node.queuedTasks} | {node.runningTasks}</Descriptions.Item>
            <Descriptions.Item label='Workers'>{node.workerNum}</Descriptions.Item>
        </Descriptions> }
        
        <iframe src='./nodedetail.html' width='100%' />
    </>
}

export default ShellOld
