import { Select } from 'antd'
import type { SizeType } from 'antd/es/config-provider/SizeContext.js'

import { envs, model } from '@model'


export function HostSelect ({ size = 'small' }: { size?: SizeType }) {
    return <Select
        className='host-select'
        size={size}
        listHeight={512}
        options={envs}
        onSelect={host => {
            const [hostname, port] = host.split(':')
            location.href = model.get_url(hostname, Number(port))
        }}
        popupMatchSelectWidth={false}
        defaultValue={`${model.hostname}:${model.port}`}
    />
 }
