import { ColorPicker, type ColorPickerProps } from 'antd'
import { type Color } from 'antd/lib/color-picker'
import { useCallback } from 'react'

interface IProps extends Omit<ColorPickerProps, 'onChange' | 'value'> {
    value?: string
    onChange?: (str: string) => void
}

export function StringColorPicker (props: IProps) { 
    const { value, onChange, ...others } = props  
    
    const on_color_change = useCallback((color: Color) => {
        onChange?.(color.toHexString())
    }, [ ])
    
    return <ColorPicker format='hex' defaultFormat='hex' {...others} value={value} onChange={on_color_change}/>
}


