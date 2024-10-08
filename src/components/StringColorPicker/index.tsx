import { ColorPicker, type ColorPickerProps } from 'antd'
import { type Color } from 'antd/lib/color-picker'
import { useCallback } from 'react'

interface IProps extends Omit<ColorPickerProps, 'onChange' | 'value'> {
    value?: string
    onChange?: (str: string) => void
}

export function StringColorPicker (props: IProps) { 
    const { onChange, ...others } = props  
    
    const on_color_change = useCallback<ColorPickerProps['onChange']>(color => {
        onChange?.(color.toHexString())
    }, [ ])
    
    return <ColorPicker
        defaultValue={null}
        format='hex'
        defaultFormat='hex'
        allowClear
        {...others}
        onChange={on_color_change}
        onClear={() => { onChange(null) }}
    />
}


