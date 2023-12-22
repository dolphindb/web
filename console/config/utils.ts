import { type NodeType, type ControllerConfig, type ClusterNode, type NodesConfig } from './type.js'

export const strs_2_controller_configs  = (strs: string[]): ControllerConfig[] =>
    strs.map(str => {
        const [name, value] = str.split('=')
        return {
            id: str,
            name,
            value
        }
    })


export const _2_strs  = (items: ControllerConfig[] | ClusterNode[]): string[] =>
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

    
export const strs_2_nodes_config = (strs: string[]): NodesConfig[] =>
    strs.map(str => {
        const [rest, value] = str.split('=')
        const [first, second] = rest.split('.')
        return {
            id: str,
            qualifier: second ? first : '',
            name: second ? second : first,
            value
        }
    })
