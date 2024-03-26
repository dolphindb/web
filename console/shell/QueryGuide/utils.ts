import { safe_json_parse } from '../../dashboard/utils.js'
import { request } from '../../guide/utils.js'
import { type Query } from './type.js'

export function transform_query (query: Query) {
    return query.map(item => { 
        const { name, data_type } = safe_json_parse(item.col)
        return {
            ...item,
            col: name,
            dataType: data_type
        }
    })
}


export async function query_enums (params) { 
    const col_name = safe_json_parse(params.col)?.name
    if (!col_name)
        return [ ]
    
    const res = await request<{ enumList: string[] }>('dbms_generateEnumerate', {
        ...params,
        col: col_name
    })
    if (!res)
        return [ ]
    else
        return res.enumList.map(item => ({ label: item, value: item }))
    
}
