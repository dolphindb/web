import { default as React, useState } from 'react'

import { Tooltip, Tree } from 'antd'

import type { DataNode, EventDataNode } from 'antd/es/tree'

import { default as _Icon, MinusSquareOutlined } from '@ant-design/icons'
const Icon: typeof _Icon.default = _Icon as any

import {
    DdbForm,
    DdbObj,
    DdbType,
    format,
    formati,
    DdbFunctionType,
    type DdbFunctionDefValue,
    type InspectOptions,
    type DdbVectorObj,
    type DdbDecimal32VectorValue,
    type DdbDecimal64VectorValue,
    type DdbDecimal128VectorValue,
    type DdbDictObj,
    type DdbVectorStringObj
} from 'dolphindb/browser.js'


import { t } from '../../i18n/index.js'

import { DdbObjRef } from '../obj.js'

import { model, NodeType } from '../model.js'
import { shell } from './model.js'

import SvgVar from './icons/variable.icon.svg'
import SvgScalar from './icons/scalar.icon.svg'
import SvgVector from './icons/vector.icon.svg'
import SvgPair from './icons/pair.icon.svg'
import SvgMatrix from './icons/matrix.icon.svg'
import SvgSet from './icons/set.icon.svg'
import SvgDict from './icons/dict.icon.svg'
import SvgTable from './icons/table.icon.svg'
import SvgChart from './icons/chart.icon.svg'
import SvgObject from './icons/object.icon.svg'
import SvgSchema from './icons/schema.icon.svg'


export function Variables ({ shared }: { shared?: boolean }) {
    const { vars } = shell.use(['vars'])
    
    const [expanded_keys, set_expanded_keys] = useState(Array(9).fill(0).map((_x, i) => String(i)))
    
    const vars_ = vars ? vars.filter(v => {
        return v.shared === shared
    }) : [ ]
    
    let scalar  = new TreeDataItem({ title: 'scalar', key: '0', icon: <Icon component={SvgScalar} /> })
    let vector  = new TreeDataItem({ title: 'vector', key: '1', icon: <Icon component={SvgVector} /> })
    let pair    = new TreeDataItem({ title: 'pair',   key: '2', icon: <Icon component={SvgPair} /> })
    let matrix  = new TreeDataItem({ title: 'matrix', key: '3', icon: <Icon component={SvgMatrix} /> })
    let set     = new TreeDataItem({ title: 'set',    key: '4', icon: <Icon component={SvgSet} /> })
    let dict    = new TreeDataItem({ title: 'dict',   key: '5', icon: <Icon component={SvgDict} /> })
    let table   = new TreeDataItem({ title: 'table',  key: '6', icon: <Icon component={SvgTable} /> })
    let chart   = new TreeDataItem({ title: 'chart',  key: '7', icon: <Icon component={SvgChart} /> })
    let object  = new TreeDataItem({ title: 'object', key: '8', icon: <Icon component={SvgObject} /> })
    
    let scalars: TreeDataItem[] = [ ]
    let vectors: TreeDataItem[] = [ ]
    let pairs: TreeDataItem[] = [ ]
    let matrixs: TreeDataItem[] = [ ]
    let sets: TreeDataItem[] = [ ]
    let dicts: TreeDataItem[] = [ ]
    let tables: TreeDataItem[] = [ ]
    let charts: TreeDataItem[] = [ ]
    let objects: TreeDataItem[] = [ ]
    
    for (const v of vars_)
        switch (v.form) {
            case DdbForm.scalar:
                scalars.push(new TreeDataItem({ title: v.label, key: v.name }))
                scalar.children = scalars
                break
                
            case DdbForm.vector:
                vectors.push(new TreeDataItem({ title: v.label, key: v.name }))
                vector.children = vectors
                break
                
            case DdbForm.pair:
                pairs.push(new TreeDataItem({ title: v.label, key: v.name }))
                pair.children = pairs
                break
                
            case DdbForm.matrix:
                matrixs.push(new TreeDataItem({ title: v.label, key: v.name }))
                matrix.children = matrixs
                break
                
            case DdbForm.set:
                sets.push(new TreeDataItem({ title: v.label, key: v.name }))
                set.children = sets
                break
                
            case DdbForm.dict:
                dicts.push(new TreeDataItem({ title: v.label, key: v.name }))
                dict.children = dicts
                break
                
            case DdbForm.table:
                tables.push(new TreeDataItem({ title: v.label, key: v.name, form: v.form }))
                table.children = tables
                break
                
            case DdbForm.chart:
                charts.push(new TreeDataItem({ title: v.label, key: v.name }))
                chart.children = charts
                break
                
            case DdbForm.object:
                objects.push(new TreeDataItem({ title: v.label, key: v.name }))
                object.children = objects
                break
        }
        
        
    return <div className='panel'>
        <div className='type'>{shared ? t('共享变量') : t('本地变量')}
            <span onClick={() => { set_expanded_keys([ ]) }}>
                <Tooltip title={t('全部折叠')} color='grey'>
                    <MinusSquareOutlined />
                </Tooltip>
            </span>
        </div>
        <div className='tree-content'>
            <Tree
                showIcon
                defaultExpandAll
                focusable={false}
                blockNode
                showLine
                motion={null}
                treeData={[scalar, object, pair, vector, set, dict, matrix, table, chart].filter(node => node.children)}
                
                expandedKeys={expanded_keys}
                onExpand={(keys: string[]) => { set_expanded_keys(keys) }}
                expandAction='click'
                
                onClick={(event, { key }: EventDataNode<TreeDataItem>) => {
                    if (!key)
                        return
                        
                    const v = vars.find(node => node.name === key)
                    
                    if (!v)
                        return
                        
                    if (
                        v.form === DdbForm.chart ||
                        v.form === DdbForm.dict ||
                        v.form === DdbForm.matrix ||
                        v.form === DdbForm.set ||
                        v.form === DdbForm.table ||
                        v.form === DdbForm.vector
                    )
                        shell.set({
                            result: v.obj ? {
                                type: 'object',
                                data: v.obj
                            } : {
                                type: 'objref',
                                data: new DdbObjRef(v)
                            }
                        })
                }}
            />
        </div>
    </div >
}


export class DdbVar <T extends DdbObj = DdbObj> {
    static size_limit = 10240n as const
    
    label: string
    
    shared: boolean
    
    type: DdbType
    
    name: string
    
    form: DdbForm
    
    rows: number
    
    cols: number
    
    bytes: bigint
    
    tooltip: string
    
    obj: T
    
    options?: InspectOptions
    
    
    constructor (data: Partial<DdbVar>) {
        Object.assign(this, data)
        
        this.label = (() => {
            const tname = DdbType[this.type]
            
            const type = (() => {
                switch (this.form) {
                    case DdbForm.scalar:
                        if (this.type === DdbType.functiondef)
                            return `<functiondef<${DdbFunctionType[(this.obj.value as DdbFunctionDefValue).type]}>>`
                            
                        return `<${tname}>`
                        
                    case DdbForm.pair:
                        return `<${tname}>`
                        
                    case DdbForm.vector:
                        return `<${64 <= this.type && this.type < 128 ? `${DdbType[this.type - 64]}[]` : tname}> ${this.rows} rows`
                        
                    case DdbForm.set:
                        return `<${tname}> ${this.rows} keys`
                        
                    case DdbForm.table:
                        return ` ${this.rows}r × ${this.cols}c`
                        
                    case DdbForm.dict:
                        return ` ${this.rows} keys`
                        
                    case DdbForm.matrix:
                        return `<${tname}> ${this.rows}r × ${this.cols}c`
                        
                    case DdbForm.object:
                        return ''
                        
                    default:
                        return ` ${DdbForm[this.form]} ${tname}`
                }
            })()
            
            const value = (() => {
                switch (this.form) {
                    case DdbForm.scalar:
                        return ' = ' + format(this.type, this.obj.value, this.obj.le, { ...this.options, quote: true, nullstr: true })
                        
                    // 类似 DdbObj[inspect.custom] 中 format data 的逻辑
                    case DdbForm.pair: {
                        function format_array (items: string[], ellipsis: boolean) {
                            const str_items = items.join(', ') + (ellipsis ? ', ...' : '')
                            
                            return str_items.bracket('square')
                        }
                        
                        switch (this.type) {
                            case DdbType.uuid:
                            case DdbType.int128:
                            case DdbType.ipaddr: {
                                const limit = 10 as const
                                
                                const value = this.obj.value as Uint8Array
                                
                                const len_data = value.length / 16
                                
                                let items = new Array(Math.min(limit, len_data))
                                
                                const options = { ...this.options, quote: true, nullstr: true }
                                
                                for (let i = 0;  i < items.length;  i++)
                                    items[i] = format(this.type, value.subarray(16 * i, 16 * (i + 1)), this.obj.le, options)
                                    
                                return ' = ' + format_array(items, len_data > limit)
                            }
                            
                            case DdbType.complex:
                            case DdbType.point: {
                                const limit = 20 as const
                                
                                const value = this.obj.value as Float64Array
                                
                                const len_data = value.length / 2
                                
                                let items = new Array(Math.min(limit, len_data))
                                
                                const options = { ...this.options, quote: true, nullstr: true }
                                
                                for (let i = 0;  i < items.length;  i++)
                                    items[i] = format(this.type, value.subarray(2 * i, 2 * (i + 1)), this.obj.le, options)
                                    
                                return ' = ' + format_array(items, len_data > limit)
                            }
                            
                            case DdbType.decimal32:
                            case DdbType.decimal64:
                            case DdbType.decimal128: {
                                const limit = 20 as const
                                
                                const value = this.obj.value as DdbDecimal32VectorValue | DdbDecimal64VectorValue | DdbDecimal128VectorValue
                                
                                const len_data = value.data.length
                                
                                let items = new Array(Math.min(limit, len_data))
                                
                                const options = { ...this.options, quote: true, nullstr: true }
                                
                                for (let i = 0;  i < items.length;  i++)
                                    items[i] = formati(this.obj as DdbVectorObj, i, options)
                                    
                                return ' = ' + format_array(items, len_data > limit)
                            }
                            
                            default: {
                                const limit = 50 as const
                                
                                let items = new Array(Math.min(limit, (this.obj.value as any[]).length))
                                
                                const options = { ...this.options, quote: true, nullstr: true }
                                
                                for (let i = 0;  i < items.length;  i++)
                                    items[i] = format(this.type, this.obj.value[i], this.obj.le, options)
                                    
                                return ' = ' + format_array(items, (this.obj.value as any[]).length > limit)
                            }
                        }
                    }
                    
                    case DdbForm.object:
                        return ''
                        
                    default:
                        return ` [${Number(this.bytes).to_fsize_str().replace(' ', '')}]`
                }
            })()
            
            return this.name + type + value
        })()
    }
}


class TreeDataItem implements DataNode {
    key: string
    
    className?: string
    
    title: React.ReactElement
    
    children?: TreeDataItem[]
    
    icon?: any
    
    tooltip?: string
    
    isLeaf?: boolean
    
    needLoad?: boolean
    
    
    constructor ({
        key,
        className,
        title,
        children,
        icon,
        tooltip,
        isLeaf,
        needLoad,
        form,
    }: {
        key: string
        className?: string
        title: string | React.ReactElement
        children?: TreeDataItem[]
        icon?: any
        tooltip?: string
        isLeaf?: boolean
        needLoad?: boolean
        form?: DdbForm
    }) {
        const name = typeof title === 'string' ? (/^(\w+)/.exec(title)?.[1] || title) : ''
      
        this.title = <>{typeof title === 'string' ? (
            <>
                <span className='name'>{name}</span>
                {title.slice(name.length)}
                {form === DdbForm.table && <Tooltip title={t('结构')} color='grey' className='tooltip'>
                    <Icon
                        component={SvgSchema}
                        className='schema-icon'
                        onClick={async e => {
                            e.stopPropagation()
                            onclick_display_schema(key)
                        }}
                    /></Tooltip>
                }
            </>
        ) : title}</>
        
        this.key = key
        this.children = children
        this.icon = icon || <Icon component={SvgVar} />
        this.tooltip = tooltip
        this.isLeaf = isLeaf
        this.needLoad = needLoad || false
        this.className = className
    }
}

async function get_schema (key: string) {
    await shell.define_load_table_variable_schema()
    const schema = await model.ddb.call<DdbDictObj<DdbVectorStringObj>>(
        'load_table_variable_schema',
        [key],
        model.node_type === NodeType.controller ? { node: model.datanode.name, func_type: DdbFunctionType.UserDefinedFunc } : { }
    )
    
    return schema
}

async function onclick_display_schema (key: string) {
    try {
        shell.set(
            {
                result: {
                    type: 'object',
                    data: await get_schema(key)
                }
            }
        )
    } catch (error) {
        model.show_error({ error })
        throw error
    }
}
