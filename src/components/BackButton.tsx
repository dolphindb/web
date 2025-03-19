import { Button } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'

import { model } from '@model'

export function BackButton ({ to }: { to: string }) {
    return <Button
        icon={<ArrowLeftOutlined className='icon' />}
        type='text'
        onClick={() => { model.goto(to) }}
    />
}
