import { Checkbox, type PaginationProps, Table, type TableProps, Empty } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { genid } from 'xshell/utils.browser.js'

import {  BasicFormFields }  from '../../ChartFormFields/BasicFormFields.js'
import { BasicTableFields } from '../../ChartFormFields/BasicTableFields.js'
import { type Widget } from '../../model.js'
import { type ITableConfig } from '../../type.js'

import './index.scss'


interface IProps extends TableProps<any> { 
    widget: Widget
    data_source: any[]
}

function format_value (val, decimal_places = 2) { 
    if (isNaN(Number(val)))
        return val
    else
        return Number(val).toFixed(decimal_places)
}


export function DBTable (props: IProps) {
    const { widget, data_source = [ ], ...otherProps } = props
    
    const config = widget.config as ITableConfig
    
    const [selected_cols, set_select_cols] = useState([ ])
    
    
    useEffect(() => { set_select_cols(config.show_cols) }, [config])
    
    const radio_group_options = useMemo(() => {
        return config.show_cols?.map(col => ({
            label: config.col_mappings.find(item => item?.original_col === col)?.mapping_name?.trim() || col,
            value: col,
            key: col
        }))
    }, [config])
    
    const columns = useMemo(() => {
        const { col_mappings, value_format } = config
        return selected_cols
            .map((col: string) => {
                const col_config = {
                    dataIndex: col,
                    title: col_mappings.find(item => item?.original_col === col)?.mapping_name?.trim() || col,
                    key: col,
                    render: (_, record) => typeof record[col] === 'number' ? record[col] : record[col] || '-'
                }
                
                if (value_format?.cols?.includes(col))
                    return { ...col_config, render: val => format_value(val, value_format?.decimal_places) }
                return col_config
            })
    }, [config, selected_cols])
    
    
    const pagination = useMemo<PaginationProps | false>(() => { 
        if (!config.pagination.show)
            return false
            
        else
            return {
                position: ['bottom'],
                defaultPageSize: 5,
                pageSizeOptions: [5, 10, 15, 20],
                size: 'small',
                showSizeChanger: true,
                showQuickJumper: true
            }
    }, [config])
    
    
    return <div className='dashboard-table-wrapper'>
        {config.title && <h2 style={{ fontSize: config.title_size || 18 }} className='table-title'>{config.title}</h2>}
        
        {config.need_select_cols && <Checkbox.Group
            onChange={ val => { set_select_cols(val) }  }
            value={selected_cols}
            options={radio_group_options}
            className='table-radio-group' />}
        
        {
            selected_cols?.length ?
                <Table
                    bordered={config.bordered}
                    scroll={{ x: '100%' }}
                    columns={columns}
                    dataSource={data_source}
                    pagination={pagination}
                    rowKey={() => genid()}
                    {...otherProps}
                />
            :
                <Empty className='empty-table' />
        }
    </div>
}


export function DBTableConfigForm (props: { col_names: string[] }) { 
    const { col_names = [ ] } = props
    return <>
        <BasicFormFields type='table' />
        <BasicTableFields  col_names={col_names}/>
    </>
}
