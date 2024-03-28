import { Model } from 'react-object-model'

import { DdbVectorString } from 'dolphindb/browser.js'

import { model } from '../model.js'


class ConfigModel extends Model<ConfigModel> {
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
        return model.ddb.call('loadClusterNodesConfigs')
    }
    
    async save_nodes_config (configs: string[]) {
        return model.ddb.call('saveClusterNodesConfigs', [new DdbVectorString(configs)])
    }
}

export let config = new ConfigModel()
