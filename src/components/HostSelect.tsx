import { Select } from 'antd'
import type { SizeType } from 'antd/es/config-provider/SizeContext.js'

import { model } from '@/model.js'


export function HostSelect ({ size = 'small' }: { size?: SizeType }) {
    return <Select
        className='host-select'
        size={size}
        listHeight={512}
        options={[
            {
                label: '测试数据节点',
                value: '192.168.0.200:20023'
            },
            {
                label: '测试控制节点',
                value: '192.168.0.200:20000'
            },
            {
                label: '我的单机',
                value: '192.168.0.90:8848'
            },
            {
                label: '单点登录',
                value: '192.168.0.129:8900'
            },
            {
                label: '外汇交易中心',
                value: '183.134.101.138:8018'
            },
            {
                label: '新海单机',
                value: '183.134.101.134:8892'
            },
            {
                label: '指标平台单机',
                value: '192.168.100.45:8633',
            },
            {
                label: '运维工具',
                value: '192.168.0.69:18921'
            },
            {
                label: '本地',
                value: '127.0.0.1:8848'
            },
            {
                label: '采集平台',
                value: '183.134.101.140:7748'
            }
        ]}
        onSelect={host => { 
            const [hostname, port] = host.split(':')
            location.href = model.get_url(hostname, Number(port))
        }}
        popupMatchSelectWidth={false}
        defaultValue={`${model.hostname}:${model.port}`}
    />
 }
