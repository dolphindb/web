import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { t } from '@i18n/index.ts'
import { Button, DatePicker, Form, Input, Modal, Select } from 'antd'

import type { Metric, MetricParam, MetricsWithStatus } from './type.ts'

export const EditParamModal = NiceModal.create(({ 
    metric, 
    checked_metrics, 
    set_checked_metrics 
}: 
{ 
    metric: Metric
    checked_metrics: Map<string, MetricsWithStatus>
    set_checked_metrics: (metrics: Map<string, MetricsWithStatus>) => void 
}) => {
    const modal = useModal()   
    
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
            initialValues={metric} 
            labelCol={{ span: 3 }} 
            wrapperCol={{ span: 21 }}
            onFinish={values => {
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
                name='name' 
                label={<h3 className='form-item-label'>{t('名称')}</h3>} 
                >
                <Input disabled/>
            </Form.Item>
            
            <Form.Item 
                name='desc' 
                label={<h3 className='form-item-label'>{t('描述')}</h3>} 
                >
                <Input disabled/>
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
                    }))}/> : <p>{t('所有节点')}</p>}
            </Form.Item>
            
            <Form.Item 
                name='script' 
                label={<h3 className='form-item-label'>{t('脚本内容')}</h3>} 
                >
                <Input.TextArea disabled autoSize={{ maxRows: 10 }} />
            </Form.Item>
            
           {metric.params.size &&  <Form.Item 
                name='selected_params' 
                label={<h3 className='form-item-label'>{t('参数配置')}</h3>} 
                >
                {
                    [...metric.params.values()].map((param: MetricParam) => {
                        const { type, name } = param
                        
                        return <Form.Item name={['selected_params', name]} label={name} labelCol={{ span: 2 }} wrapperCol={{ span: 22 }}>
                                {type === 'TIMESTAMP' ? 
                                <DatePicker 
                                    showTime 
                                    /> : 
                                <Select 
                                    options={param.options.map(op => ({
                                        value: op,
                                        label: op
                                    }))}
                                    />}
                            </Form.Item>
                      
                    })
                }
            </Form.Item>}
            
            <Form.Item wrapperCol={{ offset: 20, span: 4 }}>
                <Button type='primary' htmlType='submit'>
                    {t('保存')}
                </Button>
            </Form.Item>
            
        </Form>
    </Modal>
})
 
