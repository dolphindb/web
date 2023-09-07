import { Switch, InputNumber } from 'antd'

import { type dataSourceNodeType, type dataSourceNodePropertyType } from '../storage/date-source-node.js'

type Propstype = {
    current_data_source_node: dataSourceNodeType
    change_current_data_source_node_property: (key: string, value: dataSourceNodePropertyType) => void
}

export function SqlConfig ({ current_data_source_node, change_current_data_source_node_property }: Propstype) {    
    return <>
        <div className='data-source-config-sqlconfig'>
            <div className='data-source-config-sqlconfig-left'>
                <div className='data-source-config-sqlconfig-left-refresh'>
                    自动刷新：
                    <Switch 
                        size='small' 
                        checked={current_data_source_node.auto_refresh }
                        onChange={(checked: boolean) => {
                            change_current_data_source_node_property('auto_refresh', checked)
                        }} 
                    />
                </div>
                {current_data_source_node.auto_refresh 
                    ? <div>
                        间隔时间：
                        <InputNumber 
                            size='small' 
                            min={0.001}
                            className='data-source-config-sqlconfig-left-intervals-input'
                            value={current_data_source_node.interval}
                            onChange={value => {
                                if (value !== null)
                                    change_current_data_source_node_property('interval', value) 
                            }}
                        />
                        s
                    </div> 
                    : <></>
                }
            </div>
            <div className='data-source-config-sqlconfig-right'>
                <div>
                    最大行数：
                    <InputNumber 
                        size='small' 
                        min={0}
                        max={1000}
                        className='data-source-config-sqlconfig-right-maxline-input' 
                        value={current_data_source_node.max_line}
                        onChange={value => { 
                            if (value !== null)
                                change_current_data_source_node_property('max_line', value) 
                        }}
                    />
                </div>
            </div>
        </div>
    </>
}
