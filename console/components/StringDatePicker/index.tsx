import { DatePicker, type DatePickerProps } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useCallback, useMemo } from 'react'

interface IProps extends Omit<DatePickerProps, 'onChange' | 'value'> { 
    value?: string
    onChange?: (val: string) => void
    submitFormat?: string
    showTime?: boolean
    submitSuffix?: string
}


const { RangePicker } = DatePicker

interface IStringRangePickerProps {
    onChange: (val: [string, string]) => void
    value: [string, string]
    format?: string
}

export function StringDatePicker (props: IProps) { 
    // 使用 submitFormat 是因为 ddb 内时间格式固定将年月日以 . 连接，但是实际在组件内展示的标准时间格式是以 - 连接，所以提交表单的格式与展示格式不一致
    const { onChange, value, submitFormat = 'YYYY.MM.DD', submitSuffix, ...others } = props
    
    const on_date_change = useCallback((value: Dayjs) => { 
        if (!value) { 
            onChange(null)
            return
        }
           
        if (submitSuffix)
            onChange(value.format(submitFormat) + submitSuffix)
        else
            onChange(value.format(submitFormat))
    }, [ submitSuffix ])
    
    const val = useMemo(() => { 
        if (!value || !dayjs(value).isValid())
            return null
        let time = value
        if (submitSuffix)  
            time = submitSuffix ? time.replace(submitSuffix, '') : time
        return dayjs(time)
    }, [ value, submitSuffix ])
    
    return <DatePicker picker='date' {...others} onChange={on_date_change} value={val} />
}
