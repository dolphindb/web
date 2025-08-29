import '@xyflow/react/dist/style.css'
import './index.sass'

import { useEffect } from 'react'
import { Model } from 'react-object-model'
// import { useLocation } from 'react-router'

import { log, map_keys } from 'xshell/utils.browser.js'

import dagre from '@dagrejs/dagre'

import { t } from '@i18n'
import { model } from '@model'
import SvgTable from '@/shell/icons/table.icon.svg'
import Icon from '@ant-design/icons'
import { ReactFlow, type Edge, type Node, MarkerType } from '@xyflow/react'

// todo: 保存选中的表格到 url 路径，并在刷新时自动

export function Lineage () {
    const { tables, table, nodes, edges } = lineage.use(['tables', 'table', 'nodes', 'edges'])
    
    // let { pathname } = useLocation()
    
    useEffect(() => {
        lineage.get_tables()
    }, [ ])
    
    // useEffect(() => {
    //     const table_name = pathname.strip_start('/lineage/')
    //     lineage.get_lineage(table)
    // }, [pathname])
    
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
                        onClick={async () => {
                            await lineage.get_lineage(table)
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
                    fitView
                    proOptions={{ hideAttribution: true }}
                    nodesDraggable={false}
                    nodesConnectable={false}
                    edgesReconnectable={false}
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
    }
}

export let lineage = new LineageModel()


interface TableMeta {
    name: string
    
    fullname: string
    
    id: string
    
    graph_refs: string[]
}
