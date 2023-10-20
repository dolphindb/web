import { Button, Dropdown } from 'antd'
import { t } from '../../i18n/index.js'
import { useMemo } from 'react'
import { SelectOutlined } from '@ant-design/icons'

function get_href (hostname: string, port: string) { 
    const url = new URL(location.href)
    url.searchParams.set('hostname', hostname)
    url.searchParams.set('port', port)
    return url.toString()
}

export function HostChangeBtn () {
    const items = useMemo(() => [ 
        {
            label: <a href={get_href('192.168.0.200', '20023')}>邹杨集群.数据节点</a>,
            key: '192.168.0.200:20023'
        },
        {
            label: <a href={get_href('192.168.0.200', '20000')}>邹杨集群.控制节点</a>,
            key: '192.168.0.200:20000'
        },
        {
            label: <a href={get_href('115.239.209.123', '8892')}>新海单机</a>,
            key: '115.239.209.123:8892'
        },
        {
            label: <a href={get_href('192.168.100.45', '8666')}>数据面板</a>,
            key: '192.168.100.45:8666'
        },
        {
            label: <a href={get_href('183.136.170.16', '8820')}>因子管理</a>,
            key: '183.136.170.16:8820'
        },
        {
            label: <a href={get_href('127.0.0.1', '8848')}>本地</a>,
            key: '127.0.0.1:8848'
        }
    ], [ ])
    
    
    return <Dropdown menu={{ items }}>
        <Button icon={<SelectOutlined />} size='small' className='refresh-button'>
            {t('切换服务器')}
        </Button>
    </Dropdown>
 }
