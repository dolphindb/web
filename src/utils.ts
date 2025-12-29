import { DdbType } from 'dolphindb/browser.js'

import { delay } from 'xshell/utils.browser.js'

import { language, t } from '@i18n'

import { model } from '@model'


/** 侧边栏收起状态宽度 */
export const sider_collapsed_width = 50

/** 侧边栏未收起状态宽度 */
export const sider_uncollapsed_width = language === 'en' ? 220 : 150


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
export async function goto_url (url: string): Promise<never> {
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


export function iterator_foreach <TValue, TReturn> (
    array: IteratorObject<TValue>, 
    foreach: (value: TValue, index: number) => void
) {
    if (iterator_utils)
        array.forEach(foreach)
    else
        [...array].map(foreach)
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


/** 如果插入了 key, key 总是返回数组的最后一项 */
export function switch_keys <TKey> (keys: TKey[], key: TKey) {
    let found = false
    let keys_ = [ ]
    
    for (const k of keys)
        if (k === key)
            found = true
        else
            keys_.push(k)
    
    if (!found)
        keys_.push(key)
    
    return keys_
}


export function ns2ms (num: number) {
    return num / 1_000_000
}


export function upper (str: string) {
    return model.shf ? str : str.toUpperCase()
}
