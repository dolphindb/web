import { DatePicker, type DatePickerProps } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useCallback, useMemo } from 'react'

interface IProps extends Omit<DatePickerProps, 'onChange' | 'value'> { 
    value?: string
    onChange?: (val: string) => void
    submitFormat?: string
    showTime?: boolean
    submit_suffix?: string
}


const { RangePicker } = DatePicker

interface IStringRangePickerProps {
    onChange: (val: [string, string]) => void
    value: [string, string]
    format?: string
}

export function StringRangeDateTimePicker (props: IStringRangePickerProps) { 
    const { value, onChange, format = 'YYYY-MM-DD HH:mm:ss', ...others } = props
    
    const on_value_change = useCallback((_, dateStrings: [string, string],) => {
        onChange(dateStrings)
    }, [ ])
    
    console.log(value, 'value')
    
    return <RangePicker
        value={value ? [dayjs(value[0], format), dayjs(value[1], format)] : null}
        format={format} {...others}
        onChange={on_value_change}
    />
}

export function StringDatePicker (props: IProps) { 
    const { onChange, value, submitFormat = 'YYYY.MM.DD', submit_suffix, ...others } = props
    
    const on_date_change = useCallback((value: Dayjs) => { 
        if (!value) { 
            onChange(null)
            return
        }
           
        if (submit_suffix)
            onChange(value.format(submitFormat) + submit_suffix)
        else
            onChange(value.format(submitFormat))
    }, [ ])
    
    const val = useMemo(() => { 
        if (!value || !dayjs(value).isValid())
            return null
        let time = value
        if (submit_suffix)  
            time = submit_suffix ? time.replace(submit_suffix, '') : time
        return dayjs(time)
    }, [ value, submit_suffix ])
    
    return <DatePicker picker='date' {...others} onChange={on_date_change} value={val} />
}
