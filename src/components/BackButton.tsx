import { Button } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'

import { model } from '@/model.ts'

export function BackButton ({ path }: { path: string }) {
    return <Button
            icon={<ArrowLeftOutlined className='icon' />}
            type='text'
            onClick={() => { model.goto(path) }}
        />
}
