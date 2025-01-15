import { ACCESS_TYPE, DATABASES_WITHOUT_CATALOG } from '../constants.js'

export function generate_access_cols (accesses: Record<string, any>, category: keyof typeof ACCESS_TYPE, name: string) {
    if (category === 'catalog' && name === DATABASES_WITHOUT_CATALOG) 
        return ACCESS_TYPE.catalog.map(type => ([type, 'default']))
    return Object.fromEntries(ACCESS_TYPE[category].map(type => handle_access(accesses, type, name)))
}

export function handle_access (accesses: Record<string, any>, type: string, name: string) {
    if (!accesses)
        return [type, 'none']
    // DB_OWNER 单独处理
    if (type === 'DB_OWNER') 
        if (accesses.DB_OWNER === 'allow') 
            if (!accesses.DB_OWNER_allowed) 
                return [type, 'allow']
             else {
                let objs = accesses.DB_OWNER_allowed.split(',')
                for (let obj of objs) {
                    // dfs://test* 变成 dfs://test.*
                    let reg = new RegExp(obj.replace('*', '.*'))
                    if (reg.test(name)) 
                        return [type, 'allow']
                }
                return [type, 'none']
            }
        else if (accesses.DB_OWNER === 'deny')
            return [type, 'deny']
        else
            return [type, 'none']
    else 
        if (accesses[type + '_allowed'] && accesses[type + '_allowed'].split(',').includes(name))
            return [type, 'allow']
        else if (accesses[type + '_denied'] && accesses[type + '_denied'].split(',').includes(name))
            return [type, 'deny']
        else
            return [type, 'none']
             
}
