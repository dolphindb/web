import { TimePicker, type TimePickerProps } from 'antd'
import dayjs from 'dayjs'
import { useCallback, useMemo } from 'react'
interface IProps extends Omit<TimePickerProps, 'onChange' | 'value'> { 
    onChange?: (time: string) => void
    value?: string
    submit_suffix?: string
}

export function StringTimePicker (props: IProps) { 
    const { format = 'HH:mm:ss', onChange, value, submit_suffix, ...others } = props
    
    const on_value_change = useCallback((value, time) => {
        if (!value) { 
            onChange(null)
            return
        }
        if (submit_suffix)
            onChange(time + submit_suffix)
        else
            onChange(time)
    }, [submit_suffix])
    
    const val = useMemo(() => { 
        if (!value || !dayjs(value, format as string).isValid())
            return null
        let time = submit_suffix ? value.replace(submit_suffix, '') : value
        return time ? dayjs(value, format as string) : null
    }, [submit_suffix, value, format])
    
    
    return <TimePicker
        value={val}
        {...others}
        format={format}
        onChange={on_value_change}
    />
}
