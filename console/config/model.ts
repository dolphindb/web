import { DdbVectorString } from 'dolphindb/browser.js'
import { Model } from 'react-object-model'
import { model } from '../model.js'
class ConfigModel extends Model<ConfigModel> {
    async load_controller_configs () {
        return model.ddb.call('loadControllerConfigs', [ ], { urgent: true })
    }
    
    async save_controller_configs (configs: string[]) {
        return model.ddb.call('saveControllerConfigs', [new DdbVectorString(configs)], { urgent: true })
    }
    
    async get_cluster_nodes () {
        return model.ddb.call('getClusterNodesCfg', [ ], { urgent: true })
    }
    
    async save_cluster_nodes (nodes: string[]) {
        return model.ddb.call('saveClusterNodes', [new DdbVectorString(nodes)], { urgent: true })
    }
    
    async load_nodes_config () {
        return model.ddb.call('loadClusterNodesConfigs', [ ], { urgent: true })
    }
    
    async save_nodes_config (configs: string[]) {
        return model.ddb.call('saveClusterNodesConfigs', [new DdbVectorString(configs)], { urgent: true })
    }
}

export let config = new ConfigModel()
