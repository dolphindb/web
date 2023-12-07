import { safe_json_parse } from '../dashboard/utils.js'
import { model } from '../model.js'

export async function request<T> (func: string, params: any) { 
    let res
    await model.execute(async () => { 
        console.log(`执行脚本：${func}('${JSON.stringify(params)}')`)
        res = await model.ddb.call(func, [JSON.stringify(params)])
        console.log('res: ', safe_json_parse(res.value))
    })
    return safe_json_parse(res?.value) as T
}


export function check_tb_valid (name: string) { 
    // 表名不能以数字，. / *这些字符开头，不能有空格
    if (['.', '*', '/'].includes(name[0]) || /^[0-9]/.test(name) || name.includes(' '))
        return false
    return true
}
