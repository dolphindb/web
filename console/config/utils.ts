import { t } from '../../i18n/index.js'
import { CONFIG_CLASSIFICATION } from './constants.js'

import { type NodeType, type ControllerConfig, type ClusterNode, type NodesConfig } from './type.js'

export const strs_2_controller_configs = (strs: string[]): ControllerConfig[] =>
    strs.map(str => {
        const [name, value] = str.split('=')
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


export function strs_2_nodes_config(strs: string[]) {
    const nodes_configs = new Map<string, NodesConfig>()
    strs.forEach(str => {
        const [rest, value] = str.split('=')
        const [first, second] = rest.split('.')
        const qualifier = second ? first : ''
        const name = second ? second : first

        nodes_configs.set(
            rest,
            {
                key: rest,
                category: get_category(name),
                qualifier,
                name,
                value,
            }
        )
    })
    return nodes_configs
}


export function get_category(name: string) {
    let category = t('其它')
    let clses = Object.keys(CONFIG_CLASSIFICATION)
    for (let cls of clses)
        if (CONFIG_CLASSIFICATION[cls].has(name))
            category = cls
    return category
}
