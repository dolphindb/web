import '@xyflow/react/dist/style.css'
import './index.sass'

import { useEffect } from 'react'
import { Model } from 'react-object-model'
import { useLocation } from 'react-router'
import Icon, { ApartmentOutlined, QuestionCircleOutlined, TableOutlined, ThunderboltOutlined } from '@ant-design/icons'

import {
    ReactFlow, type Edge, type Node, MarkerType, type ReactFlowInstance, Controls, ConnectionLineType,
    Handle, Position, type FitViewOptions,
} from '@xyflow/react'

import { log, map_keys } from 'xshell/utils.browser.js'

import dagre from '@dagrejs/dagre'

import { t } from '@i18n'
import { model } from '@model'
import { RefreshButton } from '@components/RefreshButton/index.tsx'
import SvgTable from '@/shell/icons/table.icon.svg'


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
            <div className='padding' />
            <div className='note'><QuestionCircleOutlined /> 表名和引擎名称隐藏了中间的 .orca_table 和 .orca_engine</div>
            <RefreshButton onClick={async () => {
                const { table } = lineage
                
                await Promise.all([
                    lineage.get_tables(),
                    table && lineage.get_lineage(table)
                ])
                
                model.message.success(t('刷新成功'))
            }} />
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
                <div className='title'>
                    <ApartmentOutlined />
                    <div className='name'>{t('流表 {{name}} 的血缘关系图', { name: table.name })}</div>
                </div>
                <ReactFlow
                    nodeTypes={node_types}
                    nodes={nodes}
                    edges={edges}
                    proOptions={{ hideAttribution: true }}
                    nodesDraggable={false}
                    nodesConnectable={false}
                    edgesReconnectable={false}
                    fitView
                    fitViewOptions={fit_view_options}
                    onInit={reactflow => { lineage.set({ reactflow }) }}
                    minZoom={0.1}
                    maxZoom={16}
                    connectionLineType={ConnectionLineType.Step}
                >
                    <Controls
                        showInteractive={false}
                        position='bottom-right'
                        onFitView={() => {
                            lineage.reactflow.fitView(fit_view_options)
                        }}
                    />
                </ReactFlow>
            </div> }
        </div>
    </>
}


function MyNode ({ data: { name, engine } }: TMyNode) {
    return <>
        <div className='icon'>
            { engine ? <ThunderboltOutlined /> : <TableOutlined /> }
        </div>
        
        <div className='name'><span title={name}>{name.truncate(46)}</span></div>
        <Handle type='target' position={Position.Top} />
        <Handle type='source' position={Position.Bottom} />
    </>
}


const fit_view_options: FitViewOptions<TMyNode> = {
    padding: '100px'
}


let node_types = {
    mynode: MyNode as React.FunctionComponent
}


class LineageModel extends Model<LineageModel> {
    tables: TableMeta[]
    
    table: TableMeta
    
    nodes: TMyNode[] = [ ]
    
    edges: Edge[] = [ ]
    
    reactflow: ReactFlowInstance<TMyNode, Edge>
    
    
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
        const data = JSON.parse(
            await model.ddb.invoke<string>('getOrcaDataLineage', [table.fullname]))
        
        console.log('图数据:', data)
        
        let g = new dagre.graphlib.Graph()
        
        g.setGraph({
            rankdir: 'TB',
            ranksep: 100, // 大幅增加排之间的距离 (从 100 增加到 250)
            nodesep: 100, // 增加同一排中节点之间的距离 (从 50 增加到 100)
            edgesep: 30 // 稍微增加边之间的最小距离 (从 20 增加到 30)
        })
        
        g.setDefaultEdgeLabel(() => ({ }))
        
        let map = new Map<string, GraphNode>()
        
        for (const graph_id in data) {
            const {
                fqn: graph_fullname,
                isDeleted: deleted,
                ...nodes
            } = data[graph_id]
            
            for (const fullname in nodes) {
                const { is_engine: engine, parents } = map_keys<any>(nodes[fullname])
                
                map.set(fullname, {
                    fullname,
                    name: fullname.replace(engine ? '.orca_engine' : '.orca_table', ''),
                    engine,
                    parents
                })
                
                g.setNode(fullname, { width: 400, height: 40 })
                
                parents.forEach((parent: string) => {
                    g.setEdge(parent, fullname)
                })
            }
        }
        
        dagre.layout(g)
        
        this.set({
            table,
            
            nodes: g.nodes()
                .map(fullname => {
                    const { x, y, width, height } = g.node(fullname)
                    const node = map.get(fullname)
                    
                    return {
                        id: fullname,
                        type: 'mynode',
                        className: `mynode ${node.engine ? 'engine' : 'table'}`,
                        position: { x, y },
                        data: node,
                        width,
                        height
                    }
                }),
            
            edges: g.edges()
                .map(({ v, w }) => ({
                    id: `${v}-${w}`,
                    source: v,
                    target: w,
                    type: ConnectionLineType.Step,
                    // 间隔线
                    // style: {
                    //     strokeDasharray: '10, 10'
                    // },
                    markerEnd: {
                        type: MarkerType.Arrow,
                        color: '#666666',
                        width: 40,
                        height: 40
                    }
                } satisfies Edge))
        })
        
        
        setTimeout(() => {
            this.reactflow?.fitView(fit_view_options)
        })
        
        setTimeout(() => {
            this.reactflow?.fitView(fit_view_options)
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


interface GraphNode extends Record<string, any> {
    name: string
    
    /** true 时为 engine, 否则是 table */
    engine: boolean
    
    parents: string[]
}

type TMyNode = Node<GraphNode>
