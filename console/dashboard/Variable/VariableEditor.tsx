import { Input, Select } from 'antd'

import { type Variable, type VariablePropertyType, get_variable, variables } from './variable.js'
import { OptionList } from './OptionList.js'

type PropsType = { 
    current_variable: Variable
    change_no_save_flag: (value: boolean) => void
    change_current_variable_property: (key: string, value: VariablePropertyType, save_confirm?: boolean) => void
}
export function VariableEditor ({ 
        current_variable, 
        change_current_variable_property,
        change_no_save_flag
    }: PropsType) 
{ 
    return <>
        <div className='variable-editor'>
            <div className='variable-editor-main'>
                <div className='variable-editor-main-display-name'>
                    显示名称：
                    <Input 
                        size='small' 
                        className='variable-editor-main-display-name-input'
                        value={current_variable.display_name}
                        onChange={event => {
                            if (event !== null)
                                change_current_variable_property('display_name', event.target.value) 
                        }}
                    />
                </div>
                <div className='variable-editor-main-mode'>
                    变量类型：
                    <Select
                        value={current_variable.mode}
                        className='variable-editor-main-mode-select'
                        size='small'
                        onChange={(value: string) => { change_current_variable_property('mode', value) }}
                        options={[
                            {
                                label: '选择项',
                                value: 'select',
                            },
                            {
                                label: '自由文本',
                                value: 'text'
                            },
                            {
                                label: '时间',
                                value: 'time'
                            }
                        ]}
                    />
                </div>
                {current_variable.mode === 'select'
                    ? <OptionList
                        current_variable={current_variable}
                        change_current_variable_property={change_current_variable_property}
                        change_no_save_flag={change_no_save_flag}
                    />          
                    : <></>
                }   
            </div>
        </div>
    </>
}
