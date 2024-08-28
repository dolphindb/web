import { t } from '@i18n/index.ts'
import { Button, Form, Input, InputNumber, Popover, Select, Table, TimePicker, Tooltip, type TableColumnsType } from 'antd'
import dayjs from 'dayjs'
import { useMemo } from 'react'
import useSWR from 'swr'

import { model } from '@/model.ts'

import { inspection } from './model.tsx'

const inspectionFrequencyOptions = [
    {
        label: '每日',
        value: 'daily',
    },
    {
        label: '每周',
        value: 'weekly',
    },
    {
        label: '每月',
        value: 'monthly',
    },
]

const metricGroups = ['集群基础信息', '集群运行状态', '服务器运行状态']

export function InspectionForm () {

    return <div className='inspection-form'>
        <h3>{t('指标列表')}</h3>
        <MetricTable/>
        
        <h3>{t('巡检周期')}</h3>
        <Form layout='inline'>
            <Form.Item label={t('巡检频率')} name='frequency'>
                <Select 
                    options={inspectionFrequencyOptions} 
                    defaultValue={inspectionFrequencyOptions[0].value}
                />
            </Form.Item>
            
            <Form.Item 
                label={t('巡检日期')} 
                dependencies={['frequency']} 
                shouldUpdate={(prevValues, curValues) => prevValues.frequency !== curValues.frequency}>
                {
                    ({ getFieldValue }) => {
                        const frequency = getFieldValue('frequency')
                        return <Form.Item name='date'>
                                <Select
                                    mode='multiple'
                                    defaultValue={[1]}
                                    // options={[ ]}
                                    className='date-select'
                                    optionLabelProp='value'
                                    options={Array.from({ length: frequency === 'monthly' ? dayjs().daysInMonth() : frequency === 'weekly' ? 7 : 1 }, (_, i) => i + 1).
                                        map(idx => ({
                                            label: t('第 {{day}} 天', { day: idx }),
                                            value: idx
                                        }))} 
                                    /> 
                        </Form.Item>
                    }
                }
            </Form.Item>
            
            <Form.Item label={t('巡检时间')} name='time'>
                <TimePicker />
            </Form.Item>
        </Form>
        
        <h3>{t('巡检计划描述')}</h3>
        <Input/>
        
        <div className='inspection-form-footer'>
            <Button>{t('取消')}</Button>
            <Tooltip title={t('保存当前方案并立即执行一次巡检')}>
                <Button type='primary'>{t('立即巡检')}</Button>
            </Tooltip>
            <Tooltip title={t('保存当前方案')}>
                <Button type='primary'>{t('保存')}</Button>
            </Tooltip>
        </div>
    </div>
}

function MetricTable () {
    const cols: TableColumnsType = useMemo(() => [ 
        {
            title: t('名称'),
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: t('分类'),
            dataIndex: 'group',
            key: 'group',
            render: (group: number) => metricGroups[group]
        },
        {
            title: t('描述'),
            dataIndex: 'desc',
            key: 'desc',
        },
        {
            title: t('版本'),
            dataIndex: 'version',
            key: 'version',
        },
        {
            title: t('创建时间'),
            dataIndex: 'createTime',
            key: 'createTime',
        },
        {
            title: t('更新时间'),
            dataIndex: 'updateTime',
            key: 'updateTime',
        },
        {
            title: t('巡检节点'),
            dataIndex: 'nodes',
            key: 'nodes',
        },
        {
            title: t('脚本内容'),
            dataIndex: 'script',
            key: 'script',
            render: (script: string) => <>
                <Popover content={<pre className='script-popover'>{script}</pre>} title={t('指标脚本')}>
                    <Button type='link'>{t('查看')}</Button>
                </Popover>
                <Button type='link' 
                    onClick={async () => {
                        await navigator.clipboard.writeText(script)
                        model.message.success(t('复制成功'))
                    }}>
                    {t('复制')}
                </Button>
            </>
        },
    ], [ ])
    
    const { data: metrics } = useSWR('get_metrics', inspection.get_metrics)
    
    return  <Table 
        rowSelection={{ type: 'checkbox' }} 
        key='name'
        dataSource={metrics} 
        columns={cols} 
    />
}
