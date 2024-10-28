import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { t } from '@i18n/index.ts'
import { Button, DatePicker, Form, Input, InputNumber, Modal, Select } from 'antd'

import { isEmpty } from 'lodash'

import dayjs from 'dayjs'

import { useMemo } from 'react'

import type { MetricParam, MetricsWithStatus } from './type.ts'

export const EditParamModal = NiceModal.create(({ 
    metric, 
    checked_metrics, 
    set_checked_metrics 
}: 
{ 
    metric: MetricsWithStatus
    checked_metrics: Map<string, MetricsWithStatus>
    set_checked_metrics: (metrics: Map<string, MetricsWithStatus>) => void 
}) => {
    const modal = useModal()   
    
    const init_metric = useMemo(() => {
        const { selected_params, params } = metric
        let formatted_params = { }
        if (selected_params !== null && typeof selected_params === 'object' && !isEmpty(metric.selected_params)) 
            for (const [key, value] of Object.entries(selected_params)) {
                let param = params.get(key)
                if (param.type === 'TIMESTAMP')
                    formatted_params[key] = value ?  dayjs(value) : null
                else
                    formatted_params[key] = value
            }
         
        return { ...metric, selected_params: formatted_params }
    }, [metric])
    
    return <Modal
        className='edit-param-modal'       
        width='50%'    
        open={modal.visible}
        afterClose={modal.remove}
        onCancel={modal.hide}
        footer={null}
        title={t('编辑指标')}
        okText={t('确定')}
        cancelText={t('取消')}
    >
        <Form 
            initialValues={init_metric} 
            labelCol={{ span: 3 }} 
            wrapperCol={{ span: 21 }}
            onFinish={values => {
                console.log('🚀 ~ values:', values)
                let new_checked_metrics = new Map(checked_metrics)
                new_checked_metrics.set(metric.name, 
                    { ...new_checked_metrics.get(metric.name), 
                        selected_nodes: values.selected_nodes, 
                        selected_params: values.selected_params })
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
                                    labelAlign='left'
                                    labelCol={{ span: 3 }}
                                    wrapperCol={{ span: 21 }}
                                    >
                                {type === 'TIMESTAMP' ? 
                                    <DatePicker
                                        showTime 
                                    /> : 
                                    type === 'SYMBOL' ? 
                                            <Select 
                                                options={param.options.map(op => ({
                                                    value: op,
                                                    label: op
                                            }))}
                                            /> :  <InputNumber/>}
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
 
