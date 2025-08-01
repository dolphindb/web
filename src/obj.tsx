import './obj.sass'

import { useEffect, useRef, useState, type default as React, type RefObject, useCallback } from 'react'

import {
    Pagination,
    Table as AntTable,
    Tooltip,
    Tree,
    Button,
    Switch,
    Select,
    type TableColumnType,
    Input,
    Form,
    type TableProps,
} from 'antd'

import { default as Icon, CaretRightOutlined, PauseOutlined, RightOutlined } from '@ant-design/icons'

import * as echarts from 'echarts'

import { use_rerender } from 'react-object-model/hooks.js'

import { genid, seq, assert, delay, debounce, unique } from 'xshell/utils.browser.js'


import {
    DDB,
    DdbObj,
    DdbForm,
    DdbType,
    DdbChartType,
    nulls,
    formati,
    format,
    type InspectOptions,
    type DdbValue,
    type DdbVectorValue,
    type DdbMatrixValue,
    type DdbChartValue,
    type DdbDictObj,
    type DdbVectorObj,
    type DdbTableObj,
    type DdbMatrixObj,
    type DdbChartObj,
    type StreamingMessage,
    ddb_tensor_bytes,
    type DdbTensorObj
} from 'dolphindb/browser.js'

import { t } from '@i18n'

import SvgLink from './link.icon.svg'

import { type WindowModel } from './window.tsx'


const max_strlen = 10000

const page_sizes = [1, 2, 3, 5, 10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200, 300, 400, 500, 750, 1000, 5000, 10000, 100000]

const views = {
    [DdbForm.vector]: Vector,
    [DdbForm.set]: Vector,
    [DdbForm.table]: Table,
    [DdbForm.matrix]: Matrix,
    [DdbForm.chart]: Chart,
    [DdbForm.dict]: Dict,
    [DdbForm.tensor]: Tensor,
}


export type Context = 'page' | 'webview' | 'window' | 'embed' | 'dashboard'

export interface Remote {
    /** 调用 remote 中的 func, 只适用于最简单的一元 rpc (请求, 响应) */
    call <TReturn extends any[] = any[]> (func: string, args?: any[]): Promise<TReturn>
}


function truncate (str: string) {
    return str.length >= max_strlen ? str.slice(0, max_strlen - 2) + '···' : str
}


export function Obj ({
    obj,
    objref,
    ctx = 'webview',
    remote,
    ddb,
    ExportCsv,
    options,
}: {
    obj?: DdbObj
    objref?: DdbObjRef
    ctx?: Context
    remote?: Remote
    ddb?: DDB
    ExportCsv?: React.FC<{ info: DdbTableObj | DdbObjRef<DdbObj<DdbVectorValue>[]> }>
    options?: InspectOptions
}) {
    const info = obj || objref
    const View = views[info.form] || Default
    
    return <View obj={obj} objref={objref} ctx={ctx} remote={remote} ddb={ddb} options={options} ExportCsv={ExportCsv}/>
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
    options,
}: {
    obj?: DdbObj
    objref?: DdbObjRef
    remote?: Remote
    ddb?: DDB
    options?: InspectOptions
}) {
    let win = window.open('./window.html', new Date().toString(), 'left=100,top=100,width=1000,height=640,popup')
    
    if (!win)
        throw new Error(t('弹窗被浏览器拦截，请设置网页允许弹出式窗口和重定向'))
    
    await new Promise<void>(resolve => {
        (win as any).resolve = resolve
    })
    
    ;(win.model as WindowModel).set({
        obj,
        objref,
        remote,
        ddb,
        options,
    })
}


function Default ({ obj, objref, options }: { obj?: DdbObj, objref?: DdbObjRef, options?: InspectOptions }) {
    return <div className='default-obj'>{(obj || objref).toString(options)}</div>
}

function Dict ({
    obj,
    objref,
    remote,
    ddb,
    ctx,
    options,
}: {
    obj?: DdbDictObj
    objref?: DdbObjRef<DdbDictObj['value']>
    remote?: Remote
    ddb?: DDB
    ctx?: Context
    options?: InspectOptions
}) {
    const [page_size, set_page_size] = useState(100)
    const [page_index, set_page_index] = useState(0)
    
    const render = use_rerender()
    
    const _obj = obj || objref.obj
    
    useEffect(() => {
        (async () => {
            // 重置分页
            set_page_index(0)
            set_page_size(100)
            
            if (_obj)
                return
            
            const { node, name } = objref
            
            console.log('dict.fetch:', name)
            
            objref.obj = ddb ?
                await ddb.eval<DdbDictObj>(name)
            :
                DdbObj.parse(... await remote.call<[Uint8Array, boolean]>('eval', [node, name])) as DdbDictObj
            
            render()
        })()
    }, [obj, objref])
    
    
    if (!_obj)
        return null
    
    return <div className='dict'>
        <Tree
            key={genid()}
            treeData={(() => {
                if (!_obj)
                    return [ ]
                
                const start = page_index * page_size
                const end = Math.min(start + page_size, _obj.rows)
                const data = build_tree_data_with_slice(_obj, start, end, { remote, ddb, ctx, options })
                
                return data
            })()}
            defaultExpandAll
            focusable={false}
            blockNode
            showLine
            motion={null}
        />
        
        <div className='bottom-bar-placeholder' />
        
        <div className='bottom-bar'>
            <div className='info'>
                <span className='desc'>{_obj.rows} {t('个键')}{ objref ? ` (${Number(objref.bytes).to_fsize_str()}) ` : '' }</span>
                <span className='type'>{t('的词典')}</span>
            </div>
            
            <Pagination
                className='pagination'
                total={_obj.rows}
                current={page_index + 1}
                pageSize={page_size}
                pageSizeOptions={page_sizes}
                size='small'
                showSizeChanger
                showQuickJumper
                hideOnSinglePage={page_size <= 50}
                onChange={(page, size) => {
                    set_page_size(size)
                    set_page_index(page - 1)
                }}
            />
        </div>
    </div>
}

function build_tree_data_with_slice (
    obj: DdbDictObj,
    start: number,
    end: number,
    { remote, ctx, ddb, options }: { remote?: Remote, ctx?: Context, ddb?: DDB, options?: InspectOptions }
) {
    const [dict_key, dict_value] = obj.value
    return seq(Math.min(Math.max(end - start, 0), dict_key.rows), i => {
        const ireal = start + i
        const key = formati(dict_key, ireal, options)
        const valueobj = dict_value.value[ireal]
        
        // if (valueobj instanceof DdbObj)
        // valueobj 可能来自不同 window
        if (valueobj && Object.getPrototypeOf(valueobj)?.constructor.name === 'DdbObj')
            if (valueobj.form === DdbForm.dict)
                return {
                    title: `${key}: `,
                    key: genid(),
                    // 对嵌套的字典不继续分页
                    children: build_tree_data_with_slice(valueobj, 0, valueobj.rows, { remote, ctx, ddb })
                }
            else if (valueobj.form === DdbForm.scalar)
                return {
                    title: `${key}: ${format(valueobj.type, valueobj.value, valueobj.le, { ...options, quote: true, nullstr: true })}`,
                    key: genid()
                }
            else {
                const View = views[valueobj.form] || Default
                
                return {
                    title: `${key}:`,
                    key: genid(),
                    children: [
                        {
                            title: <View obj={valueobj} ctx={ctx} ddb={ddb} remote={remote} options={options} />,
                            key: genid()
                        }
                    ]
                }
            }
        else
            return {
                title: `${key}: ${truncate(formati(dict_value, ireal, options))}`,
                key: genid()
            }
    })
}

function Tensor ({
    obj,
    objref,
    remote,
    ddb,
    ctx,
    options,
}: {
    obj?: DdbTensorObj
    objref?: DdbObjRef<DdbTensorObj['value']>
    remote?: Remote
    ddb?: DDB
    ctx?: Context
    options?: InspectOptions
}) {
    const render = useState({ })[1]
    
    const _obj = obj || objref.obj
    
    // 接下来开始写当前浏览状态的维护
    const [currentDir, setCurrentDir] = useState<number[]>([ ])
    const [pageSize, setPageSize] = useState(10)
    const [page, setPage] = useState(1)
    const [previewLimit, setPreviewLimit] = useState(10)
    
    useEffect(() => {
        (async () => {
            if (_obj)
                return
            
            const { node, name } = objref
            
            console.log('tensor.fetch:', name)
            
            objref.obj = ddb ?
                await ddb.eval<DdbTensorObj>(name)
            :
                DdbObj.parse(... await remote.call<[Uint8Array, boolean]>('eval', [node, name])) as DdbTensorObj
            
            render({ })
        })()
        
        setCurrentDir([ ])
        setPageSize(10)
        setPage(1)
    }, [obj, objref])
    
    
    if (!_obj)
        return null
    
    
    // 第 i 个维度的 size
    const shape: number[] = _obj.value.shape
    // 第 i 个维度，元素间距离
    const strides: number[] = _obj.value.strides
    // 元素间跳字节
    const dataByte: number = ddb_tensor_bytes[_obj.value.data_type]
    
    const typeName = DdbType[_obj.value.data_type]
    
    const pageIndex = page - 1
    const currentDim = currentDir.length
    const isLeaf = currentDim === _obj.value.dimensions - 1
    const thisDimSize = shape[currentDim]
    const totalPageCount = Math.ceil(thisDimSize / pageSize)
    const data = _obj.value.data
    
    function pushDimIndex (index: number) {
        setCurrentDir([...currentDir, index])
        setPage(1)
    }
    
    function popDimIndexTo (index: number) {
        setCurrentDir(currentDir.slice(0, index))
        setPage(1)
    }
    
    // 如果不是最高维，没有数据，比较简单
    // 只需要展示有一些低维数组存在就可以了
    const currentDimSize: number = _obj.value.shape[currentDim]
    // 搞这么多元素来
    const elems = [ ]
    const offset = currentDir.reduce(
        (prev, curr, index) =>
            prev + strides[index] * curr * dataByte,
        0)
    
    let arrstrall = ''
    for (let j = 0;  j < _obj.value.dimensions;  j++) 
        // j 代表当前维度
        arrstrall += `[${shape[j]}]`
    
    if (!isLeaf)
        for (let i = pageIndex * pageSize;  i < pageIndex * pageSize + pageSize && i < thisDimSize;  i++) {
            // 搞清楚后面的维度的 size
            let arrstr = ''
            for (let j = currentDim + 1;  j < _obj.value.dimensions;  j++)
                // j 代表当前维度
                arrstr += `[${shape[j]}]`
                
                
            // 如果是倒数第二维
            let previewStr = ''
            if (currentDim === _obj.value.dimensions - 2) {
                previewStr = '['
                // 取每个维度的前 10 个
                for (let k = 0;  k < shape[currentDim + 1];  k++) {
                    const offsetElem = offset + i * dataByte * strides[currentDim] + k * dataByte * strides[currentDim + 1]
                    const targetArr = data.subarray(offsetElem, offsetElem + dataByte)
                    const val = get_value_from_uint8_array(_obj.value.data_type, targetArr, _obj.le)
                    previewStr += `${val}`
                    if (k === previewLimit) {
                        previewStr += ', ...'
                        break
                    } else if (k !== shape[currentDim + 1] - 1)
                        previewStr += ', '
                        
                        
                }
                previewStr += ']'
            }
            
            
            elems.push(
                <div onClick={() => { pushDimIndex(i) }} className='tensor-elem' key={'dim' + `${i}`}>
                    <span className='tensor-elem-count'>{i}</span>: <span className='type-name'>{typeName}{arrstr}</span> {previewStr}
                </div>
            )
        } else
        for (let i = pageIndex * pageSize;  i < pageIndex * pageSize + pageSize && i < thisDimSize;  i++) {
            const offsetElem = offset + i * dataByte
            const targetArr = data.subarray(offsetElem, offsetElem + dataByte)
            const val = get_value_from_uint8_array(_obj.value.data_type, targetArr, _obj.le)
            elems.push(<div key={`tensor-elem-offset-${offsetElem}`} className='tensor-elem'>
                <span className='tensor-elem-count'>{i}</span>: <span className='type-name'>{typeName}</span> {String(val)}
            </div>)
        }
    
    
    const navItems = currentDir.map((e, i) => 
        <div
            className='tensor-nav-elem'
            key={`tensor-index-${i}`}
            onClick={() => { popDimIndexTo(i + 1) }}
        >
            [{e}] <RightOutlined style={{ transform: 'scale(0.8,0.8) translate(0,2px)' }}/>
        </div>)
    
    
    return <div className='tensor'>
        <div className='tensor-nav'>
            <span className='tensor-title' onClick={() => { popDimIndexTo(0) }}>Tensor<RightOutlined style={{ transform: 'scale(0.8,0.8) translate(0,2px)' }}/></span>{navItems}
        </div>
        <div className='tensor-view'>
            {elems}
        </div>
        <div className='tensor-page'>
            <span className='tensor-desc'>
                Tensor{`<${typeName}${arrstrall}>`}
            </span>
            {totalPageCount > 1 && <Pagination
                current={page}
                total={currentDimSize}
                pageSize={pageSize}
                onChange={(page, pageSize) => {
                    setPage(page)
                    setPageSize(pageSize)
                }}
                showSizeChanger
            />}
        </div>
    </div>
}


function get_value_from_uint8_array (dataType: DdbType, data: Uint8Array, le: boolean) {
    const dv = new DataView(data.buffer, data.byteOffset)
    switch (dataType) {
        case DdbType.bool: {
            const value = dv.getInt8(0)
            return value === nulls.int8 ? null : Boolean(value)
        }
        case DdbType.char: {
            const value = dv.getInt8(0)
            return value === nulls.int8 ? null : value
        }
        case DdbType.short: {
            const value = dv.getInt16(0, le)
            return value === nulls.int16 ? null : value
        }
        case DdbType.int: {
            const value = dv.getInt32(0, le)
            return value === nulls.int32 ? null : value
        }
        case DdbType.long: {
            const value = dv.getBigInt64(0, le)
            return value === nulls.int64 ? null : value
        }
        case DdbType.float: {
            const value = dv.getFloat32(0, le)
            return value === nulls.float32 ? null : value
        }
        case DdbType.double: {
            const value = dv.getFloat64(0, le)
            return value === nulls.double ? null : value
        }
    }
}


function Vector ({
    obj,
    objref,
    ctx,
    remote,
    ddb,
    options,
}: {
    obj?: DdbVectorObj
    objref?: DdbObjRef<DdbVectorValue>
    ctx: Context
    remote?: Remote
    ddb?: DDB
    options?: InspectOptions
}) {
    const info = obj || objref
    
    const { type } = info
    const typestr = (64 <= type && type < 128 ? `${DdbType[type - 64]}[]` : DdbType[type]) || String(type)
    
    const ncols = Math.min(
        10,
        info.rows
    )
    
    const [page_size, set_page_size] = useState(
        (ctx === 'page' || ctx === 'window') ? 200 : 100
    )
    
    const nrows = info.rows === 0 ? 
            0
        :
            Math.min(
                Math.ceil(info.rows / ncols),
                Math.ceil(page_size / ncols)
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
            
            if (
                // 允许在 rows 为 0 时拉一次变量获取 obj 用来显示类型
                rows === 0 && offset === 0 ||
                offset < rows
            ) {
                const script = (form === DdbForm.set || rows === 0) ?
                    name
                :
                    `${name}[${offset}..${Math.min(offset + page_size, rows) - 1}]`
                
                console.log(`${DdbForm[form]}.fetch:`, script)
            
                objref.obj = ddb ?
                    await ddb.eval(script)
                :
                    DdbObj.parse(... await remote.call<[Uint8Array, boolean]>('eval', [node, script])) as DdbObj<DdbObj[]>
            
                render({ })
            }
        })()
    }, [obj, objref, page_index, page_size])
    
    
    // 当 obj 为空的时候，我们需要等待其在 useEffect 中重新拉取, 因此先返回 null
    if (!(obj || objref.obj)) 
        return null
    
    if (!info.rows)
        return <>{ (obj || objref.obj).toString(options) }</>
    
    return <div className='vector'>
        <AntTable
            dataSource={seq(nrows) as any[]}
            rowKey={x => x}
            bordered
            pagination={false}
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
                ... seq(ncols, index => 
                    new VectorColumn({
                        obj,
                        objref,
                        index,
                        form: info.form as (DdbForm.set | DdbForm.vector),
                        ncols,
                        page_index,
                        page_size,
                        options
                    })
                )
            ]}
        />
        
        <div className='bottom-bar-placeholder' />
        
        <div className='bottom-bar'>
            <div className='info'>
                <span className='desc'>{info.rows} {t('个元素')}{ objref ? ` (${Number(objref.bytes).to_fsize_str()}) ` : '' }</span>
                <span className='type'>{ info.form === DdbForm.set ? 
                    t('的 {{type}} 集合', { type: typestr })
                :
                    t('的 {{type}} 向量', { type: typestr })
                }</span>
                { info.name && <span className='name'>{info.name}</span> }
            </div>
            
            <Pagination
                className='pagination'
                total={info.rows}
                current={page_index + 1}
                pageSize={page_size}
                pageSizeOptions={page_sizes}
                size='small'
                showSizeChanger
                showQuickJumper
                hideOnSinglePage={page_size <= 200}
                onChange={(page_index, page_size) => {
                    set_page_size(page_size)
                    set_page_index(page_index - 1)
                }}
            />
            
            <div className='actions'>
                {(ctx === 'page' || ctx === 'embed') && <Icon
                    className='icon-link'
                    title={t('在新窗口中打开')}
                    component={SvgLink}
                    onClick={async () => {
                        await open_obj({ obj, objref, remote, ddb, options })
                    }}
                />}
            </div>
        </div>
    </div>
}

class VectorColumn implements TableColumnType <number> {
    index: number
    
    form: DdbForm.vector | DdbForm.set
    
    obj?: DdbVectorObj
    objref?: DdbObjRef<DdbVectorValue>
    
    ncols: number
    
    page_index: number
    page_size: number
    
    title: string
    key: number
    
    options?: InspectOptions
    
    constructor (data: Partial<VectorColumn>) {
        Object.assign(this, data)
        this.title = String(this.index)
        this.key = this.index
        
        const { type } = this.obj || this.objref
        this.options = { ...this.options, grouping: !(64 <= type && type < 128) }
    }
    
    render = (value: any, row: number, index: number) => {
        const obj = this.obj || this.objref.obj
        
        if (!obj)
            return null
        
        // 在 obj 中的 index
        const index_ = 
            (this.obj || this.form === DdbForm.set ? this.page_size * this.page_index : 0) + // 之前页的 items 数量
            this.ncols * index + // 之前行的 items 数量
            this.index
        
        return index_ < obj.rows ?
            truncate(formati(obj, index_, this.options))
        :
            null
    }
}


function StreamingCell ({
    window: { objs },
    
    icol,
    irow,
    options
}: {
    window: StreamingMessage['window']
    
    /** 在表格实际数据中位于第几列 */
    icol: number
    
    /** antd table 从上往下第几行 */
    irow: number
    
    options?: InspectOptions
}) {
    // 在 objs 中从后往前查找 index 所属的 segment, 这样能更快找到（最新的记录都在最后面）
    // 最坏复杂度 O(page.size)，整个表格的渲染复杂度 page.size^2 * ncols
    
    let _rows = 0
    for (let i = objs.length - 1;  i >= 0;  i--) {
        const segment = objs[i]
        
        const { rows } = segment.value[0]  // 当前 segment 所包含的 rows
        
        if (irow < _rows + rows) {  // irow 位于这个 segment 中
            const col = segment.value[icol]
            
            return <>{formati(col, col.rows - 1 - (irow - _rows), options)}</>
        }
        
        _rows += rows
    }
    
    return null
}


export function Table ({
    obj,
    objref,
    ctx,
    remote,
    ddb,
    options,
    ExportCsv,
    show_bottom_bar = true,
    ...others
}: {
    obj?: DdbTableObj
    objref?: DdbObjRef<DdbObj<DdbVectorValue>[]>
    ctx: Context
    remote?: Remote
    ddb?: DDB
    options?: InspectOptions
    ExportCsv?: React.FC<{ info: DdbTableObj | DdbObjRef<DdbObj<DdbVectorValue>[]> }>
    show_bottom_bar?: boolean
} & TableProps<any>) {
    const info = obj || objref
    
    const ncols = info.cols
    
    const [page_size, set_page_size] = useState(
        (ctx === 'page' || ctx === 'window') ? 20 : 10
    )
    
    const nrows = Math.min(page_size, info.rows)
    
    const [page_index, set_page_index] = useState(0)
    
    const render = use_rerender()
    
    useEffect(() => {
        set_page_index(0)
    }, [obj, objref])
    
    useEffect(() => {
        (async () => {
            if (obj)
                return
            
            const { node, name, rows } = objref
            
            const offset = page_size * page_index
            
            if (
                // 允许在 rows 为 0 时拉一次空的 table[0:0] 获取 obj 用来显示列名
                rows === 0 && offset === 0 ||
                offset < rows
            ) {
                const script = `select * from ${name} limit ${offset}, ${page_size}`
                
                console.log('table.fetch:', script)
                
                if (ddb)
                    objref.obj = await ddb.eval(script)
                else
                    objref.obj = DdbObj.parse(... await remote.call<[Uint8Array, boolean]>('eval', [node, script])) as DdbTableObj
                
                render()
            }
        })()
    }, [obj, objref, page_index, page_size])
    
    
    return <div className='table'>
        <AntTable
            dataSource={seq(nrows) as any[]}
            rowKey={x => x}
            bordered
            pagination={false}
            columns={[
                {
                    title: '',
                    key: 'index',
                    className: 'row-head',
                    fixed: 'left',
                    render: irow =>
                        page_size * page_index + irow
                },
                ...seq(ncols, index =>
                    new TableColumn({
                        obj,
                        objref,
                        index,
                        page_index,
                        page_size,
                        options,
                    }))
            ]}
            {...others}
        />
        
        {/* 底部区占位 */}
        { show_bottom_bar && <div className='bottom-bar-placeholder' />}
        
        { show_bottom_bar && <div className='bottom-bar'>
            <div className='info'>
                <span className='desc'>{ info.rows ? `${info.rows} ${t('行')} ` : ' ' }{info.cols} {t('列')}{ objref ? ` (${Number(objref.bytes).to_fsize_str()}) ` : '' }</span>
                <span className='type'>{t('的表格')}</span>
                { info.name && <span className='name'>{info.name}</span> }
            </div>
            
            <Pagination
                className='pagination'
                total={info.rows}
                current={page_index + 1}
                pageSize={page_size}
                pageSizeOptions={page_sizes}
                size='small'
                showSizeChanger
                showQuickJumper
                hideOnSinglePage={page_size <= 50}
                onChange={(page_index, page_size) => {
                    set_page_size(page_size)
                    set_page_index(page_index - 1)
                }}
            />
            
            <div className='actions'>
                {(ctx === 'page' || ctx === 'embed') && <>
                    <Icon
                        className='icon-link'
                        title={t('在新窗口中打开')}
                        component={SvgLink}
                        onClick={async () => {
                            await open_obj({ obj, objref, remote, ddb, options })
                        }}
                    />
                    {ExportCsv && <ExportCsv info={info} />}
                </>}
            </div>
        </div>}
    </div>
}


export function StreamingTable ({
    url,
    table: _table,
    username,
    password,
    ctx,
    options,
    on_error,
}: {
    url: string
    table?: string
    username?: string
    password?: string
    ctx: Context
    options?: InspectOptions
    on_error? (error: Error): void
}) {
    let rsddb = useRef<DDB>(undefined)
    
    let rddbapi = useRef<DDB>(undefined)
    
    let rauto_append = useRef<boolean>(false)
    
    let rappended = useRef<number>(0)
    
    let rreceived = useRef<number>(0)
    
    let rmessage = useRef<StreamingMessage>(null)
    
    const default_rate = 0 as const
    
    /** 刷新率 (ms): 0 实时更新, -1 暂停, > 0 刷新间隔 */
    let rrate = useRef<number>(default_rate)
    
    function set_rate (rate: number = default_rate) {
        rrate.current = rate
        rerender({ })
    }
    
    let rlast = useRef<number>(0)
    
    /** 订阅的流表 */
    let [table, set_table] = useState(_table || new URLSearchParams(location.search).get('streaming-table') || 'prices')
    
    let [, rerender] = useState({ })
    
    const [page_size, set_page_size] = useState(
        (ctx === 'page' || ctx === 'window') ? 20 : 10
    )
    
    const [page_index, set_page_index] = useState(0)
    
    
    // 有可能会资源泄露，sddb 在 unmount 时还没有，后面才被赋值
    useEffect(() => 
        () => {
            rsddb.current?.disconnect()
            rddbapi.current?.disconnect()
        }
    , [ ])
    
    
    useEffect(() => {
        if (!rauto_append.current)
            return
        
        let stopped = false
        
        ;(async () => {
            for (  ;  rauto_append.current && !stopped;  ) {
                await append_data()
                await delay(1000)
            }
            
            console.log('自动更新已停止')
        })()
        
        return () => {
            stopped = true
        }
    }, [rauto_append.current])
    
    
    const StreamingTableActions = useCallback(() => {
        interface Fields {
            table?: string
            column?: string
            expression?: string
        }
        
        const label_span = 3
        const wrapper_span = 24 - label_span
        
        return <div className='actions'>
            <Form<Fields>
                className='form'
                name='流表配置表单'
                labelCol={{ span: label_span }}
                wrapperCol={{ span: wrapper_span }}
                initialValues={{ table: table }}
                autoComplete='off'
                onFinish={async ({ table, column, expression }) => {
                    set_table(table)
                    
                    try {
                        rddbapi.current?.disconnect()
                        
                        rsddb.current?.disconnect()
                        
                        rmessage.current = null
                        
                        rappended.current = 0
                        rreceived.current = 0
                        
                        
                        ;(async () => {
                            try {
                                let apiddb = rddbapi.current = new DDB(url)
                                
                                if (table === 'prices')
                                    await apiddb.eval(
                                        'try {\n' +
                                        "    if (!defined('prices', SHARED)) {\n" +
                                        '        share(\n' +
                                        '            streamTable(\n' +
                                        '                10000:0,\n' +
                                        "                ['time', 'stock', 'price'],\n" +
                                        '                [TIMESTAMP, SYMBOL, DOUBLE]\n' +
                                        '            ),\n' +
                                        "            'prices'\n" +
                                        '        )\n' +
                                        "        setStreamTableFilterColumn(objByName('prices'), 'stock')\n" +
                                        "        print('prices 流表创建成功')\n" +
                                        '    } else\n' +
                                        "        print('prices 流表已存在')\n" +
                                        '} catch (error) {\n' +
                                        "    print('prices 流表创建失败')\n" +
                                        '    print(error)\n' +
                                        '}\n'
                                    )
                                
                                
                                let sddb = rsddb.current = new DDB(url, {
                                    autologin: Boolean(username),
                                    username,
                                    password,
                                    streaming: {
                                        table,
                                        filters: {
                                            ... column ? { column: await apiddb.eval(column) } : { },
                                            expression: expression
                                        },
                                        handler (message) {
                                            const { error } = message
                                            
                                            if (error) {
                                                on_error?.(error)
                                                throw error
                                            }
                                            
                                            const time = new Date().getTime()
                                            
                                            rreceived.current += message.data.data.length
                                            
                                            // 冻结或者未到更新时间
                                            if (rrate.current === -1 || time - rlast.current < rrate.current)
                                                return
                                            
                                            rmessage.current = message
                                            rlast.current = time
                                            rerender({ })
                                        }
                                    }
                                })
                                
                                // 开始订阅
                                await sddb.connect()
                     
                                rerender({ })
                            } catch (error) {
                                on_error?.(error)
                                throw error
                            }
                        })()
                    } catch (error) {
                        on_error?.(error)
                        throw error
                    }
                }}
            >
                <Form.Item<Fields> label='流表名称' name='table'>
                    <Input placeholder='prices' />
                </Form.Item>
                
                <Form.Item<Fields> label='列过滤' name='column'>
                    <Input placeholder="['MSFT']" />
                </Form.Item>
                
                <Form.Item<Fields> label='表达式过滤' name='expression'>
                    <Input placeholder='price > 190'/>
                </Form.Item>
                
                <Form.Item wrapperCol={{ offset: label_span, span: wrapper_span }}>
                    <Button className='subscribe-button' type='primary' htmlType='submit'>
                        开始订阅
                    </Button>
                </Form.Item>
            </Form>
            
            {table === 'prices' && <>
                <div><Button onClick={async () => {
                    rlast.current = 0
                    await append_data()
                }}>向流表中添加三条数据</Button></div>
                
                <div><Button onClick={async () => {
                    rlast.current = 0
                    await append_data(1)
                }}>向流表中添加一条数据</Button></div>
                
                <div><Button onClick={async () => {
                    rlast.current = 0
                    rappended.current += 2000 * 5
                    
                    await rddbapi.current.eval(
                        'n = 2000\n' +
                        '\n' +
                        'for (i in 0..4)\n' +
                        '    append!(\n' +
                        '        prices,\n' +
                        '        table([\n' +
                        '            (now() + 0..(n-1)) as time,\n' +
                        "            take(['MSFT', 'FUTU'], n) as stock,\n" +
                        '            (0..(n-1) \\ 10) as price\n' +
                        '        ])\n' +
                        '    )\n'
                    )
                }}>测试插入 2000 条数据 5 次</Button></div>
                
                <div><Button onClick={async () => {
                    rlast.current = 0
                    rappended.current += 1_0000 * 10
                    
                    await rddbapi.current.eval(
                        'n = 10000\n' +
                        '\n' +
                        'for (i in 0..9)\n' +
                        '    append!(\n' +
                        '        prices,\n' +
                        '        table([\n' +
                        '            (now() + 0..(n-1)) as time,\n' +
                        "            take(['MSFT', 'FUTU'], n) as stock,\n" +
                        '            (0..(n-1) \\ 10) as price\n' +
                        '        ])\n' +
                        '    )\n'
                    )
                }}>测试插入 1_0000 条数据 10 次</Button></div>
                
                <div><Button onClick={async () => {
                    rlast.current = 0
                    rappended.current += 10_0000 * 10
                    
                    await rddbapi.current.eval(
                        'n = 100000\n' +
                        '\n' +
                        'for (i in 0..9)\n' +
                        '    append!(\n' +
                        '        prices,\n' +
                        '        table([\n' +
                        '            (now() + 0..(n-1)) as time,\n' +
                        "            take(['MSFT', 'FUTU'], n) as stock,\n" +
                        '            (0..(n-1) \\ 10) as price\n' +
                        '        ])\n' +
                        '    )\n'
                    )
                }}>测试插入 10_0000 条数据 10 次</Button></div>
                
                <div><Button onClick={async () => {
                    rlast.current = 0
                    rappended.current += 2000
                    await rddbapi.current.eval(
                        'n = 2000\n' +
                        'for (i in 0..(n-1))\n' +
                        "    insert into prices values (now(), 'MSFT', rand(100, 1)[0])\n"
                    )
                }}>测试添加一条数据 2000 次</Button></div>
                
                <div>应添加行数: {rappended.current}</div>
                <div>实际的行数: {rreceived.current}</div>
                <div>上面两个应该相等</div>
                
                <div>
                    自动添加数据: <Switch onChange={checked => {
                        rauto_append.current = checked
                        rerender({ })
                    }}/>
                </div>
            </>}
            
            <div>接收到推送的 message 之后，才会在下面显示出表格</div>
        </div>
    }, [table])
    
    
    if (!rsddb.current || !rddbapi.current || !rmessage.current)
        return <div className='streaming-table'>
            <StreamingTableActions />
        </div>
    
    
    const { current: message } = rmessage
    
    const cols = seq(
        message.data.columns.length,
        index => new StreamingTableColumn({
            rmessage,
            index,
            page_size,
            page_index,
            options,
        }))
    
    
    async function append_data (n = 3) {
        rappended.current += n
        
        try {
            await rddbapi.current.eval(
                n === 3 ?
                    'append!(\n' +
                    '    prices,\n' +
                    '    table([\n' +
                    '        [now(), timestamp(now() + 10), timestamp(now() + 20)] as time,\n' +
                    "        ['MSFT', 'FUTU', 'MSFT'] as stock,\n" +
                    '        [1.0, 2.0, 3.0] as price\n' +
                    '    ])\n' +
                    ')\n'
                :
                    'append!(\n' +
                    '    prices,\n' +
                    '    table([\n' +
                    '        [now()] as time,\n' +
                    "        ['MSFT'] as stock,\n" +
                    '        [1.0] as price\n' +
                    '    ])\n' +
                    ')\n'
            )
        } catch (error) {
            on_error?.(error)
            throw error
        }
    }
    
    
    return <div className='streaming-table'>
        <StreamingTableActions />
        
        <div className='table'>
            <AntTable
                dataSource={seq(page_size) as any[]}
                rowKey={x => x}
                bordered
                pagination={false}
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
            />
        </div>
        
        <div className='bottom-bar-placeholder' />
        
        <div className='bottom-bar'>
            <div className='info'>
                <span className='desc'>{rreceived.current} {t('行')} {cols.length} {t('列')}{ message.window.offset > 0 ? ` ${message.window.offset} ${t('偏移')}` : '' }</span>{' '}
                <span className='type'>{t('的流表')}</span>
                <span className='name'>{table}</span>
            </div>
            
            <Pagination
                className='pagination'
                total={rreceived.current}
                current={page_index + 1}
                pageSize={page_size}
                pageSizeOptions={page_sizes}
                size='small'
                showSizeChanger
                showQuickJumper
                hideOnSinglePage={page_size <= 50}
                onChange={(page_index, page_size) => {
                    set_page_size(page_size)
                    set_page_index(page_index - 1)
                }}
            />
            
            <div className='actions'>
                {(ctx === 'page' || ctx === 'embed') && <Icon
                    className='icon-link'
                    title={t('在新窗口中打开')}
                    component={SvgLink}
                    onClick={async () => {
                        throw new Error('未实现')
                        
                        // await open_obj({ obj, objref, remote, ddb })
                    }}
                />}
                
                <div className='pause-play'>
                    { rrate.current === -1 ? 
                        <CaretRightOutlined
                            title={t('继续显示流表更新')}
                            onClick={() => { set_rate() }} />
                    :
                        <PauseOutlined
                            title={t('暂停显示流表更新')}
                            onClick={() => { set_rate(-1) }} /> }
                </div>
                
                <Select
                    defaultValue={default_rate}
                    onSelect={(value: number) => {
                        set_rate(value)
                    }}
                >
                    <Select.Option value={0}>{t('实时')}</Select.Option>
                    <Select.Option value={1000}>1 s</Select.Option>
                    <Select.Option value={2000}>2 s</Select.Option>
                    <Select.Option value={3000}>3 s</Select.Option>
                    <Select.Option value={5000}>5 s</Select.Option>
                    <Select.Option value={10 * 1000}>10 s</Select.Option>
                    <Select.Option value={30 * 1000}>30 s</Select.Option>
                    <Select.Option value={60 * 1000}>60 s</Select.Option>
                </Select>
            </div>
        </div>
    </div>
}


class StreamingTableColumn implements TableColumnType <number> {
    /** 表格数据的第 index 列 */
    index: number
    
    key: number
    
    rmessage: RefObject<StreamingMessage>
    
    col: DdbVectorObj
    
    page_index: number
    page_size: number
    
    title: React.ReactNode
    
    align: 'left' | 'center' | 'right'
    
    options?: InspectOptions
    
    constructor (data: Partial<StreamingTableColumn>) {
        Object.assign(this, data)
        
        this.key = this.index
        
        const { current: { obj, data: { columns } } } = this.rmessage
        
        this.col = obj.value[this.index]
        assert(this.col.form === DdbForm.vector, t('this.streaming.data 中的元素应该是 vector'))
        
        this.title = <Tooltip
                title={DdbType[this.col.type === DdbType.symbol_extended ? DdbType.symbol : this.col.type]}
            >{columns[this.index]}</Tooltip>
        
        this.align = TableColumn.left_align_types.has(this.col.type) ? 'left' : 'right'
    }
    
    
    render = (irow: number) => 
        <StreamingCell
            window={this.rmessage.current.window}
            irow={this.page_size * this.page_index + irow}
            icol={this.index}
            options={this.options}
        />
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
    
    /** 表格数据的第 index 列 */
    index: number
    
    obj?: DdbObj<DdbObj<DdbVectorValue>[]>
    objref?: DdbObjRef<DdbObj<DdbVectorValue>[]>
    
    col?: DdbObj<DdbVectorValue>
    
    page_index: number
    page_size: number
    
    title: React.ReactNode
    key: number
    
    align: 'left' | 'center' | 'right'
    
    options?: InspectOptions
    
    constructor (data: Partial<TableColumn>) {
        Object.assign(this, data)
        this.key = this.index
        let obj = this.obj || this.objref.obj
        if (!obj)
            return
        
        this.col = obj.value[this.index]
    
        this.options = { ...this.options, grouping: !(64 <= this.col.type && this.col.type < 128) }
        
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
    
    render = (irow: number) => {
        const obj = this.col
        
        if (!obj)
            return null
        
        const index = 
            (this.obj ? this.page_size * this.page_index : 0) + // 之前页的 items 数量
            irow
        
        return index < obj.rows ?
            truncate(formati(obj, index, this.options))
        :
            null
    }
}


function Matrix ({
    obj,
    objref,
    ctx,
    remote,
    ddb,
    options,
}: {
    obj?: DdbMatrixObj
    objref?: DdbObjRef<DdbMatrixValue>
    ctx?: Context
    remote?: Remote
    ddb?: DDB
    options?: InspectOptions
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
            
            console.log('matrix.fetch:', script)
            
            if (ddb)
                objref.obj = await ddb.eval(script)
            else
                objref.obj = DdbObj.parse(... await remote.call<[Uint8Array, boolean]>('eval', [node, script])) as DdbMatrixObj
            
            render({ })
        })()
    }, [obj, objref, page_index, page_size])
    
    
    return <div className='matrix'>
        <AntTable
            dataSource={seq(nrows) as any[]}
            rowKey={x => x}
            bordered
            pagination={false}
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
                                i < rows.rows ?
                                    formati(rows, i, options)
                                :
                                    ''
                            :
                                i
                    }
                },
                ... seq(ncols, index => 
                    new MatrixColumn({
                        obj,
                        objref,
                        index,
                        page_index,
                        page_size,
                        options,
                    })
                )
            ]}
        />
        
        <div className='bottom-bar-placeholder' />
        
        <div className='bottom-bar'>
            <div className='info'>
                <span className='desc'>{info.rows} {t('行')} {info.cols} {t('列')}{ objref ? ` (${Number(objref.bytes).to_fsize_str()}) ` : '' }</span>
                <span className='type'>{t('的矩阵')}</span>
                { info.name && <span className='name'>{info.name}</span> }
            </div>
            
            <Pagination
                className='pagination'
                total={info.rows}
                current={page_index + 1}
                pageSize={page_size}
                pageSizeOptions={page_sizes}
                size='small'
                showSizeChanger
                showQuickJumper
                hideOnSinglePage={page_size <= 50}
                onChange={(page_index, page_size) => {
                    set_page_size(page_size)
                    set_page_index(page_index - 1)
                }}
            />
            
            <div className='actions'>
                {(ctx === 'page' || ctx === 'embed') && <Icon
                    className='icon-link'
                    title={t('在新窗口中打开')}
                    component={SvgLink}
                    onClick={async () => {
                        await open_obj({ obj, objref, remote, ddb, options })
                    }}
                />}
            </div>
            
        </div>
    </div>
}

class MatrixColumn implements TableColumnType <number> {
    index: number
    
    obj?: DdbMatrixObj
    objref?: DdbObjRef<DdbMatrixValue>
    
    page_index: number
    page_size: number
    
    title: string
    key: number
    
    options?: InspectOptions
    
    constructor (data: Partial<MatrixColumn>) {
        Object.assign(this, data)
        
        this.title = String(this.index)
        this.key = this.index
        
        let obj = this.obj || this.objref.obj
        if (!obj)
            return
        
        const cols = obj?.value.cols
        if (cols)
            this.title = formati(cols, this.index, this.options)
    }
    
    render = (irow: number) => {
        const obj = this.obj || this.objref.obj
        
        if (!obj)
            return null
        
        const irow_ = this.obj ? 
                this.page_size * this.page_index + irow
            :
                irow
        
        if (irow_ >= obj.rows)
            return null
        
        const nitems = obj.cols * obj.rows
        
        // this.index 列之前所有列的元素 + this.index 列之前分页中的列内的元素 + 当前元素下标
        const index = this.obj ?
            obj.rows * this.index + this.page_size * this.page_index + irow
        :
            obj.rows * this.index + irow
        
        assert(index < nitems, 'index < obj.cols * obj.rows')
        
        return formati(
            new DdbObj({
                form: DdbForm.vector,
                type: obj.type,
                rows: nitems,
                value: obj.value.data
            }),
            index,
            this.options
        )
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


interface ChartConfig {
    inited: boolean
    charttype: DdbChartType
    data: any[]
    titles: DdbChartValue['titles']
    stacking: boolean
    multi_y_axes: boolean
    col_labels: string[]
    bin_count: DdbChartValue['bin_count']
    bin_start: DdbChartValue['bin_start']
    bin_end: DdbChartValue['bin_end']
}


function Chart ({
    obj,
    objref,
    ctx,
    remote,
    ddb,
    options,
}: {
    obj?: DdbChartObj
    objref?: DdbObjRef<DdbChartValue>
    ctx?: Context
    remote?: Remote
    ddb?: DDB
    options?: InspectOptions
}) {
    const [config, set_config] = useState<ChartConfig>({
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
                    DdbObj.parse(... await remote.call<[Uint8Array, boolean]>('eval', [objref.node, objref.name])) as DdbChartObj
                )
            
            const { multi_y_axes = false } = extras || { }
            
            const col_labels_ = ((cols_?.value || seq(cols)) as any[]).map(col_label => col_label?.value?.name || col_label)
            
            const row_labels = (() => {
                // 没有设置 label 的话直接以序号赋值并返回
                if (!rows_)
                    return seq(rows)
                else if (charttype === DdbChartType.kline || charttype === DdbChartType.scatter)
                    return rows_.value
                else
                    // format 为 string
                    return seq(rows, i => formati(rows_, i, options))
            })()
            
            const n = charttype === DdbChartType.line && multi_y_axes || charttype === DdbChartType.kline ? rows : rows * cols
            let data_ = new Array(n)
            
            switch (charttype) {
                case DdbChartType.line:
                    if (multi_y_axes)
                        for (let j = 0;  j < rows;  j++) {
                            let dataobj: any = { }
                            dataobj.row = row_labels[j]
                            for (let i = 0;  i < cols;  i++) {
                                let idata = i * rows + j
                                dataobj[col_labels_[i]] = to_chart_data(data[idata], datatype)
                            }
                            data_[j] = dataobj
                        }
                    else
                        for (let i = 0;  i < cols;  i++) 
                            for (let j = 0;  j < rows;  j++) {
                                const idata = i * rows + j
                                data_[idata] = {
                                    row: row_labels[j],
                                    col: col_labels_[i],
                                    value: to_chart_data(data[idata], datatype)
                                }
                            }
                        
                    break
                    
                case DdbChartType.kline:
                    for (let j = 0;  j < rows;  j++) {
                        let dataobj: any = { }
                        
                        dataobj.row = row_labels[j]
                        dataobj.row_ = formati(rows_, j, options)
                        
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
                    for (let i = 0;  i < cols;  i++) 
                        for (let j = 0;  j < rows;  j++) {
                            const idata = i * rows + j
                            data_[idata] = {
                                row: row_labels[j],
                                col: col_labels_[i],
                                value: to_chart_data(data[idata], datatype)
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
                col_labels: col_labels_,
                bin_count,
                bin_start,
                bin_end,
            })
        })()
    }, [obj, objref])
    
    
    if (!config.inited)
        return null
    
    return <div className='chart'>
        <div className='chart-title'>{config.titles.chart}</div>
        
        <EChartsComponent option={get_chart_option(config)} />
        
        {ctx !== 'window' && <div className='bottom-bar-placeholder' />}
        
        {ctx !== 'window' && <div className='bottom-bar'>
            <div className='actions'>
                {(ctx === 'page' || ctx === 'embed') && <Icon
                    className='icon-link'
                    title={t('在新窗口中打开')}
                    component={SvgLink}
                    onClick={async () => {
                        await open_obj({ obj, objref, remote, ddb })
                    }}
                />}
            </div>
        </div>}
    </div>
}


function get_chart_option (config: ChartConfig): echarts.EChartsOption {
    const { charttype, data, titles, stacking, multi_y_axes, col_labels, bin_count } = config
    
    const base: echarts.EChartsOption = {
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'cross',
                label: {
                    borderRadius: 0,
                }
            },
            borderRadius: 0,
        },
        legend: {
            data: col_labels.map(String),
            textStyle: {
                color: 'var(--vscode-editor-foreground, #000000)'
            }
        },
        grid: {
            top: 20,
            bottom: 20,
            left: 30,
            right: 20,
            containLabel: true
        },
        animation: false
    }
    
    // 通用的坐标轴样式
    const axis_style: echarts.EChartsOption['xAxis'] & echarts.EChartsOption['yAxis'] = {
        axisLine: { },
        splitLine: {
            lineStyle: {
                color: '#80808050',
                width: 0.5
            }
        },
        nameTextStyle: {
            fontSize: 12,
            padding: [0, 10, 0, 10]  
        },
        nameLocation: 'middle' as const,  
        nameGap: 50,
        axisTick: {
            show: true,
            alignWithLabel: true
        },
        axisLabel: {
            interval: 'auto',  
            hideOverlap: true, 
            formatter (value, index) {
                if (typeof value === 'string' && value.length > 10)
                    return value.truncate(10)
                return value
            }
        }
    }
    
    switch (charttype) {
        case DdbChartType.line:
            if (!multi_y_axes)
                return {
                    ...base,
                    xAxis: {
                        type: 'category',
                        name: titles.x_axis,
                        data: [...new Set(data.map(item => item.row))],
                        ...axis_style
                    } as echarts.EChartsOption['xAxis'],
                    yAxis: {
                        type: 'value' as any,
                        name: titles.y_axis,
                        ...axis_style
                    },
                    series: col_labels.map(label => ({
                        name: String(label),
                        type: 'line',
                        stack: stacking ? 'total' : undefined,
                        data: data.filter(d => d.col === label).map(d => d.value),
                        symbol: 'none',
                        smooth: false
                    }))
                }
            else
                return {
                    ...base,
                    xAxis: {
                        ...axis_style,
                        type: 'category',
                        name: titles.x_axis,
                        data: data.map(d => d.row),
                    },
                    yAxis: col_labels.map((label, index) => {
                        const isRight = index % 2 === 1 // 判断是否为右侧
                        const sideOffset = Math.floor(index / 2) * 30 // 每个 Y 轴之间的间隔
                        
                        return {
                            ...axis_style,
                            type: 'value',
                            position: isRight ? 'right' : 'left',
                            offset: sideOffset, // 设置偏移量以避免重叠
                            name: label,
                            nameLocation: 'end',
                            alignTicks: true,
                            axisLabel: {
                                margin: 8, // 轴标签的边距
                            },
                        } as any
                    }),
                    series: col_labels.map((label, index) => ({
                        name: String(label),
                        type: 'line',
                        yAxisIndex: index,
                        data: data.map(d => d[label]),
                        symbol: 'none',
                        smooth: false
                    }))
                }
            
            
        case DdbChartType.column:
            return {
                ...base,
                xAxis: {
                    ...axis_style,
                    type: 'category',
                    name: titles.x_axis,
                    data: unique(data.map(item => item.row)),
                } as echarts.EChartsOption['xAxis'],
                yAxis: {
                    ...axis_style,
                    type: 'value' as any,
                    name: titles.y_axis,
                },
                series: col_labels.map(label => ({
                    name: label,
                    type: 'bar',
                    stack: stacking ? 'total' : undefined,
                    data: data.filter(d => d.col === label).map(d => d.value)
                }))
            }
            
        case DdbChartType.bar:
            return {
                ...base,
                xAxis: {
                    ...axis_style,
                    type: 'value' as any,
                    name: titles.y_axis,
                },
                yAxis: {
                    ...axis_style,
                    type: 'category',
                    name: titles.x_axis,
                    data: unique(data.map(item => item.row)),
                } as echarts.EChartsOption['yAxis'],
                series: col_labels.map(label => ({
                    name: label,
                    type: 'bar',
                    stack: stacking ? 'total' : undefined,
                    data: data.filter(d => d.col === label).map(d => d.value)
                }))
            }
            
        case DdbChartType.pie:
            return {
                ...base,
                series: [{
                    type: 'pie',
                    radius: '90%',
                    data: data.map(d => ({
                        name: d.row,
                        value: d.value
                    })),
                    label: {
                        formatter (params) {
                            return `${params.name}: ${params.percent.toFixed(2)}%`
                        },
                        backgroundColor: 'transparent',
                        color: '#888888'
                    }
                }]
            }
            
        case DdbChartType.area:
            return {
                ...base,
                xAxis: {
                    ...axis_style,
                    type: 'category',
                    name: titles.x_axis,
                    data: [...new Set(data.map(item => item.row))],
                },
                yAxis: {
                    ...axis_style,
                    type: 'value' as any,
                    name: titles.y_axis,
                },
                series: col_labels.map(label => ({
                    name: label,
                    type: 'line',
                    areaStyle: { },
                    stack: stacking ? 'total' : undefined,
                    data: data.filter(d => d.col === label).map(d => d.value),
                    symbol: 'none',
                    smooth: false
                }))
            }
            
        case DdbChartType.scatter:
            return {
                ...base,
                legend: null,
                tooltip: {
                    trigger: 'item',
                    formatter: function (params) {
                        return `X : ${params.data[0]}<br/>
                                Y : ${params.data[1]}`
                    }
                },
                xAxis: {
                    ...axis_style,
                    type: 'value' as any,
                    name: titles.x_axis,
                },
                yAxis: {
                    ...axis_style,
                    type: 'value' as any,
                    name: titles.y_axis,
                },
                series: col_labels.map(label => ({
                    name: label,
                    type: 'scatter',
                    data: data.filter(d => d.col === label).map(d => [d.row, d.value])
                }))
            }
            
        case DdbChartType.histogram:
            const values = data.map(d => d.value)
            const minValue = config.bin_start ? Number(config.bin_start.value) : Math.min(...values)
            const maxValue = config.bin_end ? Number(config.bin_end.value) : Math.max(...values)
            const xMin = Math.floor(minValue)
            const xMax = Math.ceil(maxValue)
            const binCount = config.bin_count ? Number(config.bin_count.value) : 30
            const binWidth = (maxValue - minValue) / binCount
            
            // 创建区间并统计每个区间的频次
            const bins = new Array(binCount).fill(0)
            values.forEach(value => {
                if (value >= minValue && value <= maxValue) {
                    const binIndex = Math.min(Math.floor((value - minValue) / binWidth), binCount - 1)
                    bins[binIndex]++
                }
            })
            
            return {
                ...base,
                tooltip: {
                    formatter: params => {
                        const i = params.dataIndex
                        const start = minValue + i * binWidth
                        const end = minValue + (i + 1) * binWidth
                        const count = bins[i]
                        const percentage = ((count / values.length) * 100).toFixed(2)
                        return `[${start.toFixed(2)}, ${end.toFixed(2)}]: ${percentage}% (${count})`
                    }
                },
                xAxis: {
                    ...axis_style,
                    type: 'value' as any,
                    name: !titles.x_axis || titles.x_axis === '' ? t('区间') : titles.x_axis,
                    min: xMin,
                    max: xMax,
                },
                yAxis: {
                    ...axis_style,
                    type: 'value' as any,
                    name: !titles.y_axis || titles.y_axis === '' ? t('频次') : titles.y_axis,
                },
                series: [{
                    type: 'custom',
                    renderItem: (params, api) => ({
                        type: 'rect',
                        shape: {
                            x: api.coord([minValue + params.dataIndex * binWidth, 0])[0],
                            y: api.coord([0, api.value(0)])[1],
                            width: api.size([binWidth, 0])[0],
                            height: api.size([0, api.value(0)])[1]
                        },
                        style: api.style()
                    }),
                    data: bins,
                }]
            }
            
        case DdbChartType.kline:
            return {
                ...base,
                xAxis: {
                    ...axis_style,
                    type: 'category',
                    name: titles.x_axis,
                    data: data.map(d => d.row_),
                },
                yAxis: [
                    {
                        ...axis_style,
                        type: 'value' as any,
                        name: titles.y_axis,
                        scale: true,
                    } as any,
                    {
                        ...axis_style,
                        type: 'value' as any,
                        name: t('成交量'),
                        scale: true,
                    }
                ],
                series: [
                    {
                        type: 'candlestick',
                        data: data.map(d => [d.open, d.close, d.low, d.high])
                    },
                    ... data[0].vol ? [{
                        name: t('成交量'),
                        type: 'bar',
                        yAxisIndex: 1,
                        data: data.map(d => d.vol)
                    } as echarts.BarSeriesOption] : [ ]
                ]
            }
            
        default:
            return base
    }
}


function EChartsComponent ({ option }: { option: echarts.EChartsOption }) {
    let rchart = useRef<HTMLDivElement>(null)
    let chart = useRef<echarts.ECharts | null>(null)
    
    useEffect(() => {
        if (rchart.current) {
            chart.current = echarts.init(rchart.current)
            chart.current.setOption(option)
        }
        
        let observer: ResizeObserver
        
        if (rchart.current) {
            observer = new ResizeObserver(debounce(200, () => {
                chart.current?.resize()
            }))
            
            observer.observe(rchart.current)
        }
        
        return () => {
            chart.current?.dispose()
            observer?.disconnect()
        }
    }, [option])
    
    useEffect(() => {
        chart.current?.setOption(option)
    }, [option])
    
    return <div ref={rchart} className='chart-body' style={{ width: '100%', height: '100%' }} />
}
