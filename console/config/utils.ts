import { NodeType, type Config, type Node } from './type.js'

export const strs_2_configs  = (strs: string[]): Config[] =>
    strs.map(str => {
        const [name, value] = str.split('=')
        return {
            id: str,
            name,
            value
        }
    })


export const configs_2_strs  = (configs: Config[]): string[] =>
    configs.map(cfg => cfg.id)

    
export const nodes_2_strs = (nodes: Node[]): string[] =>
    nodes.map(node => node.id)
    

export const strs_2_nodes = (strs: string[]): Node[] =>
    strs.map(str => {
        const [rest, mode] = str.split(',')
        const [host, port, alias] = rest.split(':')
        return {
            id: str,
            host,
            port,
            alias,
            mode: NodeType[mode]
        }
    })
