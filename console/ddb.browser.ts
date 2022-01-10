import type { ColumnType } from 'antd/lib/table'

import dayjs from 'dayjs'

import 'xshell/prototype.browser'
import { concat, delay } from 'xshell/utils.browser'

import { blue, yellow } from 'xshell/chalk.browser'

export enum DdbForm {
    scalar = 0,
    vector = 1,
    pair = 2,
    matrix = 3,
    set = 4,
    dict = 5,
    table = 6,
    chart = 7,
    chunk = 8,
}

export enum DdbType {
    void = 0,
    bool = 1,
    char = 2,
    short = 3,
    int = 4,
    long = 5,
    date = 6,
    month = 7,
    time = 8,
    minute = 9,
    second = 10,
    datetime = 11,
    timestamp = 12,
    nanotime = 13,
    nanotimestamp = 14,
    float = 15,
    double = 16,
    symbol = 17,
    string = 18,
    uuid = 19,
    functiondef = 20,
    handle = 21,
    code = 22,
    datasource = 23,
    resource = 24,
    any = 25,
    compress = 26,
    dict = 27,
    datehour = 28,
    ipaddr = 30,
    int128 = 31,
    blob = 32,
    complex = 34,
    point = 35,
    duration = 36,
    
    symbol_extended = 145,
}

export enum DdbFunctionType {
    SystemFunc = 0,
    SystemProc = 1,
    OperatorFunc = 2,
    UserDefinedFunc = 3,
    PartialFunc = 4,
    DynamicFunc = 5,
    PiecewiseFunc = 6,
    JitFunc = 7,
    JitPartialFunc = 8,
}

export interface DdbFunctionDefValue {
    type: DdbFunctionType
    name: string
}

export interface DdbSymbolExtendedValue {
    base_id: number
    base: string[]
    value: Uint32Array
}

export type DdbValue = null | boolean | number | [number, number] | bigint | string | string[] | Uint8Array | Int16Array | Int32Array | Float32Array | Float64Array | BigInt64Array | Uint8Array[] | DdbObj[] | DdbFunctionDefValue | DdbSymbolExtendedValue


export type DdbVectorValue = string | string[] | Uint8Array | Int16Array | Int32Array | Float32Array | Float64Array | BigInt64Array | Uint8Array[] | DdbObj[] | DdbSymbolExtendedValue


export const nulls = {
    char: '\x80',
    int16: -0x80_00,  // -32768
    int32: -0x80_00_00_00,  // -21_4748_3648
    int64: -0x80_00_00_00_00_00_00_00n,  // -922_3372_0368_5477_5808
} as const

export class DdbObj <T extends DdbValue = DdbValue> {
    static dec = new TextDecoder('utf-8')
    
    static enc = new TextEncoder()
    
    /** 维护已解析的 symbol base，比如流数据中后续的 symbol 向量可能只发送一个 base.id, base.size == 0, 依赖之前发送的 symbol base */
    static symbol_bases: Record<number, string[]> = { }
    
    
    form: DdbForm
    
    type: DdbType
    
    /** 占用 parse 时传入的 buf 的长度 */
    length: number
    
    name?: string
    
    /**
        最低维、第 1 维
        - vector: rows = n, cols = 1
        - pair:   rows = 2, cols = 1
        - matrix: rows = n, cols = m
        - set:    同 vector
        - dict:   包含 keys, values 向量
        - table:  同 matrix
    */
    rows?: number
    
    /** 第 2 维 */
    cols?: number
    
    
    /** matrix 中值的类型，仅 matrix 才有 */
    datatype?: DdbType
    
    value: T
    
    
    constructor (data: Partial<DdbObj> & { form: DdbForm, type: DdbType, length: number }) {
        Object.assign(this, data)
    }
    
    
    static parse (buf: Uint8Array) {
        if (!buf.length)
            return new this({
                form: DdbForm.scalar,
                type: DdbType.void,
                length: 0,
                value: undefined
            })
        
        const type = buf[0]
        const form = buf[1]
        
        if (buf.length <= 2) {
            return new this({
                form,
                type,
                length: 2,
                value: null,
            })
        }
        
        // set 里面 data 嵌套了一个 vector, 跳过 vector 的 type 和 form
        const i_data = form === DdbForm.set ? 4 : 2
        const buf_data = buf.subarray(i_data)
        
        switch (form) {
            case DdbForm.scalar: {
                const [length, value] = this.parse_scalar(buf_data, type)
                return new this({
                    form, 
                    type,
                    length: 2 + length,
                    value,
                })
            }
            
            case DdbForm.vector:
            case DdbForm.pair:
            case DdbForm.set: {
                let vector = this.parse_vector(buf_data, type)
                vector.length += 2
                vector.form = form
                return vector
            }
            
            
            case DdbForm.table: {
                // table([
                //     [1, 2] as a,
                //     [1, 2] as b
                // ])
                
                // <Buffer 
                // 00 06 form = table
                // 02 00 00 00 02 00 00 00 rows = 2, cols = 2
                // 00 行名称
                // 61 00 62 00 列名称 a, b
                
                // 04 01 form = vector, type = int
                // 02 00 00 00 01 00 00 00 cols = 2, rows = 1
                // 01 00 00 00 02 00 00 00 
                
                // 04 01 
                // 02 00 00 00 01 00 00 00 
                // 01 00 00 00 02 00 00 00>
                
                const dv = new DataView(buf.buffer, buf.byteOffset + i_data)
                
                const rows = dv.getUint32(0, ddb.le)
                const cols = dv.getUint32(4, ddb.le)
                const i_name_tail = buf_data.indexOf(0, 8)
                const name = this.dec.decode(
                    buf_data.subarray(8, i_name_tail)
                )
                
                const i_items_start = i_name_tail + 1
                
                const [len_items, colnames] = this.parse_vector_items(
                    buf_data.subarray(i_items_start),
                    DdbType.string,
                    cols
                ) as [number, string[]]
                
                let value = new Array(cols)
                let i_start = i_items_start + len_items
                for (let i = 0;  i < cols;  i++) {
                    const type = buf_data[i_start] as DdbType
                    
                    const i_vector_head = i_start + 2
                    
                    let col = this.parse_vector(
                        buf_data.subarray(i_vector_head),
                        type
                    )
                    
                    col.name = colnames[i]
                    
                    value[i] = col
                    
                    i_start = i_vector_head + col.length
                }
                
                return new this({
                    form,
                    type,
                    length: i_start,
                    name,
                    rows,
                    cols,
                    value,
                })
            }
            
            
            case DdbForm.dict: {
                // <Buffer 19 05 type = any, form = dict
                // 12 01 keys.type = string, keys.form = vector
                // 03 00 00 00 01 00 00 00 keys.cols = 3, keys.rows = 1
                // 63 00 62 00 61 00 
                
                // 19 01 values.type = any, values.form = vector
                // 03 00 00 00 01 00 00 00 values.cols = 3, values.rows = 1
                // 04 00 03 00 00 00 04 00 02 00 00 00 04 00 01 00 00 00>
                
                const keys = this.parse_vector(
                    buf_data.subarray(2),
                    buf_data[0]
                )
                
                const i_values_start = 2 + keys.length
                
                const values = this.parse_vector(
                    buf_data.subarray(i_values_start + 2),
                    buf_data[i_values_start]
                )
                
                return new this({
                    form,
                    type,
                    length: i_values_start + 2 + values.length,
                    rows: keys.rows,
                    cols: 2,
                    value: [
                        keys,
                        values
                    ],
                })
            }
            
            
            case DdbForm.matrix: {
                // matrix([
                //     [1, 2, 3],
                //     [3, 2, 1]
                // ])
                
                // <Buffer 00 has_row_label = , has_col_label = 
                // 04 03 type = int, form = matrix
                // 03 00 00 00 02 00 00 00 rows = 3, cols = 2
                // 01 00 00 00 02 00 00 00 03 00 00 00 03 00 00 00 02 00 00 00 01 00 00 00>
                
                const dv = new DataView(buf.buffer, buf.byteOffset + i_data)
                
                const label_flags = buf_data[0]
                const has_row_labels = Boolean(label_flags & 0x01)
                const has_col_labels = Boolean(label_flags & 0x02)
                
                if (has_row_labels || has_col_labels)
                    throw new Error('matrix 暂不支持 row labels 和 col labels')
                
                const datatype = buf_data[1] as DdbType
                const rows = dv.getUint32(3, ddb.le)
                const cols = dv.getUint32(7, ddb.le)
                
                const [len_items, value] = this.parse_vector_items(
                    buf_data.subarray(11),
                    datatype,
                    rows * cols  // 假设小于 2**32
                )
                
                return new this({
                    form, 
                    type,
                    length: 11 + len_items,
                    rows,
                    cols,
                    datatype,
                    value,
                })    
            }
            
            
            default:
                return new this({
                    form,
                    type,
                    length: buf_data.length,
                    value: buf_data
                })
        }
    }
    
    
    static parse_scalar (buf: Uint8Array, type: DdbType): [number, DdbValue] {
        switch (type) {
            case DdbType.void:
                return [1, null]
            
            
            case DdbType.bool:
                return [1, Boolean(buf[0])]
            
            
            case DdbType.char:
                return [1, String.fromCharCode(buf[0])]
            
            
            case DdbType.short: {
                const dv = new DataView(buf.buffer, buf.byteOffset)
                return [2, dv.getInt16(0, ddb.le)]
            }
            
            
            case DdbType.int:
            // datetime
            case DdbType.date:
            case DdbType.month:
            case DdbType.time:
            case DdbType.minute:
            case DdbType.second:
            case DdbType.datetime: 
            case DdbType.datehour: {
                const dv = new DataView(buf.buffer, buf.byteOffset)
                return [4, dv.getInt32(0, ddb.le)]
            }
            
            
            case DdbType.float: {
                const dv = new DataView(buf.buffer, buf.byteOffset)
                return [4, dv.getFloat32(0, ddb.le)]
            }
            
            
            case DdbType.double: {
                const dv = new DataView(buf.buffer, buf.byteOffset)
                return [8, dv.getFloat64(0, ddb.le)]
            }
            
            
            case DdbType.long:
            // timestamp
            case DdbType.timestamp:
            case DdbType.nanotime:
            case DdbType.nanotimestamp: {
                const dv = new DataView(buf.buffer, buf.byteOffset)
                return [8, dv.getBigInt64(0, ddb.le)]
            }
            
            
            case DdbType.string:
            case DdbType.symbol:
            case DdbType.code:
            case DdbType.functiondef: {
                const i_head = type === DdbType.functiondef ? 1 : 0
                let i_zero = buf.indexOf(0, i_head)
                let i_end: number  // 整个字符串（包括 0）的末尾，excluding
                if (i_zero === -1)
                    i_end = i_zero = buf.length
                else
                    i_end = i_zero + 1
                // 调整了 i_zero 到字符串（不包括 0）的末尾，excluding
                
                const str = this.dec.decode(
                    buf.subarray(i_head, i_zero)
                )
                
                return [
                    i_end,
                    type === DdbType.functiondef ?
                        {
                            type: buf[0] as DdbFunctionType,
                            name: str
                        }
                    :
                        str
                ]
            }
            
            
            case DdbType.uuid:
            case DdbType.ipaddr:
            case DdbType.int128:
                return [
                    16,
                    buf.slice(0, 16)
                ]
            
            
            case DdbType.blob: {
                const dv = new DataView(buf.buffer, buf.byteOffset)
                const length = dv.getUint32(0, ddb.le)
                
                return [
                    4 + length,
                    buf.slice(4, 4 + length)
                ]
            }
            
            
            case DdbType.complex:
            case DdbType.point: {
                const dv = new DataView(buf.buffer, buf.byteOffset)
                return [
                    16,
                    [
                        dv.getFloat64(0, ddb.le),
                        dv.getFloat64(8, ddb.le)
                    ] as [number, number]
                ]
            }
            
            
            default:
                return [0, buf]
        }
    }
    
    
    /** parse: rows, cols, items */
    static parse_vector (buf: Uint8Array, type: DdbType): DdbObj {
        const dv = new DataView(buf.buffer, buf.byteOffset)
        
        const rows = dv.getUint32(0, ddb.le)
        
        const i_items_start = 8
        
        const [len_items, value] = this.parse_vector_items(
            buf.subarray(i_items_start),
            type,
            rows
        )
        
        return new this({
            form: DdbForm.vector,
            type,
            length: i_items_start + len_items,
            cols: 1,
            rows,
            value,
        })
    }
    
    
    /** 有可能没有字节对齐，不能直接使用原有 message 的 arraybuffer, 统一复制出来，让原有 arraybuffer 被回收掉比较好 */
    static parse_vector_items (
        buf: Uint8Array, 
        type: DdbType, 
        length: number
    ): [
        number, 
        DdbVectorValue
    ] {
        switch (type) {
            case DdbType.bool:
                return [length, buf.slice(0, length)]
            
            
            case DdbType.char:
                return [
                    length,
                    this.dec.decode(
                        buf.subarray(0, length)
                    )
                ]
            
            
            case DdbType.short:
                return [
                    2 * length,
                    new Int16Array(
                        buf.buffer.slice(
                            buf.byteOffset,
                            buf.byteOffset + 2 * length
                        )
                    )
                ]
            
            
            case DdbType.int:
            // datetime
            case DdbType.date:
            case DdbType.month:
            case DdbType.time:
            case DdbType.minute:
            case DdbType.second:
            case DdbType.datetime:
                return [
                    4 * length,
                    new Int32Array(
                        buf.buffer.slice(
                            buf.byteOffset,
                            buf.byteOffset + 4 * length
                        )
                    )
                ]
            
            
            case DdbType.float:
                return [
                    4 * length,
                    new Float32Array(
                        buf.buffer.slice(
                            buf.byteOffset,
                            buf.byteOffset + 4 * length
                        )
                    )
                ]
            
            
            case DdbType.double:
                return [
                    8 * length,
                    new Float64Array(
                        buf.buffer.slice(
                            buf.byteOffset, 
                            buf.byteOffset + 8 * length
                        )
                    )
                ]
            
            
            case DdbType.long:
            // timestamp
            case DdbType.timestamp:
            case DdbType.nanotime:
            case DdbType.nanotimestamp:
                return [
                    8 * length,
                    new BigInt64Array(
                        buf.buffer.slice(
                            buf.byteOffset,
                            buf.byteOffset + 8 * length
                        )
                    )
                ]
            
            
            case DdbType.string: 
            case DdbType.symbol: 
            case DdbType.code: {
                let value = new Array<string>(length)
                let i_head = 0, i_tail = i_head
                for (let i = 0;  i < length;  i++) {
                    i_tail = buf.indexOf(0, i_head)
                    value[i] = this.dec.decode(
                        buf.subarray(i_head, i_tail)
                    )
                    i_head = i_tail + 1
                }
                return [i_head, value]
            }
            
            
            case DdbType.symbol_extended: {
                // <Buffer 91 01 type = symbol extended, form = vector
                // 05 00 00 00 01 00 00 00 row = 5, col = 1
                
                // buf:
                // 00 00 00 00 symbol base id = 0 (uint32)
                // 02 00 00 00 symbol base size = 2
                // 00 61 61 00 以 \0 分割的字符串
                // 01 00 00 00 01 00 00 00 01 00 00 00 01 00 00 00 01 00 00 00>
                
                const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
                const base_id = dv.getUint32(0, ddb.le)
                const base_size = dv.getUint32(4, ddb.le)
                
                let base_length = 0
                let base = this.symbol_bases[base_id]
                
                // base_size 为 0 时复用之前的 symbol base
                if (base_size) {
                    [base_length, base] = this.parse_vector_items(
                        buf.subarray(8),
                        DdbType.string,
                        base_size
                    ) as [number, string[]]
                    
                    this.symbol_bases[base_id] = base
                }
                
                const value_start = 8 + base_length
                const value_end = value_start + length * 4
                
                const value = new Uint32Array(
                    buf.buffer.slice(
                        buf.byteOffset + value_start,
                        buf.byteOffset + value_end
                    )
                )
                
                return [
                    value_end,
                    {
                        base_id,
                        base,
                        value
                    }
                ]
            }
            
            
            case DdbType.uuid:
            case DdbType.ipaddr:
            case DdbType.int128:
                return [
                    16 * length,
                    new Uint8Array(
                        buf.buffer.slice(
                            buf.byteOffset,
                            buf.byteOffset + 16 * length
                        )
                    )
                ]
            
            
            case DdbType.blob: {
                // <Buffer 20 01 type = blob, form = vector
                // 02 00 00 00 01 00 00 00 cols = 2, rows = 1
                // 04 00 00 00 61 62 63 64 
                // 04 00 00 00 61 62 63 64>
                
                let value = new Array<Uint8Array>(length)
                const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
                let i_head = 0
                for (let i = 0;  i < length;  i++) {
                    const sublen = dv.getUint32(i_head, ddb.le)
                    const i_blob_head = i_head + 4
                    const i_blob_tail = i_blob_head + sublen
                    value[i] = buf.slice(i_blob_head, i_blob_tail)
                    i_head = i_blob_tail
                }
                
                return [i_head, value]
            }
            
            
            case DdbType.complex:
            case DdbType.point: 
                return [
                    16 * length,
                    new Float64Array(
                        buf.buffer.slice(
                            buf.byteOffset,
                            buf.byteOffset + 16 * length
                        )
                    )
                ]
            
            
            case DdbType.any: {
                // [1, 2, 'a', 'aaa']
                // any[4](<Buffer 
                // 04 00 DdbType.int, DdbForm.scalar
                // 01 00 00 00 
                // 04 00 DdbType.int, DdbForm.scalar
                // 02 00 00 00 
                // 02 00 DdbType.char, DdbForm.scalar
                // 61 
                // 12 00 DdbType.string, DdbForm.scalar
                // 61 61 61 00>)
                
                
                let values = new Array<DdbObj>(length)
                let i_head = 0
                for (let i = 0;  i < length;  i++) {
                    const obj = this.parse(
                        buf.subarray(i_head)
                    )
                    values[i] = obj
                    i_head += obj.length
                }
                
                return [
                    i_head,
                    values
                ]
            }
            
            
            default:
                return [0, buf]
        }
    }
    
    
    pack (): Uint8Array {
        const { form, type, value } = this
        
        let header = new Uint8Array(new ArrayBuffer(2))
        header[0] = type
        header[1] = form
        
        const body = (() => {
            switch (form) {
                case DdbForm.scalar:
                    switch (type) {
                        case DdbType.void:
                            return [Uint8Array.of(1)]
                        
                        case DdbType.bool:
                            return [Uint8Array.of(Number(value as boolean))]
                        
                        
                        case DdbType.char:
                            return [Uint8Array.of((value as string).charCodeAt(0))]
                        
                        
                        case DdbType.short:
                            return [Int16Array.of(value as number)]
                        
                        
                        case DdbType.int:
                        // datetime
                        case DdbType.date:
                        case DdbType.month:
                        case DdbType.time:
                        case DdbType.minute:
                        case DdbType.second:
                        case DdbType.datetime:
                        case DdbType.datehour:
                            return [Int32Array.of(value as number)]
                        
                        
                        case DdbType.float:
                            return [Float32Array.of(value as number)]
                        
                        
                        case DdbType.double:
                            return [Float64Array.of(value as number)]
                        
                        
                        case DdbType.long:
                        // timestamp
                        case DdbType.timestamp:
                        case DdbType.nanotime:
                        case DdbType.nanotimestamp:
                            return [BigInt64Array.of(this.value as bigint)]
                        
                        
                        case DdbType.string:
                        case DdbType.symbol:
                        case DdbType.code:
                            return [
                                DdbObj.enc.encode(value as string),
                                Uint8Array.of(0),
                            ]
                        
                        case DdbType.functiondef:
                            return [
                                Uint8Array.of((value as DdbFunctionDefValue).type),
                                DdbObj.enc.encode((value as DdbFunctionDefValue).name),
                                Uint8Array.of(0)
                            ]
                        
                        case DdbType.uuid:
                        case DdbType.ipaddr:
                        case DdbType.int128:
                            return [this.value as Uint8Array]
                        
                        
                        case DdbType.blob:
                            return [
                                Uint32Array.of(
                                    (this.value as Uint8Array).byteLength
                                ),
                                this.value as Uint8Array
                            ]
                        
                        
                        case DdbType.complex:
                        case DdbType.point:
                            return [Float64Array.from(this.value as [number, number])]
                        
                        
                        case DdbType.duration:
                            return [value as Uint8Array]
                        
                        default:
                            throw new Error(`${DdbType[type]} 暂时不支持序列化`)
                    }
                
                
                case DdbForm.vector:
                case DdbForm.pair:
                    return [
                        Uint32Array.of(this.rows, 1),
                        ... DdbObj.pack_vector_body(value as DdbVectorValue, type, this.rows)
                    ]
                
                
                case DdbForm.set:
                    return [
                        new DdbObj({
                            ...this,
                            form: DdbForm.vector,
                        }).pack()
                    ]
                
                
                case DdbForm.table:
                    return [
                        Uint32Array.of(this.rows, this.cols),
                        DdbObj.enc.encode(this.name),
                        Uint8Array.of(0),
                        ...DdbObj.pack_vector_body(
                            (this.value as DdbObj[]).map(col => col.name),
                            DdbType.string, 
                            this.cols
                        ),
                        ...(() => {
                            let cols = new Array<Uint8Array>(this.cols)
                            for (let i = 0;  i < cols.length;  i++)
                                cols[i] = (this.value as DdbObj[])[i].pack()
                            return cols
                        })()
                    ]
                
                
                case DdbForm.dict:
                    return [
                        (value as [DdbObj, DdbObj])[0].pack(),
                        (value as [DdbObj, DdbObj])[1].pack(),
                    ]
                
                
                case DdbForm.matrix:
                    return [
                        Uint8Array.of(0, this.datatype, this.form),
                        Uint32Array.of(this.rows, this.cols),
                        ... DdbObj.pack_vector_body(value as DdbVectorValue, this.datatype, this.rows * this.cols)
                    ]
                
                
                default:
                    throw new Error(`${DdbForm[form]} 暂不支持序列化`)
            }
        })()
        
        
        if (!body)
            return new Uint8Array(0)
        
        return concat([
            header,
            ...body
        ])
    }
    
    
    static pack_vector_body (
        value: DdbVectorValue,
        type: DdbType,
        length: number
    ): ArrayBufferView[] {
        switch (type) {
            case DdbType.bool:
                return [value as Uint8Array]
            
            
            case DdbType.char:
                return [this.enc.encode(value as string)]
            
            
            case DdbType.short:
                return [value as Int16Array]
            
            
            case DdbType.int:
            // datetime
            case DdbType.date:
            case DdbType.month:
            case DdbType.time:
            case DdbType.minute:
            case DdbType.second:
            case DdbType.datetime:
                return [value as Int32Array]
            
            
            case DdbType.float:
                return [value as Float32Array]
            
            
            case DdbType.double:
                return [value as Float64Array]
            
            case DdbType.long:
            // timestamp
            case DdbType.timestamp:
            case DdbType.nanotime:
            case DdbType.nanotimestamp:
                return [value as BigInt64Array]
            
            
            case DdbType.string: 
            case DdbType.symbol: 
            case DdbType.code: {
                let bufs = new Array<Uint8Array>(length * 2)
                for (let i = 0;  i < length;  i++) {
                    bufs[2 * i] = this.enc.encode((value as string[])[i])
                    bufs[2 * i + 1] = Uint8Array.of(0)
                }
                return bufs
            }
            
            
            case DdbType.uuid:
            case DdbType.ipaddr:
            case DdbType.int128:
                return [value as Uint8Array]
            
            
            case DdbType.blob: {
                let bufs = new Array<ArrayBufferView>(length * 2)
                for (let i = 0;  i < length;  i++) {
                    const blob_value = (value as Uint8Array[])[i]
                    bufs[2 * i] = Uint32Array.of(blob_value.length)
                    bufs[2 * i + 1] = blob_value
                }
                return bufs
            }
            
            
            case DdbType.complex:
            case DdbType.point: 
                return [value as Float64Array]
            
            
            case DdbType.any: {
                // [1, 2, 'a', 'aaa']
                // any[4](<Buffer 
                // 04 00 DdbType.int, DdbForm.scalar
                // 01 00 00 00 
                // 04 00 DdbType.int, DdbForm.scalar
                // 02 00 00 00 
                // 02 00 DdbType.char, DdbForm.scalar
                // 61 
                // 12 00 DdbType.string, DdbForm.scalar
                // 61 61 61 00>)
                
                let bufs = new Array<Uint8Array>(length)
                for (let i = 0;  i < length;  i++)
                    bufs[i] = (value as DdbObj[])[i].pack()
                return bufs
            }
            
            default:
                throw new Error(`vector ${DdbType[type]} 暂不支持序列化`)
        }
    }
    
    
    toString () {
        const type = (() => {
            const tname = DdbType[this.type]
            
            switch (this.form) {
                case DdbForm.scalar:
                    if (this.type === DdbType.functiondef)
                        return `functiondef<${DdbFunctionType[(this.value as DdbFunctionDefValue).type]}>`
                    return tname
                
                case DdbForm.vector:
                    return `${tname}[${this.rows}]`
                
                case DdbForm.pair:
                    return `pair<${tname}>`
                
                case DdbForm.set:
                    return `set<${tname}>`
                
                case DdbForm.table:
                    return `table[${this.rows} rows][${this.cols} cols]`
                
                case DdbForm.dict:
                    return `dict<${DdbType[(this.value[0] as DdbObj).type]}, ${DdbType[(this.value[1] as DdbObj).type]}>`
                
                case DdbForm.matrix:
                    return `matrix<${DdbType[this.datatype]}>[${this.rows} rows][${this.cols} cols]`
                
                default:
                    return `${DdbForm[this.form]} ${tname}`
            }
        })()
        
        const data = (() => {
            if (this.form === DdbForm.pair)
                return `${this.value[0]}, ${this.value[1]}`
            
            if (this.form === DdbForm.scalar && this.type === DdbType.functiondef)
                return `'${(this.value as DdbFunctionDefValue).name}'`
            
            return this.value
        })()
        
        return `${blue(type)}(${ this.name ? `'${yellow(this.name)}', ` : '' }${data})\n`
    }
    
    
    to_cols () {
        return (this.value as DdbObj[]).map(col => {
            let col_: ColumnType<Record<string, any>> = {
                title: col.name,
                dataIndex: col.name,
            }
            
            switch (col.type) {
                case DdbType.timestamp:
                    col_.render = (value: bigint) => {
                        if (value === nulls.int64)
                            return ''
                        
                        return dayjs(
                            Number(value)
                        ).format('YYYY.MM.DD HH:mm:ss.SSS')
                    }
                    break
                    
                case DdbType.date:
                    col_.render = (value: number) => {
                        if (value === nulls.int32)
                            return ''
                        return dayjs(
                            Number(1000 * 3600 * 24 * value)
                        ).format('YYYY.MM.DD')
                    }
                    break
                    
                case DdbType.ipaddr:
                    col_.render = value =>
                        (value as Uint8Array).slice().reverse().join('.').replace(/^(0\.)+/, '')
                    break
            }
            
            return col_
        })
    }
    
    
    to_rows <T extends Record<string, any> = Record<string, any>> () {
        let rows = new Array<T>(this.rows)
        
        for (let i = 0;  i < this.rows;  i++) {
            let row: any = { }
            for (let j = 0;  j < this.cols;  j++) {
                const c: DdbObj = this.value[j]
                
                if (c.type === DdbType.ipaddr) {
                    row[c.name] = (c.value as Uint8Array).subarray(16 * i, 16 * (i + 1))
                    continue
                }
                
                row[c.name] = c.value[i]
            }
            rows[i] = row
        }
        
        return rows
    }
}


export class DdbBool extends DdbObj<boolean> {
    constructor (value: boolean) {
        super({
            form: DdbForm.scalar,
            type: DdbType.bool,
            length: 1,
            value,
        })
    }
}

export class DdbInt extends DdbObj<number> {
    constructor (value: number) {
        super({
            form: DdbForm.scalar,
            type: DdbType.int,
            length: 4,
            value
        })
    }
}

export class DdbString extends DdbObj<string> {
    constructor (value: string) {
        super({
            form: DdbForm.scalar,
            type: DdbType.string,
            length: 0,
            value
        })
    }
}

export class DdbLong extends DdbObj<bigint> {
    constructor (value: bigint) {
        super({
            form: DdbForm.scalar,
            type: DdbType.long,
            length: 8,
            value
        })
    }
}

export class DdbDouble extends DdbObj<number> {
    constructor (value: number) {
        super({
            form: DdbForm.scalar,
            type: DdbType.double,
            length: 8,
            value
        })
    }
}

export class DdbVectorInt extends DdbObj<Int32Array> {
    constructor (value: number[]) {
        super({
            form: DdbForm.vector,
            type: DdbType.int,
            length: 0,
            rows: value.length,
            cols: 1,
            value: Int32Array.from(value),
        })
    }
}

export class DdbVectorString extends DdbObj<string[]> {
    constructor (value: string[]) {
        super({
            form: DdbForm.vector,
            type: DdbType.string,
            length: 0,
            rows: value.length,
            cols: 1,
            value
        })
    }
}

export class DdbVectorDouble extends DdbObj<Float64Array> {
    constructor (value: number[]) {
        super({
            form: DdbForm.vector,
            type: DdbType.double,
            length: 0,
            rows: value.length,
            cols: 1,
            value: Float64Array.from(value)
        })
    }
}

export class DdbVectorAny extends DdbObj {
    constructor (value: DdbObj<DdbValue>[]) {
        super({
            form: DdbForm.vector,
            type: DdbType.any,
            length: 0,
            rows: value.length,
            cols: 1,
            value
        })
    }
}

export class DdbPair extends DdbObj<Int32Array> {
    constructor (l: number, r = -2147483648) {
        super({
            form: DdbForm.pair,
            type: DdbType.int,
            length: 0,
            rows: 2,
            cols: 1,
            value: Int32Array.of(l, r)
        })
    }
}

export class DdbFunction extends DdbObj<DdbFunctionDefValue> {
    constructor (name: string, type: DdbFunctionType) {
        super({
            form: DdbForm.scalar,
            type: DdbType.functiondef,
            length: 0,
            value: { type, name }
        })
    }
}


export let ddb = {
    /** 当前的 session id (http 或 tcp) */
    sid: '0',
    
    /** utf-8 text decoder */
    dec: new TextDecoder('utf-8'),
    
    enc: new TextEncoder(),
    
    ws: null as WebSocket,
    
    /** little endian (server) */
    le: true,
    
    /** little endian (client) */
    le_client: Boolean(
        new Uint8Array(
            Uint32Array.of(1).buffer
        )[0]
    ),
    
    /** resolver, rejector, promise of last rpc */
    presolver (buf: Uint8Array) { },
    prejector (error: Error) { },
    presult: Promise.resolve(null) as Promise<Uint8Array>,
    
    
    async connect () {
        const url = new URL(location.href)
        
        const hostname = url.searchParams.get('hostname') || location.hostname
        
        const port = url.searchParams.get('port') || location.port
        
        const ws_url = `${ location.protocol === 'https:' ? 'wss' : 'ws' }://${hostname}${ port ? `:${port}` : '' }/`
        
        let ws = new WebSocket(ws_url)
        
        // https://stackoverflow.com/questions/11821096/what-is-the-difference-between-an-arraybuffer-and-a-blob/39951543
        ws.binaryType = 'arraybuffer'
        
        this.ws = ws
        
        ws.addEventListener('open', ev => {
            console.log('ws opened:', ws_url)
            
            ws.send(
                `API ${this.sid} 8\n` +
                'connect\n'
            )
        })
        
        ws.addEventListener('close', ev => {
            console.log('ws closed', ev)
        })
        
        ws.addEventListener('error', ev => {
            console.log('ws errored', ev)
        })
        
        // 为首个 connect 响应报文初始化 presult 链表头结点
        this.presult = new Promise((resolve, reject) => {
            this.presolver = resolve
            this.prejector = reject
        })
        
        ws.addEventListener('message', ({ data: buf }) => {
            try {
                this.presolver(
                    this.parse_message(
                        new Uint8Array(buf as ArrayBuffer)
                    )
                )
            } catch (error) {
                this.prejector(error)
            }
        })
        
        await this.presult
        
        await this.eval(
            'def pnode_run (nodes, func_name, args, add_node_alias = true) {\n' +
            '    nargs = size(args)\n' +
            '    func = funcByName(func_name)\n' +
            '    \n' +
            '    if (!nargs)\n' +
            '        return pnodeRun(func, nodes, add_node_alias)\n' +
            '    \n' +
            '    args_partial = array(any, 1 + nargs, 1 + nargs)\n' +
            '    args_partial[0] = func\n' +
            '    args_partial[1:] = args\n' +
            '    return pnodeRun(\n' +
            '        unifiedCall(partial, args_partial),\n' +
            '        nodes,\n' +
            '        add_node_alias\n' +
            '    )\n' +
            '}\n',
            { urgent: true }
        )
    },
    
    
    /** rpc through websocket (function command)  
        ddb 世界观：需要等待上一个 rpc 结果从 server 返回之后才能发起下一个调用  
        违反世界观可能造成:  
        1. 并发多个请求只返回第一个结果（阻塞，需后续请求疏通）
        2. windows 下 ddb server 返回多个相同的结果
        
        - type: API 类型: 'script' | 'function' | 'variable'
        - options:
            - urgent?: 决定 `行为标识` 那一行字符串的取值（只适用于 script 和 function）
            - vars?: type === 'variable' 时必传，variable 指令中待上传的变量名
    */
    async rpc <T extends DdbObj = DdbObj> (
        type: 'script' | 'function' | 'variable',
        {
            script,
            func,
            args = [ ],
            vars = [ ],
            urgent,
        }: {
            script?: string
            func?: string
            args?: (DdbObj | string | boolean)[]
            vars?: string[]
            urgent?: boolean
    }) {
        if (!this.ws)
            await this.connect()
        
        if (this.ws.readyState !== WebSocket.OPEN)
            throw new Error('ws 连接已断开')
        
        // 临界区：保证多个 rpc 并发时形成 promise 链
        const ptail = this.presult
        let presolver: (buf: Uint8Array) => void
        let prejector: (error: Error) => void
        
        const presult = this.presult = new Promise<Uint8Array>((resolve, reject) => {
            presolver = resolve
            prejector = reject
        })
        
        try {
            await ptail
        } catch { }
        
        this.presolver = presolver
        this.prejector = prejector
        // 临界区结束，只有一个 rpc 请求可以写 WebSocket
        
        if (urgent && type !== 'script' && type !== 'function')
            throw new Error('urgent 只适用于 script 和 funciton')
        
        this.to_ddbobjs(args)
        
        const command = this.enc.encode(
            (() => {
                switch (type) {
                    case 'function':
                        return 'function\n' +
                            `${func}\n` +
                            `${args.length}\n` +
                            `${Number(this.le_client)}\n`
                        
                    case 'script':
                        return 'script\n' +
                            script
                            
                    case 'variable':
                        return 'variable\n' +
                            `${vars.join(',')}\n` +
                            `${vars.length}\n` +
                            `${Number(this.le_client)}\n`
                }
            })()
        )
        
        const message = concat([
            this.enc.encode(
                `API ${this.sid} ${command.length}${ urgent ? ` / 1_1_8_8` : '' }\n`
            ),
            command,
            ... args.map((arg: DdbObj) =>
                arg.pack()
            )
        ])
        
        this.ws.send(message)
        
        return DdbObj.parse(
            await presult  // data_buf
        ) as T
    },
    
    
    /** eval script through websocket (script command) */
    async eval <T extends DdbObj> (
        script: string,
        { urgent }: { urgent?: boolean } = { }
    ) {
        return this.rpc<T>('script', { script, urgent })
    },
    
    
    /** call function through websocket (function command) */
    async call <T extends DdbObj> (
        func: string,
        args: (DdbObj | string | boolean)[] = [ ],
        {
            urgent,
            node,
            nodes,
            func_type,
            add_node_alias
        }: {
            urgent?: boolean
            node?: string
            nodes?: string[]
            func_type?: DdbFunctionType
            add_node_alias?: boolean
        } = { }
    ) {
        if (node) {
            if (typeof func_type === 'undefined')
                throw new Error('指定 node 时必须设置 func_type')
            
            args = [
                node,
                new DdbFunction(func, func_type),
                ...args
            ]
            func = 'rpc'
        }
        
        if (nodes) {
            args = [
                new DdbVectorString(nodes),
                func,
                new DdbVectorAny(
                    this.to_ddbobjs(args)
                ),
                ... typeof add_node_alias === 'undefined' ? [ ] : [true]
            ]
            func = 'pnode_run'
        }
        
        return this.rpc<T>('function', {
            func,
            args,
            urgent,
        })
    },
    
    
    /** upload variable through websocket (variable command) */
    async upload (vars: string[], args: any[]) {
        if (!args.length || args.length !== vars.length)
            throw new Error('variable 指令参数为空或参数名为空，或数量不匹配')
        
        return this.rpc('variable', { vars, args })
    },
    
    
    /** 解析服务端响应报文，返回去掉 header 的 data buf */
    parse_message (buf: Uint8Array) {
        // '1166953221 1 1\n'
        // 'OK\n'
        // '\x04\x00\x02\x00\x00\x00'
        
        /** index of line feed 0 */
        const i_lf_0 = buf.indexOf(0x0a)  // '\n'
        
        const parts = this.dec.decode(
            buf.subarray(0, i_lf_0)
        ).split(' ')
        
        /** session id */
        const sid = parts[0]
        if (sid !== this.sid) {
            console.log(`sid 从 ${this.sid} 变为 ${sid}`)
            this.sid = sid
        }
        
        /** 返回对象的数量 */
        const n_obj = Number(parts[1])
        
        /** 大小端: 协议中大端为 0, 小端为 1 */
        this.le = Number(parts[2]) !== 0
        
        const i_ls_1 = i_lf_0 + 1
        const i_lf_1 = buf.indexOf(0x0a, i_ls_1)  // '\n'
        /** 'OK' 表示成功，其它文本表示失败 */
        const message = this.dec.decode(
            buf.subarray(i_ls_1, i_lf_1)
        )
        
        if (message !== 'OK')
            throw new Error(message)
        
        return buf.subarray(i_lf_1 + 1)
    },
    
    
    /** 自动转换 js string, boolean 为 DdbObj */
    to_ddbobj (value: DdbObj | string | boolean): DdbObj {
        if (value instanceof DdbObj)
            return value
            
        const type = typeof value
        
        switch (type) {
            case 'string':
                return new DdbString(value as string)
            
            case 'boolean':
                return new DdbBool(value as boolean)
            
            default: 
                throw new Error(`不能自动转换 ${type} 至 DdbObj`)
        }
    },
    
    
    /** 转换 js 数组为 DdbObj[] (in place, 会修改原数组) */
    to_ddbobjs (values: any[]) {
        for (let i = 0;  i < values.length;  i++)
            values[i] = this.to_ddbobj(values[i])
        return values as DdbObj<DdbValue>[]
    },
}

;(window as any).ddb = ddb

export default ddb
