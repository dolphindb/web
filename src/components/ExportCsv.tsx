import { Form, Input, InputNumber, Modal, Radio } from 'antd'

import { use_modal } from 'react-object-model/hooks.js'
import Icon from '@ant-design/icons'
import { useEffect, useState } from 'react'

import { download_url } from 'xshell/utils.browser.js'

import { DdbInt, type DdbObj, type DdbTableObj, type DdbVectorValue } from 'dolphindb/browser.js'

import { t } from '@i18n'
import { DdbObjRef } from '../obj.js'

import { shell } from '../shell/model.js'
import { model } from '../model.js'

import SvgExport from './icons/export.icon.svg'

export function ExportCsv ({ info }: { info: DdbTableObj | DdbObjRef<DdbObj<DdbVectorValue>[]> }) {
    const { visible, open, close } = use_modal()
    
    let [form] = Form.useForm()
    
    const [loading, set_loading] = useState(false)
    
    const [scope, set_scope] = useState(false)
    
    useEffect(() => {
        form.setFieldsValue({
            name: info.name || 'table',
            scope: 'all',
            start: 0,
            end: info.rows - 1
        })
        set_scope(false)
    }, [info])
    
    return <>
        <Icon
            className='icon-link'
            title={t('导出 CSV')}
            component={SvgExport}
            onClick={open}
        />
        
        <Modal
            width='50%'
            forceRender
            mask={{ closable: false }}
            title={t('导出 CSV')} 
            open={visible} 
            okButtonProps={{ loading }}
            onOk={async () => { 
                try {
                    await form.validateFields()
                    
                    set_loading(true)
                    
                    let { name, start, end } = form.getFieldsValue()
                
                    start ??= 0
                    end ??= info.rows - 1
                    
                    await shell.define_get_csv_content()
                    
                    download_url(
                        `${name}.csv`,
                        URL.createObjectURL(new Blob(
                            [
                                new Uint8Array([0xEF, 0xBB, 0xBF]),
                                await model.ddb.invoke<Uint8Array<ArrayBuffer>>(
                                    'get_csv_content',
                                    [
                                        info instanceof DdbObjRef ? info.name : info,
                                        new DdbInt(start), 
                                        new DdbInt(end)
                                    ],
                                    { chars: 'binary' })
                            ],
                            { type: 'text/csv' })))
                } finally {
                    set_loading(false)
                    close()
                }
            }}
            onCancel={() => {
                if (!loading)
                    close()
            }}
        >
            <Form form={form} labelCol={{ span: 4 }} wrapperCol={{ span: 18 }} disabled={loading}>
                <Form.Item rules={[{ required: true, message: t('请输入文件名') }]} name='name' label={t('文件名')}>
                    <Input suffix='.csv' placeholder={t('请输入文件名')} />
                </Form.Item>
                {info.rows > 0 && <>
                    <Form.Item name='scope' label={t('导出范围')} initialValue='all'>
                        <Radio.Group onChange={event => { set_scope(event.target.value === 'part') }}>
                            <Radio value='all'> {t('全部')} </Radio>
                            <Radio value='part'> {t('部分')} </Radio>
                        </Radio.Group>
                    </Form.Item>
                    {scope && <>
                        <Form.Item 
                            rules={[
                                ({ getFieldValue }) => ({
                                    async validator (_, value) {
                                        const end = getFieldValue('end')
                                        if (value === undefined || !Number.isInteger(value) || value < 0)
                                            return Promise.reject(new Error(t('起始行需为大于等于 0 的整数')))
                                        else if (value > end)
                                            return Promise.reject(new Error(t('起始行需小于等于结束行')))
                                        
                                        return Promise.resolve()
                                    },
                                }),
                            ]}
                            name='start' label={t('起始行')} 
                        >
                            <InputNumber style={{ width: 120 }} placeholder={t('请输入起始行')}/>
                        </Form.Item>
                        <Form.Item 
                            name='end'
                            label={t('结束行')} 
                            rules={[
                                ({ getFieldValue }) => ({
                                    async validator (_, value) {
                                        const start = getFieldValue('start')
                                        if (value === undefined  || !Number.isInteger(value) || value < 0 || value > info.rows - 1)
                                            return Promise.reject(new Error(t('结束行需为大于等于 0 且小于表格实际行数的整数')))
                                        else if (start > value)
                                            return Promise.reject(new Error(t('结束行需大于等于起始行')))
                                        
                                        return Promise.resolve()
                                    },
                                }),
                            ]} 
                        >
                            <InputNumber style={{ width: 120 }} placeholder={t('请输入结束行')}/>
                        </Form.Item>
                    </>}
                </>}
            </Form>
            { info.rows > 0 && <div className='export-prompt'>
                {t('注意：请根据实际的硬件情况选择导出范围，过大的范围可能导致浏览器崩溃！')}
            </div> }
            
        </Modal>
    </>
}
