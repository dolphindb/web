import dayjs from 'dayjs'

import { DatePicker, Input, Select } from 'antd'

import { type Variable, type VariablePropertyType } from './variable.js'
import { OptionList } from './OptionList.js'
import { safe_json_parse } from '../utils.js'
import { t } from '../../../i18n/index.js'

const { TextArea } = Input

interface PropsType { 
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
                    value={current_variable.value}
                    onChange={value => { change_current_variable_property('value', value) }}
                    options={current_variable.options}
                />,
        multi_select: <Select
                    size='small'
                    mode='multiple'
                    className='variable-editor-main-value-control'
                    value={safe_json_parse(current_variable.value)}
                    onChange={value => { change_current_variable_property('value', JSON.stringify(value)) }}
                    options={current_variable.options}
                />,
        text: <TextArea 
                    size='small' 
                    rows={18}
                    className='variable-editor-main-value-control-text'
                    value={current_variable.value}
                    onChange={event => {
                        change_current_variable_property('value', event.target.value) 
                    }}
                />,
        date: <DatePicker 
                    size='small'
                    className='variable-editor-main-value-control'
                    value={current_variable.value ? dayjs(current_variable.value) : null}
                    onChange={date => {
                        change_current_variable_property('value', date ? date.format('YYYY.MM.DD') : '')
                    }} 
                />
    }
    
    return <>
        <div className='variable-editor'>
            <div className='variable-editor-main'>
                <div className='variable-editor-main-display-name'>
                    {t('显示名称：')}
                    <Input 
                        size='small' 
                        className='variable-editor-main-display-name-input'
                        value={current_variable.display_name}
                        onChange={event => {
                            if (event !== null)
                                change_current_variable_property('display_name', event.target.value.trim()) 
                        }}
                    />
                </div>
                <div className='variable-editor-main-mode'>
                    {t('变量类型：')}
                    <Select
                        value={current_variable.mode}
                        className='variable-editor-main-mode-select'
                        size='small'
                        onChange={(value: string) => { 
                            change_current_variable_property('mode', value) 
                            change_current_variable_property('value', value === 'multi_select' ? '[]' : '')
                        }}
                        options={[
                            {
                                label: t('单选'),
                                value: 'select',
                            },
                            {
                                label: t('多选'),
                                value: 'multi_select',
                            },
                            {
                                label: t('自由文本'),
                                value: 'text'
                            },
                            {
                                label: t('日期'),
                                value: 'date'
                            }
                        ]}
                    />
                </div>
                <div className='variable-editor-main-value'>
                    {t('变量值：')}
                    {value_editor[current_variable.mode]}
                </div>
                {(current_variable.mode === 'select' || current_variable.mode === 'multi_select') &&
                    <OptionList
                        current_variable={current_variable}
                        change_current_variable_property={change_current_variable_property}
                        change_no_save_flag={change_no_save_flag}
                    />          
                }   
            </div>
        </div>
    </>
}
