import { TimePicker, type TimePickerProps } from 'antd'
import dayjs from 'dayjs'
import { useCallback } from 'react'
interface IProps extends Omit<TimePickerProps, 'onChange' | 'value'> { 
    onChange?: (time: string) => void
    value?: string
    suffix?: string
}

export function StringTimePicker (props: IProps) { 
    const { format = 'HH:mm:ss', onChange, value, suffix, ...others } = props
    
    const on_value_change = useCallback((_, time) => {
        if (suffix)
            onChange(time + suffix)
        else
            onChange(time)
    }, [suffix])
    
    return <TimePicker
        value={value ? dayjs(value) : null}
        {...others}
        format={format}
        onChange={on_value_change}
    />
}
