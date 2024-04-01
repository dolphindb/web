import { safe_json_parse, sql_formatter } from '../../dashboard/utils.js'
import { model } from '../../model.js'
import { type ICEPEngineDetail, type CEPEngineItem, type DataViewEngineItem, type IServerEngineDetail } from './type.js'


export async function get_cep_engine_list () { 
    const res = await model.ddb.eval('getStreamEngineStat().CEPEngine')
    return res?.value ? sql_formatter(res) as CEPEngineItem[] : [ ]
}


export async function get_cep_engine_detail (name: string) { 
    const { value } = (await model.ddb.eval(`toStdJson(getCEPEngineStat(${JSON.stringify(name)}))`))
    const res = safe_json_parse(value) as IServerEngineDetail
    
    return {
        ...res,
        eventSchema: res?.eventSchema?.map(item => ({
            eventValuesTypeIntList: item.fieldTypeId,
            eventType: item.eventType,
            eventField: item.eventField ? item.eventField.split(',') : [ ],
            eventValuesTypeStringList: item.fieldType ? item.fieldType.split(',') : [ ],
            eventFormIdList: item.fieldFormId,
        }))
    } as ICEPEngineDetail
}


export async function get_dataview_info (engine_name: string, dataview_name: string) { 
    
    const dataview_info = await model.ddb.call('getDataViewEngine', [engine_name, dataview_name])
    const engine_detail = await get_cep_engine_detail(engine_name)
    
    const [key_col] = engine_detail?.dataViewEngines?.find(item => item.name === dataview_name)?.keyColumns?.split(' ')
    const data_view_table = dataview_info ? sql_formatter(dataview_info) : [ ]
    return { table: data_view_table, key_col, keys: data_view_table.map(item => item[key_col]) }
}
