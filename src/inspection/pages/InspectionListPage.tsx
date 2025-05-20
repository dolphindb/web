import { CheckOutlined, CloseOutlined, DeleteOutlined, MailOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import NiceModal from '@ebay/nice-modal-react'
import { t } from '@i18n'
import { Button, DatePicker, Input, Popconfirm, Space, Table, Tooltip, Typography, type TableColumnsType } from 'antd'

import { useEffect, useMemo, useState } from 'react'

import useSWR from 'swr'

import type { Dayjs } from 'dayjs'

import { datetime_format } from 'xshell/utils.browser.js'

import { model } from '@model'

import { EmailConfigModal } from '@/inspection/modals/EmailConfigModal.tsx'
import { inspection } from '@/inspection/model.ts'
import type { Plan, PlanReport } from '@/inspection/type.ts'
import { LogModal } from '@/inspection/modals/LogModal.tsx'
import { RefreshButton } from '@/components/RefreshButton/index.tsx'
import { DDBTable } from '@/components/DDBTable/index.tsx'
import { DeleteReportsModal } from '@/inspection/components/DeleteReportsModal.tsx'
import { DeletePlansModal } from '@/inspection/components/DeletePlansModal.tsx'
import create_metrics_script from '@/inspection/scripts/init.dos'


export function InspectionListPage () {
    const [search_key, set_search_key] = useState('')
    const [search_input_value, set_search_input_value] = useState('')
    const { defined, email_config } = inspection.use(['defined', 'email_config'])
    
    const [refresh, set_refresh] = useState(0)
    const refresher = useMemo(() => () => { set_refresh(cnt => cnt + 1) }, [ ])
    
    
    useEffect(() => {
        async function checkMetrics () {
            const metricsUpdated = await model.ddb.invoke('areMetricsUpdated', [WEB_VERSION])
            if (!metricsUpdated) {
                await model.ddb.execute(create_metrics_script)
                await model.ddb.invoke('setMetricsUpdated', [WEB_VERSION])
                console.log(t('指标已更新'))
            }
        }
        checkMetrics()
    }, [ ])
    
    return <div>
            <div className='inspection-header'>
                <Input.Search 
                    placeholder={t('请输入巡检名称')} 
                    value={search_input_value}
                    onChange={e => { set_search_input_value(e.target.value) }}
                    onSearch={set_search_key} 
                    className='inspection-search'
                />
                
                <Button 
                    type='primary'
                    icon={<PlusOutlined />}
                    onClick={() => { model.goto('/inspection/plan/new') }}>
                    {t('新增巡检')}
                </Button>
                
                {!email_config.can_config ? (
                <Tooltip title={<div style={{ whiteSpace: 'pre-wrap' }}>{email_config.error_msg}</div>}>
                    <Button
                        icon={<MailOutlined />}
                        disabled
                        onClick={ () => { NiceModal.show(EmailConfigModal) } }>
                            {t('邮件告警设置')}
                    </Button>
                </Tooltip>
                ) : (
                    <Button
                        icon={<MailOutlined />}
                        disabled={false}
                        onClick={ () => { NiceModal.show(EmailConfigModal) } }>
                            {t('邮件告警设置')}
                    </Button>
                )}
                
            
                <RefreshButton 
                    onClick={() => {
                        set_search_input_value('')
                        set_search_key('')
                        refresher()
                        model.message.success(t('刷新成功'))
                    }}/>
                
              
            </div>
            
            {
            defined &&  
            <Space direction='vertical' size='large' style={{ width: '100%' }}>
                <PlanListTable enabled search_key={search_key}  refresh={refresh} refresher={refresher}/>
                <PlanListTable search_key={search_key} refresh={refresh} refresher={refresher}/>
                <ReportListTable
                    search_key={search_key} 
                    refresh={refresh}
                    refresher={refresher}
                />
            </Space>
        }
        </div>
}


function ReportListTable  ({
    search_key,
    refresh,
    refresher
}: {
    search_key: string
    refresh: number
    refresher: () => void
}) {    
    const { inited } = inspection.use(['inited'])
    
    const [ids, set_ids] = useState([ ])
    
    const [current_page, set_current_page] = useState(1)
    
    const [current_page_size, set_current_page_size] = useState(5)
    
    const [sorter, set_sorter] = useState<[string, 0 | 1] | null>(['receivedTime', 0])
    
    const [success, set_success] = useState<number | null>(null)
    
    const [dates, set_dates] = useState<[Dayjs | null, Dayjs | null] | null>([ null, null ])
    
    useEffect(() => {
        // 刷新重新定位到第一页
        set_current_page(1)
    }, [refresh])
    
    const { data: reports_obj, mutate: mutate_reports } = 
        useSWR([inited, refresh, 'get_reports', dates, sorter, success, current_page, current_page_size, search_key], async () =>  {
            if (inited) {
                const [startTime, endTime] = Array.isArray(dates) ? dates.map(d => d && d.format(datetime_format)) : [null, null]
                return inspection.get_reports(null, null, startTime, endTime, success, current_page, current_page_size, search_key, sorter[0], sorter[1])
            }
            else 
                inspection.define()
    }, { keepPreviousData: true })
    
    
    const cols: TableColumnsType<PlanReport> = useMemo(() => [ 
        {
            title: t('ID'),
            dataIndex: 'planId',
            key: 'planId',
        },
        {
            title: t('名称'),
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: t('描述'),
            dataIndex: 'desc',
            key: 'desc',
        },
        {
            title: t('提交人'),
            dataIndex: 'user',
            key: 'user',
        },
        {
            title: t('收到巡检计划时间'),
            dataIndex: 'receivedTime',
            key: 'receivedTime',
            sorter: true,
        },
        {
            title: t('开始时间'),
            dataIndex: 'startTime',
            key: 'startTime',
        },
        {
            title: t('结束时间'),
            dataIndex: 'endTime',
            key: 'endTime',
        },
        {
            title: t('结果'),
            dataIndex: 'success',
            key: 'success',
            filterMultiple: false,
            filters: [
                {
                    text: t('正常'),
                    value: 1,
                },
                {
                    text: t('异常'),
                    value: 0,
                },
                {
                    text: t('执行中'),
                    value: 2,
                },
              ],
            sorter: true,
            render: ( success: boolean | null, record) => success === null ? <span className='yellow'>{t('执行中')}</span> : success ? 
                <span className='green'>{t('{{success}}/{{total}} 正常', { success: record.totalNum, total: record.totalNum })}</span> : 
                <span className='red'>{t('{{failedNum}}/{{total}} 异常', { failedNum: record.failedNum, total: record.totalNum })}</span>
        },
        {
            title: t('操作'),
            dataIndex: 'action',
            key: 'action',
            fixed: 'right',
            render: (_, record) => <Space size={10}>
                    {record.success === null && 
                        <Typography.Link
                            onClick={async () => {
                                await inspection.cancel_running_plan(record.id)
                                model.message.success(t('取消执行成功'))
                                mutate_reports()
                            }}
                        >
                            {t('取消执行')}
                        </Typography.Link>
                    }
            
                    <Typography.Link
                        disabled={record.success === null}
                        onClick={() => { model.goto(`/inspection/report/${record.id}`) }}
                    >
                        {t('查看详细报告')}
                    </Typography.Link>
                    
                    <Typography.Link
                        disabled={!record.startTime}
                        onClick={() => { NiceModal.show(LogModal, { report_id: record.id, node: record.enabledNode }) }}
                    >
                        {t('查看日志')}
                    </Typography.Link>
                    
                    <Popconfirm   
                        title={t('删除巡检结果')} 
                        description={t('确认删除此巡检结果吗？')} 
                        okButtonProps={{ type: 'primary', danger: true }}
                        onConfirm={async () => { 
                            await inspection.delete_reprorts([record.id])
                            model.message.success(t('删除成功'))
                            refresher()
                        }} >
                        <Typography.Link
                            disabled={record.success === null}
                            type='danger'
                        >
                        {t('删除')}
                        </Typography.Link>
                    </Popconfirm> 
                </Space>
               
                
        },
    ], [ ])
    
    return <DDBTable
                scroll={{ x: 'max-content' }}
                buttons={
                    <Button 
                        icon={<DeleteOutlined />} 
                        danger 
                        disabled={ids.length === 0}
                        onClick={() => {
                            if (ids.length) 
                                NiceModal.show(DeleteReportsModal, { 
                                    ids,
                                    refresher,
                                    set_current_page 
                                })
                            
                        }}
                    >
                        {t('批量删除')}
                    </Button>
                }
                title={t('巡检结果')}
                filter_form={
                    <DatePicker.RangePicker 
                    value={dates} 
                    onChange={set_dates} 
                    showTime 
                    placeholder={[t('开始时间'), t('结束时间')]}/>
                }
                onChange={(_, filter, sorter) => {
                    if (filter?.success && filter.success.length > 0) 
                        set_success(Number(filter.success[0]))
                    else
                        set_success(null)
                    
                    if (Array.isArray(sorter))
                        sorter = sorter[0]
                    if (sorter.order) 
                        set_sorter([String(sorter.field), sorter.order === 'ascend' ? 1 : 0])
                }}
                rowSelection={{ type: 'checkbox', selectedRowKeys: ids, onChange: set_ids }}
                dataSource={reports_obj?.records} 
                columns={cols}
                rowKey='id' 
                pagination={{
                    current: current_page,
                    pageSize: current_page_size,
                    pageSizeOptions: [5, 10, 20, 50, 100],
                    total: Number(reports_obj?.total),
                    showSizeChanger: true,
                    onChange: (current_page, current_page_size) => {
                        set_current_page(current_page)
                        set_current_page_size(current_page_size)
                    }
            }} 
        />
}

function PlanListTable  ({
    search_key,
    enabled = false,
    refresh,
    refresher
}: {
    search_key: string
    enabled?: boolean
    refresh: number
    refresher: () => void
}) {
    const { inited } = inspection.use(['inited'])
    
    const [ids, set_ids] = useState([ ])
    
    useEffect(() => {
        // 刷新重新定位到第一页
        set_current_page(1)
    }, [refresh])
    
    const [current_page, set_current_page] = useState(1)
    const [current_page_size, set_current_page_size] = useState(5)
    
    const { data: plans_obj, mutate: mutate_plans } = 
        useSWR([inited, 'get_plans',  enabled, search_key, refresh, current_page, current_page_size], async () => {
            if (inited) 
                return inspection.get_plans(enabled, current_page, current_page_size, search_key)
            else 
                inspection.define()
    }, { keepPreviousData: true })
    
    const cols: TableColumnsType<Plan> = useMemo(() => [ 
        {
            title: t('ID'),
            dataIndex: 'id',
            key: 'id',
        },
        {
            title: t('名称'),
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: t('描述'),
            dataIndex: 'desc',
            key: 'desc',
        },
        {
            title: t('提交人'),
            dataIndex: 'user',
            key: 'user',
        },
        {
            title: t('开始日期'),
            dataIndex: 'startDate',
            key: 'startDate',
        },
        {
            title: t('结束日期'),
            dataIndex: 'endDate',
            key: 'endDate',
        },
        {
            title: t('巡检频率'),
            dataIndex: 'frequency',
            key: 'frequency',
        },
        {
            title: t('巡检日期'),
            dataIndex: 'days',
            key: 'days',
        },
        {
            title: t('巡检时间'),
            dataIndex: 'scheduleTime',
            key: 'scheduleTime',
            render: (scheduleTime: string[]) => scheduleTime.join(', ')
        },
        {
            title: t('操作'),
            dataIndex: 'action',
            key: 'action',
            fixed: 'right',
            render: (_, record) => 
                <Space size={10}>
                     <Popconfirm
                        placement='topLeft'
                        title={t('确定巡检')}
                        description={t('确定立即巡检 {{name}} 吗？', { name: record.name })}
                        okText={t('确定')}
                        cancelText={t('取消')}
                        okButtonProps={{ type: 'primary' }}
                        onConfirm={async () => {
                            await inspection.run_plan(record.id)
                            model.message.success(t('执行成功'))
                            refresher()
                        }}
                        >
                        <Typography.Link 
                            >
                        {t('立即巡检')}
                        </Typography.Link>
                    </Popconfirm>
                   
                    <Typography.Link 
                        onClick={() => { model.goto(`/inspection/plan/${record.id}`, { queries: { disabled: '1' } }) }}
                    >
                        {t('查看详情')}
                    </Typography.Link>
                    
                    <Typography.Link 
                        disabled={record.lastReportId === ''}
                        onClick={() => { model.goto(`/inspection/report/${record.lastReportId}`) }}
                    >
                        {t('查看最近一次巡检结果')}
                    </Typography.Link>
                    <Typography.Link 
                        onClick={async () => {
                            if (enabled) 
                                await inspection.disable_plan(record.id) 
                            else
                                await inspection.enable_plan(record.id)
                            model.message.success(t('执行成功'))
                            // 这里需要全局刷新
                            refresher()
                        }}
                    >
                        {enabled ?  t('暂停') : t('启用')}
                    </Typography.Link>
                    <Popconfirm 
                        title={t('删除方案')} 
                        description={t('确认删除巡检方案 {{plan}} 吗？', { plan: record.name })} 
                        okButtonProps={{ type: 'primary', danger: true }}
                        onConfirm={async () => {
                            await inspection.delete_plans([record.id])
                            model.message.success(t('删除成功'))
                            mutate_plans()
                        }} >
                        <Typography.Link type='danger' >{t('删除')}</Typography.Link>
                    </Popconfirm> 
                </Space>
        },
    ], [refresher])
    
    return <DDBTable
        title={enabled ? t('正在执行的巡检计划') : t('待执行的巡检计划')}
        scroll={{ x: 'max-content' }}
        buttons={
            <Button 
                icon={<DeleteOutlined />} 
                danger 
                disabled={ids.length === 0}
                onClick={() => {
                    if (ids.length) 
                        NiceModal.show(DeletePlansModal, { 
                            ids,
                            refresher,
                            set_current_page
                        })
                }}
            >
                {t('批量删除')}
            </Button>
        }
        rowSelection={{ type: 'checkbox', selectedRowKeys: ids, onChange: set_ids }}
        pagination={{
            current: current_page,
            pageSize: current_page_size,
            pageSizeOptions: [5, 10, 20, 50, 100],
            total: plans_obj?.total || 0,
            showSizeChanger: true,
            onChange: (current_page, current_page_size) => {
                set_current_page(current_page)
                set_current_page_size(current_page_size)
            }
        }} 
        rowKey='id' 
        dataSource={plans_obj?.records} 
        columns={cols} />        
}

export const SuccessStatus = <CheckOutlined className='green'/>
export const FailedStatus = <CloseOutlined className='red'/>
