
import './index.sass'

import { t } from '@i18n/index.ts'
import { Button, Popconfirm, Spin, Result } from 'antd'

import useSWR from 'swr'

import { isNull } from 'lodash'

import { Outlet } from 'react-router-dom'

import { model, NodeType } from '@/model.ts'

import { inspection } from './model.tsx'


export function Inspection () {
    
    const { node_type } = model.use(['node_type'])
    
    const { table_created, inited, defined } = inspection.use(['table_created', 'inited', 'defined', 'current_report', 'current_plan', 'email_config'])
    
    useSWR(['inspection', table_created, inited], async () => {
        // 表已创建但未初始化需要 define 和 init
        if (table_created && !inited && node_type !== NodeType.controller) {
            await inspection.define()
            await inspection.init()
        }
    })
    
    if (node_type === NodeType.controller) 
        return <Result
        status='warning'
        className='interceptor'
        title={t('控制节点不支持自动化巡检，请跳转到数据节点或计算节点查看。')}
    />
    
    if (table_created !== null && !table_created) 
        return  <Result
        title={t('请点击下方按钮完成初始化')}
        subTitle={
            <>
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
                title={t('你确定要初始化自动化巡检功能吗？')}
                onConfirm={async () => { 
                    await inspection.create_table()
                    model.message.success(t('初始化自动化巡检成功！'))
                }}
                okText={t('确定')}
                cancelText={t('取消')}
                >
                <Button type='primary' size='large'>{t('初始化')}</Button>
            </Popconfirm>
        }
    />
    
    
    // table_created 未 null 代表未从 server 获取到 table_created 状态
    if (isNull(table_created) || !inited || !defined) 
        return <div className='spin-container'>
            <Spin size='large' delay={300}/>
        </div>
    
    
    return <Outlet />
        
}
