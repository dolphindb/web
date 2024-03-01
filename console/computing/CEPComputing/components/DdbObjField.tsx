
import { DatePicker, TimePicker, type DatePickerProps, type InputNumberProps, InputNumber, Input, type InputProps, type TimePickerProps, Space } from 'antd'
import { type ChangeEventHandler, useCallback, useState, useEffect } from 'react'
import { model } from '../../../model.js'
import { t } from '../../../../i18n/index.js'
import { DdbType } from 'dolphindb'

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
    
    return <InputNumber {...others} onChange={on_value_change} />
}

interface IDdbObjInput extends Omit<InputProps, 'onChange'> { 
    onChange?: (val: any) => void
    type_id: DdbType
}

/** 将 input 输入的值转化为 ddb 对象 */
export function DdbObjInputField ({ onChange, value, type_id, ...others }: IDdbObjInput) { 
    
    const on_value_change = useCallback<ChangeEventHandler<HTMLInputElement>>(async e => {
        let execute_str = e.target.value
        
        switch (type_id) { 
            case DdbType.string:
                execute_str = JSON.stringify(execute_str)
                break
            case DdbType.char:
                execute_str = `'${execute_str}'`
                break
            case DdbType.float:
                execute_str = `float(${execute_str})`
                break
            case DdbType.double:
                execute_str = `double(${execute_str})`
                break
            case DdbType.long:
                execute_str = `long(${execute_str})`
                break
        }
        
        try {
            const obj = await model.ddb.eval(execute_str)
            onChange(obj)
        } catch (e) { 
            onChange(execute_str)
        }
     }, [ type_id ])
    
    return <Input placeholder={t('请输入')} {...others} onChange={on_value_change} />
    
}


interface IDecimalObjInputFieldProps { 
    onChange?: (val: any) => void
    type_id: DdbType
    type: string
}

export function DecimalObjInputField (props: IDecimalObjInputFieldProps) {
    const { onChange, type_id, type } = props
    
    const [value, set_value] = useState<string>()
    const [precision, set_precision] = useState<string | number>()
    
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
        transfer_decimal(value, precision)    
    }, [value, precision, transfer_decimal])
    
    return <Space className='decimal-field-wrapper'>
        <Input placeholder={t(`${type} 的值`)} onChange={e => { set_value(e.target.value) } } />
        <InputNumber placeholder={t(`${type} 的精度`)} precision={0} onChange={val => { set_precision(val) } } />
    </Space>
 }


interface IDdbObjFieldProps {
    /** ddb 类型 */
    type: string
    /** ddb id 类型 */
    type_id: DdbType
    placeholder?: string
}

export function DdbObjField ({ type, type_id, placeholder, ...others }: IDdbObjFieldProps) {
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
        case DdbType.decimal32:
        case DdbType.decimal64:
        case DdbType.decimal128:
            return <DecimalObjInputField type={type} type_id={type_id} {...others} />
        default:
            return <DdbObjInputField placeholder={placeholder} type_id={type_id} {...others} />
    }
}

