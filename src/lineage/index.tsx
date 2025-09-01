import '@xyflow/react/dist/style.css'
import './index.sass'

import { useEffect } from 'react'
import { Model } from 'react-object-model'
import { useLocation } from 'react-router'

import { ReactFlow, type Edge, type Node, MarkerType, type ReactFlowInstance } from '@xyflow/react'

import { log, map_keys } from 'xshell/utils.browser.js'

import dagre from '@dagrejs/dagre'

import { t } from '@i18n'
import { model } from '@model'
import SvgTable from '@/shell/icons/table.icon.svg'
import Icon from '@ant-design/icons'


export function Lineage () {
    const { tables, table, nodes, edges } = lineage.use(['tables', 'table', 'nodes', 'edges'])
    
    // pathname 是不包含 assets_root 的
    let { pathname } = useLocation()
    
    useEffect(() => {
        lineage.get_tables()
    }, [ ])
    
    useEffect(() => {
        if (!tables?.length)
            return
        
        const table_name = pathname.strip_start('/lineage/').strip_if_end('/')
        if (!table_name)
            return
        
        const table = tables.find(({ name }) => name === table_name)
        
        if (!table) {
            model.message.warning(t('找不到流表 {{table_name}}，可能已经被删除', { table_name }))
            return
        }
        
        lineage.get_lineage(table)
    }, [tables, pathname])
    
    
    if (!tables)
        return null
    
    return <>
        <div className='header'>
            <div className='title'>{t('数据血缘')}</div>
        </div>
        <div className='main'>
            <div className='list'>{
                tables.map(table => {
                    const { name } = table
                    return <div
                        className='item'
                        key={name}
                        onClick={() => {
                            model.goto(`/lineage/${name}/`)
                        }}
                    >
                        <Icon component={SvgTable} />
                        {name}
                    </div>
                })
            }</div>
            
            { table && <div className='body'>
                <div className='title'>{table.name}</div>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    proOptions={{ hideAttribution: true }}
                    nodesDraggable={false}
                    nodesConnectable={false}
                    edgesReconnectable={false}
                    onInit={reactflow => { lineage.set({ reactflow }) }}
                />
            </div> }
        </div>
    </>
}


class LineageModel extends Model<LineageModel> {
    tables: TableMeta[]
    
    table: TableMeta
    
    nodes: Node[] = [ ]
    
    edges: Edge[] = [ ]
    
    reactflow: ReactFlowInstance<Node, Edge>
    
    
    async get_tables () {
        this.set({
            tables: log('流表列表:', 
                (await model.ddb.invoke<any[]>('getOrcaStreamTableMeta'))
                    .filter(({ fqn }) => fqn)
                    .map(o => 
                        map_keys(
                            o, 
                            undefined, 
                            ({ fqn, graph_refs }) => ({
                                name: fqn.replace('.orca_table', ''),
                                fullname: fqn,
                                graph_refs: graph_refs.split(',')
                            }))
                    ) as TableMeta[])
        })
    }
    
    
    async get_lineage (table: TableMeta) {
        const data = log('图数据:',
                JSON.parse(
                    await model.ddb.invoke<string>('getOrcaDataLineage', [table.fullname])))
        
        let g = new dagre.graphlib.Graph()
        
        g.setGraph({
            rankdir: 'TB',
            ranksep: 100, // 大幅增加排之间的距离 (从 100 增加到 250)
            nodesep: 100, // 增加同一排中节点之间的距离 (从 50 增加到 100)
            edgesep: 30 // 稍微增加边之间的最小距离 (从 20 增加到 30)
        })
        
        g.setDefaultEdgeLabel(() => ({ }))
        
        for (const graph_id in data) {
            const {
                fqn: graph_fullname,
                isDeleted: deleted,
                ...nodes
            } = data[graph_id]
            
            for (const name in nodes) {
                g.setNode(name, { width: 320, height: 40 })
                
                ;(nodes[name].parents as string[]).forEach(parent => {
                    g.setEdge(parent, name)
                })
            }
        }
        
        dagre.layout(g)
        
        this.set({
            table,
            
            nodes: g.nodes()
                .map(name => {
                    const { x, y, width, height } = g.node(name)
                    
                    
                    
                    return {
                        id: name,
                        className: '',
                        position: { x, y },
                        data: { label: name.replace('.orca_table', '').replace('.orca_engine', '') },
                        width,
                        height
                    }
                }),
            
            edges: g.edges()
                .map(({ v, w }) => {
                    return {
                        id: `${v}-${w}`,
                        source: v,
                        target: w,
                        style: {
                            stroke: '#000000'
                        },
                        markerEnd: {
                            type: MarkerType.Arrow,
                            color: '#000000',
                            width: 20,
                            height: 20
                        },
                    }
                })
        })
        
        
        setTimeout(() => {
            this.reactflow?.fitView()
        })
        
        setTimeout(() => {
            this.reactflow?.fitView()
        }, 200)
    }
}

export let lineage = new LineageModel()


interface TableMeta {
    name: string
    
    fullname: string
    
    id: string
    
    graph_refs: string[]
}
