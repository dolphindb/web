import { Model } from 'react-object-model'

import { DdbFunctionType, type DdbObj, type DdbValue, DdbVectorString, type DdbVectorStringObj, DdbInt, type DdbCallOptions } from 'dolphindb/browser.js'

import { t } from '@i18n/index.js'

import { NodeType, model } from '../model.js'

import { type NodesConfig } from './type.js'
import { _2_strs, get_category, parse_nodes_configs } from './utils.js'

const trusies = ['1', 'true'] as const

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
    
    async add_agent_to_controller (host: string, port: number, alias: string) {
        await this.call('addAgentToController', [host, new DdbInt(port), alias])
    }
    
    
    /** load_configs 依赖 controller alias 等信息 */
    async load_configs () {
        this.set({ 
            nodes_configs: parse_nodes_configs(
                (await this.call<DdbVectorStringObj>('loadClusterNodesConfigs', undefined, { urgent: true }))
                    .value)
        })
        
        
        console.log(
            t('配置文件:'),
            Object.fromEntries(
                // @ts-ignore
                typeof Iterator !== 'undefined' && Iterator.prototype?.map
                    // @ts-ignore
                    ? this.nodes_configs.entries().map(([key, { value }]) => [key, value])
                    : [...this.nodes_configs].map(([key, { value }]) => [key, value])
            )
        )
    }
    
    
    /** 读取配置文件 key 配置项对应的值，返回字符串值或 undefined */
    get_config <TValue extends string> (key: string): TValue | undefined {
        return this.nodes_configs.get(key)?.value as TValue
    }
    
    
    get_boolean_config (key: string) {
        return trusies.includes(this.get_config(key))
    }
    
    
    set_config (key: string, value: string) {
        this.nodes_configs.set(key, {
            name: key,
            key,
            value,
            qualifier: '',
            category: get_category(key)
        })
    }
    
    
    async change_configs (configs: Array<[string, NodesConfig]>) {
        configs.forEach(([key, value]) => {
            this.nodes_configs.set(key, { ...value, category: get_category(value.name) })
        }) 
        
        await this.save_configs()
    }
    
    
    delete_config (key: string) {
        this.nodes_configs.delete(key)
    }
    
    
    async delete_configs (configs: Array<string>) {
        configs.forEach(config => {
            this.nodes_configs.delete(config)
        })
        
        await this.save_configs()
    }
    
    
    async save_configs () {
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
    
    
    async call <TResult extends DdbObj> (
        name: string, 
        args?: (string | boolean | DdbObj<DdbValue>)[], 
        options?: DdbCallOptions
    ) {
        return model.ddb.call<TResult>(
            name, 
            args,
            {
                ... model.node_type === NodeType.controller || model.node_type === NodeType.single
                    ? { }
                    : { node: model.controller_alias, func_type: DdbFunctionType.SystemFunc },
                ...options
            })
    }
}

export let config = new ConfigModel()
