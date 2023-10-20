import { Select } from 'antd'


export function HostSelect () {
    return <Select
        className='host-select'
        size='small'
        options={[
            {
                label: '测试集群.数据节点',
                value: '192.168.0.200:20023'
            },
            {
                label: '测试集群.控制节点',
                value: '192.168.0.200:20000'
            },
            {
                label: '单机',
                value: '115.239.209.123:8892'
            },
            {
                label: '数据面板',
                value: '192.168.100.45:8666'
            },
            {
                label: '因子管理',
                value: '183.136.170.16:8820'
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
            
            location.href = url.toString()
        }}
        popupMatchSelectWidth={false}
        defaultValue={(() => {
            const { searchParams } = new URL(location.href)
            return `${searchParams.get('hostname')}:${searchParams.get('port')}`
        })()}
    />
 }
