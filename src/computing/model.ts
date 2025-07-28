import { Model } from 'react-object-model'

import { type DdbObj } from 'dolphindb/browser.js'

import { model } from '@model'
import { urgent } from '@utils'

import script from './index.dos'


class ComputingModel extends Model<ComputingModel> {
    inited = false
    
    persistence_dir = ''
    
    streaming_stat: Record<string, DdbObj>
    
    engine_stat: Record<string, DdbObj>
    
    persistent_table_stat: DdbObj
    
    shared_table_stat: DdbObj
    
    
    async init () {
        let { ddb } = model
        
        await ddb.execute(script, urgent)
        
        this.set({
            inited: true,
            persistence_dir: await ddb.invoke<string>('getConfig', ['persistenceDir'], urgent)
        })
    }
    
    
    /** 处理流计算引擎状态，给每一个引擎添加 engineType 字段，合并所有类型的引擎 */
    async get_streaming_stat (orca = false) {
        this.set({
            streaming_stat: (
                await model.ddb.call('get_streaming_stat', [orca], urgent)
            ).to_dict()
        })
    }
    
    
    async get_engine_stat (orca = false) {
        this.set({
            engine_stat: (
                await model.ddb.call('get_engine_stat', [orca], urgent)
            ).to_dict()
        })
    }
    
    
    async get_streaming_table_stat () {
        let { ddb } = model
        
        this.set({
            ... this.persistence_dir ? {
                persistent_table_stat: await ddb.call('get_persistence_stat', undefined, urgent)
            } : { },
            
            shared_table_stat: await ddb.call('get_shared_table_stat', undefined, urgent)
        })
    }
}

export let computing = new ComputingModel()
