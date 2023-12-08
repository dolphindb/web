import { safe_json_parse } from '../../dashboard/utils.js'
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
