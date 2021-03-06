import './obj.sass'

import { default as React, useEffect, useState } from 'react'
import {
    Pagination,
    Table as AntTable,
    Tooltip,
    Tree,
    type TableColumnType,
} from 'antd'
import {
    default as Icon,
} from '@ant-design/icons'
import { Line, Pie, Bar, Column, Scatter, Area, DualAxes, Histogram, Stock } from '@ant-design/plots'

import { nanoid } from 'nanoid'


import {
    type DDB,
    DdbObj,
    DdbForm,
    DdbType,
    DdbChartType,
    nulls,
    formati,
    format,
    
    type DdbValue,
    type DdbVectorValue,
    type DdbMatrixValue,
    type DdbChartValue,
} from 'dolphindb/browser.js'
import type { Message } from 'xshell/net.browser.js'

import { t } from '../i18n/index.js'

import SvgLink from './link.icon.svg'
import { type WindowModel } from './window.js'


const views = {
    [DdbForm.vector]: Vector,
    [DdbForm.set]: Vector,
    [DdbForm.table]: Table,
    [DdbForm.matrix]: Matrix,
    [DdbForm.chart]: Chart,
    [DdbForm.dict]: Dict,
}

export type Context = 'page' | 'webview' | 'window' | 'embed'

export interface Remote {
    call <T extends any[] = any[]> (
        message: Message,
        handler?: (message: Message<T>) => any
    ): Promise<T>
}


export function Obj ({
    obj,
    objref,
    ctx = 'webview',
    remote,
    ddb
}: {
    obj?: DdbObj
    objref?: DdbObjRef
    ctx?: Context
    remote?: Remote
    ddb?: DDB
}) {
    const info = obj || objref
    
    const View = views[info.form] || Default
    
    return <View obj={obj} objref={objref} ctx={ctx} remote={remote} ddb={ddb} />
}


/** 对应 ddb.ext 中的 DdbVar, 是从 objs(true) 中获取到的变量信息 */
export class DdbObjRef <T extends DdbValue = DdbValue> {
    static size_limit = 10240n
    
    node: string
    
    // --- by objs(true)
    name: string
    
    form: DdbForm
    
    type: DdbType
    
    rows: number
    
    cols: number
    
    bytes: bigint
    
    shared: boolean
    
    extra: string
    
    /** this.bytes <= DdbVar.size_limit */
    obj: DdbObj<T>
    
    
    constructor (data: Partial<DdbObjRef>) {
        Object.assign(this, data)
    }
}


export async function open_obj ({
    obj,
    objref,
    remote,
    ddb,
}: {
    obj?: DdbObj
    objref?: DdbObjRef
    remote?: Remote
    ddb?: DDB
}) {
    let win = window.open('./window.html', new Date().toString(), 'left=100,top=100,width=1000,height=640,popup')
    
    await new Promise<void>(resolve => {
        (win as any).resolve = resolve
    })
    
    ;(win.model as WindowModel).set({
        obj,
        objref,
        remote,
        ddb
    })
}


function Default ({ obj, objref }: { obj?: DdbObj, objref?: DdbObjRef }) {
    return <div>{(obj || objref).toString()}</div>
}

function Dict ({
    obj,
    objref,
    remote,
    ddb,
    ctx,
}: {
    obj?: DdbObj<[DdbObj, DdbObj]>
    objref?: DdbObjRef<[DdbObj, DdbObj]>
    remote?: Remote
    ddb?: DDB
    ctx?: Context
}) {
    const render = useState({ })[1]
    
    const _obj = obj || objref.obj
    
    useEffect(() => {
        (async () => {
            if (_obj)
                return
            
            const { node, name } = objref
            
            console.log(`dict.fetch:`, name)
            
            objref.obj = ddb ?
                await ddb.eval<DdbObj<[DdbObj, DdbObj]>>(name)
            :
                DdbObj.parse(
                    ... await remote.call<[Uint8Array, boolean]>({
                        func: 'eval',
                        args: [node, name]
                    })
                ) as DdbObj<[DdbObj, DdbObj]>
            
            render({ })
        })()
    }, [obj, objref])
    
    
    if (!_obj)
        return null
    
    return <div className='dict'>
        <Tree
            treeData={build_tree_data(_obj, { remote, ddb, ctx })}
            defaultExpandAll
            focusable={false}
            blockNode
            showLine
            motion={null}
        />
    </div>
}


function build_tree_data (
    obj: DdbObj<[DdbObj, DdbObj]>,
    {
        remote,
        ctx,
        ddb
    }: {
        remote?: Remote
        ctx?: Context
        ddb?: DDB
    }
) {
    const dict_key = obj.value[0]
    const dict_value = obj.value[1]
    
    let tree_data = new Array(dict_key.rows)
    
    for (let i = 0;  i < dict_key.rows;  i++) {
        let node = { }
        let key = formati(dict_key, i)
        
        let valueobj = dict_value.value[i]
        
        if (valueobj instanceof DdbObj) 
            if (valueobj.form === DdbForm.dict) 
                node = {
                    title: key + ': ',
                    key: nanoid(),
                    children: build_tree_data(valueobj, { remote, ctx, ddb })
                }
             else if (valueobj.form === DdbForm.scalar) {
                let value = format(valueobj.type, valueobj.value, valueobj.le)
                node = {
                    title: key + ': ' + value,
                    key: nanoid()
                }
            } else {
                const View = views[valueobj.form] || Default
                
                node = {
                    title: key + ':',
                    key: nanoid(),
                    children: [
                        {
                            title: <View obj={valueobj} ctx={ctx} ddb={ddb} remote={remote} />,
                            key: nanoid()
                        }
                    ]
                }
            }
         else
            node = {
                title: key + ': ' + formati(dict_value, i),
                key: nanoid()
            }
        
        tree_data.push(node)
    }
    
    return tree_data
}


function Vector ({
    obj,
    objref,
    ctx,
    remote,
    ddb,
}: {
    obj?: DdbObj<DdbVectorValue>
    objref?: DdbObjRef<DdbVectorValue>
    ctx: Context
    remote?: Remote
    ddb?: DDB
}) {
    const info = obj || objref
    
    const ncols = Math.min(
        10,
        info.rows
    )
    
    const [page_size, set_page_size] = useState(
        (ctx === 'page' || ctx === 'window') ? 200 : 100
    )
    
    const nrows = Math.min(
        Math.ceil(info.rows / ncols),
        page_size / ncols
    )
    
    const [page_index, set_page_index] = useState(0)
    
    const render = useState({ })[1]
    
    useEffect(() => {
        set_page_index(0)
    }, [obj, objref])
    
    useEffect(() => {
        (async () => {
            if (
                obj ||
                info.form === DdbForm.set && objref.obj
            )
                return
            
            const { node, name, rows, form } = objref
            
            const offset = page_size * page_index
            
            if (offset >= rows)
                return
            
            const script = form === DdbForm.set ?
                    name
                :
                    `${name}[${offset}:${Math.min(offset + page_size, rows)}]`
            
            console.log(`${DdbForm[form]}.fetch:`, script)
            
            objref.obj = ddb ?
                await ddb.eval(script)
            :
                DdbObj.parse(
                    ... await remote.call<[Uint8Array, boolean]>({
                        func: 'eval',
                        args: [node, script]
                    })
                ) as DdbObj<DdbObj[]>
            
            render({ })
        })()
    }, [obj, objref, page_index, page_size])
    
    
    if (!info.rows)
        return <>{ (obj || objref.obj).toString() }</>
    
    let rows = new Array<number>(nrows)
    for (let i = 0;  i < nrows;  i++)
        rows[i] = i
    
    let cols = new Array<VectorColumn>(ncols)
    for (let i = 0;  i < ncols;  i++)
        cols[i] = new VectorColumn({
            obj,
            objref,
            index: i,
            form: info.form as (DdbForm.set | DdbForm.vector),
            ncols,
            page_index,
            page_size,
        })
    
    return <div className='vector'>
        <AntTable
            dataSource={rows as any[]}
            rowKey={x => x}
            bordered
            columns={[
                {
                    title: '',
                    key: 'index',
                    className: 'row-head',
                    fixed: 'left',
                    render (value, row, index) {
                        return page_size * page_index + index * ncols
                    }
                },
                ... cols
            ]}
            pagination={false}
        />
        
        <div className='bottom-bar'>
            <div className='actions'>
                {(ctx === 'page' || ctx === 'embed') && <Icon
                    className='icon-link'
                    component={SvgLink}
                    onClick={async () => {
                        await open_obj({ obj, objref, remote, ddb })
                    }}
                />}
            </div>
            
            <Pagination
                className='pagination'
                total={info.rows}
                current={page_index + 1}
                pageSize={page_size}
                pageSizeOptions={
                    ctx === 'window' ?
                        [10, 50, 100, 200, 500, 1000, 10000, 100000]
                    :
                        [20, 100, 200, 400, 1000, 10000, 100000]
                }
                
                size='small'
                showSizeChanger
                showQuickJumper
                hideOnSinglePage={page_size <= 200}
                
                onChange={(page_index, page_size) => {
                    set_page_size(page_size)
                    set_page_index(page_index - 1)
                }}
            />
        </div>
    </div>
}

class VectorColumn implements TableColumnType <number> {
    index: number
    
    form: DdbForm.vector | DdbForm.set
    
    obj?: DdbObj<DdbVectorValue>
    objref?: DdbObjRef<DdbVectorValue>
    
    ncols: number
    
    page_index: number
    page_size: number
    
    title: number
    key: number
    
    constructor (data: Partial<VectorColumn>) {
        Object.assign(this, data)
        this.title = this.index
        this.key = this.index
    }
    
    render = (value: any, row: number, index: number) => 
        <Cell
            obj={this.obj || this.objref.obj}
            index={
                (this.obj || this.form === DdbForm.set ? 
                    this.page_size * this.page_index
                :
                    0
                ) + this.ncols * index + this.index
            }
        />
}


function Cell ({
    obj,
    index
}: {
    obj: DdbObj<DdbVectorValue>
    index: number
}) {
    if (!obj || index >= obj.rows)
        return null
    
    const str = formati(obj, index)
    
    return str === 'null' ? null : <>{str}</>
}


function Table ({
    obj,
    objref,
    ctx,
    remote,
    ddb
}: {
    obj?: DdbObj<DdbObj<DdbVectorValue>[]>
    objref?: DdbObjRef<DdbObj<DdbVectorValue>[]>
    ctx: Context
    remote?: Remote
    ddb?: DDB
}) {
    const info = obj || objref
    
    const ncols = info.cols
    
    const [page_size, set_page_size] = useState(
        (ctx === 'page' || ctx === 'window') ? 20 : 10
    )
    
    const nrows = Math.min(page_size, info.rows)
    
    const [page_index, set_page_index] = useState(0)
    
    const render = useState({ })[1]
    
    useEffect(() => {
        set_page_index(0)
    }, [obj, objref])
    
    useEffect(() => {
        (async () => {
            if (obj)
                return
            
            const { node, name, rows } = objref
            
            const offset = page_size * page_index
            
            if (offset >= rows)
                return
            
            const script = `${name}[${offset}:${Math.min(offset + page_size, rows)}]`
            
            console.log(`table.fetch:`, script)
            
            if (ddb)
                objref.obj = await ddb.eval(script)
            else
                objref.obj = DdbObj.parse(
                    ... await remote.call<[Uint8Array, boolean]>({
                        func: 'eval',
                        args: [node, script]
                    })
                ) as DdbObj<DdbObj<DdbVectorValue>[]>
            
            render({ })
        })()
    }, [obj, objref, page_index, page_size])
    
    
    let rows = new Array<number>(nrows)
    for (let i = 0;  i < nrows;  i++)
        rows[i] = i
    
    let cols = new Array<TableColumn>(ncols)
    for (let i = 0;  i < ncols;  i++)
        cols[i] = new TableColumn({
            obj,
            objref,
            index: i,
            page_index,
            page_size,
        })
        
    
    return <div className='table'>
        { ctx !== 'webview' && <div className='info'>
            <span className='name'>{info.name || 'table'}</span>
            <span className='desc'>{info.rows}r × {info.cols}c  { objref ? `(${Number(objref.bytes).to_fsize_str()})` : '' }</span>
        </div> }
        
        <AntTable
            dataSource={rows as any[]}
            rowKey={x => x}
            bordered
            columns={[
                {
                    title: '',
                    key: 'index',
                    className: 'row-head',
                    fixed: 'left',
                    render: irow =>
                        page_size * page_index + irow
                },
                ... cols
            ]}
            pagination={false}
        />
        
        <div className='bottom-bar'>
            <div className='actions'>
                {(ctx === 'page' || ctx === 'embed') && <Icon
                    className='icon-link'
                    component={SvgLink}
                    onClick={async () => {
                        await open_obj({ obj, objref, remote, ddb })
                    }}
                />}
            </div>
            
            <Pagination
                className='pagination'
                total={info.rows}
                current={page_index + 1}
                pageSize={page_size}
                pageSizeOptions={[5, 10, 20, 50, 100, 200, 500, 1000, 10000, 100000]}
                size='small'
                showSizeChanger
                showQuickJumper
                hideOnSinglePage={page_size <= 50}
                
                onChange={(page_index, page_size) => {
                    set_page_size(page_size)
                    set_page_index(page_index - 1)
                }}
            />
        </div>
    </div>
}


class TableColumn implements TableColumnType <number> {
    static left_align_types = new Set([
        DdbType.symbol,
        DdbType.symbol_extended,
        DdbType.string,
        DdbType.functiondef,
        DdbType.handle,
        DdbType.code,
        DdbType.datasource,
        DdbType.resource,
    ])
    
    index: number
    
    obj?: DdbObj<DdbObj<DdbVectorValue>[]>
    objref?: DdbObjRef<DdbObj<DdbVectorValue>[]>
    
    col?: DdbObj<DdbVectorValue>
    
    page_index: number
    page_size: number
    
    title: React.ReactNode
    key: number
    
    align: 'left' | 'center' | 'right'
    
    constructor (data: Partial<TableColumn>) {
        Object.assign(this, data)
        this.key = this.index
        let obj = this.obj || this.objref.obj
        if (!obj)
            return
        
        this.col = obj.value[this.index]
        
        this.title = <Tooltip
            title={
                DdbType[
                    this.col.type === DdbType.symbol_extended ? DdbType.symbol : this.col.type
                ]}
        >{
            this.col.name
        }</Tooltip>
        
        this.align = TableColumn.left_align_types.has(this.col.type) ? 'left' : 'right'
    }
    
    render = (irow: number) => 
        <Cell
            obj={this.col}
            index={
                (this.obj ?
                    this.page_size * this.page_index
                :
                    0
                ) + irow
            }
        />
}


function Matrix ({
    obj,
    objref,
    ctx,
    remote,
    ddb,
}: {
    obj?: DdbObj<DdbMatrixValue>
    objref?: DdbObjRef<DdbMatrixValue>
    ctx?: Context
    remote?: Remote
    ddb?: DDB
}) {
    const info = obj || objref
    
    const ncols = info.cols
    
    const [page_size, set_page_size] = useState(
        (ctx === 'page' || ctx === 'window') ? 20 : 10
    )
    
    const nrows = Math.min(page_size, info.rows)
    
    const [page_index, set_page_index] = useState(0)
    
    const render = useState({ })[1]
    
    useEffect(() => {
        set_page_index(0)
    }, [obj, objref])
    
    useEffect(() => {
        (async () => {
            if (obj)
                return
            
            const { node, name, rows } = objref
            
            const offset = page_size * page_index
            
            if (offset >= rows)
                return
            
            const script = `${name}[${offset}:${Math.min(offset + page_size, rows)},]`
            
            console.log('matrix.fetch', script)
            
            if (ddb)
                objref.obj = await ddb.eval(script)
            else
                objref.obj = DdbObj.parse(
                    ... await remote.call<[Uint8Array, boolean]>({
                        func: 'eval',
                        args: [node, script]
                    })
                ) as DdbObj<DdbMatrixValue>
            
            render({ })
        })()
    }, [obj, objref, page_index, page_size])
    
    
    let rows = new Array<number>(nrows)
    for (let i = 0;  i < nrows;  i++)
        rows[i] = i
    
    let cols = new Array<MatrixColumn>(ncols)
    for (let i = 0;  i < ncols;  i++)
        cols[i] = new MatrixColumn({
            obj,
            objref,
            index: i,
            page_index,
            page_size,
        })
    
    return <div className='matrix'>
        <AntTable
            dataSource={rows as any[]}
            rowKey={x => x}
            bordered
            columns={[
                {
                    title: '',
                    key: 'index',
                    className: 'row-head',
                    fixed: 'left',
                    render (irow: number) {
                        const i = obj ? 
                                page_size * page_index + irow
                            :
                                irow
                        
                        const rows = (obj || objref.obj)?.value.rows
                        
                        return rows ?
                                formati(rows, i)
                            :
                                i
                    }
                },
                ... cols
            ]}
            pagination={false}
        />
        
        <div className='bottom-bar'>
            <div className='actions'>
                {(ctx === 'page' || ctx === 'embed') && <Icon
                    className='icon-link'
                    component={SvgLink}
                    onClick={async () => {
                        await open_obj({ obj, objref, remote, ddb })
                    }}
                />}
            </div>
            
            <Pagination
                className='pagination'
                total={info.rows}
                current={page_index + 1}
                pageSize={page_size}
                pageSizeOptions={[5, 10, 20, 50, 100, 200, 500, 1000, 10000, 100000]}
                size='small'
                showSizeChanger
                showQuickJumper
                hideOnSinglePage={page_size <= 50}
                
                onChange={(page_index, page_size) => {
                    set_page_size(page_size)
                    set_page_index(page_index - 1)
                }}
            />
        </div>
    </div>
}

class MatrixColumn implements TableColumnType <number> {
    index: number
    
    obj?: DdbObj<DdbMatrixValue>
    objref?: DdbObjRef<DdbMatrixValue>
    
    page_index: number
    page_size: number
    
    title: number | string
    key: number
    
    constructor (data: Partial<MatrixColumn>) {
        Object.assign(this, data)
        
        this.title = this.index
        this.key = this.index
        
        let obj = this.obj || this.objref.obj
        if (!obj)
            return
        
        const cols = obj?.value.cols
        if (cols)
            this.title = formati(cols, this.index)
    }
    
    render = (irow: number) => {
        const obj = this.obj || this.objref.obj
        
        if (!obj)
            return null
        
        return <Cell
            obj={
                new DdbObj({
                    form: obj.form,
                    type: obj.type,
                    rows: obj.cols * obj.rows,
                    value: obj.value.data
                })
            }
            index={
                this.obj ?
                    obj.rows * this.index + this.page_size * this.page_index + irow
                :
                    obj.rows * this.index + irow
            }
        />
    }
}

function to_chart_data (data: DdbValue, datatype: DdbType) {
    switch (datatype) {
        case DdbType.int:
            return data === nulls.int32 ? null : Number(data)
            
        case DdbType.short:
            return data === nulls.int16 ? null : Number(data)
            
        case DdbType.float:
            return data === nulls.float32 ? null : Number(data)
            
        case DdbType.double:
            return data === nulls.double ? null : Number(data)
            
        case DdbType.long:
            return data === nulls.int64 ? null : Number(data)
            
        default:
            return Number(data)
    }
}

function Chart ({
    obj,
    objref,
    ctx,
    remote,
    ddb,
}: {
    obj?: DdbObj<DdbChartValue>
    objref?: DdbObjRef<DdbChartValue>
    ctx?: Context
    remote?: Remote
    ddb?: DDB
}) {
    const [
        {
            inited,
            charttype,
            data,
            titles,
            stacking,
            multi_y_axes,
            col_labels,
            bin_count,
            bin_start,
            bin_end
        },
        set_config
    ] = useState({
        inited: false,
        charttype: DdbChartType.line,
        data: [ ],
        titles: { } as DdbChartValue['titles'],
        stacking: false,
        multi_y_axes: false,
        col_labels: [ ],
        bin_count: null as DdbChartValue['bin_count'],
        bin_start: null as DdbChartValue['bin_start'],
        bin_end: null as DdbChartValue['bin_end'],
    })
    
    useEffect(() => {
        (async () => {
            const {
                value: {
                    bin_count,
                    bin_start,
                    bin_end,
                    titles,
                    type: charttype,
                    stacking,
                    extras,
                    data: {
                        rows,
                        cols,
                        type: datatype,
                        value: {
                            rows: rows_,
                            cols: cols_,
                            data
                        }
                    }
                }
            } = obj ||
                (ddb ? 
                    await ddb.eval(objref.name)
                :
                    DdbObj.parse(
                        ... await remote.call<[Uint8Array, boolean]>({
                            func: 'eval',
                            args: [objref.node, objref.name]
                        })
                    ) as DdbObj<DdbChartValue>
                )
            
            const { multi_y_axes = false } = extras || { }
            
            let col_labels = (cols_?.value || [ ]) as any[]
            let col_lables_ = new Array(col_labels.length)
            
            // 没有设置 label 的情况
            let row_labels_ = new Array(rows)
            
            for (let i = 0; i < rows; i++) 
                row_labels_[i] = i
            
            let row_labels = (rows_?.value || row_labels_) as any[]
                       
            const n = charttype === DdbChartType.line && multi_y_axes || charttype === DdbChartType.kline ? rows : rows * cols
            let data_ = new Array(n)
            
            switch (charttype) {
                case DdbChartType.line:
                    if (multi_y_axes === true) 
                        for (let j = 0; j < rows; j++) {
                            let dataobj: any = { }
                            dataobj.row = String(row_labels[j])
                            for (let i = 0; i < cols; i++) {
                                const col = col_labels[i]?.value?.name || col_labels[i]
                                col_lables_[i] = col
                                
                                let idata = i * rows + j
                                dataobj[col] = to_chart_data(data[idata], datatype)
                            }
                            data_[j] = dataobj
                        }
                     else 
                        for (let i = 0; i < cols; i++) {
                            const col = col_labels[i]?.value?.name || col_labels[i]
                            col_lables_[i] = col
                            
                            for (let j = 0; j < rows; j++) {
                                const idata = i * rows + j
                                data_[idata] = {
                                    row: String(row_labels[j]),
                                    col,
                                    value: to_chart_data(data[idata], datatype)
                                }
                            }
                        }
                    break
                    
                case DdbChartType.kline:
                    for (let j = 0; j < rows; j++) {
                        let dataobj: any = { }
                        
                        dataobj.row = row_labels[j]
                        dataobj.row_ = formati(rows_, j)

                        dataobj.open = to_chart_data(data[j], datatype)
                        dataobj.high = to_chart_data(data[rows + j], datatype)
                        dataobj.low = to_chart_data(data[rows * 2 + j], datatype)
                        dataobj.close = to_chart_data(data[rows * 3 + j], datatype)
                        
                        if (cols === 5)
                            dataobj.vol = to_chart_data(data[rows * 4 + j], datatype)
                            
                        data_[j] = dataobj
                        
                    }
                    break
                    
                default:
                    for (let i = 0; i < cols; i++) {
                        const col = col_labels[i]?.value?.name || col_labels[i]
                        col_lables_[i] = col
                        
                        for (let j = 0; j < rows; j++) {
                            const idata = i * rows + j
                            data_[idata] = {
                                row: charttype === DdbChartType.scatter ? row_labels[j] : String(row_labels[j]),
                                col,
                                value: to_chart_data(data[idata], datatype)
                            }
                        }
                    }
                    
                    if (charttype === DdbChartType.histogram && bin_start && bin_end) 
                        data_ = data_.filter(data => 
                            data.value >= Number(bin_start.value) && data.value <= Number(bin_end.value))
                    
                    break
            }
            
            console.log('data:', data_)   
            
            set_config({
                inited: true,
                charttype,
                data: data_,
                titles,
                stacking,
                multi_y_axes,
                col_labels: col_lables_,
                bin_count,
                bin_start,
                bin_end,
            })
        })()
    }, [obj, objref])
    
    if (!inited)
        return null
    
    return <div className='chart'>
        <div className='chart-title'>{titles.chart}</div>
        
        {(() => {
            switch (charttype) {
                case DdbChartType.line:
                    if (!multi_y_axes)
                        return <Line
                            className='chart-body'
                            data={data}
                            xField='row'
                            yField='value'
                            seriesField='col'
                            xAxis={{
                                title: {
                                    text: titles.x_axis
                                }
                            }}
                            yAxis={{
                                title: {
                                    text: titles.y_axis
                                }
                            }}
                            isStack={stacking}
                            padding='auto'
                        />
                    else
                        return <DualAxes
                            className='chart-body'
                            data={[data, data]}
                            xField='row'
                            yField={col_labels}
                            xAxis={{
                                title: {
                                    text: titles.x_axis
                                }
                            }}
                            yAxis={{
                                [col_labels[0]]: {
                                    title: {
                                        text: titles.y_axis
                                    }
                                }
                            }}
                            padding='auto'
                        />

                case DdbChartType.column:
                    return <Column
                        className='chart-body'
                        data={data}
                        xField='row'
                        yField='value'
                        seriesField='col'
                        xAxis={{
                            title: {
                                text: titles.x_axis
                            }
                        }}
                        yAxis={{
                            title: {
                                text: titles.y_axis
                            }
                        }}
                        isGroup={true}
                        label={{
                            position: 'middle',
                            layout: [
                                {
                                    type: 'interval-adjust-position',
                                },
                                {
                                    type: 'interval-hide-overlap',
                                },
                                {
                                    type: 'adjust-color',
                                },
                            ],
                        }}
                        padding='auto'
                    />
                
                case DdbChartType.bar:
                    return <Bar
                        className='chart-body'
                        data={data}
                        xField='value'
                        yField='row'
                        seriesField='col'
                        xAxis={{
                            title: {
                                text: titles.y_axis
                            }
                        }}
                        yAxis={{
                            title: {
                                text: titles.x_axis
                            }
                        }}
                        isStack={stacking}
                        isGroup={!stacking}
                        label={{
                            position: 'middle',
                            layout: [
                                {
                                    type: 'interval-adjust-position',
                                },
                                {
                                    type: 'interval-hide-overlap',
                                },
                                {
                                    type: 'adjust-color',
                                },
                            ],
                        }}
                        padding='auto'
                    />
                
                case DdbChartType.pie:
                    return <Pie
                        className='chart-body'
                        data={data}
                        angleField='value'
                        colorField='row'
                        radius={0.9}
                        label={{
                            type: 'spider',
                            content: `{name}: {percentage}`,
                        }}
                        padding='auto'
                    />
                
                case DdbChartType.area:
                    return <Area
                        className='chart-body'
                        data={data}
                        xField='row'
                        yField='value'
                        seriesField='col'
                        xAxis={{
                            title: {
                                text: titles.x_axis
                            }
                        }}
                        yAxis={{
                            title: {
                                text: titles.y_axis
                            }
                        }}
                        isStack={stacking}
                        padding='auto'
                    />
                
                case DdbChartType.scatter:
                    return <Scatter
                        className='chart-body'
                        data={data}
                        xField='row'
                        yField='value'
                        colorField='col'
                        xAxis={{
                            title: {
                                text: titles.x_axis
                            }
                        }}
                        yAxis={{
                            title: {
                                text: titles.y_axis
                            }
                        }}
                        shape='circle'
                        padding='auto'
                    />
                
                case DdbChartType.histogram:
                    let binNumber = bin_count ? Number(bin_count.value) : null
                    let binWidth: number
                    if (bin_start && bin_end && binNumber)
                        if (data.length < binNumber)
                            binWidth = null
                        else    
                            binWidth = (Number(bin_start.value) - Number(bin_end.value)) / binNumber
                    return <Histogram 
                        className='chart-body'
                        data={data}
                        binField='value'
                        stackField= 'col'
                        binNumber={binNumber}
                        binWidth={binWidth}
                        meta={{
                            range: {
                                min: Number(bin_start?.value),
                                max: Number(bin_end?.value)
                            }
                        }}
                        limitInPlot
                        xAxis={{
                            title: {
                                text: titles.x_axis
                            }
                        }}
                        yAxis={{
                            title: {
                                text: titles.y_axis
                            }
                        }}
                        padding='auto'
                    />
                
                case DdbChartType.kline:
                    return <Stock
                        data={data}
                        xField='row'
                        yField={['open', 'close', 'high', 'low']}
                        xAxis={{
                            title: {
                                text: titles.x_axis
                            }
                        }}
                        yAxis={{
                            title: {
                                text: titles.y_axis
                            }
                        }}
                        meta={{
                            row: {
                                formatter: (value, index) => data[index].row_ 
                            },
                            vol: {
                                alias: t('成交量'),
                            },
                            open: {
                                alias: t('开盘价'),
                            },
                            close: {
                                alias: t('收盘价'),
                            },
                            high: {
                                alias: t('最高价'),
                            },
                            low: {
                                alias: t('最低价'),
                            },
                        }}
                        padding='auto'
                        tooltip={{
                            crosshairs: {
                                // 自定义 crosshairs line 样式
                                line: {
                                    style: {
                                        lineWidth: 0.5,
                                        stroke: 'rgba(0,0,0,0.25)'
                                    }
                                },
                                text: (type, defaultContent, items) => {
                                    let textContent
                                    
                                    if (type === 'x') {
                                        const item = items[0]
                                        textContent = item ? item.data.row_ : defaultContent
                                    } else 
                                        textContent = defaultContent.toFixed(2)
                                    
                                    return {
                                        position: type === 'y' ? 'start' : 'end',
                                        content: textContent,
                                        // 自定义 crosshairs text 样式
                                        style: {
                                            fill: '#dfdfdf'
                                        }
                                    }
                                },
                            },
                            
                            fields: ['open', 'close', 'high', 'low', 'vol'],
                            
                            title: 'row_',
                        }}
                    />
                
                default:
                    return <Line
                        className='chart-body'
                        data={data}
                        xField='row'
                        yField='value'
                        seriesField='col'
                        xAxis={{
                            title: {
                                text: titles.x_axis
                            }
                        }}
                        yAxis={{
                            title: {
                                text: titles.y_axis
                            }
                        }}
                        isStack={stacking}
                        padding='auto'
                    />
            }
        })()}
        
        <div className='bottom-bar'>
            <div className='actions'>
                {(ctx === 'page' || ctx === 'embed') && <Icon
                    className='icon-link'
                    component={SvgLink}
                    onClick={async () => {
                        await open_obj({ obj, objref, remote, ddb })
                    }}
                />}
            </div>
        </div>
    </div>
}
