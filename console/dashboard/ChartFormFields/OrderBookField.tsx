import './index.scss'

import { useMemo } from 'react'
import { Form, Select, Input, Collapse, Button, Space, Divider, InputNumber } from 'antd'
import { DeleteOutlined, PlusCircleOutlined } from '@ant-design/icons'

import { t } from '../../../i18n/index.js'

import { BoolRadioGroup } from '../../components/BoolRadioGroup/index.js'
import { variables } from '../Variable/variable.js'

function Series (props: { col_names: string[] }) { 
    const { col_names } = props
    
    return <Form.Item label={t('倍率')} name='time_rate'>
        <Input />
    </Form.Item>
}


export function SeriesFormFields (props: { col_names: string[] }) {
    const { col_names } = props
    return <Collapse items={[
        {
            key: 'series',
            label: t('订单图'),
            children: <Series col_names={col_names} />,
            forceRender: true,
        }
    ]} />
}


