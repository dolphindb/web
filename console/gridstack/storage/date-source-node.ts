type ExtractTypes<T> = T extends { [key: string]: infer U } ? U : never

export type dataSourceNodeType = {
    id: number
    name: string
    mode: string
    code?: string
    auto_refresh?: boolean
    interval?: number
    max_line?: number
}

export type dataSourceNodePropertyType = ExtractTypes<dataSourceNodeType>

let index = 3

export const data_source_nodes: dataSourceNodeType[] = [
    {
        id: 1,
        name: '节点1',
        mode: 'sql',
        auto_refresh: false,
        interval: 1,
        max_line: 10,
        code: ''
    },
    {
        id: 2,
        name: '节点2',
        mode: 'sql',
        auto_refresh: true,
        interval: 1,
        max_line: 10,
        code: ''
    },
    {
        id: 3,
        name: '节点3',
        mode: 'stream'
    },
 ]
