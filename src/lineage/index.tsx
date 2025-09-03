import '@xyflow/react/dist/style.css'
import './index.sass'

import { useEffect } from 'react'
import { Model } from 'react-object-model'
import { useLocation } from 'react-router'
import { Empty, Tooltip, Splitter } from 'antd'
import {
    default as Icon, ApartmentOutlined, DeleteOutlined, QuestionCircleOutlined, TableOutlined,
    ThunderboltOutlined
} from '@ant-design/icons'

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
    const { tables, table, nodes, edges, list_width } = lineage.use(['tables', 'table', 'nodes', 'edges', 'list_width'])
    
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
    
    const graph_title = table ? t('流表 {{name}} 的血缘关系图', { name: table.name }) : ''
    
    return <>
        <div className='header'>
            <div className='title' style={{ width: list_width }}>{t('数据血缘')}</div>
            
            { table && <div className='graph-title'>
                <ApartmentOutlined />
                <div className='name' title={graph_title}>{graph_title}</div>
            </div> }
            
            <div className='padding' />
            
            <div className='note'><QuestionCircleOutlined /> {t('表名和引擎名称隐藏了中间的 .orca_table 和 .orca_engine')}</div>
            <RefreshButton onClick={async () => {
                const { table } = lineage
                
                await Promise.all([
                    lineage.get_tables(),
                    table && lineage.get_lineage(table)
                ])
                
                model.message.success(t('刷新成功'))
            }} />
        </div>
        
        <Splitter className='main' onResizeEnd={([list_width]) => { lineage.set({ list_width }) }}>
            <Splitter.Panel className='list' defaultSize={default_list_width} collapsible>{
                tables.length ?
                    tables.map(({ name }) =>
                        <div
                            className={`item ${name === table?.name ? 'selected' : ''}`}
                            key={name}
                            title={name}
                            onClick={() => { model.goto(`/lineage/${name}/`) }}
                        >
                            <Icon component={SvgTable} />
                            <span className='text'>{name}</span>
                        </div>)
                :
                    <Empty description={t('暂无流表')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
            }</Splitter.Panel>
            <Splitter.Panel>
                { table && <ReactFlow
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
                </ReactFlow> }
            </Splitter.Panel>
        </Splitter>
    </>
}


function MyNode ({ data: { name, engine, deleted, id } }: TMyNode) {
    return <>
        <div className='icon'>
            { engine ? <ThunderboltOutlined /> : <TableOutlined /> }
        </div>
        
        <div className='name'>
            <span title={name}>{name.truncate(46)}</span>
            { deleted && <Tooltip title={t('引擎 {{id}} 已删除', { id })}><DeleteOutlined /></Tooltip> }
        </div>
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


const default_list_width = 360


class LineageModel extends Model<LineageModel> {
    tables: TableMeta[]
    
    table: TableMeta
    
    nodes: TMyNode[] = [ ]
    
    edges: Edge[] = [ ]
    
    reactflow: ReactFlowInstance<TMyNode, Edge>
    
    list_width = default_list_width
    
    
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
        
        // console.log('图数据:', data)
        
        let g = new dagre.graphlib.Graph()
        
        g.setGraph({
            rankdir: 'TB',
            ranksep: 100, // 大幅增加排之间的距离 (从 100 增加到 250)
            nodesep: 100, // 增加同一排中节点之间的距离 (从 50 增加到 100)
            edgesep: 30 // 稍微增加边之间的最小距离 (从 20 增加到 30)
        })
        
        g.setDefaultEdgeLabel(() => ({ }))
        
        // reactflow 图的所有节点，引擎的 key 含有 graph_id，表的 key 不含
        let all_nodes = new Map<string, GraphNode>()
        
        for (const graph_id in data) {
            // parents 中需要根据 fullname 查找当前图的节点
            let graph_nodes = new Map<string, GraphNode>()
            
            const {
                fqn: graph_fullname,
                isDeleted: deleted,
                ...nodes
            } = data[graph_id]
            
            for (const fullname in nodes) {
                const engine = nodes[fullname].isEngine
                
                const id = engine ? `${fullname}.${graph_id}` : fullname
                
                const node = {
                    id,
                    fullname,
                    name: fullname.replace(engine ? '.orca_engine' : '.orca_table', ''),
                    graph_id,
                    engine,
                    ... engine ? { deleted } : { },
                }
                
                graph_nodes.set(fullname, node)
                
                if (engine || !all_nodes.has(id) /* table 的话不含 graph_id, 可能前面已经有了 */)
                    all_nodes.set(id, node)
                
                g.setNode(id, { width: 400, height: 40 })
            }
            
            for (const fullname in nodes)
                (nodes[fullname].parents as string[])
                    .forEach(parent => {
                        g.setEdge(
                            graph_nodes.get(parent).id,
                            graph_nodes.get(fullname).id)
                    })
        }
        
        dagre.layout(g)
        
        this.set({
            table,
            
            nodes: g.nodes()
                .map(id => {
                    const { x, y, width, height } = g.node(id)
                    const node = all_nodes.get(id)
                    
                    return {
                        id,
                        type: 'mynode',
                        className: `mynode ${node.engine ? 'engine' : 'table'} ${node.deleted ? 'deleted' : ''}`,
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
    id: string
    
    name: string
    
    fullname: string
    
    /** true 时为 engine, 否则是 table */
    engine: boolean
    
    graph_id: string
    
    /** engine: true 时有这个属性，标记引擎是否被删除 */
    deleted?: boolean
}

type TMyNode = Node<GraphNode>
