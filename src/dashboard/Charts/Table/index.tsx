import './index.scss'

import { Checkbox, type PaginationProps, Table, type TableProps, Empty } from 'antd'
import { useEffect, useMemo, useRef, useState } from 'react'
import { genid } from 'xshell/utils.browser.js'

import { type ColumnsType } from 'antd/es/table'

import { isNumber } from 'lodash'

import cn from 'classnames'



import { useSize } from 'ahooks'

import {  BasicFormFields }  from '../../ChartFormFields/BasicFormFields.js'
import { BasicTableFields } from '../../ChartFormFields/BasicTableFields.js'
import { type Widget } from '../../model.js'
import { type ITableConfig } from '../../type.js'


import { format_number, format_time, parse_text } from '../../utils.ts'



interface IProps extends TableProps<any> { 
    widget: Widget
    data_source: any[]
}

function get_cell_color (val, threshold, total) { 
    
    if (isNumber(Number(val)) && isNumber(threshold)) { 
        const low_to_threshold_list = total.map(Number).filter(item => item < threshold).sort((a, b) => a - b)
        const low_to_threshold_min = low_to_threshold_list[0]
    
        const high_to_threshold_list = total.map(Number).filter(item => item >= threshold).sort((a, b) => a - b)
        const high_to_threshold_max = high_to_threshold_list.pop()
        
        
        if (Number(val) >= threshold) {
            const transparency = ((val - threshold) / (high_to_threshold_max - threshold)) * 0.8 + 0.2
            return `rgba(255,0,0,${transparency})`
        }
        else { 
            const transparency = ((threshold - val) / (threshold - low_to_threshold_min)) * 0.8 + 0.2
            return `rgba(13,114,1,${transparency})`
        }
    
    }
    else
        return null
}


export function DBTable (props: IProps) {
    const { widget, data_source = [ ], ...otherProps } = props
    const [selected_cols, set_select_cols] = useState([ ])
    
    const config = useMemo(() => widget.config as ITableConfig, [widget.config])
    
    const show_cols = useMemo(() => config?.col_properties?.filter(item => item?.show) ?? [ ], [config.col_properties])
    
    
    useEffect(() => { set_select_cols(show_cols?.map(item => item.col)) }, [show_cols])
        
    const radio_group_options = useMemo(() => show_cols?.map(col => ({
            label: col.display_name || col.col,
            value: col.col,
            key: col.col
        })), [show_cols])
    
    const columns = useMemo<ColumnsType<any>>(() => selected_cols
            .map(col_name => show_cols.find(item => item.col === col_name))
            .map(col => {
                const {
                    col: name,
                    width,
                    threshold,
                    display_name,
                    decimal_places,
                    time_format,
                    is_thousandth_place,
                    color,
                    align = 'left',
                    background_color,
                    sorter,
                    font_size,
                    header_style,
                    ellipsis
                } = col ?? { }
                
                const col_config = {
                    dataIndex: name,
                    width,
                    title: display_name || name,
                    key: name,
                    ellipsis,
                    align,
                    sorter: sorter ? {
                        compare: (a, b) => a[name] - b[name],
                    } : false,
                    onCell: record => ({
                        style: {
                            backgroundColor: isNumber(threshold) ? get_cell_color(record[name], threshold, data_source.map(item => item[col?.col])) : background_color,
                            color,
                            border: config.bordered ? '1px solid black' : null,
                            fontSize: font_size || 14,
                            wordBreak: width ? 'break-all' as const : undefined
                        }
                    }),
                    onHeaderCell: () => ({ style: header_style }),
                    render: val => (decimal_places === 0 || decimal_places || is_thousandth_place) ? format_number(val, decimal_places, is_thousandth_place) : val ?? '-'
                }
                
                if (time_format)  
                    return {
                        ...col_config,
                        render: val => format_time(val, time_format)
                    }
                
                return col_config
            }), [ selected_cols, data_source, show_cols, config])
            
    
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
                showQuickJumper: true,
                hideOnSinglePage: true,
                style: {
                    marginBottom: 0
                }
            }
    }, [config, data_source])
    
    
    return <div className='dashboard-table-wrapper'>
        
        {
            config.title && <h2
                style={{ fontSize: config.title_size }}
                className='table-title'
            >
                {parse_text(config.title)}
            </h2>
        }
        
        { 
            config.need_select_cols && <Checkbox.Group
                onChange={ val => { set_select_cols(val) }  }
                value={selected_cols}
                options={radio_group_options}
                className='table-radio-group' 
            /> 
        }
        
        
        {
            selected_cols?.length ?
                    <Table
                        className={cn('dashboard-table', {
                            'dashboard-table-with-pagination': pagination
                        })}
                        bordered={config.bordered}
                        scroll={{ x: config.max_content ? 'max-content' : undefined }}
                        columns={columns}
                        dataSource={config.is_reverse ? data_source.toReversed() : data_source}
                        pagination={pagination}
                        rowKey={() => genid()}
                        rowClassName={cn({
                            'table-row-with-border': config.bordered
                        })}
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
