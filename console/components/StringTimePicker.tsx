import { TimePicker, type TimePickerProps } from 'antd'
import dayjs from 'dayjs'
interface IProps extends Omit<TimePickerProps, 'onChange' | 'value'> { 
    onChange?: (time: string) => void
    value?: string
}

export function StringTimePicker (props: IProps) { 
    const { format = 'HH:mm:ss', onChange, value, ...others } = props
    
    return <TimePicker value={value ? dayjs(value) : null} {...others} format={format} onChange={(_, time) => { onChange(time) }} />
}
