import { model } from '@model'

export async function request <T> (func: string, params?: any) {
    const res = await model.ddb.invoke<string | boolean>(func, params ? [JSON.stringify(params)] : undefined)
    if (typeof res === 'string')
        return JSON.parse(res) as T
    else
        return res as T
}
