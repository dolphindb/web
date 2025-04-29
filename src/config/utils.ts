import { t } from '../../i18n/index.js'

import { config } from './model.ts'

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


/** 节点配置项转字符串 
    @param {ControllerConfig[] | ClusterNode[]} items - 节点配置
    @return {string[]} 转换的字符串，拼接形成的一行字符串，是以逗号分隔的节点的全部信息 */
export const _2_strs = (items: ControllerConfig[] | ClusterNode[]): string[] =>
    items.map(i => i.id)


export const strs_2_nodes = (strs: string[]): ClusterNode[] =>
    strs.map(str => {
        const [rest, mode, group, zone] = str.split(',')
        const [host, port, alias] = rest.split(':')
        return {
            id: str,
            host,
            port,
            alias,
            mode: mode as NodeType,
            computeGroup: group,
            zone
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
            left,
            {
                key: left,
                category: get_category(name),
                qualifier,
                name,
                value,
            }
        )
    })
    
    return nodes_configs
}


export function get_category (name: string) {
    let category = t('其它')
    const config_classification = config.get_config_classification()
    let clses = Object.keys(config_classification)
    for (let cls of clses)
        if (config_classification[cls].has(name))
            category = cls
    return category
}

export const filter_config = (input: string, option?: { label: string, options: any }) =>
    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
