import { message } from 'antd'
import { safe_json_parse } from '../dashboard/utils.js'
import { model } from '../model.js'

export async function request<T> (func: string, params: any) { 
    try {
        console.log(`执行脚本：${func}('${JSON.stringify(params)}')`)
        const res = await model.ddb.call(func, [JSON.stringify(params)])
        console.log('res: ', safe_json_parse(res.value))
        return safe_json_parse(res.value)
    } catch (e) { 
        message.error(JSON.stringify(e))
    }
}
