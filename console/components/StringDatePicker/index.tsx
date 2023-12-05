import { DatePicker, type DatePickerProps } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useCallback } from 'react'

interface IProps extends Omit<DatePickerProps, 'onChange' | 'value'> { 
    value?: string
    onChange?: (val: string) => void
    submitFormat?: string
    showTime?: boolean
}

export function StringDatePicker (props: IProps) { 
    const { onChange, value, submitFormat = 'YYYY.MM.DD', ...others } = props
    
    const on_date_change = useCallback((value: Dayjs) => { 
        onChange(value.format(submitFormat))
    }, [ ])
    
    return <DatePicker picker='date' {...others} onChange={on_date_change} value={value ? dayjs(value) : null} />
}
