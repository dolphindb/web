export type NodeType = 'data' | 'agent' | 'controller' | 'computing'

export type ControllerConfig = {
    id: string
    name: string
    value: string
}

export type ClusterNode = {
    id: string
    host: string
    port: string
    alias: string
    mode: NodeType
}

export type NodesConfig = {
    key: string
    category?: string
    qualifier: string
    name: string
    value: string
}
