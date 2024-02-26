import { safe_json_parse, sql_formatter } from '../../dashboard/utils.js'
import { model } from '../../model.js'
import { type ICEPEngineDetail, type CEPEngineItem, type DataViewEngineItem, type IServerEngineDetail } from './type.js'

export async function get_cep_engine_list () { 
    const res = await model.ddb.eval('getStreamEngineStat().CEPEngine')
    return res.value ? sql_formatter(res) as CEPEngineItem[] : [ ]
}

export async function get_cep_engine_detail (name: string) { 
    const { value } = await model.ddb.eval(`toStdJson(getCEPEngineStat(${JSON.stringify(name)}))`)
    const res = safe_json_parse(value) as IServerEngineDetail
    return {
        ...res,
        msgSchema: res?.msgSchema?.map(item => ({
            eventValuesTypeIntList: item.eventValuesTypeID,
            eventType: item.eventType,
            eventKeys: item.eventKeys ? item.eventKeys.split(',') : [ ],
            eventValuesTypeStringList: item.eventValuesTypeString ? item.eventValuesTypeString.split(',') : [ ]
        }))
    } as ICEPEngineDetail
    
}


export async function get_dataview_keys (engine_name: string, dataview_name: string ) { 
    const engine_detail = await get_cep_engine_detail(engine_name)
    const [key_col] = engine_detail.dataViewEngines?.find(item => item.name === dataview_name)?.keyColumns?.split(' ')
    const dataview_info = await model.ddb.call('getDataViewEngine', [engine_name, dataview_name])
    return sql_formatter(dataview_info).map(item => item[key_col])
}


export async function get_dataview_info (engine_name, dataview_name) { 
    const info_table = await model.ddb.call('getDataViewEngine', [engine_name, dataview_name])
    return sql_formatter(info_table)
}

