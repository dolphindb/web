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
            // this.def_get_persistence_table_names(),
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
    
    
    async def_get_persistence_stat () {
        await model.ddb.eval(
            'def get_persistence_stat () {\n' +
            '    persistTable = getStreamTables(1)\n' +
            '    resultColNames = ["name","lastLogSeqNum","sizeInMemory","asynWrite","totalSize","raftGroup","compress","memoryOffset","sizeOnDisk","retentionMinutes","persistenceDir","hashValue","diskOffset"]\n' +
            '    resultColTypes = ["STRING", "LONG","LONG","BOOL","LONG","INT","BOOL","LONG","LONG","LONG","STRING","INT","LONG"]\n' +
            '    result = table(1:0, resultColNames, resultColTypes)\n' +
            '    for(tbname in persistTable["name"]){\n' +
            '       try{\n' +
            '           tbStat = getPersistenceMeta(objByName(tbname))\n' +
            '           tbStat["name"] = tbname\n' +
            '           result.tableInsert(tbStat)\n' +
            '       }catch(ex){}\n' +
            '    }\n' +
            '    result = select name as tablename, loaded, columns, memoryUsed, totalSize, sizeInMemory, memoryOffset, sizeOnDisk, diskOffset, asynWrite, retentionMinutes, compress, persistenceDir, hashValue, raftGroup, lastLogSeqNum from lj(persistTable, result, `name)\n' +
            '    return result\n' +
            '}\n', { urgent: true }
        )
    }
    
    
    async def_get_shared_table_stat () {
        await model.ddb.eval(
            'def get_shared_table_stat () {\n' +
            '    return select name as TableName, rowsInMemory as rows, columns, memoryUsed as bytes from getStreamTables(2) where shared=true\n' +
            '}\n', { urgent: true }
        )
    }
    
}


export let computing = new ComputingModel()
