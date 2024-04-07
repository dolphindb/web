import { Model } from 'react-object-model'

import { DdbFunctionType, DdbVectorString } from 'dolphindb/browser.js'

import { NodeType, model } from '../model.js'

import { type NodesConfig } from './type.js'
import { _2_strs, strs_2_nodes_config } from './utils.js'


class ConfigModel extends Model<ConfigModel> {
    nodes_configs: Map<string, NodesConfig>
    
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
        this.set({ 
            nodes_configs: strs_2_nodes_config(
                (await model.ddb.call(
                    'loadClusterNodesConfigs', 
                    [ ], 
                    { ... model.node_type === NodeType.controller || model.node_type === NodeType.single ? { } : { node: model.controller_alias, func_type: DdbFunctionType.SystemFunc } }
                )).value as string[]
            ) 
        })
    }
    
    
    async save_nodes_config (configs: Array<[string, NodesConfig]>, is_delete: false): Promise<void>
    async save_nodes_config (configs: Array<string>, is_delete: true): Promise<void>
    async save_nodes_config (configs: Array<[string, NodesConfig]> | Array<string>, is_delete: boolean): Promise<void> {
        let web_modules_changed = false
        if (is_delete) 
            (configs as Array<string>).forEach(config => {
                if (config === 'webModules')
                    web_modules_changed = true
                this.nodes_configs.delete(config)
            })
        else
            (configs as Array<[string, NodesConfig]>).forEach(([key, value]) => {
                if (key === 'webModules')
                    web_modules_changed = true
                this.nodes_configs.set(key, value)
            }) 
        
        await model.ddb.call(
            'saveClusterNodesConfigs', 
            [new DdbVectorString(Array.from(this.nodes_configs).map(([key, config]) => {
                const { value } = config
                return `${key}=${value}`
            }))]
        )
        await config.load_nodes_config()
        
        if (web_modules_changed) 
            model.get_modules()
        
    }
    
    constructor () {
        super()
    }
}

export let config = new ConfigModel()
