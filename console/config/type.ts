export enum NodeType {
    data,
    agent,
    controller,
    computing,
}

export type Config = {
    id: string
    name: string
    value: string
}

export type Node = {
    id: string
    host: string
    port: string
    alias: string
    mode: NodeType
}
