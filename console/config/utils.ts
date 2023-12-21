import { type NodeType, type Config, type ClusterNode } from './type.js'

export const strs_2_configs  = (strs: string[]): Config[] =>
    strs.map(str => {
        const [name, value] = str.split('=')
        return {
            id: str,
            name,
            value
        }
    })


export const _2_strs  = (items: Config[] | ClusterNode[]): string[] =>
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
