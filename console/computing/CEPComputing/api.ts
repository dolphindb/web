import { DdbString } from 'dolphindb'
import { safe_json_parse, sql_formatter } from '../../dashboard/utils.js'
import { model } from '../../model.js'
import { type CEPEngineDetail, type CEPEngineItem } from './type.js'

export async function get_cep_engine_list () { 
    const res = await model.ddb.eval('getStreamEngineStat().CEPEngine')
    return sql_formatter(res) as CEPEngineItem[]
}

export async function get_cep_engine_detail (name: string) { 
    const { value } = await model.ddb.eval(`toStdJson(getCEPEngineStat(${JSON.stringify(name)}))`)
    return safe_json_parse(value) as CEPEngineDetail
}

export async function send_event_to_engine () { 
    
}

export async function get_engine_dataviews () {
    
}

export function convert_to_basic_ddb_type (type, value) { }
