import { Select } from 'antd'


export function HostSelect () {
    return <Select
        className='host-select'
        size='small'
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
                label: '单机',
                value: '183.134.101.134:8892'
            },
            {
                label: '数据面板.开发',
                value: '192.168.100.45:8666'
            },
            {
                label: '数据面板.演示',
                value: '183.134.101.138:8666'
            },
            {
                label: '因子管理',
                value: '183.136.170.16:8820'
            },
            {
                label: '运维工具',
                value: '183.136.170.173:1001'
            },
            {
                label: '本地',
                value: '127.0.0.1:8848'
            }
        ]}
        onSelect={(host: string) => { 
            const [hostname, port] = host.split(':')
            
            let url = new URL(location.href)
            
            url.searchParams.set('hostname', hostname)
            url.searchParams.set('port', port)
            url.searchParams.delete('dashboard')
            
            location.href = url.toString()
        }}
        popupMatchSelectWidth={false}
        defaultValue={(() => {
            const { searchParams } = new URL(location.href)
            return `${searchParams.get('hostname')}:${searchParams.get('port')}`
        })()}
    />
 }
