import { useState } from 'react'

import { Input, Select } from 'antd'
import { CloseOutlined } from '@ant-design/icons'

export function StreamConfig () {
    const [ip_select, set_ip_select] = useState(true)
    
    const on_node_select_change_handler = (value: string) => {
        console.log(`selected ${value}`)
    }
    
    const on_ip_select_change_handler = (value: string) => {
        if (value === 'customize') {
            set_ip_select(false)
            return
        }
    }
      
    return <>
        <div className='data-source-config-streamconfig'>
            <div className='data-source-config-streamconfig-left'>
                <div>
                    节点：
                    <Select
                        defaultValue='node1'
                        className='data-source-config-streamconfig-left-node-select'
                        size='small'
                        onChange={on_node_select_change_handler}
                        options={[
                            { value: 'node1', label: '节点1' },
                            { value: 'node2', label: '节点2' }
                        ]}
                    />
                </div>
                <div className='data-source-config-streamconfig-left-ip'>
                    IP：
                    {ip_select
                        ? <Select
                            defaultValue='127.0.0.1'
                            className='data-source-config-streamconfig-left-ip-select'
                            size='small'
                            onChange={on_ip_select_change_handler}
                            options={[
                                { value: '127.0.0.1', label: '127.0.0.1' },
                                { value: 'customize', label: '自定义' }
                            ]}
                        />
                        : <div  className='data-source-config-streamconfig-left-ip-manualinput'>
                            <Input size='small' className='data-source-config-streamconfig-left-ip-manualinput-input'/>
                            <CloseOutlined className='data-source-config-streamconfig-left-ip-manualinput-icon' onClick={() => { set_ip_select(true) }}/>
                        </div>
                    }
                </div>
            </div>
            <div className='data-source-config-streamconfig-right'>
                <div>
                    最大行数：
                    <Input size='small' className='data-source-config-streamconfig-right-input'/>
                </div>
            </div>
        </div>
    </>
}
