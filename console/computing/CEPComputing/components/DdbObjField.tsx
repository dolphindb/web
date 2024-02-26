
import { DatePicker, TimePicker, type DatePickerProps, type InputNumberProps, InputNumber, Input, type InputProps, type TimePickerProps } from 'antd'
import { type ChangeEventHandler, useCallback } from 'react'
import { model } from '../../../model.js'
import { t } from '../../../../i18n/index.js'

interface IProps extends Omit<DatePickerProps, 'onChange'> { 
    onChange?: (val: any) => void
    showTime?: any
    type?: string
}

/**  
 * 将控件输入的日期格式转化为 ddb 的时间格式，format 需要与 ddb 中的日期格式一致
      @param type 代表 ddb 中时间类型，如 DATEHOUR、DATETIME 等
      @returns   
*/

export function DdbObjDatePicker ({ onChange, value, type, ...others }: IProps) { 
    
    const on_value_change = useCallback(async (_, date_str: string) => {
        if (type === 'MONTH')
            date_str += 'M'
        else if (type === 'DATEHOUR')
            date_str = `datehour(${JSON.stringify(date_str)})`
        const obj = await model.ddb.eval(date_str)
        onChange(obj)
    }, [type])
    
    return <DatePicker picker='date' {...others} onChange={on_value_change} />
}


interface IDdbObjTimePickerProps extends Omit<TimePickerProps, 'onChange'> { 
    onChange?: (obj: any) => void
    type?: string
}

/** 将控件输入的时间格式转化为 ddb 的时间格式，format 需要与 ddb 中的时间格式一致 */ 
export function DdbObjTimePicker ({ onChange, type, value, ...others }: IDdbObjTimePickerProps) {
    const on_value_change = useCallback(async (_, time_str: string) => { 
        if (type === 'MINUTE')
            time_str += 'm'
        else if (type === 'TIME')
            time_str = `time(${JSON.stringify(time_str)})`
        const time_obj = await model.ddb.eval(time_str)
        onChange(time_obj)
    }, [ type ])
    
    return <TimePicker
        {...others}
        format={others.format}
        onChange={on_value_change}
    />
}

interface IDdbObjInputNumberProps extends Omit<InputNumberProps, 'onChange'> { 
    onChange?: (val: any) => void
}

/** 将数值类输入转化为 ddb 的数值格式 */

export function DdbObjInputNumber ({ onChange, value, ...others }: IDdbObjInputNumberProps) { 
    
    const on_value_change = useCallback(async (val: string | number) => { 
        // 开启高精度模式，onChange 事件会返回 string 类型，其他模式下是 number 类型
        if (typeof val === 'number')
            val = JSON.stringify(val)
        const obj = await model.ddb.eval(val)
        onChange(obj)
    }, [ ])
    
    return <InputNumber placeholder={t('请输入')} {...others} onChange={on_value_change} />
}

interface IDdbObjInput extends Omit<InputProps, 'onChange'> { 
    onChange?: (val: any) => void
    type: string
}

/** 将 input 输入的值转化为 ddb 对象 */
export function DdbObjInputField ({ onChange, value, type, ...others }: IDdbObjInput) { 
    
    const on_value_change = useCallback<ChangeEventHandler<HTMLInputElement>>(async e => {
        let input_str = e.target.value
        if (type === 'STRING')
            input_str = JSON.stringify(input_str)
        else if (type === 'CHAR')
            input_str = `'${input_str}'`
        const obj = await model.ddb.eval(input_str)
        onChange(obj)
     }, [ ])
    
    return <Input placeholder={t('请输入')} {...others} onChange={on_value_change} />
    
}

interface IDdbObjFieldProps {
    /** ddb 类型 */
    type: string
    placeholder?: string
}

export function DdbObjField ({ type, placeholder, ...others }: IDdbObjFieldProps) {
    switch (type) { 
        case 'DATE':
            return <DdbObjDatePicker placeholder={placeholder} format='YYYY.MM.DD' {...others} />
        case 'MONTH': 
            return <DdbObjDatePicker placeholder={placeholder} format='YYYY.MM' type='MONTH' picker='month' {...others} />
        case 'DATETIME': 
            return <DdbObjDatePicker placeholder={placeholder} format='YYYY.MM.DD HH:mm:ss' showTime {...others} />
        case 'TIMESTAMP':
            return <DdbObjDatePicker placeholder={placeholder} format='YYYY.MM.DD HH:mm:ss.SSS' showTime {...others} />
        case 'DATEHOUR':
            return <DdbObjDatePicker placeholder={placeholder} format='YYYY.MM.DD HH' showTime={{ format: 'HH' }} type='DATEHOUR' {...others} />
        case 'TIME':
            return <DdbObjTimePicker placeholder={placeholder} format='HH:mm:ss.SSS' type='TIME' {...others} />
        case 'MINUTE':
            return <DdbObjTimePicker placeholder={placeholder} format='HH:mm' type='MINUTE' {...others} />
        case 'SECOND':
            return <DdbObjTimePicker placeholder={placeholder} format='HH:mm:ss' {...others} />
        case 'INT':
            return <DdbObjInputNumber placeholder={placeholder} precision={0} {...others} />
        default:
            return <DdbObjInputField placeholder={placeholder} type={type} {...others} />
    }
}

