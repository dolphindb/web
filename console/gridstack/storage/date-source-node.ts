type ExtractTypes<T> = T extends { [key: string]: infer U } ? U : never

export type dataSourceNodeType = {
    auto_refresh?: boolean
    code?: string
    data?: { name: string, data: Array<string> }[]
    error_message?: string
    id: string
    interval?: number
    max_line?: number
    mode: string
    name: string
}

export type dataSourceNodePropertyType = ExtractTypes<dataSourceNodeType>

export const find_data_source_node_index = (key: string) =>
    data_source_nodes.findIndex(data_source_node => data_source_node.id === key) 


export const save_data_source_node = ( new_data_source_node: dataSourceNodeType) => {
    data_source_nodes[find_data_source_node_index(new_data_source_node.id)] = { ...new_data_source_node }
}

export const delete_data_source_node = (key: string) => {
    const delete_index = find_data_source_node_index(key)
    data_source_nodes.splice(delete_index, 1)
    return delete_index
}

export const create_data_source_node = () => {
    const id = String(Date.now())
    const name = `节点${id}`
    data_source_nodes.unshift({
        id,
        name,
        mode: 'sql',
        interval: 1,
        max_line: 10,
        code: '',
        data: [ ]
    })
    return { id, name }
}

export const rename_data_source_node = (key: string, new_name: string) => {
    data_source_nodes[find_data_source_node_index(key)].name = new_name
}

export const name_is_exist = (new_name: string): boolean => 
    data_source_nodes.findIndex(data_source_node => data_source_node.name === new_name) !== -1

export const data_source_nodes: dataSourceNodeType[] = [
    {
        id: '1',
        name: '节点1',
        mode: 'sql',
        interval: 1,
        max_line: 10,
        code: '',
        data: [ ]
    },
    {
        id: '2',
        name: '节点2',
        mode: 'sql',
        auto_refresh: true,
        interval: 1,
        max_line: 10,
        code: '',
        data: [ ]
    },
    {
        id: '3',
        name: '节点3',
        mode: 'stream'
    },
 ]
