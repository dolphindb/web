import { t } from '@i18n'
import { Button, Form, Input, Select, Space, Switch, TimePicker, Tooltip } from 'antd'
import dayjs from 'dayjs'

import { MinusCircleOutlined, PlusOutlined, WarningOutlined } from '@ant-design/icons'

import { inspection } from '@/inspection/model.ts'
import { InspectionFrequencyOptions, WeekDays } from '@/inspection/constants.ts'
import type { MetricsWithStatus, Plan } from '@/inspection/type.ts'
import { parse_minute } from '@/inspection/utils.ts'

import { MetricTable } from '@/inspection/components/MetricTable.tsx'

interface InspectionFormContentProps {
    plan?: Plan
    view_only: boolean
    metrics_with_nodes: MetricsWithStatus[]
    set_checked_metrics: (metrics: MetricsWithStatus[]) => void
    execute_node_names: string[]
    inspection_form: any
}

export function InspectionFormContent ({
    plan,
    view_only,
    metrics_with_nodes,
    set_checked_metrics,
    execute_node_names,
    inspection_form,
}: InspectionFormContentProps) {
    
    const { email_config } = inspection.use(['email_config'])
    return <Form
            key={plan?.id}
            disabled={view_only} 
            className='inspection-form-inline' 
            form={inspection_form}
            requiredMark={false}
            layout='vertical'
            initialValues={plan ? 
                { 
                    ...plan,
                    scheduleTime: plan.scheduleTime ? plan.scheduleTime.map(time => parse_minute(time as string)) : [dayjs()],
                    alertRecipient: plan.alertRecipient ? (plan.alertRecipient as string).split(',') : [ ],
                    enabledNode: plan.enabledNode ?? execute_node_names[0],
                    days: plan.days ? (plan.days as string).split(',').map(Number) : [1], 
                } : 
                {   
                    scheduleTime: [dayjs()], 
                    frequency: 'W', 
                    enabledNode: execute_node_names[0],
                    days: [1], 
                }}>
            <Form.Item 
                name='name' 
                required
                layout='vertical'
                label={<h3 className='required'>{t('巡检名称')}</h3>} 
                rules={[{ required: true, message: t('请输入巡检名称') }]}>
                <Input/>
            </Form.Item>
            
            <Form.Item name='desc' layout='vertical' label={<h3>{t('巡检计划描述')}</h3>} >
                <Input placeholder={t('巡检计划描述(非必填)')} style={{ whiteSpace: 'pre-wrap' }}/>
            </Form.Item>
            
            <h3 className='required'>{t('巡检周期')}</h3>
            <div className='inspection-form-inline-time'>
                <Form.Item label={t('巡检频率')} name='frequency' required>
                    <Select 
                        options={InspectionFrequencyOptions} 
                        onChange={() => {
                            inspection_form.setFieldsValue({ days: undefined })
                        }}
                    />
                </Form.Item>
                
                <Form.Item 
                    noStyle
                    shouldUpdate={(prevValues, curValues) => prevValues.frequency !== curValues.frequency}
                >
                    {({ getFieldValue }) => {
                        const frequency = getFieldValue('frequency')
                        return frequency !== 'D' && (
                            <Form.Item 
                                label={t('巡检日期')} 
                                name='days'
                                rules={[{ required: true, message: t('请选择巡检日期') }]}
                            >
                                <Select
                                    mode='multiple'
                                    className='date-select'
                                    options={Array.from({ length: frequency === 'M' ? 31 : 7 }, (_, i) => i).
                                            map(idx => ({
                                                label:  frequency === 'W' ? WeekDays[idx] : t('第 {{day}} 天', { day: idx + 1 }),
                                                value:  frequency === 'W' ? idx : idx + 1
                                            }))} 
                                /> 
                            </Form.Item>
                        )
                    }}
                </Form.Item>
                
                <Form.Item label={t('巡检时间')} required>
                    <Form.List 
                        name='scheduleTime'
                        rules={[
                            {
                                validator: async (_, value) => {
                                    if (!value || value.length < 1) 
                                        throw new Error(t('至少需要设置一个巡检时间'))
                                    
                                },
                            },
                        ]}
                    >
                        {(fields, { add, remove }) =>
                            <Space align='baseline'>
                            {
                                fields.map((field, idx) => <Space key={field.key} align='baseline'>
                                        <Form.Item 
                                            name={field.name}
                                            rules={[{ required: true, message: t('请选择巡检时间') }]}
                                        >
                                            <TimePicker format='HH:mm'/>
                                        </Form.Item>
                                        {fields.length > 1 && !view_only && (
                                            <MinusCircleOutlined onClick={() => { remove(field.name) }} />
                                        )}
                                    </Space>)
                            }
                            <Form.Item>
                                <Button type='dashed' onClick={() => { add() }} block icon={<PlusOutlined />}>
                                    {t('添加')}
                                </Button>
                            </Form.Item>
                            </Space>
                        }
                    </Form.List>
                </Form.Item>
                {/*                 
                <Form.Item label={t('巡检时间')} name='scheduleTime' rules={[{ required: true, message: t('请选择巡检时间') }]}>
                    <TimePicker format='HH:mm:ss'/>
                </Form.Item> */}
            </div>
            
            <Form.Item name='enabledNode' layout='vertical' label={<h3 className='required'>{t('执行节点')}</h3>} >
                <Select options={execute_node_names.map(name => ({ label: name, value: name }))}/>
            </Form.Item>
            
            <div className='enable-emali-form-item'>
                <Form.Item 
                    name='alertEnabled' 
                    layout='vertical'
                    label={<h3 >{t('是否启用邮件告警')} </h3>} >
                    <Switch />
                </Form.Item>
                {
                    !email_config.can_config && <Tooltip 
                        title={<div style={{ whiteSpace: 'pre-wrap' }}>{email_config.error_msg}</div>}>
                        <WarningOutlined 
                            className='email-config-warning' 
                        /> 
                    </Tooltip>
                }
            </div>
            
            <Form.Item layout='vertical' label={<h3>{t('邮件告警接收人邮箱')}</h3>} >
                <Form.List name='alertRecipient' >
                    {(fields, { add, remove }) =>
                        <Space>
                        {
                            fields.map(field => <Space key={field.key}>
                            <Form.Item name={field.name} required>
                                <Input/>
                            </Form.Item>
                            {!view_only && <MinusCircleOutlined onClick={() => { remove(field.name) }} />}
                            </Space>)
                            
                        }
                        <Form.Item>
                            <Button type='dashed' onClick={() => { add() }} block icon={<PlusOutlined />}>
                            {t('添加')}
                            </Button>
                        </Form.Item>
                        </Space>
                    }
                </Form.List>
            </Form.Item>
            
            <div className='metric-table'>
                <MetricTable
                    checked_metrics={metrics_with_nodes} 
                    set_checked_metrics={set_checked_metrics}
                />
            </div>
        </Form>
}
