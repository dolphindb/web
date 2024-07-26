import { TimePicker, type TimePickerProps } from 'antd'
import dayjs from 'dayjs'
import { useCallback, useMemo } from 'react'
interface IProps extends Omit<TimePickerProps, 'onChange' | 'value'> { 
    onChange?: (time: string) => void
    value?: string
    submitSuffix?: string
}

export function StringTimePicker (props: IProps) { 
    const { format = 'HH:mm:ss', onChange, value, submitSuffix, ...others } = props
    
    const on_value_change = useCallback((value, time) => {
        if (!value) { 
            onChange(null)
            return
        }
        if (submitSuffix)
            onChange(time + submitSuffix)
        else
            onChange(time)
    }, [submitSuffix])
    
    const val = useMemo(() => { 
        if (!value || !dayjs(value, format as string).isValid())
            return null
        let time = submitSuffix ? value.replace(submitSuffix, '') : value
        return time ? dayjs(value, format as string) : null
    }, [submitSuffix, value, format])
    
    
    return <TimePicker
        value={val}
        {...others}
        format={format}
        onChange={on_value_change}
    />
}
