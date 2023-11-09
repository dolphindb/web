import { Model } from 'react-object-model'
import { model } from '../model.js'
import { type DdbObj } from 'dolphindb/browser.js'

class ComputingModel extends Model<ComputingModel> {
    
    inited = false
    
    streaming_stat: Record<string, DdbObj>
    
    origin_streaming_engine_stat: Record<string, DdbObj>
    
    persistent_table_stat: DdbObj
    
    shared_table_stat: DdbObj
    
    async init () {
        await Promise.all([
            this.def_get_persistence_table_names(),
            this.def_get_persistence_stat(),
            this.def_get_shared_table_stat()
        ])
        
        this.set({ inited: true })
    }
    
     /** 处理流计算引擎状态，给每一个引擎添加 engineType 字段，合并所有类型的引擎 */
    async get_streaming_pub_sub_stat () {
        this.set({ streaming_stat: (await model.ddb.call('getStreamingStat', [ ], { urgent: true })).to_dict() })
    }
    
    async get_streaming_engine_stat () {
        this.set({ origin_streaming_engine_stat: (await model.ddb.call('getStreamEngineStat', [ ], { urgent: true })).to_dict() })
    }
    
    async get_streaming_table_stat () {
        this.set({ persistent_table_stat: await model.ddb.call('get_persistence_stat', [ ], { urgent: true }) })
        this.set({ shared_table_stat: await model.ddb.call('get_shared_table_stat', [ ], { urgent: true }) }) 
    }
    
    async def_get_persistence_table_names () {
        await model.ddb.eval(
            'def get_persistence_table_names () {\n' +
            '    if(getConfigure("persistenceDir") == NULL){\n' +
            '        return NULL\n' +
            '    }else{\n' +
            '        shareNames = exec name from objs(true) where type="REALTIME" and shared=true\n' +
            '        res = array(STRING, 0)\n' +
            '        for(tbName in shareNames){\n' +
            '            try{\n' +
            '                getPersistenceMeta(objByName(tbName))\n' +
            '            }catch(ex){\n' +
            '                continue\n' +
            '            }\n' +
            '            res.append!(tbName)\n' +
            '        }\n' +
            '        return res\n' +
            '    }\n' +
            '}\n', { urgent: true })
    } 
    
    
    async def_get_persistence_stat () {
        await model.ddb.eval(
            'def get_persistence_stat () {\n' +
            '    tableNames = get_persistence_table_names()\n' +
            '    resultColNames = ["tablename","lastLogSeqNum","sizeInMemory","asynWrite","totalSize","raftGroup","compress","memoryOffset","sizeOnDisk","retentionMinutes","persistenceDir","hashValue","diskOffset"]\n' +
            '    resultColTypes = ["STRING", "LONG","LONG","BOOL","LONG","INT","BOOL","LONG","LONG","LONG","STRING","INT","LONG"]\n' +
            '    result = table(1:0, resultColNames, resultColTypes)\n' +
            '    for(tbname in tableNames){\n' +
            '       tbStat = getPersistenceMeta(objByName(tbname))\n' +
            '       tbStat["tablename"] = tbname\n' +
            '       result.tableInsert(tbStat)\n' +
            '    }\n' +
            '    return result\n' +
            '}\n', { urgent: true }
        )
    }
    
    
    async def_get_shared_table_stat () {
        await model.ddb.eval(
            'def get_shared_table_stat () {\n' +
            '    tableNames = get_persistence_table_names()\n' +
            '    shareNames = exec name from objs(true) where type="REALTIME" and shared=true and name not in tableNames\n' +
            '    return select name as tableName,  rows, columns, bytes from objs(true) where name in shareNames\n' +
            '}\n', { urgent: true }
        )
    }
    
}


export let computing = new ComputingModel()
