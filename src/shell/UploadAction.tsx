import { useState, useRef } from 'react'

import { Modal, Input, Form, type FormInstance, Tooltip } from 'antd'
import { CloudUploadOutlined } from '@ant-design/icons'

import { required } from 'xshell/utils.browser.js'
import { empty } from 'xshell/prototype.browser.js'

import { use_modal } from 'react-object-model/hooks.js'

import { t } from '@i18n'

import { model } from '@model'

import { shell } from './model.ts'


export function UploadAction () {
    interface Fields {
        fp: string
    }
    
    let modal = use_modal()
    
    let rform = useRef<FormInstance<Fields>>(undefined)
    
    const [loading, set_loading] = useState(false)
    
    let rfp = useRef<string>('')
    
    const title = t('上传标签页代码到服务器')
    
    return <>
        <Tooltip title={title}>
            <span
                className='action upload'
                onClick={async () => {
                    const { itab, tabs } = shell
                    
                    const tabname = itab > -1
                        ? tabs.find(t => t.index === itab).name
                        : 'default'
                    
                    rfp.current = `${await shell.get_home_dir()}uploads/${tabname}.dos`
                    
                    rform.current?.setFieldValue('fp', rfp.current)
                    
                    modal.open()
                }}
            >
                <CloudUploadOutlined />
                <span className='text'>{t('上传')}</span>
            </span>
        </Tooltip>
        
        <Modal
            className='upload-tab-modal'
            title={title}
            open={modal.visible}
            onCancel={modal.close}
            onOk={() => { rform.current.submit() }}
            okButtonProps={{ loading }}
            okText={t('上传')}
            width={800}
        >
            <Form<Fields>
                className='upload-tab-form'
                ref={rform}
                initialValues={{ fp: rfp.current } satisfies Fields}
                onFinish={async ({ fp }) => {
                    const code = shell.editor.getValue()
                    if (empty(code))
                        throw new Error(t('无法获取编辑器内容'))
                    
                    let { ddb } = model
                    
                    fp = fp.trim()
                    
                    set_loading(true)
                    
                    try {
                        const { fdir } = fp
                        
                        if (!await ddb.invoke('exists', [fdir]))
                            await ddb.invoke('mkdir', [fdir])
                        
                        await ddb.invoke('saveTextFile', [code, fp])
                        model.message.success(t('上传成功: {{fp}}', { fp }))
                        modal.close()
                    } finally {
                        set_loading(false)
                    }
                }}
            >
                <Form.Item label={t('文件路径')} name='fp' {...required}>
                    <Input placeholder={t('上传到服务器的文件路径')} />
                </Form.Item>
            </Form>
        </Modal>
    </>
}