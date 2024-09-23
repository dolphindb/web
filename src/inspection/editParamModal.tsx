import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { t } from '@i18n/index.ts'
import { Form, Input, Modal, Select } from 'antd'

import type { Metric, MetricsWithNodes } from './type.ts'

export const EditParamModal = NiceModal.create(({ metric, checked_metrics, set_checked_metrics }: { 
    metric: Metric
    checked_metrics: Map<string, MetricsWithNodes>
    set_checked_metrics: (metrics: Map<string, MetricsWithNodes>) => void }) => {
        
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
        <Form initialValues={metric} style={{ padding: 20 }}>
            <Form.Item 
                name='name' 
                layout='vertical'
                label={<h3>{t('名称')}</h3>} 
                >
                <Input disabled/>
            </Form.Item>
            
            <Form.Item 
                name='desc' 
                layout='vertical'
                label={<h3>{t('描述')}</h3>} 
                >
                <Input disabled/>
            </Form.Item>
            
            <Form.Item 
                name='nodes' 
                layout='vertical'
                label={<h3>{t('节点')}</h3>} >
               { metric.nodes &&  checked_metrics.size ? 
                    <Select 
                        mode='multiple' 
                        className='nodes-select'
                        value={checked_metrics.get(metric.name).nodes}
                        onChange={nodes => {
                            let new_checked_metrics = new Map(checked_metrics)
                            new_checked_metrics.set(metric.name, { ...new_checked_metrics.get(metric.name), nodes })
                            set_checked_metrics(new_checked_metrics)
                        }}
                        placeholder={t('请选择需要巡检的节点')} 
                        options={ metric.nodes.split(',').map(node => ({
                            label: node,
                            value: node
                    }))}/> : <p>{t('所有节点')}</p>}
            </Form.Item>
            
            <Form.Item 
                name='desc' 
                layout='vertical'
                label={<h3>{t('描述')}</h3>} 
                >
                <Input.TextArea disabled/>
            </Form.Item>
        </Form>
    </Modal>
})
