import './index.scss'

import { useMemo } from 'react'
import { Form, Select, Input, Collapse, Button, Space, Divider, InputNumber } from 'antd'
import { DeleteOutlined, PlusCircleOutlined } from '@ant-design/icons'

import { t } from '../../../i18n/index.js'

import { BoolRadioGroup } from '../../components/BoolRadioGroup/index.js'
import { variables } from '../Variable/variable.js'

export function OrderFormFields () {
    const FormFields = useMemo(() => { 
        return  <>
            <Form.Item label={t('倍率')} name='time_rate' initialValue={100}>
                <Input type='number'/>
            </Form.Item>
        </>
    }, [ ])
    return <Collapse items={[
        {
            key: 'series',
            label: t('订单图'),
            children: FormFields,
            forceRender: true,
        }
    ]} />
}


