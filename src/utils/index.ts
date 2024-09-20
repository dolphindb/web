import { DdbType } from 'dolphindb/browser.js'

import { delay } from 'xshell/utils.browser.js'

import { t } from '@i18n/index.ts'


/** 表单 Form.Item 必填 `<Form.Item {...required}>` */
export const required = { required: true, rules: [{ required: true }] }


export function download_file (name: string, url: string) {
    // 创建一个隐藏的 <a> 元素
    const a = document.createElement('a')
    a.style.display = 'none'
    a.href = url
    a.download = name
    
    // 将 <a> 元素添加到 DOM 中
    document.body.appendChild(a)
    
    // 触发下载
    a.click()
    
    // 下载完成后移除 <a> 元素和 URL 对象
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}


export function strip_quotes (str: string) {
    if (str && (
        str.startsWith("'") && str.endsWith("'") ||
        str.startsWith('"') && str.endsWith('"')
    ))
        return str.slice(1, -1)
    else
        return str
}


/** 设置 location.href 之后可能会需要一段时间才跳转，这里稍作等待并抛出错误中断流程，
    防止执行后续代码，且不显示报错弹窗 */
export async function goto_url (url: string) {
    location.href = url
    
    await delay(1000 * 3)
    
    throw Object.assign(
        new Error(t('正在跳转')), 
        { shown: true }
    )
}


const iterator_utils = Boolean(typeof Iterator !== 'undefined' && Iterator.prototype?.map)

export function iterator_map <TValue, TReturn> (
    array: IteratorObject<TValue>, 
    mapper: (value: TValue, index: number) => TReturn
): IteratorObject<TReturn> | TReturn[] {
    return iterator_utils
        ? array.map(mapper)
        : [...array].map(mapper)
}


export type DDBColumnTypeNames = Uppercase<keyof typeof DdbType>


export const DDB_TYPE_MAP = {
    [DdbType.void]: 'VOID',
    [DdbType.bool]: 'BOOL',
    [DdbType.char]: 'CHAR',
    [DdbType.short]: 'SHORT',
    [DdbType.int]: 'INT',
    [DdbType.long]: 'LONG',
    [DdbType.compressed]: 'COMPRESSED',
    [DdbType.date]: 'DATE',
    [DdbType.month]: 'MONTH',
    [DdbType.time]: 'TIME',
    [DdbType.minute]: 'MINUTE',
    [DdbType.second]: 'SECOND',
    [DdbType.datetime]: 'DATETIME',
    [DdbType.timestamp]: 'TIMESTAMP',
    [DdbType.nanotime]: 'NANOTIME',
    [DdbType.nanotimestamp]: 'NANOTIMESTAMP',
    [DdbType.datehour]: 'DATEHOUR',
    [DdbType.float]: 'FLOAT',
    [DdbType.double]: 'DOUBLE',
    [DdbType.symbol]: 'SYMBOL',
    [DdbType.string]: 'STRING',
    [DdbType.blob]: 'BLOB',
    [DdbType.int128]: 'INT128',
    [DdbType.uuid]: 'UUID',
    [DdbType.ipaddr]: 'IPADDR',
    [DdbType.point]: 'POINT',
    [DdbType.functiondef]: 'FUNCTIONDEF',
    [DdbType.handle]: 'HANDLE',
    [DdbType.code]: 'CODE',
    [DdbType.datasource]: 'DATASOURCE',
    [DdbType.resource]: 'RESOURCE',
    [DdbType.duration]: 'DURATION',
    [DdbType.any]: 'ANY',
    [DdbType.dict]: 'DICTIONARY',
    [DdbType.complex]: 'COMPLEX',
    [DdbType.decimal32]: 'DECIMAL32(S)',
    [DdbType.decimal64]: 'DECIMAL64(S)',
    [DdbType.decimal128]: 'DECIMAL128(S)'
}
