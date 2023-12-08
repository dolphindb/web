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
    
    return <DatePicker  picker='date' {...others} onChange={on_date_change} value={val} />
}
