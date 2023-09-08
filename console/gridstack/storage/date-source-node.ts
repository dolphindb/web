type ExtractTypes<T> = T extends { [key: string]: infer U } ? U : never

export type dataSourceNodeType = {
    auto_refresh?: boolean
    code?: string
    data?: { name: string, data: Array<string> }[]
    error_message?: string
    id: number
    interval?: number
    max_line?: number
    mode: string
    name: string
}

export type dataSourceNodePropertyType = ExtractTypes<dataSourceNodeType>

let index = 3

export const find_data_source_node_index = (key: string | number) =>
    data_source_nodes.findIndex(data_source_node => data_source_node.id === Number(key)) 


export const save_data_source_node = ( new_data_source_node: dataSourceNodeType) => {
    data_source_nodes[find_data_source_node_index(new_data_source_node.id)] = { ...new_data_source_node }
}

export const delete_data_source_node = (key: string | number) => {
    const delete_index = find_data_source_node_index(key)
    data_source_nodes.splice(delete_index, 1)
    return delete_index
}

export const create_data_source_node = () => {
    data_source_nodes.unshift({
        id: ++index,
        name: `节点${index}`,
        mode: 'sql',
        interval: 1,
        max_line: 10,
        code: '',
        data: [ ]
    })
}

export const data_source_nodes: dataSourceNodeType[] = [
    {
        id: 1,
        name: '节点1',
        mode: 'sql',
        interval: 1,
        max_line: 10,
        code: '',
        data: [ ]
    },
    {
        id: 2,
        name: '节点2',
        mode: 'sql',
        auto_refresh: true,
        interval: 1,
        max_line: 10,
        code: '',
        data: [ ]
    },
    {
        id: 3,
        name: '节点3',
        mode: 'stream'
    },
 ]
