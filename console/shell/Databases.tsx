import { default as React, useEffect, useRef, useState } from 'react'

import { Resizable } from 're-resizable'

import { message, Tooltip, Tree, Modal, Form, Input, Select, Button } from 'antd'
const { Option } = Select

import type { DataNode, EventDataNode } from 'antd/es/tree'

import { default as _Icon, SyncOutlined, MinusSquareOutlined, EditOutlined } from '@ant-design/icons'
const Icon: typeof _Icon.default = _Icon as any

import { assert } from 'xshell/utils.browser.js'

import {
    DdbType,
    DdbFunctionType,
    DdbInt,
    type DdbVectorStringObj,
    type DdbTableObj,
    type DdbDictObj
} from 'dolphindb/browser.js'


import { t } from '../../i18n/index.js'

import { model, NodeType } from '../model.js'
import { shell } from './model.js'


import SvgDatabase from './icons/database.icon.svg'
import SvgDatabaseGroup from './icons/database-group.icon.svg'
import SvgColumn from './icons/column.icon.svg'
import SvgAddColumn from './icons/add-column.icon.svg'
import SvgPartitions from './icons/partitions.icon.svg'
import SvgSchema from './icons/schema.icon.svg'
import SvgPartitionFile from './icons/partition-file.icon.svg'
import SvgColumnRoot from './icons/column-root.icon.svg'
import SvgPartitionDirectory from './icons/partition-directory.icon.svg'
import SvgTable from './icons/table.icon.svg'


export function Databases () {
    const { dbs } = shell.use(['dbs'])
    const { logined } = model.use(['logined'])
    
    const [db_height, set_db_height] = useState(256)
    
    const [expanded_keys, set_expanded_keys] = useState([ ])
    const [loaded_keys, set_loaded_keys] = useState([ ])
    const previous_clicked_node = useRef<DatabaseGroup | Database | Table | ColumnRoot | PartitionRoot | Column | PartitionDirectory | PartitionFile | Schema>()
    
    if (!dbs)
        return
    
    return <Resizable
        className='treeview-resizable-split1'
        enable={{
            top: false,
            right: false,
            bottom: true,
            left: false,
            topRight: false,
            bottomRight: false,
            bottomLeft: false,
            topLeft: false
        }}
        minHeight='22px'
        handleStyles={{ bottom: { height: 20, bottom: -10 } }}
        handleClasses={{ bottom: 'resizable-handle' }}
        // 这个 Resizable 包括 TitleBar 和 TreeContent, TitleBar 占 27px 高度
        defaultSize={{ height: 256 + 27, width: '100%' }}
        onResizeStop={
            (event, direction, elementRef, delta) => {
                set_db_height(db_height + delta.height)
            }
        }
    >
        <div className='panel'>
            <div className='database-panel'>
                <div className='type'>
                    {t('数据库')}
                    <span className='extra'>
                        <span onClick={async () => {
                            await shell.load_dbs()
                            set_expanded_keys([ ])
                            set_loaded_keys([ ])
                        }}>
                            <Tooltip title={t('刷新')} color='grey'>
                                <SyncOutlined />
                            </Tooltip>
                        </span>
                        <span onClick={() => { set_expanded_keys([]) }}>
                            <Tooltip title={t('全部折叠')} color='grey'>
                                <MinusSquareOutlined />
                            </Tooltip>
                        </span>
                    </span>
                </div>
                { (logined || dbs.length) ?
                    <Tree
                        className='database-tree'
                        showIcon
                        focusable={false}
                        blockNode
                        showLine
                        
                        // 启用虚拟滚动
                        height={db_height}
                        
                        treeData={dbs}
                        
                        loadedKeys={loaded_keys}
                        loadData={async (node: EventDataNode<DatabaseGroup | Database | Table | ColumnRoot | PartitionRoot | Column | PartitionDirectory | PartitionFile>) => {
                            try {
                                switch (node.type) {
                                    case 'column-root':
                                    case 'partition-root':
                                    case 'partition-directory':
                                        await node.self.load_children()
                                        
                                        shell.set({ dbs: [...dbs] })
                                        
                                        break
                                }
                            } catch (error) {
                                model.show_error({ error })
                                
                                // 这里不往上扔错误，避免 rc-tree 自动重试造成多个错误弹窗
                                // throw error
                            }
                        }}
                        onLoad={ keys => { set_loaded_keys(keys) }}
                        
                        expandedKeys={expanded_keys}
                        onExpand={ keys => { set_expanded_keys(keys) }}
                        
                        onClick={async (event, { self: node, type }: EventDataNode<DatabaseGroup | Database | Table | ColumnRoot | PartitionRoot | Column | PartitionDirectory | PartitionFile | Schema>) => {
                            const previous = previous_clicked_node.current
                            if (previous && previous.key !== node.key && previous.type === 'table')
                                previous.peeked = false
                            
                            switch (type) {
                                case 'database-group': 
                                case 'database': 
                                case 'partition-root': 
                                case 'column-root': 
                                case 'partition-directory': {
                                    // 切换展开状态
                                    let found = false
                                    let keys_ = [ ]
                                    
                                    for (const key of expanded_keys)
                                        if (key === node.key)
                                            found = true
                                        else
                                            keys_.push(key)
                                    
                                    if (!found)
                                        keys_.push(node.key)
                                    
                                    set_expanded_keys(keys_)
                                    break
                                }
                                
                                case 'partition-file':
                                case 'schema':
                                    try {
                                        await node.inspect()
                                    } catch (error) {
                                        model.show_error({ error })
                                        throw error
                                    }
                                    break
                                
                                case 'table': {
                                    // 一个 Table 有两种属性 expanded + peeked，共四种状态。以下代码完成4种状态的流转
                                    let expanded = false
                                    const  { peeked } = node
                                    let keys_ = []
                                    
                                    for (const key of expanded_keys)
                                        if (key === node.key)
                                            expanded = true
                                        else
                                            keys_.push(key)
                                    
                                    if (expanded !== peeked)
                                        keys_.push(node.key)
                                    
                                    set_expanded_keys(keys_)
                                    
                                    try {
                                        await node.inspect()
                                    } catch (error) {
                                        model.show_error({ error })
                                        throw error
                                    }
                                    
                                    node.peeked = true
                                    
                                    break
                                }
                            }
                            
                            previous_clicked_node.current = node
                        }}
                        
                        
                        // onContextMenu={event => { event.preventDefault() }}
                    />
                :
                    <div className='login-to-view'>
                        <span>{t('登录后查看')}</span>
                        <a onClick={() => model.goto_login()}>{t('去登陆')}</a>
                    </div>
                }
                <AddColumn />
                <SetColumnComment />
            </div>
        </div>
    </Resizable>
}


function AddColumn () {
    // DdbType 中对应枚举的大写，排除一些不能添加的类型
    // todo: 让邹杨测试，有没有遗漏，有没有不能加的
    const coltypes = [
        'BOOL',
        'CHAR',
        'SHORT',
        'INT',
        'LONG',
        'DATE',
        'MONTH',
        'TIME',
        'MINUTE',
        'SECOND',
        'DATETIME',
        'TIMESTAMP',
        'NANOTIME',
        'NANOTIMESTAMP',
        'FLOAT',
        'DOUBLE',
        'SYMBOL',
        'STRING',
        'UUID',
        'IPADDR',
        'INT128',
        'BLOB',
        'COMPLEX',
        'POINT',
        
        // 'DURATION',
        // decimal32, 64, 128
    ] as const
    
    const [form] = Form.useForm()
    
    let { current_node, add_column_modal_visible } = shell.use(['current_node', 'add_column_modal_visible']) as { current_node: ColumnRoot, add_column_modal_visible: boolean }
    
    if (!current_node)
        return
    
    let { table, children } = current_node
    
    return <Modal 
        className='db-modal'
        open={add_column_modal_visible} 
        onCancel={() => { shell.set({ add_column_modal_visible: false }) }} 
        title={t('添加列')}
    >
        <Form
            className='db-modal-form' 
            name='add-column' 
            labelCol={{ span: 4 }} wrapperCol={{ span: 20 }} 
            form={form}
            onFinish={
                async ({ column, type }: { column: string, type: string }) => {
                    try {
                        await shell.define_add_column()
                        // 调用该函数时，数据库路径不能以 / 结尾
                        await model.ddb.call('add_column', [
                            table.db.path.slice(0, -1),
                            table.name,
                            column,
                            new DdbInt(DdbType[type.toLocaleLowerCase()])
                        ])
                        message.success(t('添加成功'))
                        current_node.children = null
                        table.schema = null
                        await current_node.load_children()
                        shell.set({ dbs: [...shell.dbs] })
                    } catch (error) {
                        model.show_error({ error })
                        throw error
                    }
                    
                    form.resetFields()
                    shell.set({ add_column_modal_visible: false })
                }
        }>
            <Form.Item label={t('列名')} name='column' rules={[{ required: true, message: t('请输入列名') }]}>
                <Input placeholder={t('输入列名，支持包含特殊字符')} />
            </Form.Item>
            <Form.Item label={t('类型')} name='type' rules={[{ required: true, message: t('请选择该列的类型') }]}>
                <Select showSearch placeholder={t('选择类型')}>
                    { coltypes.map(v => <Option key={v}>{v}</Option>) }
                </Select>
            </Form.Item>
            <Form.Item className='db-modal-content-button-group'>
                <Button type='primary' htmlType='submit'>
                    {t('确定')}
                </Button>
                <Button htmlType='button' onClick={() => {
                    form.resetFields()
                    shell.set({ add_column_modal_visible: false })
                }}>
                    {t('取消')}
                </Button>
            </Form.Item>
        </Form>
    </Modal>
}


function SetColumnComment () {
    const { current_node, set_column_comment_modal_visible } = shell.use(['current_node', 'set_column_comment_modal_visible']) as { current_node: Column, set_column_comment_modal_visible: boolean }
    const [form] = Form.useForm()
    
    useEffect(() => {
        if (current_node?.type === 'column')
            form.setFieldsValue({ comment: current_node.comment })
    }, [current_node])
    
    if (!current_node)
        return
        
    let { name, root } = current_node
    
    return <Modal 
        className='db-modal' 
        open={set_column_comment_modal_visible} 
        onCancel={() => { shell.set({ set_column_comment_modal_visible: false }) }} 
        title={t('设置注释')}
    >
        <Form
            labelWrap
            name='edit-comment'
            onFinish={ async ({ comment }: { comment: string }) => {
                try {
                    await shell.define_set_column_comment()
                    await model.ddb.call('set_column_comment', [
                        root.table.db.path.slice(0, -1),
                        root.table.name,
                        name,
                        comment
                    ])
                    message.success(t('设置注释成功'))
                    root.children = null
                    root.table.schema = null
                    await root.load_children()
                    shell.set({ dbs: [...shell.dbs] })
                } catch (error) {
                    model.show_error({ error })
                    throw error
                }
                
                form.resetFields()
                shell.set({ set_column_comment_modal_visible: false })
            }}
            labelCol={{ span: 4 }}
            wrapperCol={{ span: 20 }}
            className='db-modal-form'
            form={form}
        >
            <Form.Item label={t('注释')} name='comment'>
                <Input />
            </Form.Item>
            <Form.Item className='db-modal-content-button-group'>
                <Button type='primary' htmlType='submit'>
                    {t('确定')}
                </Button>
                <Button htmlType='button' onClick={() => {
                    form.resetFields()
                    shell.set({ set_column_comment_modal_visible: false })
                }}>
                    {t('取消')}
                </Button>
            </Form.Item>
        </Form>
    </Modal>
}


interface ContextMenu {
    /** TreeItem key */
    key: string
    open: boolean
    command?: string
    database: string
    table?: string
    column?: string
}

interface MenuItem {
    label: string
    key: string
    open: boolean
    command: string
    icon?: React.ReactNode
}


export class DatabaseGroup implements DataNode {
    type = 'database-group' as const
    
    self: DatabaseGroup
    
    /** 一定以 . 结尾 */
    key: string
    
    title: string
    
    className = 'database-group'
    
    icon = <Icon component={SvgDatabaseGroup} />
    
    isLeaf = false as const
    
    children: (Database | DatabaseGroup)[] = []
    
    
    constructor (key: string) {
        this.self = this
        this.key = key
        this.title = key.slice('dfs://'.length, -1).split('.').at(-1)
    }
}


export class Database implements DataNode {
    type = 'database' as const
    
    self: Database
    
    key: string
    
    /** 以 dfs:// 开头，以 / 结尾 */
    path: string
    
    title: React.ReactNode
    
    className = 'db'
    
    icon = <Icon component={SvgDatabase} />
    
    isLeaf = false
    
    /** tables */
    children: Table[] = [ ]
    
    
    constructor (path: string) {
        this.self = this
        assert(path.startsWith('dfs://'), t('数据库路径应该以 dfs:// 开头'))
        this.key = this.path = path
        this.title = <span title={path.slice(0, -1)}>{path.slice('dfs://'.length, -1).split('.').at(-1)}</span>
    }
}


export class Table implements DataNode {
    type = 'table' as const
    
    self: Table
    
    /** 以 / 结尾 */
    key: string
    
    /** 以 dfs:// 开头，以 / 结尾 */
    path: string
    
    name: string
    
    title: string
    
    className = 'table'
    
    icon = <Icon component={SvgTable} />
    
    isLeaf = false
    
    peeked = false
    
    db: Database
    
    children: [Schema, ColumnRoot, PartitionRoot]
    
    obj: DdbTableObj
    
    schema: DdbDictObj<DdbVectorStringObj>
    
    
    constructor (db: Database, path: string) {
        this.self = this
        this.db = db
        this.key = this.path = path
        this.title = this.name = path.slice(db.path.length, -1)
        this.children = [new Schema(this), new ColumnRoot(this), new PartitionRoot(this)]
    }
    
    
    async inspect () {
        await shell.define_peek_table()
        let obj = await model.ddb.call(
            'peek_table',
            [this.db.path.slice(0, -1), this.name],
            model.node_type === NodeType.controller ? { node: model.datanode.name, func_type: DdbFunctionType.UserDefinedFunc } : { }
        )
        obj.name = `${this.name} (${t('前 100 行')})`
        shell.set({ result: { type: 'object', data: obj } })
    }
    
    
    async get_schema () {
        if (!this.schema) {
            await shell.define_load_schema()
            this.schema = await model.ddb.call<DdbDictObj<DdbVectorStringObj>>(
                // 这个函数在 define_load_schema 中已定义
                'load_schema',
                // 调用该函数时，数据库路径不能以 / 结尾
                [this.db.path.slice(0, -1), this.name],
                model.node_type === NodeType.controller ? { node: model.datanode.name, func_type: DdbFunctionType.UserDefinedFunc } : { }
            )
        }
        
        return this.schema
    }
}


class Schema implements DataNode {
    type = 'schema' as const
    
    self: Schema
    
    key: string
    
    title = t('结构')
    
    className = 'schema'
    
    icon = <Icon component={SvgSchema} />
    
    isLeaf = true as const
    
    table: Table
    
    
    constructor (table: Table) {
        this.self = this
        this.table = table
        this.key = `${table.key}schema`
    }
    
    
    async inspect () {
        shell.set(
            {
                result: {
                    type: 'object',
                    data: await this.table.get_schema()
                }
            }
        )
    }
}


export class Column implements DataNode {
    type = 'column' as const
    
    self: Column
    
    key: string
    
    title: React.ReactNode
    
    className = 'column'
    
    icon = <Icon component={SvgColumn} />
    
    isLeaf = true
    
    root: ColumnRoot
    
    comment: string
    
    extra: number
    
    name: string
    
    typeInt: number
    
    typeString: string
    
    
    constructor (root: ColumnRoot, { comment, extra, name, typeInt, typeString }: { comment: string, extra: number, name: string, typeInt: number, typeString: string }) {
        this.self = this
        this.root = root
        this.key = `${root.table.path}${name}`
        
        this.comment = comment
        this.extra = extra
        this.name = name
        this.typeInt = typeInt
        this.typeString = typeString
        
        this.title = <div className='column-title'>
            <div>
                <span className='column-name'>{name}</span>: {DdbType[typeInt]} {comment} 
            </div>
            <div className='edit-comment-button' onClick={ event => {
                shell.set({ current_node: this, set_column_comment_modal_visible: true })
                event.stopPropagation()
            }}
            >
                <Tooltip title={t('设置注释')} color='grey'>
                    <EditOutlined />
                </Tooltip>
            </div>
        </div>
    }
}


export class PartitionDirectory implements DataNode {
    type = 'partition-directory' as const
    
    self: PartitionDirectory
    
    key: string
    
    /** 以 dfs:// 开头，以 / 结尾，如 dfs://A.compo/pt/20170807/0_50/ */
    path: string
    
    name: string
    
    title: string
    
    className = 'partition-directory'
    
    icon = <Icon component={SvgPartitionDirectory} />
    
    isLeaf = false
    
    root: PartitionRoot
    
    parent: PartitionDirectory | PartitionRoot
    
    children?: PartitionDirectory[] | PartitionFile[]
    
    chunks?: string[]
    
    
    constructor (root: PartitionRoot, parent: PartitionDirectory | PartitionRoot, path: string) {
        this.self = this
        this.parent = parent
        this.root = root
        this.path = path
        
        // key 需要带上表路径避免重复
        const { table } = root
        this.key = table.path + path.slice(table.db.path.length)
        
        // 找到除了最后一个 / 之外的前一个斜杠的位置，开始截取
        this.title = this.name = path.slice(
            path.lastIndexOf('/', path.length - 2) + 1,
            -1
        )
    }
    
    
    async load_children () {
        if (!this.children)
            this.children = await shell.load_partitions(this.root, this)
    }
}


export class PartitionFile implements DataNode {
    type = 'partition-file' as const
    
    self: PartitionFile
    
    key: string
    
    /** 以 dfs:// 开头，不以 / 结尾，如 dfs://A.compo/pt2/20170807/0_50/3xeU */
    path: string
    
    name: string
    
    title: string
    
    className = 'partition-file'
    
    icon = <Icon component={SvgPartitionFile} />
    
    isLeaf = true
    
    root: PartitionRoot
    
    parent: PartitionDirectory | PartitionRoot
    
    /** 类似 7fd1b1bd-ebf8-f789-764d-8ad76ce38194 这样的 chunk id */
    chunk: string
    
    /** chunk 所在的集群中的节点 alias */
    site_node: string
    
    constructor (root: PartitionRoot, parent: PartitionDirectory | PartitionRoot, path: string, chunk: string, site_node: string) {
        this.self = this
        this.parent = parent
        this.root = root
        this.path = path
        
        // key 需要带上表路径避免重复
        const { table } = root
        this.key = table.path + path.slice(table.db.path.length)
        
        this.chunk = chunk
        
        // 找到最后一个 / 的位置，从后面开始截取
        this.title = this.name = t('分区数据')
        
        this.site_node = site_node
    }
    
    
    async inspect () {
        const { table } = this.root
        const { db } = table
        
        // readTabletChunk(chunkId, dbUrl, chunkPath, tableName, offset, length, [cid=-1])
        // readTabletChunk('cb0a78f4-5a44-e388-c040-9e53cbc041b7', 'dfs://SH_TSDB_entrust', '/SH_TSDB_entrust/20210104/Key0/6Ny', `entrust, 0, 50)
        // 从 site_node 对应的节点读取 chunk
        let obj = await model.ddb.call<DdbTableObj>(
            'readTabletChunk',
            [this.chunk, db.path.slice(0, -1), this.path.slice('dfs:/'.length), table.name, new DdbInt(0), new DdbInt(100)],
            this.site_node !== model.node_alias ? { node: this.site_node, func_type: DdbFunctionType.SystemFunc } : { }
        )
        
        obj.name = `${this.path.slice(db.path.length, this.path.lastIndexOf('/'))} ${t('分区的数据')} (${t('前 100 行')})`
        shell.set({ result: { type: 'object', data: obj } })
    }
}

export class ColumnRoot implements DataNode {
    type = 'column-root' as const
    
    self: ColumnRoot
    
    key: string
    
    title: React.ReactElement
    
    className = 'category'
    
    icon = <Icon component={SvgColumnRoot} />
    
    isLeaf = false
    
    table: Table
    
    obj: DdbTableObj
    
    children: Column[]
    
    
    constructor (table: Table) {
        this.self = this
        this.table = table
        this.key = `${table.path}${this.type}/`
        this.title = <div className='column-root-title'>
            {t('列')}
            <div className='add-column-button' onClick={ event => {
                shell.set({ current_node: this, add_column_modal_visible: true })
                event.stopPropagation()
            }}>
                <Tooltip title={t('添加列')} color='grey'>
                    <Icon component={SvgAddColumn} />
                </Tooltip>
            </div>
        </div>
    }
    
    
    async load_children () {
        if (!this.children) {
            const schema_coldefs = (
                await this.table.get_schema()
            ).to_dict<{ colDefs: DdbTableObj }>()
            .colDefs
            .to_rows<{ comment: string, extra: number, name: string, typeInt: number, typeString: string }>()
            
            this.children = schema_coldefs.map(col => new Column(this, col))
        }
    }
}


export class PartitionRoot implements DataNode {
    type = 'partition-root' as const
    
    self: PartitionRoot
    
    key: string
    
    path: string
    
    title = t('分区')
    
    className = 'category'
    
    icon = <Icon component={SvgPartitions} />
    
    isLeaf = false
    
    table: Table
    
    root: PartitionRoot
    
    children: PartitionDirectory[]
    
    
    constructor (table: Table) {
        this.self = this
        this.root = this
        this.table = table
        this.key = `${table.path}${this.type}/`
        this.path = table.db.path
    }
    
    
    async load_children () {
        if (!this.children)
            this.children = (await shell.load_partitions(this, this)) as PartitionDirectory[]
    }
}
