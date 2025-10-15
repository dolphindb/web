import { t } from '@i18n'

import { node_configs } from './model.ts'

import { type NodeType, type ControllerConfig, type ClusterNode } from './type.js'

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
        const [rest, mode, group = '', zone = ''] = str.split(',')
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


export function get_category (name: string) {
    for (let category_name in node_configs)
        if (node_configs[category_name].includes(name))
            return category_name
    
    return t('其它')
}

export const filter_config = (input: string, option?: { label: string, options: any }) =>
    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
