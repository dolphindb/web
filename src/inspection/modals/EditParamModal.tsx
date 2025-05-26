import NiceModal, { useModal } from '@ebay/nice-modal-react'

import { Button, DatePicker, Form, Input, InputNumber, Modal, Select } from 'antd'

import { cloneDeep, isEmpty } from 'lodash'

import dayjs, { type Dayjs } from 'dayjs'

import { useMemo } from 'react'

import { DdbType } from 'dolphindb/browser'
 
import { DDB_TYPE_MAP } from '@utils'
import { t } from '@i18n'

import type { MetricParam, MetricsWithStatus } from '@/inspection/type.ts'

interface EditParamModalProps {
    metric: MetricsWithStatus
    checked_metrics: MetricsWithStatus[]
    set_checked_metrics: (metrics: MetricsWithStatus[]) => void 
}

export const EditParamModal = NiceModal.create(({ 
    metric, 
    checked_metrics, 
    set_checked_metrics 
}: EditParamModalProps) => {
    const modal = useModal()   
    const [form] = Form.useForm()
    
    function formatMetricData (metricData: MetricsWithStatus) {
        const { selected_params, params } = metricData
        let formatted_params: Record<string, string | Dayjs | null> = { }
        if (selected_params !== null && typeof selected_params === 'object' && !isEmpty(metricData.selected_params)) 
            for (const [key, value] of Object.entries(selected_params)) {
                let param = params.get(key)
                if (param.type === 'TIMESTAMP')
                    formatted_params[key] = value ?  dayjs(value) : null
                else
                    formatted_params[key] = value
            }
         
        return { ...metricData, selected_params: formatted_params }
    }
    
    const init_metric = useMemo(() => formatMetricData(metric), [metric])
    
    const version_options = checked_metrics.filter(m => m.name === metric.name).map(m => m.version).map(v => ({ label: v !== null ? v : t('最新'), value: v }))
    
    return <Modal
        className='edit-param-modal'       
        width='80%'    
        open={modal.visible}
        afterClose={modal.remove}
        onCancel={modal.hide}
        footer={null}
        title={t('编辑指标')}
        okText={t('确定')}
        cancelText={t('取消')}
    >
        <Form 
            form={form}
            initialValues={init_metric} 
            labelCol={{ span: 3 }} 
            wrapperCol={{ span: 21 }}
            onFinish={values => {
                let new_checked_metrics = cloneDeep(checked_metrics)
                // 先把同名指标的 checked 都设为 false，后面根据这个指标的版本来决定设置哪个为 true
                new_checked_metrics.forEach(m => {
                    if (m.name === metric.name)
                        m.checked = false
                })
                // 然后把这个版本的设一下
                const this_metric = new_checked_metrics.find(m => m.name === metric.name && m.version === values.version)
                Object.assign(this_metric, { ...metric,
                    checked: true,
                    selected_nodes: values.selected_nodes, 
                    selected_params: values.selected_params 
                })
                set_checked_metrics(new_checked_metrics)
                modal.hide()
            }}
            >
            <Form.Item 
                name='displayName' 
                label={<h3 className='form-item-label'>{t('名称')}</h3>} 
                >
                <Input readOnly style={{ cursor: 'not-allowed' }}/>
            </Form.Item>
            
            <Form.Item
                name='version'
                initialValue={metric.version}
                label={<h3 className='form-item-label'>{t('版本')}</h3>}
                >
                <Select
                    options={version_options}
                    onChange={version => {
                        const newMetric = checked_metrics.find(m => m.name === metric.name && m.version === version)
                        if (newMetric) 
                            form.setFieldsValue(formatMetricData(newMetric))
                        
                    }}
                />
            </Form.Item>
            
            <Form.Item 
                name='desc' 
                label={<h3 className='form-item-label'>{t('描述')}</h3>} 
                >
                <Input.TextArea readOnly style={{ whiteSpace: 'pre-wrap', cursor: 'not-allowed' }} autoSize />
            </Form.Item>
            
            <Form.Item 
                name='selected_nodes' 
                label={<h3 className='form-item-label'>{t('节点')}</h3>} >
                { metric.nodes ? 
                    <Select 
                        mode='multiple' 
                        className='nodes-select'
                        placeholder={t('请选择需要巡检的节点')} 
                        options={ metric.nodes.split(',').map(node => ({
                            label: node,
                            value: node
                    }))}/> : t('所有节点')}
            </Form.Item>
            
            <Form.Item 
                name='script' 
                label={<h3 className='form-item-label'>{t('脚本内容')}</h3>} 
                >
                <Input.TextArea readOnly autoSize={{ maxRows: 10 }} style={{ cursor: 'not-allowed', whiteSpace: 'pre-wrap' }}/>
            </Form.Item>
            
           {Boolean(metric.params.size) &&  <Form.Item 
                label={<h3 className='form-item-label'>{t('参数配置')}</h3>} 
                >
                {
                    [...metric.params.values()].map((param: MetricParam) => {
                        const { type, name } = param
                        return  <Form.Item 
                            name={['selected_params', name]}   
                            label={name}
                            labelCol={{ span: 3 }}
                            wrapperCol={{ span: 21 }}
                        >
                            {type === DDB_TYPE_MAP[DdbType.timestamp] ? 
                                <DatePicker
                                    showTime 
                                /> : 
                                type === DDB_TYPE_MAP[DdbType.symbol] || type === DDB_TYPE_MAP[DdbType.symbol_extended]
                                    ? <Select
                                        mode='multiple'
                                        options={param.options.map(op => ({
                                                value: op,
                                                label: op
                                        }))} />
                                    :  <InputNumber/>}
                            </Form.Item>
                      
                    })
                }
            </Form.Item>}
            
            <Form.Item wrapperCol={{ offset: 20, span: 4 }} layout='horizontal'>
                <div className='modal-footer'>
                    <Button htmlType='button' onClick={modal.hide}>
                        {t('取消')}
                    </Button>
                    <Button type='primary' htmlType='submit'>
                        {t('保存')}
                    </Button>
                </div>
            </Form.Item>
            
        </Form>
    </Modal>
})
 
