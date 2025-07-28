import { Model } from 'react-object-model'

import { type DdbObj } from 'dolphindb/browser.js'

import { model } from '@model'
import { urgent } from '@utils'


class ComputingModel extends Model<ComputingModel> {
    inited = false
    
    persistence_dir = ''
    
    streaming_stat: Record<string, DdbObj>
    
    engine_stat: Record<string, DdbObj>
    
    persistent_table_stat: DdbObj
    
    shared_table_stat: DdbObj
    
    
    async init () {
        this.set({
            inited: true,
            persistence_dir: await model.ddb.invoke<string>('getConfig', ['persistenceDir'], urgent)
        })
    }
    
    
    /** 处理流计算引擎状态，给每一个引擎添加 engineType 字段，合并所有类型的引擎 */
    async get_streaming_stat (orca = false) {
        this.set({
            streaming_stat: (
                await model.ddb.call(
                    await model.ddb.define(get_streaming_stat, urgent),
                    [orca], 
                    urgent)
            ).to_dict()
        })
    }
    
    
    async get_engine_stat (orca = false) {
        this.set({
            engine_stat: (
                await model.ddb.call(
                    await model.ddb.define(get_engine_stat, urgent), 
                    [orca],
                    urgent)
            ).to_dict()
        })
    }
    
    
    async get_streaming_table_stat () {
        this.set({
            ... this.persistence_dir ? {
                persistent_table_stat: await model.ddb.call(
                    await model.ddb.define(get_persistence_stat, urgent),
                    undefined, 
                    urgent)
            } : { },
            
            shared_table_stat: await model.ddb.call(
                await model.ddb.define(get_shared_table_stat, urgent), 
                undefined, 
                urgent)
        })
    }
}

export let computing = new ComputingModel()


const get_streaming_stat = 
    '// orca: true: 仅 orca; false: 仅非 orca\n' +
    'def get_streaming_stat (orca) {\n' +
    '    try {\n' +
    "        func = funcByName('filterStreamingStat')\n" +
    '    } catch (error) {\n' +
    '        func = NULL\n' +
    '    }\n' +
    '    \n' +
    '    if (func)\n' +
    '        return func(getStreamingStat(), orca ? 0 : 1)\n' +
    '    else\n' +
    '        return getStreamingStat()\n' +
    '}\n'


const get_engine_stat = 
    '// orca: true: 仅 orca; false: 仅非 orca\n' +
    'def get_engine_stat (orca) {\n' +
    '    try {\n' +
    "        func = funcByName('filterEngineStat')\n" +
    '    } catch (error) {\n' +
    '        func = NULL\n' +
    '    }\n' +
    '    \n' +
    '    if (func)\n' +
    '        return func(getStreamEngineStat(), orca ? 0 : 1)\n' +
    '    else\n' +
    '        return getStreamEngineStat()\n' +
    '}\n'


const get_shared_table_stat = 
    'def get_shared_table_stat () {\n' +
    '    return select name as TableName, rowsInMemory as rows, columns, memoryUsed from getStreamTables(2) where shared=true\n' +
    '}\n'


const get_persistence_stat = 
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
    '}\n'

