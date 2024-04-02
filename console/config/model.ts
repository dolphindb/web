import { Model } from 'react-object-model'

import { DdbVectorString } from 'dolphindb/browser.js'

import { model } from '../model.js'

import { type NodesConfig } from './type.js'
import { strs_2_nodes_config } from './utils.js'


class ConfigModel extends Model<ConfigModel> {
    nodes_configs: NodesConfig[] = [ ]
    
    async load_controller_configs () {
        return model.ddb.call('loadControllerConfigs')
    }
    
    async save_controller_configs (configs: string[]) {
        return model.ddb.call('saveControllerConfigs', [new DdbVectorString(configs)])
    }
    
    async get_cluster_nodes () {
        return model.ddb.call('getClusterNodesCfg')
    }
    
    async save_cluster_nodes (nodes: string[]) {
        return model.ddb.call('saveClusterNodes', [new DdbVectorString(nodes)])
    }
    
    async load_nodes_config () {
        this.set({ nodes_configs: 
            strs_2_nodes_config(
                Array.from(new Set((await model.ddb.call('loadClusterNodesConfigs')).value as string[]))
        ) })
    }
    
    async save_nodes_config (configs: string[]) {
        await model.ddb.call('saveClusterNodesConfigs', [new DdbVectorString(configs)])
        await config.load_nodes_config()
    }
    
    constructor () {
        super()
    }
}

export let config = new ConfigModel()
