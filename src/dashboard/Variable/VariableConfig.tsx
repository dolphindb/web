import './index.sass'

import { useCallback, useRef, useState, useEffect } from 'react'
import { cloneDeep } from 'lodash'

import { Button, Modal } from 'antd'
import { ToolOutlined } from '@ant-design/icons'
import { use_modal } from 'react-object-model/hooks.js'

import { dashboard } from '../model.js'

import { t } from '../../../i18n/index.js'

import { VariableList } from './VariableList.js'
import { VariableEditor } from './VariableEditor.js'

import { 
    save_variable, 
    type Variable,
    type VariablePropertyType,
    variables,
} from './variable.js'


const save_confirm_config = {
    cancelText: t('不保存'),
    okText: t('保存'),
    styles: { top: '250px', mask: { backgroundColor: 'rgba(0,0,0,.2)' } },
    title: t('此变量存在未保存的更改。你想保存吗？'),   
}


export function VariableConfig () {
    const { variable_infos } = variables.use(['variable_infos'])
    const { visible, open, close } = use_modal()
    const [modal, contextHolder] = Modal.useModal()
    const { config } = dashboard.use(['config'])
     
    const [current_variable, set_current_variable] = useState(null)
    const [loading, set_loading] = useState(false)
    
    const no_save_flag = useRef(false)
    
    useEffect(() => {
       change_current_variable('')
    }, [config?.id])
    
    const change_current_variable = useCallback((key: string) => {
        if (key === '') {
            set_current_variable(null)
            return
        }    
        set_current_variable(cloneDeep(variables[key]))
    }, [ ])
    
    const change_current_variable_property = useCallback(
        (keys: string[], values: VariablePropertyType[], save_confirm = true) => {
            set_current_variable((pre: Variable) => {
                keys.forEach((key, index) => { pre[key] = values[index] })
                return cloneDeep(pre)
            })
            if (save_confirm)
                no_save_flag.current = true 
    }, [ ])
    
    const handle_save = useCallback(async () => {
        await save_variable(current_variable)
        no_save_flag.current = false
    }, [current_variable])
    
    const handle_close = useCallback(async () => {
        if (loading)
            return
        if (no_save_flag.current && await modal.confirm(save_confirm_config) ) {
            await handle_save()
            no_save_flag.current = false
        }    
        close()
    }, [no_save_flag.current, handle_save, loading])
    
    return <>
        <Button
            icon={<ToolOutlined className='variable-trigge' />}
            onClick={open}
        >
            {t('变量')}
        </Button>
        <Modal 
            title={t('配置变量')}
            width='80%' 
            destroyOnClose
            className='variable'
            open={visible}
            onCancel={handle_close} 
            maskClosable={false}
            styles={{ mask: { backgroundColor: 'rgba(84,84,84,0.5)' } }}
            afterOpenChange={() => {
                set_current_variable(cloneDeep(variables[variable_infos[0]?.id]))
            }}
            footer={
                [
                    <Button 
                        key='save' 
                        type='primary' 
                        disabled={loading}
                        onClick={async () => {
                            if (current_variable)
                                await handle_save()
                        } 
                    }>
                        {t('保存')}
                    </Button>,
                    <Button key='close' disabled={loading} onClick={handle_close}>
                        {t('关闭')}
                    </Button>,
                ]
            }
        >
            {/* 未保存提示框 */}
            {contextHolder}
            <div className='variable-config-main'>
                <VariableList 
                    current_variable={current_variable}
                    loading={loading}
                    no_save_flag={no_save_flag}
                    save_confirm={() => modal.confirm(save_confirm_config) }
                    handle_save={handle_save}
                    change_current_variable={change_current_variable}
                    change_current_variable_property={change_current_variable_property}
                />
                {current_variable &&
                    <div className='config-right'>
                        <VariableEditor
                            current_variable={current_variable}
                            loading={loading}
                            set_loading={set_loading}
                            change_no_save_flag={(value: boolean) => no_save_flag.current = value}
                            change_current_variable_property={change_current_variable_property}
                        />
                    </div>
                }
            </div>
        </Modal>
    </>
}
