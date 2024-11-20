import { t } from '@i18n/index.ts'
import { Button, Popconfirm, Spin, Result, Divider } from 'antd'

import useSWR from 'swr'

import { isNull } from 'lodash'

import type { ReactNode } from 'react'

import { model, NodeType } from '@/model.ts'

import { inspection } from '@/inspection/model.ts'


export function InspectionGuard ({ children }: { children: React.ReactNode }) {
    const { node_type } = model.use(['node_type'])
    
    const { table_created, inited, defined } = inspection.use(['table_created', 'inited', 'defined', 'email_config'])
    
    useSWR(['inspection', table_created, inited], async () => {
        // 表已创建但未初始化需要 define 和 init
        if (table_created && !inited && node_type !== NodeType.controller) {
            await inspection.define()
            await inspection.init()
        }
    })
    
    useSWR('check_inited', async () => {
        inspection.check_table_created()
    })
    
    if (node_type === NodeType.controller)
        return <Result
            status='warning'
            className='interceptor'
            title={t('控制节点不支持自动巡检，请跳转到数据节点或计算节点查看。')}
        />
    
    if (table_created !== null && !table_created) 
        return <div className='initialization-container'>
            <Result
                title={t('请点击下方按钮完成初始化')}
                subTitle={
                    <>
                        <div className='intro-container'>
                            <h3 className='intro-title'>{t('功能介绍')}</h3>
                            <div className='intro-list'>
                                {[
                                    t('系统监控：定期自动检查数据库性能指标，及时发现潜在问题'),
                                    t('计划任务：支持自定义巡检计划，可设置执行周期和检查项目'),
                                    t('报告生成：自动生成巡检报告，直观展示系统运行状况'),
                                    t('预警提醒：发现异常时及时通知，支持邮件告警配置'),
                                    t('历史追溯：保存历史巡检记录，便于问题分析和追踪')
                                ].map((item, index) => <div key={index} className='intro-item'>
                                        {`${index + 1}. ${item}`}
                                    </div>)}
                            </div>
                        </div>
                        <Divider />
                        <p>{t('初始化操作将新增以下数据库表：')}</p>
                        <p>dfs://autolnspection/metrics</p>
                        <p>dfs://autolnspection/planDetails</p>
                        <p>dfs://autolnspection/plans</p>
                        <p>dfs://autolnspection/reportDetails</p>
                        <p>dfs://autolnspection/reports</p>
                    </>
                }
                extra={
                    <Popconfirm
                        title={t('确定初始化自动巡检？')}
                        onConfirm={async () => { 
                            await inspection.create_table()
                            model.message.success(t('成功'))
                        }}
                        okText={t('确定')}
                        cancelText={t('取消')}
                    >
                        <Button type='primary' size='large'>{t('初始化')}</Button>
                    </Popconfirm>
                }
            />
        </div>
    
    // table_created 未 null 代表未从 server 获取到 table_created 状态
    if (isNull(table_created) || !inited || !defined) 
        return <div className='spin-container'>
            <Spin size='large' delay={300}/>
        </div>
    return <>{children}</>
}


export function wrapWithGuard (children: ReactNode) {
    return <InspectionGuard>{children}</InspectionGuard>
}
