import { Model } from 'react-object-model'

import { DdbFunctionType, type DdbCallOptions } from 'dolphindb/browser.js'

import { t } from '@i18n/index.ts'

import { NodeType, model } from '@/model.ts'

import { iterator_map } from '@/utils.ts'

import { _2_strs, get_category, parse_nodes_configs } from './utils.ts'

import type { NodesConfig } from './type.ts'


const trusies = ['1', 'true'] as const

class ConfigModel extends Model<ConfigModel> {
    nodes_configs: Map<string, NodesConfig>
    
    async load_controller_configs () {
        return this.invoke<string[]>('loadControllerConfigs')
    }
    
    async save_controller_configs (configs: string[]) {
        await this.invoke('saveControllerConfigs', [configs])
    }
    
    async get_cluster_nodes () {
        return this.invoke<string[]>('getClusterNodesCfg')
    }
    
    async save_cluster_nodes (nodes: string[]) {
        await this.invoke('saveClusterNodes', [nodes])
    }
    
    async add_agent_to_controller (host: string, port: number, alias: string) {
        await this.invoke('addAgentToController', [host, port, alias])
    }
    
    
    /** load_configs 依赖 controller alias 等信息 */
    async load_configs () {
        this.set({ 
            nodes_configs: parse_nodes_configs(
                await this.invoke<string[]>('loadClusterNodesConfigs', undefined, { urgent: true })
            )
        })
        
        
        console.log(
            t('配置文件:'),
            Object.fromEntries(
                iterator_map(
                    this.nodes_configs.entries(),
                    ([key, { value }]) => [key, value]
                )
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
        
        await this.invoke(
            'saveClusterNodesConfigs', 
            [[...iterator_map(
                this.nodes_configs.entries(), 
                ([key, config]) => {
                    new_nodes_configs.set(key, config)
                    const { value } = config
                    return `${key}=${value}`
                })
            ]])
            
        if (model.node_type === NodeType.controller)
            await this.invoke('reloadClusterConfig')
        
        this.set({ nodes_configs: new_nodes_configs })
    }
    
    
    async invoke <TResult> (
        name: string, 
        args?: any[], 
        options?: DdbCallOptions
    ) {
        return model.ddb.invoke<TResult>(
            name, 
            args,
            {
                ... model.node_type === NodeType.controller || model.node_type === NodeType.single
                    ? { }
                    : { node: model.controller_alias },
                ...options
            })
    }
}

export let config = new ConfigModel()
