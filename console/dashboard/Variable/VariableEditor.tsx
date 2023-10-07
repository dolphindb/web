import dayjs from 'dayjs'

import { DatePicker, Input, Select } from 'antd'

import { type Variable, type VariablePropertyType } from './variable.js'
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
    const value_editor = {
        select: <Select
                    size='small'
                    className='variable-editor-main-value-control'
                    defaultValue={current_variable.value}
                    onChange={value => { change_current_variable_property('value', value) }}
                    options={current_variable.options}
                />,
        text: <Input 
                    size='small' 
                    className='variable-editor-main-value-control'
                    defaultValue={current_variable.value}
                    onChange={event => {
                        change_current_variable_property('value', event.target.value) 
                    }}
                />,
        date: <DatePicker 
                    size='small'
                    className='variable-editor-main-value-control'
                    defaultValue={current_variable.value ? dayjs(current_variable.value) : null}
                    onChange={date => {
                        change_current_variable_property('value', date ? date.format('YYYY.MM.DD') : '')
                    }} 
                />
    }
    
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
                        onChange={(value: string) => { 
                            change_current_variable_property('mode', value) 
                            change_current_variable_property('value', '')
                        }}
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
                                label: '日期',
                                value: 'date'
                            }
                        ]}
                    />
                </div>
                <div className='variable-editor-main-value'>
                    变量值：
                    {value_editor[current_variable.mode]}
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
