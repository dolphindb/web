import { Model } from 'react-object-model'

import { DdbFunctionType, type DdbObj, type DdbValue, DdbVectorString } from 'dolphindb/browser.js'

import { NodeType, model } from '../model.js'

import { type NodesConfig } from './type.js'
import { _2_strs, get_category, strs_2_nodes_config } from './utils.js'

class ConfigModel extends Model<ConfigModel> {
    nodes_configs: Map<string, NodesConfig>
    
    async load_controller_configs () {
        return this.call('loadControllerConfigs')
    }
    
    async save_controller_configs (configs: string[]) {
        return this.call('saveControllerConfigs', [new DdbVectorString(configs)])
    }
    
    async get_cluster_nodes () {
        return this.call('getClusterNodesCfg')
    }
    
    async save_cluster_nodes (nodes: string[]) {
        return this.call('saveClusterNodes', [new DdbVectorString(nodes)])
    }
    
    async load_nodes_config () {
        this.set({ 
            nodes_configs: strs_2_nodes_config(
                (await this.call('loadClusterNodesConfigs')).value as string[]
            ) 
        })
    }
    
    
    async change_nodes_config (configs: Array<[string, NodesConfig]>) {
        configs.forEach(([key, value]) => {
            this.nodes_configs.set(key, { ...value, category: get_category(value.name) })
        }) 
    
        await this.save_nodes_config()
    }
    
    
    async delete_nodes_config (configs: Array<string>) {
        configs.forEach(config => {
            this.nodes_configs.delete(config)
        })
        await this.save_nodes_config()
    }
    
    
    async save_nodes_config () {
        const new_nodes_configs = new Map<string, NodesConfig>()
        await this.call(
            'saveClusterNodesConfigs', 
            [new DdbVectorString(Array.from(this.nodes_configs).map(([key, config]) => {
                new_nodes_configs.set(key, config)
                const { value } = config
                return `${key}=${value}`
            }))]
        )
        this.set({ nodes_configs: new_nodes_configs })
    }
    
    
    async call (name: string, args?: (string | boolean | DdbObj<DdbValue>)[], options?) {
        return model.ddb.call(name, args || [ ], options || { ... model.node_type === NodeType.controller || model.node_type === NodeType.single ? { } : { node: model.controller_alias, func_type: DdbFunctionType.SystemFunc } })
    }
}

export let config = new ConfigModel()
