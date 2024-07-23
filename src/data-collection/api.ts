import type { DdbObj } from 'dolphindb/browser.js'

import { safe_json_parse } from '../dashboard/utils.js'


import { type ISubscribe, Protocol, type ServerSubscribe, type Connection, type ServerParserTemplate, type IParserTemplate, type ListData, type KeyValueItem, InitStatus } from './type.js'
import { request } from './utils.js'

import dcp_code from './dolphindb-scripts/script.dos'

import { model } from '@/model.js'



export async function edit_subscribe (protocol: Protocol, subscribe: ISubscribe) {
    const { templateParams, consumerCfg,  ...others } = subscribe
    let params: ServerSubscribe = { ...others, templateParams: JSON.stringify(templateParams) }
    if (protocol === Protocol.KAFKA)
        params.consumerCfg = JSON.stringify(consumerCfg)
    return request('dcp_updateSubscribe', params)
}

export async function create_subscribe (protocol: Protocol, subscribe: ISubscribe & { connectId: string }) {
    const { templateParams, consumerCfg,  ...others } = subscribe
    let params: ServerSubscribe = { ...others, templateParams: JSON.stringify(templateParams) }
    if (protocol === Protocol.KAFKA)
        params.consumerCfg = JSON.stringify(consumerCfg)
    return request('dcp_addSubscribe', params)
}


export async function get_connect_detail (connect_id: string) {
    const { subscribes, ...others } = await request<{ subscribes: ServerSubscribe[], total: number, connectInfo: Connection }>('dcp_getConnectAndSubInfo', { connectId: connect_id })
    return {
        ...others,
        subscribes: subscribes.map(item => {
            const { templateParams, consumerCfg, ...subs } = item
            return {
                ...subs,
                templateParams: templateParams ? safe_json_parse(templateParams) : [ ],
                consumerCfg: consumerCfg ? safe_json_parse(consumerCfg) : [ ]
            } as ISubscribe
        })
    }
}


export async function get_parser_templates (protocol?: Protocol) {
    const res = await request <ListData<ServerParserTemplate>>('dcp_getParserTemplateList', protocol ? { protocol } : undefined)
    return {
        total: res.total,
        items: res.items.map(item => ({
            ...item,
            templateParams: item.templateParams ? safe_json_parse(item.templateParams) as KeyValueItem[] : [ ] as Array<{}>
        })) as IParserTemplate[]
    }
}

get_parser_templates.KEY = 'dcp_getParserTemplateList'


export async function is_inited () {
    const { value } = await model.ddb.eval<DdbObj<boolean>>('existsDatabase("dfs://dataAcquisition")')
    if (value)
        // 已初始化数据库，则直接初始化脚本
        await model.ddb.eval(dcp_code)
    return value ? InitStatus.INITED : InitStatus.NOT_INITED
}
is_inited.KEY = 'is_inited'
