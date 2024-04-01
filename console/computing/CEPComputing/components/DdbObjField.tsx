
import { DatePicker, TimePicker, type DatePickerProps, type InputNumberProps, InputNumber, Input, type InputProps, type TimePickerProps, Space } from 'antd'
import { useCallback, useState, useEffect } from 'react'
import { model } from '../../../model.js'
import { t } from '../../../../i18n/index.js'
import { DdbType } from 'dolphindb'
import type { FocusEventHandler } from 'react'
import { convertDecimalType } from '../../../utils/decimal.js'

interface IProps extends Omit<DatePickerProps, 'onChange'> { 
    onChange?: (val: any) => void
    showTime?: any
    type_id: DdbType
}

/**  
 * 将控件输入的日期格式转化为 ddb 的时间格式，format 需要与 ddb 中的日期格式一致
      @param type 代表 ddb 中时间类型，如 DATEHOUR、DATETIME 等
      @returns   
*/

export function DdbObjDatePicker ({ onChange, value, type_id, ...others }: IProps) { 
    
    const on_value_change = useCallback(async (_, execute_str: string) => {
        if (type_id === DdbType.month)
            execute_str += 'M'
            
        else if (type_id === DdbType.datehour)
            execute_str = `datehour(${JSON.stringify(execute_str)})`
        
        const obj = await model.ddb.eval(execute_str)
        onChange(obj)
    }, [type_id])
    
    return <DatePicker picker='date' {...others} onChange={on_value_change} />
}


interface IDdbObjTimePickerProps extends Omit<TimePickerProps, 'onChange'> { 
    onChange?: (obj: any) => void
    type_id: DdbType
}

/** 将控件输入的时间格式转化为 ddb 的时间格式，format 需要与 ddb 中的时间格式一致 */ 
export function DdbObjTimePicker ({ onChange, type_id, value, ...others }: IDdbObjTimePickerProps) {
    const on_value_change = useCallback(async (_, time_str: string) => { 
        if (type_id === DdbType.minute)
            time_str += 'm'
            
        else if (type_id === DdbType.time)
            time_str = `time(${JSON.stringify(time_str)})`
        
        const time_obj = await model.ddb.eval(time_str)
        onChange(time_obj)
    }, [ type_id ])
    
    // @ts-ignore
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
    
    const on_blur = useCallback<FocusEventHandler<HTMLInputElement>>(async e => { 
        let val = e.target.value
        const obj = await model.ddb.eval(val)
        onChange(obj)
    }, [ ])
    
    
    
    return <InputNumber {...others} onBlur={on_blur} />
}

interface IDdbObjInput extends Omit<InputProps, 'onChange' | 'form'> { 
    onChange?: (val: any) => void
    type_id: DdbType
    form?: number
}

/** 将 input 输入的值转化为 ddb 对象 */
export function DdbObjInputField ({ form, onChange, value, type_id, type, ...others }: IDdbObjInput) { 
    
    const on_blur = useCallback<FocusEventHandler<HTMLInputElement>>(async e => {
        let execute_str = e.target.value
        
        switch (type_id) { 
            case DdbType.string:
                execute_str = JSON.stringify(execute_str)
                break
            case DdbType.char:
                execute_str = `'${execute_str}'`
                break
            case DdbType.blob:
            case DdbType.ipaddr:
                execute_str = `${type.toLocaleLowerCase()}(${JSON.stringify(execute_str)})`
                break
            case DdbType.nanotimestamp:
            case DdbType.nanotime:
            case DdbType.short:
            case DdbType.long:
            case DdbType.double:
            case DdbType.float:
            case DdbType.complex:
            case DdbType.point:
            case DdbType.bool:
                execute_str = `${type.toLocaleLowerCase()}(${execute_str})`
                break
            case DdbType.int128:
                if (form === 0)
                    execute_str = `int128(${JSON.stringify(execute_str)})`
                else
                    execute_str = `int128(${execute_str})`
                break
        }
        
        try {
            const obj = await model.ddb.eval(execute_str)
            onChange(obj)
        } catch (e) { 
            onChange(execute_str)
        }
     }, [ type_id ])
    
    return <Input placeholder={t('请输入')} {...others} onBlur={on_blur} />
    
}


interface IDecimalObjInputFieldProps { 
    onChange?: (val: any) => void
    type_id: DdbType
    type: string
    scale: number
}

export function DecimalObjInputField (props: IDecimalObjInputFieldProps) {
    const { onChange, type_id, type, scale } = props
    
    const [value, set_value] = useState<string>()
    
    const transfer_decimal = useCallback(async (value, precision) =>  { 
        if (!value || !precision)  
            return
        
        let execute_str = ''
        switch (type_id) { 
            case DdbType.decimal32:
                execute_str = `decimal32(${value}, ${precision})`
                break
            case DdbType.decimal64:
                execute_str = `decimal64(${value}, ${precision})`
                break
            default:
                execute_str = `decimal128(${value}, ${precision})`
        }
    
        try {
            const obj = await model.ddb.eval(execute_str)
            onChange(obj)
        } catch (e) { 
            onChange(execute_str)
        }
    }, [type_id]) 
    
    useEffect(() => { 
        transfer_decimal(value, scale)    
    }, [value, scale, transfer_decimal])
    
    return <Input placeholder={t('{{type}} 的值', { type })} onBlur={e => { set_value(e.target.value) } } />
 }

interface IDdbObjFieldProps {
    type: string
    type_id: DdbType
    placeholder: string
    form?: number
}

export function DdbObjField ({ type, type_id: server_type_id, placeholder, form, ...others }: IDdbObjFieldProps) {
   
    let type_id = server_type_id
    let scale = null
    const is_decimal = type.includes('DECIMAL')
    
    if (is_decimal) {
        [type_id, scale] = convertDecimalType(server_type_id)
        return <DecimalObjInputField type={type} type_id={type_id} {...others} scale={scale} />
    }
      
    else if (form === 1)
        return <DdbObjInputField form={form} placeholder={placeholder} type={type} type_id={type_id} {...others} />
    
    switch (type_id) { 
        case DdbType.date:
            return <DdbObjDatePicker placeholder={placeholder} format='YYYY.MM.DD' type_id={type_id} {...others} />
        case DdbType.month: 
            return <DdbObjDatePicker placeholder={placeholder} format='YYYY.MM' type_id={type_id} picker='month' {...others} />
        case DdbType.datetime: 
            return <DdbObjDatePicker placeholder={placeholder} format='YYYY.MM.DD HH:mm:ss' type_id={type_id} showTime {...others} />
        case DdbType.timestamp:
            return <DdbObjDatePicker placeholder={placeholder} format='YYYY.MM.DD HH:mm:ss.SSS' type_id={type_id} showTime {...others} />
        case DdbType.datehour:
            return <DdbObjDatePicker placeholder={placeholder} format='YYYY.MM.DD HH' type_id={type_id} showTime={{ format: 'HH' }} {...others} />
        case DdbType.time:
            return <DdbObjTimePicker placeholder={placeholder} format='HH:mm:ss.SSS' type_id={type_id} {...others} />
        case DdbType.minute:
            return <DdbObjTimePicker placeholder={placeholder} format='HH:mm' type_id={type_id} {...others} />
        case DdbType.second:
            return <DdbObjTimePicker placeholder={placeholder} format='HH:mm:ss' type_id={type_id} {...others} />
        case DdbType.int:
            return <DdbObjInputNumber placeholder={placeholder} precision={0} {...others} />
        default:
            return <DdbObjInputField placeholder={placeholder} type_id={type_id} {...others} />
    }
}

