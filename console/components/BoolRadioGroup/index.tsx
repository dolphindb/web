import { Radio, RadioChangeEvent, RadioGroupProps } from 'antd'
import { useCallback } from 'react'
import { t } from '../../../i18n/index.js'

interface IBoolRadioGroupProps extends Omit<RadioGroupProps, 'value' | 'onChange'> {
    value?: boolean
    onChange?: (val: boolean) => void
}

export function BoolRadioGroup (props: IBoolRadioGroupProps) {
    const { value, onChange: onChangeProp, ...otherProps } = props
    
    const onChange = useCallback(
        (e: RadioChangeEvent) => {
            onChangeProp?.(e?.target?.value)
        },
        [onChangeProp]
    )
    
    return <Radio.Group value={value} onChange={onChange} {...otherProps}>
            <Radio value>{t('是')}</Radio>
            <Radio value={false}>{t('否')}</Radio>
        </Radio.Group>
}
