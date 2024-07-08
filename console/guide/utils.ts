import { safe_json_parse } from '../dashboard/utils.js'
import { model } from '../model.js'

export async function request<T> (func: string, params: any) { 
    const res = await model.ddb.call(func, [JSON.stringify(params)])
    return safe_json_parse(res?.value) as T
}


export function check_tb_valid (name: string) { 
    // 仅支持中英文开头
    if (!/^[a-zA-Z\u4e00-\u9fa5]/.test(name))
        return false
    // 仅支持中英文、数字以及下划线
    if (!/[\u4e00-\u9fa5A-Za-z0-9_]+$/g.test(name))  
        return false
    return true
}
