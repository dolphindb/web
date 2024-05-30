import dayjs from 'dayjs'

import { Button, DatePicker, Input, Popover, Select } from 'antd'

import { QuestionCircleOutlined } from '@ant-design/icons'

import { useEffect } from 'react'

import { DdbForm } from 'dolphindb/browser.js'

import { genid } from 'xshell/utils.browser.js'

import { Editor } from '../../shell/Editor/index.js'

import { safe_json_parse, sql_formatter } from '../utils.js'
import { t } from '../../../i18n/index.js'
import { VariableMode } from '../type.js'

import { dashboard } from '../model.js'

import { model } from '../../model.js'

import { OptionList } from './OptionList.js'
import { type Variable, type VariablePropertyType } from './variable.js'

const { TextArea } = Input

export function VariableEditor ({ 
        current_variable, 
        change_current_variable_property,
        change_no_save_flag
    }: { 
        current_variable: Variable
        change_no_save_flag: (value: boolean) => void
        change_current_variable_property: (key: string, value: VariablePropertyType, save_confirm?: boolean) => void
    }) 
{ 
    const is_select = current_variable.mode === VariableMode.SELECT || current_variable.mode === VariableMode.MULTI_SELECT
    
    const value_editor = {
        [VariableMode.SELECT]: <Select
                    allowClear
                    size='small'
                    className='main-value-control-top'
                    value={current_variable.value}
                    onChange={value => { change_current_variable_property('value', value) }}
                    options={current_variable.options}
                />,
        [VariableMode.MULTI_SELECT]: <Select
                    allowClear
                    size='small'
                    mode='multiple'
                    className='main-value-control-top'
                    value={safe_json_parse(current_variable.value)}
                    onChange={value => { change_current_variable_property('value', JSON.stringify(value)) }}
                    options={current_variable.options}
                />,
        [VariableMode.TEXT]: <TextArea 
                    size='small' 
                    rows={18}
                    className='main-value-control-text'
                    value={current_variable.value}
                    onChange={event => {
                        change_current_variable_property('value', event.target.value) 
                    }}
                />,
        [VariableMode.DATE]: <DatePicker 
                    allowClear
                    size='small'
                    className='main-value-control-date'
                    value={current_variable.value ? dayjs(current_variable.value) : null}
                    onChange={date => {
                        change_current_variable_property('value', date ? date.format('YYYY.MM.DD') : '')
                    }} 
                />
    }
    
    useEffect(() => {
        if (dashboard.variable_editor)
            dashboard.variable_editor.setValue(current_variable?.code || '')
        change_no_save_flag(false)
    }, [current_variable.id])
    
    return <>
        <div className='variable-editor'>
            <div className='editor-main'>
                <div className='main-top'>
                    <div className='main-config'>
                        {t('显示名称：')}
                        <Input 
                            size='small' 
                            className='main-config-input'
                            value={current_variable.display_name}
                            onChange={event => {
                                if (event !== null)
                                    change_current_variable_property('display_name', event.target.value.trim()) 
                            }}
                        />
                    </div>
                    <div className='main-config'>
                        {t('变量类型：')}
                        <Select
                            value={current_variable.mode}
                            className='main-config-input'
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
                    {is_select && <div className='main-value-top'>
                        {t('变量值：')}
                        {value_editor[current_variable.mode]}
                    </div>}
                </div>
                {is_select 
                    ? <>
                        <div className='main-select main-editor'>
                            <div className='main-select-top'>
                                <div>
                                    {t('SQL 导入：')}
                                    <Popover 
                                        content={(
                                            <div>
                                                {t('需返回一个两列的表格，第一列用作标签，第二列用作值。 ( 无法在此处使用变量  )')}
                                            </div>
                                        )} 
                                    >
                                        <QuestionCircleOutlined className='tooltip'/>
                                    </Popover>
                                </div>
                                <Button 
                                    type='primary' 
                                    onClick={async () => { 
                                        const res = await model.ddb.eval(dashboard.variable_editor.getValue())
                                        if (res.form !== DdbForm.table)
                                            dashboard.message.error(t('返回结果必须是 table'))
                                        else if (res.cols !== 2)
                                            dashboard.message.error(t('返回结果的列数必须是 2'))
                                        else
                                            change_current_variable_property('options', sql_formatter(res).map(row => {
                                                const keys = Object.keys(row)
                                                return {
                                                    key: String(genid()).slice(0, 4),
                                                    label: row[keys[0]],
                                                    value: row[keys[1]]
                                                }
                                            }))
                                    }} 
                                    size='small'
                                >
                                    {t('查询')}
                                </Button>
                            </div>
                            <Editor 
                                enter_completion
                                on_mount={(editor, monaco) => {
                                    editor?.setValue(current_variable.code)
                                    dashboard.set({ variable_editor: editor, monaco })
                                }}
                                on_change={() => { change_no_save_flag(true) }}
                                theme='dark'
                            />
                        </div>
                        <OptionList
                            current_variable={current_variable}
                            change_current_variable_property={change_current_variable_property}
                        />
                    </>
                    : <div className='main-value'>
                        {t('变量值：')}
                        {value_editor[current_variable.mode]}
                    </div>       
                }   
            </div>
        </div>
    </>
}
