import { safe_json_parse } from '../dashboard/utils.js'
import { model } from '../model.js'

export async function request<T> (func: string, params?: any) {
    let res
    if (params)
        res = await model.ddb.call(func, [JSON.stringify(params)])
    else
        res = await model.ddb.eval(`${func}()`)
    return safe_json_parse(res?.value) as T
}
