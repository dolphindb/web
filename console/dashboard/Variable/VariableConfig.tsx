import './index.sass'

import { useCallback, useRef, useState, useEffect } from 'react'
import { cloneDeep } from 'lodash'

import { Button, Modal, type ButtonProps, Tabs } from 'antd'
import { ToolOutlined } from '@ant-design/icons'
import { use_modal } from 'react-object-model/modal.js'

import { VariableList } from './VariableList.js'
import { VariableEditor } from './VariableEditor.js'

import { dashboard } from '../model.js'
import { variables,
    get_variable,
    save_variable, 
    type Variable,
    type VariablePropertyType,
} from './variable.js'

const save_confirm_config = {
    cancelText: '不保存',
    okText: '保存',
    style: { top: '250px' },
    maskStyle: { backgroundColor: 'rgba(0,0,0,.2)' },
    title: '此数据源存在未保存的更改。你想保存吗？',   
}

interface IProps extends ButtonProps {
    
}

export function VariableConfig (props: IProps) {
    const { ...btn_props } = props
    const { visible, open, close } = use_modal()
    const [modal, contextHolder] = Modal.useModal()
    const { config } = dashboard.use(['config'])
     
    const [current_variable, set_current_variable] = useState(null)
    
    const no_save_flag = useRef(false)
    
    useEffect(() => {
       change_current_variable('')
    }, [config?.id])
    
    const change_current_variable = useCallback((key: string) => {
        if (key === '') {
            set_current_variable(null)
            return
        }    
        set_current_variable(cloneDeep(get_variable(key)))
    }, [ ])
    
    const change_current_variable_property = useCallback(
        (key: string, value: VariablePropertyType, save_confirm = true) => {
            set_current_variable((pre: Variable) => {
                pre[key] = value
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
        if (no_save_flag.current && await modal.confirm(save_confirm_config) ) {
            await handle_save()
            no_save_flag.current = false
        }    
        close()
    }, [no_save_flag.current, handle_save])
    
    return <>
        <Button
            icon={<ToolOutlined className='variable-config-trigger-navigation-icon' />}
            onClick={open}
            {...btn_props}
        >
            变量
        </Button>
            
        <Modal 
            title='配置变量'
            width='80%' 
            destroyOnClose
            className='variable'
            open={visible}
            onCancel={handle_close} 
            maskClosable={false}
            maskStyle={{ backgroundColor: 'rgba(84,84,84,0.5)' }}
            afterOpenChange={() => {
                set_current_variable(cloneDeep(variables[0]))
            }}
            footer={
                [
                    <Button 
                        key='save' 
                        type='primary' 
                        onClick={async () => {
                            if (no_save_flag.current)
                                await handle_save()
                        } 
                    }>
                        保存
                    </Button>,
                    <Button key='close' onClick={handle_close}>
                        关闭
                    </Button>,
                ]
            }
        >
            {/* 未保存提示框 */}
            {contextHolder}
            <div className='variable-config-main'>
                <VariableList 
                    current_variable={current_variable}
                    no_save_flag={no_save_flag}
                    save_confirm={() => modal.confirm(save_confirm_config) }
                    handle_save={handle_save}
                    change_current_variable={change_current_variable}
                    change_current_variable_property={change_current_variable_property}
                />
                {current_variable
                    ? <div className='config-right'>
                        <VariableEditor
                            current_variable={current_variable}
                            change_no_save_flag={(value: boolean) => no_save_flag.current = value}
                            change_current_variable_property={change_current_variable_property}
                        />
                    </div>
                    : <></>
                }
            </div>
        </Modal>
    </>
}
