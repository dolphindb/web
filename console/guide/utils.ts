import { safe_json_parse } from '../dashboard/utils.js'
import { model } from '../model.js'

export async function request<T> (func: string, params: any) { 
    console.log(`执行脚本：${func}('${JSON.stringify(params)}')`)
    const res = await model.ddb.call(func, [JSON.stringify(params)])
    return safe_json_parse(res.value) as T
}
