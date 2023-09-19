import { PaginationProps, Table, TableProps } from 'antd'
import {  BasicFormFields }  from '../ChartFormFields/BasicFormFields.js'
import { BasicTableFields } from '../ChartFormFields/BasicTableFields.js'
import { Widget } from '../model.js'
import { useMemo } from 'react'
import { ITableConfig } from '../type.js'

import './index.scss'


interface IProps extends TableProps<any> { 
    widget: Widget
    data_source: any[]
}

const format_value = (val, decimal_places = 2) => { 
    try { 
        return Number(val).toFixed(decimal_places)
    } catch { 
        return val
    }
}

const DBTable = (props: IProps) => { 
    const { widget, data_source = [ ], ...otherProps } = props
    
    const config = widget.config as ITableConfig
    
    const columns = useMemo(() => {
        if (!data_source.length )
            return [ ]
        const { col_mappings, show_cols, value_format } = config
        return show_cols
            .map((col: string) => { 
                const col_config = {
                    dataIndex: col,
                    title: col_mappings.find(item => item?.original_col === col)?.mapping_name?.trim() || col,
                    key: col
                }
                
                if (value_format?.cols?.includes(col))
                    return { ...col_config, render: val => format_value(val, value_format?.decimal_places) }
                return col_config
            })
    }, [ config ])
    
    const pagination = useMemo<PaginationProps | false>(() => { 
        if (!config.pagination.show)
            return false
        else
            return {
                position: ['bottom'],
                pageSizeOptions: [5, 10, 15, 20],
                size: 'small',
                showSizeChanger: true,
                showQuickJumper: true
        }
    }, [config])
    
    
    return <div className='table-wrapper'>
        {config.title && <h2 className='table-title'>{ config.title }</h2>}
        <Table
            bordered={config.bordered}
            columns={columns}
            dataSource={data_source}
            pagination={pagination}
            {...otherProps}
        />
    </div>
}


export default DBTable

export const DBTableConfigForm = (props: { col_names: string[] }) => { 
    const { col_names = [ ] } = props
    return <>
        <BasicFormFields type='table' />
        <BasicTableFields  col_names={col_names}/>
    </>
}
