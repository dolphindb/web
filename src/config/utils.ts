import { t } from '../../i18n/index.js'

import { CONFIG_CLASSIFICATION } from './constants.js'

import { type NodeType, type ControllerConfig, type ClusterNode, type NodesConfig } from './type.js'

export const strs_2_controller_configs = (strs: string[]): ControllerConfig[] =>
    strs.map(str => {
        const iequal = str.indexOf('=')
        const name = str.slice(0, iequal)
        const value = str.slice(iequal + 1)
        return {
            id: str,
            name,
            value
        }
    })


export const _2_strs = (items: ControllerConfig[] | ClusterNode[]): string[] =>
    items.map(i => i.id)


export const strs_2_nodes = (strs: string[]): ClusterNode[] =>
    strs.map(str => {
        const [rest, mode] = str.split(',')
        const [host, port, alias] = rest.split(':')
        return {
            id: str,
            host,
            port,
            alias,
            mode: mode as NodeType
        }
    })


export function parse_nodes_configs (strs: string[]) {
    const nodes_configs = new Map<string, NodesConfig>()
    
    strs.forEach(str => {
        const iequal = str.indexOf('=')
        const left = str.slice(0, iequal)
        const idot = left.indexOf('.')
        const qualifier = idot !== -1  ? left.slice(0, idot) : ''
        const name = left.slice(idot + 1)
        const value = str.slice(iequal + 1)
        
        nodes_configs.set(
            name,
            {
                key: name,
                category: get_category(name),
                qualifier,
                name,
                value,
            }
        )
    })
    
    console.log(t('配置:'), nodes_configs)
    
    return nodes_configs
}


export function get_category (name: string) {
    let category = t('其它')
    let clses = Object.keys(CONFIG_CLASSIFICATION)
    for (let cls of clses)
        if (CONFIG_CLASSIFICATION[cls].has(name))
            category = cls
    return category
}

export const filter_config = (input: string, option?: { label: string, options: any }) =>
    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
