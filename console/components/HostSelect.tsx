import { Select } from 'antd'
import { useCallback } from 'react'
import { useMemo } from 'react'
import { model } from '../model.js'

function get_current_host () { 
    const { searchParams } = new URL(location.href)
    return searchParams.get('hostname') + ':' + searchParams.get('port')
}

export function HostSelect () {
    
    const on_select = useCallback((host: string) => { 
        const [hostname, port] = host.split(':')
        model.set_query('hostname', hostname)
        model.set_query('port', port)
        location.reload()
    }, [ ])
    
    const options = useMemo(() => [ 
        {
            label: '邹杨集群.数据节点',
            value: '192.168.0.200:20023'
        },
        {
            label: '邹杨集群.控制节点',
            value: '192.168.0.200:20000'
        },
        {
            label: '新海单机',
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
    ], [ ])
    
    
    return <Select className='host-select' size='small' onSelect={on_select} options={options} defaultValue={get_current_host()}/>
 }
