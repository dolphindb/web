import { Model } from 'react-object-model'
import { model } from '../model.js'

class ComputingModel extends Model<ComputingModel> {
    
    inited = false
    
    async init () {
        await Promise.all([
            this.def_get_persistence_table_names(),
            this.def_get_persistence_stat(),
            this.def_get_shared_table_stat()
        ])
        this.set({ inited: true })
    }
    
    
    async def_get_persistence_table_names () {
        await model.ddb.eval(
            'def get_persistence_table_names(){\n' +
            '    if(getConfigure("persistenceDir") == NULL){\n' +
            '        return NULL\n' +
            '    }else{\n' +
            '        tableNames = exec filename from files(getConfigure("persistenceDir")+"/") where filename != "persistOffset"\n' +
            '        shareNames = exec name from objs(true) where type="REALTIME" and shared=true\n' +
            '        return tableNames[tableNames in shareNames]\n' +
            '    }\n' +
            '}\n', { urgent: true })
    } 
    
    
    async def_get_persistence_stat () {
        await model.ddb.eval(
            'def get_persistence_stat(){\n' +
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
            'def get_shared_table_stat(){\n' +
            '    tableNames = get_persistence_table_names()\n' +
            '    shareNames = exec name from objs(true) where type="REALTIME" and shared=true and name not in tableNames\n' +
            '    return select name as tableName,  rows, columns, bytes from objs(true) where name in shareNames\n' +
            '}\n', { urgent: true }
        )
    }
    
}

export let computing = new ComputingModel
