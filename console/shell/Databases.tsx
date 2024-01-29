import { default as React, useCallback, useEffect, useRef, useState } from 'react'

import NiceModal from '@ebay/nice-modal-react'

import { Resizable } from 're-resizable'
import cn from 'classnames'

import { Tooltip, Tree, Modal, Form, Input, Select, Button, InputNumber } from 'antd'

import type { DataNode, EventDataNode } from 'antd/es/tree'

import { default as Icon, SyncOutlined, MinusSquareOutlined, EditOutlined } from '@ant-design/icons'

import { assert, delay } from 'xshell/utils.browser.js'


import {
    DdbFunctionType,
    DdbInt,
    type DdbVectorStringObj,
    type DdbTableObj,
    type DdbDictObj
} from 'dolphindb/browser.js'


import { language, t } from '../../i18n/index.js'

import { CopyIconButton } from '../components/copy/CopyIconButton.js'

import { model, NodeType } from '../model.js'
import { shell } from './model.js'

import { Editor } from './Editor/index.js'
import { CreateTableModal } from './CreateTableModal.js'
import { AddColumnModal } from './AddColumnModal.js'
import { QueryGuideModal } from './QueryGuide/index.js'

import SvgDatabase from './icons/database.icon.svg'
import SvgCreateDatabase from './icons/create-database.icon.svg'
import SvgDatabaseGroup from './icons/database-group.icon.svg'
import SvgColumn from './icons/column.icon.svg'
import SvgAddColumn from './icons/add-column.icon.svg'
import SvgCreateTable from './icons/create-table.icon.svg'
import SvgPartitions from './icons/partitions.icon.svg'
import SvgSchema from './icons/schema.icon.svg'
import SvgPartitionFile from './icons/partition-file.icon.svg'
import SvgColumnRoot from './icons/column-root.icon.svg'
import SvgPartitionDirectory from './icons/partition-directory.icon.svg'
import SvgTable from './icons/table.icon.svg'
import SvgQueryGuide from './icons/query-guide.icon.svg'



enum TableKind {
    /** 维度表 */
    Table,
    PartitionedTable
}


export function Databases () {
    const { dbs } = shell.use(['dbs'])
    const { node, logined, node_type } = model.use(['node', 'logined', 'node_type'])
    
    const [db_height, set_db_height] = useState(256)
    
    const [expanded_keys, set_expanded_keys] = useState([ ])
    const [loaded_keys, set_loaded_keys] = useState([ ])
    const previous_clicked_node = useRef<DatabaseGroup | Database | Table | ColumnRoot | PartitionRoot | Column | PartitionDirectory | PartitionFile | Schema>()
    
    const enable_create_db = [NodeType.data, NodeType.single].includes(node_type)
    const [refresh_spin, set_refresh_spin] = useState(false)
    
    
    shell.refresh_db = useCallback(async () => {
        try {
            set_refresh_spin(true)
            const promise = delay(1000)
            await shell.load_dbs()
            set_expanded_keys([ ])
            set_loaded_keys([ ])
            await promise
        } catch (error) {
            model.show_error({ error })
            throw error
        } finally {
            set_refresh_spin(false)
        }
    }, [ ])
    
    
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
                        <span onClick={() => {
                            if (enable_create_db)
                                shell.set({ create_database_modal_visible: true })
                        }}>
                            <Tooltip title={enable_create_db ? t('创建数据库') : t('仅支持单机节点和数据节点创建数据库')} color='grey'>
                                <Icon 
                                    className={cn('create-database-icon', { disabled: !enable_create_db })}
                                    disabled={!enable_create_db}
                                    component={SvgCreateDatabase}
                                />
                            </Tooltip>
                        </span>
                        <span onClick={shell.refresh_db}>
                            <Tooltip title={t('刷新')} color='grey'>
                                <SyncOutlined spin={refresh_spin}/>
                            </Tooltip>
                        </span>
                        <span onClick={() => { set_expanded_keys([ ]) }}>
                            <Tooltip title={t('全部折叠')} color='grey'>
                                <MinusSquareOutlined />
                            </Tooltip>
                        </span>
                    </span>
                </div>
                {(logined || dbs?.length ) ?
                    (model.has_data_and_computing_nodes_alive() || node.mode === NodeType.single) ?
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
                                await model.execute(async () => {
                                    switch (node.type) {
                                        case 'column-root':
                                        case 'partition-root':
                                        case 'partition-directory':
                                        case 'table':
                                            await node.self.load_children()
                                            
                                            shell.set({ dbs: [...dbs] })
                                            
                                            break
                                    }
                                }, { throw: false })  // 这里不往上扔错误，避免 rc-tree 自动重试造成多个错误弹窗
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
                                    
                                    case 'database': {
                                        // 切换展开状态
                                        let found = false
                                        let keys_ = [ ]
                                        
                                        for (const key of expanded_keys)
                                            if (key === node.key)
                                                found = true
                                            else
                                                keys_.push(key)
                                        
                                        if (!found) {
                                            keys_.push(node.key)
                                            
                                            // 显示 schema
                                            await model.execute(async () => node.inspect())
                                        }
                                        
                                        set_expanded_keys(keys_)
                                        break
                                    }
                                    
                                    case 'partition-file':
                                    case 'schema':
                                        await model.execute(async () => node.inspect())
                                        break
                                    
                                    case 'table': {
                                        // 一个 Table 有两种属性 expanded + peeked，共四种状态。以下代码完成4种状态的流转
                                        let expanded = false
                                        const  { peeked } = node
                                        let keys_ = [ ]
                                        
                                        for (const key of expanded_keys)
                                            if (key === node.key)
                                                expanded = true
                                            else
                                                keys_.push(key)
                                        
                                        if (expanded !== peeked)
                                            keys_.push(node.key)
                                        
                                        set_expanded_keys(keys_)
                                        
                                        await model.execute(async () => node.inspect())
                                        
                                        node.peeked = true
                                        
                                        break
                                    }
                                }
                                
                                previous_clicked_node.current = node
                            }}
                            
                            
                            // onContextMenu={event => { event.preventDefault() }}
                        />
                    :
                        <div className='start-node-to-view'>
                            <span>{t('没有正在运行的数据节点和计算节点')}</span>
                            <a onClick={() => { model.set({ view: model.dev || model.cdn ? 'overview' : 'overview-old' }) } }>{t('去启动节点')}</a>
                        </div>
                :
                    <div className='login-to-view'>
                        <span>{t('登录后查看')}</span>
                        <a onClick={() => { model.goto_login() }}>{t('去登录')}</a>
                    </div>
                }
                <SetColumnComment />
                <CreateDatabase />
                <ConfirmCommand />
            </div>
        </div>
    </Resizable>
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
                await model.execute(async () => {
                    await shell.define_set_column_comment()
                    await model.ddb.call('set_column_comment', [
                        root.table.db.path.slice(0, -1),
                        root.table.name,
                        name,
                        comment
                    ])
                    model.message.success(t('设置注释成功'))
                    root.children = null
                    root.table.schema = null
                    await root.load_children()
                    shell.set({ dbs: [...shell.dbs] })
                })
                
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

function ConfirmCommand () {
    const { generated_command, confirm_command_modal_visible } = shell.use(['generated_command', 'confirm_command_modal_visible'])
    const [form] = Form.useForm()
    
    return <Modal
        className='db-modal'
        width='960px'
        open={confirm_command_modal_visible}
        onCancel={() => { shell.set({ confirm_command_modal_visible: false }) }}
        title={t('脚本预览')}
    >
        <Form
            labelWrap
            name='confirm-command'
            onFinish={async () => {
                await model.execute(async () => {
                    console.log(t('创建数据库的脚本:'))
                    console.log(generated_command)
                    await model.ddb.eval(generated_command)
                    model.message.success(t('创建数据库成功'))
                    await shell.load_dbs()
                    shell.set({ dbs: [...shell.dbs] })
                })
                
                form.resetFields()
                shell.set({ confirm_command_modal_visible: false })
            }}
            labelCol={{ span: 0 }}
            wrapperCol={{ span: 24 }}
            className='db-modal-form'
            form={form}
        >
            <Form.Item>
                <div className='confirm-command-code-editor'>
                    <Editor
                        value={generated_command}
                        readonly
                        options={{
                            padding: { top: 8 },
                            overviewRulerBorder: false,
                        }}
                    />
                    <CopyIconButton
                        type='link'
                        text={generated_command}
                        className='confirm-command-code-copy'
                    />
                </div>
            </Form.Item>
            
            <Form.Item className='db-modal-content-button-group'>
                <Button type='primary' htmlType='submit'>
                    {t('执行')}
                </Button>
                <Button htmlType='button' onClick={() => {
                    shell.set({ confirm_command_modal_visible: false, create_database_modal_visible: true })
                }}>
                    {t('上一步')}
                </Button>
                <Button htmlType='button' onClick={() => {
                    form.resetFields()
                    shell.set({ confirm_command_modal_visible: false })
                }}>
                    {t('取消')}
                </Button>
            </Form.Item>
        </Form>
    </Modal>
}


type PartitionType = 'SEQ' | 'RANGE' | 'HASH' | 'VALUE' | 'LIST'
type StorageEngine = 'OLAP' | 'TSDB'
type AtomicLevel = 'TRANS' | 'CHUNK'
type ChunkGranularity = 'TABLE' | 'DATABASE'

interface Partition {
    type: PartitionType
    scheme: string
}

interface CreateDatabaseFormInfo {
    // dbPath 无 dfs:// 前缀
    dbPath: string
    partitionCount: string
    partitions: Partition[]
    partitionLocation?: string | undefined
    storageEngine?: StorageEngine | undefined
    atomicLevel: AtomicLevel
    chunkGranularity?: ChunkGranularity | undefined
}

function CreateDatabase () {
    const { create_database_modal_visible, create_database_partition_count } = shell.use(['create_database_modal_visible', 'create_database_partition_count'])
    const { node_type, node, is_v2, is_v3 } = model.use(['node_type', 'node', 'is_v2', 'is_v3'])
    const [form] = Form.useForm()
    
    // We just assume this is always turned on in dolphindb.cfg
    const enableChunkGranularityConfig = true
    const shouldRunOnCurrNode = node_type === NodeType.data || node_type === NodeType.single
    
    let runOnNode = node.name
    // @TODO: not supported until we have support for running SQL statements inside anonymous function
    // if (!shouldRunOnCurrNode)
    //     runOnNode = datanode.name
    
    // fix forget to pass form prop warning
    // https://github.com/ant-design/ant-design/issues/21543#issuecomment-1183205379
    // 不进行清空操作，则返回上一步时保存填写内容
    // useEffect(() => {
    //     if (create_database_modal_visible)
    //         form.setFieldValue('partitions', [ ])
    // }, [create_database_modal_visible])
    
    return <Modal
        className='db-modal show-required'
        width='960px'
        open={create_database_modal_visible}
        onCancel={() => { shell.set({ create_database_modal_visible: false }) }}
        title={
            <div>
                {t('创建数据库')}
                <a 
                    className='db-modal-link' 
                    target='_blank'
                    href={language === 'zh'
                        ? 'https://docs.dolphindb.cn/zh/help/FunctionsandCommands/FunctionReferences/d/database.html'
                        : 'https://docs.dolphindb.cn/en/help200/FunctionsandCommands/FunctionReferences/d/database.html'
                    }
                >
                    {t('参考教程')}
                </a>
            </div>}
    >{
    shouldRunOnCurrNode &&
        <Form
            className='db-modal-form'
            name='create-database'
            labelWrap
            labelCol={{ span: 6 }}
            wrapperCol={{ span: 20 }}
            form={form}
            onFinish={async (table: CreateDatabaseFormInfo) => {
                // database(directory, [partitionType], [partitionScheme], [locations], [engine=’OLAP’], [atomic=’TRANS’], [chunkGranularity=’TABLE’])
                const partitionCount = Number(table.partitionCount)
                
                if (Number.isNaN(partitionCount) || partitionCount < 1 || partitionCount > 3) {
                    model.message.error(t('分区层级必须在1-3之间'))
                    return
                }
                
                let createDBScript: string
                
                /* // disabled for now. generate SQL commands instead
                if (partitionCount <= 1) {
                    // for single partition scheme, we can create database directly in one line
                    createDBScript = `database(directory="dfs://${table.dbPath}", partitionType=${table.firstPartitionType}, partitionScheme=${table.firstPartitionScheme}, `
                    
                    if (table.partitionLocation)
                        createDBScript += `locations=${table.partitionLocation}, `
                    
                    createDBScript += `engine="${table.storageEngine}", atomic="${table.atomicLevel}"`
                    
                    if (enableChunkGranularityConfig)
                        createDBScript += `, chunkGranularity="${table.chunkGranularity}"`
                    
                    createDBScript += ');'
                } else {
                    // for multiple partition scheme, we need to create multiple databases and then combine them into one,
                    // using the COMPO partition scheme
                    const scripts: string[] = []
                    
                    for (let i = 0; i < partitionCount; i++) {
                        const prefix = (['first', 'second', 'third'] as const)[i]
                        const type = table[`${prefix}PartitionType`]
                        const args = table[`${prefix}PartitionScheme`] || ''
                        
                        // we should not provide dbPath because these are all sub-databases that will be composed later
                        scripts.push(`db${i} = database(, partitionType=${type}, partitionScheme=${args});`)
                    }
                    
                    scripts[scripts.length - 1] += '\n'
                    
                    // instead, we provide dbPath here
                    let createCompoDBScript = `database(directory="dfs://${table.dbPath}", partitionType=COMPO, partitionScheme=[${
                        scripts.map((_, i) => `db${i}`).join(', ')
                    }], `
                    
                    if (table.partitionLocation)
                        createCompoDBScript += `locations=${table.partitionLocation}, `
                    
                    createCompoDBScript += `engine="${table.storageEngine}", atomic="${table.atomicLevel}"`
                    
                    if (enableChunkGranularityConfig)
                        createCompoDBScript += `, chunkGranularity="${table.chunkGranularity}"`
                    
                    createCompoDBScript += ');'
                    
                    scripts.push(createCompoDBScript)
                    
                    createDBScript = scripts.join('\n')
                }
                */
                
                // create database directory partitioned by partitionType(partitionScheme),[partitionType(partitionScheme),partitionType(partitionScheme)],
                // [engine='OLAP'], [atomic='TRANS'], [chunkGranularity='TABLE']
                
                // we can see that table.partitionLocation is not supported by the above grammar.
                
                // NOTE: `partitioned by paritionType(partitionScheme), ...paritionType(partitionScheme)` must be placed in one line, or
                // the parser will complain about syntax error.
                createDBScript = `create database "dfs://${table.dbPath}"\npartitioned by `
                
                for (let i = 0;  i < partitionCount;  i++) {
                    const { type, scheme } = table.partitions[i]
                    
                    createDBScript += `${type}(${scheme}), `
                }
                
                createDBScript += `\nengine='${table.storageEngine}',\n`
                createDBScript += `atomic='${table.atomicLevel}'`
                
                if (enableChunkGranularityConfig)
                    createDBScript += `,\nchunkGranularity='${table.chunkGranularity}'`
                
                // 等后端支持
                // if (!shouldRunOnCurrNode)
                //     createDBScript = `rpc("${runOnNode}", def () {\n\n${createDBScript}\n\n});`
                
                shell.set({
                    generated_command: createDBScript + '\n',
                    create_database_modal_visible: false,
                    confirm_command_modal_visible: true
                })
            }}
        >
            <Form.Item label={t('数据库路径 (directory)')} name='dbPath' required rules={[{
                required: true,
                validator: async (_, val: string) => {
                    if (!val)
                        throw new TypeError(t('数据库路径不能为空'))
                    
                    if (val.includes('"'))
                        throw new TypeError(t('数据库路径不能包含双引号'))
                }
            }]}>
                <Input addonBefore='dfs://' placeholder={t('请输入数据库路径')} />
            </Form.Item>
            
            <Form.Item label={t('分区层级')} name='partitionCount' required initialValue={create_database_partition_count} rules={[{
                required: true,
                validator: async (_, val: number) => {
                    if (val < 1 || val > 3)
                        throw new TypeError(t('分区层级必须在1-3之间'))
                }
            }]}>
                <InputNumber placeholder='1' onChange={(e: string) => {
                    const level = parseInt(e, 10)
                    if (level < 1 || level > 3 || !level)
                        return
                    
                    shell.set({ create_database_partition_count: level })
                    
                    if (level < 3) 
                        for (let i = level;  i < 3;  i++) 
                            form.resetFields([['partitions', i, 'type'], ['partitions', i, 'scheme']])
                }} />
            </Form.Item>
            
            {
                Array.from(new Array(create_database_partition_count), (_, i) => {
                    const i18nIndex = [t('一级'), t('二级'), t('三级')][i]
                    
                    return <div key={'create-db-' + i}>
                        <Form.Item
                            label={t('{{i18nIndex}}分区类型 (partitionType)', { i18nIndex })}
                            name={['partitions', i, 'type']}
                            required
                            rules={[{
                                required: true,
                                validator: async (_, val: PartitionType) => {
                                    if (!val)
                                        throw new TypeError(t('分区类型不能为空'))
                                }
                            }]}
                        >
                            <Select placeholder={t('请选择{{i18nIndex}}分区类型', { i18nIndex })} options={[
                                // https://www.dolphindb.cn/cn/help/FunctionsandCommands/FunctionReferences/d/database.html
                                {
                                    label: <span title={t('顺序分区。分区方案格式为：整型标量，表示分区的数量。')}>{ t('顺序分区') + ' (SEQ)' }</span>,
                                    value: 'SEQ',
                                },
                                {
                                    label: <span title={t('范围分区。分区方案格式为：向量，向量的任意两个相邻元素定义分区的范围。')}>{ t('范围分区') + ' (RANGE)' }</span>,
                                    value: 'RANGE',
                                },
                                {
                                    label: <span title={t('哈希分区。分区方案格式为：元组，第一个元素是分区列的数据类型，第二个元素是分区的数量。')}>{ t('哈希分区') + ' (HASH)' }</span>,
                                    value: 'HASH',
                                },
                                {
                                    label: <span title={t('值分区。分区方案格式为：向量，向量的每个元素定义了一个分区。')}>{ t('值分区') + ' (VALUE)' }</span>,
                                    value: 'VALUE',
                                },
                                {
                                    label: <span title={t('列表分区。分区方案格式为：嵌套向量，外层向量的每个元素定义了一个分区。')}>{ t('列表分区') + ' (LIST)' }</span>,
                                    value: 'LIST',
                                },
                            ]} />
                        </Form.Item>
                        
                        <Form.Item
                            label={t('{{i18nIndex}}分区方案 (partitionScheme)', { i18nIndex })}
                            name={['partitions', i, 'scheme']}
                            required
                            rules={[{
                                required: true,
                                message: t('分区方案不能为空')
                            }]}
                        >
                            <Input placeholder={t('请输入{{i18nIndex}}分区方案', { i18nIndex })} />
                        </Form.Item>
                    </div>
                })
            }
            
            {
            // disabled for now due to not supported by create database SQL command.
            /* <Form.Item
                label={t('分区位置')}
                name='partitionLocation'
            >
                <Input placeholder='e.g.: [`node1`node2, `node3] or [["ip1:port", "ip2:port"], "ip3:port"]' />
            </Form.Item> */
            }
            
            <Form.Item label={t('存储引擎 (engine)')} name='storageEngine' required initialValue='OLAP'>
                <Select placeholder={t('请选择存储引擎')} options={[
                    // https://www.dolphindb.cn/cn/help/FunctionsandCommands/FunctionReferences/d/database.html
                    {
                        label: <span title={t('OLAP 引擎。OLAP 数据表的每个列存储为一个文件，数据以追加的方式存储到相应的列文件中，因此，数据写入的顺序决定了它们的存储顺序。')}> OLAP </span>,
                        value: 'OLAP',
                    },
                    (is_v2 || is_v3) && {
                        label: <span title={t('TSDB 引擎。采用经典的 LSMT 模型，引入了排序列以提升在用户查询某个或少数几个设备（股票）在特定时间段数据的场景下的查询性能。')}> TSDB </span>,
                        value: 'TSDB',
                    }
                ].filter(Boolean)} />
            </Form.Item>
            
            <Form.Item label={t('写入事务原子性 (atomic)')} name='atomicLevel' required>
                <Select placeholder={t('请选择写入事务原子性')} options={[
                    // https://www.dolphindb.cn/cn/help/FunctionsandCommands/FunctionReferences/d/database.html
                    {
                        label: <span title={t('写入事务的原子性层级为事务，即一个事务写入多个分区时，若某个分区被其他写入事务锁定而出现写入冲突，则该事务的写入全部失败。因此，该设置下，不允许并发写入同一个分区。')}>{ t('事务级原子性') + ' (TRANS)' }</span>,
                        value: 'TRANS',
                    },
                    {
                        label: <span title={t('写入事务的原子性层级为分区。若一个事务写入多个分区时，某分区被其它写入事务锁定而出现冲突，系统会完成其他分区的写入，同时对之前发生冲突的分区不断尝试写入，尝试数分钟后仍冲突才放弃。此设置下，允许并发写入同一个分区，但由于不能完全保证事务的原子性，可能出现部分分区写入成功而部分分区写入失败的情况。同时由于采用了重试机制，写入速度可能较慢。')}>{ t('分区级原子性') + ' (CHUNK)' }</span>,
                        value: 'CHUNK',
                    }
                ]} />
            </Form.Item>
            
            <Form.Item label={t('分区粒度 (chunkGranularity)')} name='chunkGranularity' required>
                <Select placeholder={t('请选择分区粒度')} options={[
                    // https://www.dolphindb.cn/cn/help/FunctionsandCommands/FunctionReferences/d/database.html
                    {
                        label: <span title={t('表级分区，设置后支持同时写入同一分区的不同表。')}>{ t('表级分区') + ' (TABLE)' }</span>,
                        value: 'TABLE'
                    },
                    {
                        label: <span title={t('数据库级分区，设置后只支持同时写入不同分区。')}>{ t('数据库级分区') + ' (DATABASE)' }</span>,
                        value: 'DATABASE'
                    }
                ]} />
            </Form.Item>
            
            <Form.Item className='db-modal-content-button-group'>
                <Button type='primary' htmlType='submit'>
                    {t('预览')}
                </Button>
                <Button htmlType='button' onClick={() => {
                    form.resetFields()
                    form.setFieldValue('partitions', [ ])
                    form.setFieldValue('partitionCount', 1)
                    
                    shell.set({ create_database_partition_count: 1 })
                }}>
                    {t('清空')}
                </Button>
                <Button htmlType='button' onClick={() => {
                    shell.set({ create_database_modal_visible: false })
                }}>
                    {t('取消')}
                </Button>
            </Form.Item>
        </Form>
    }
    </Modal>
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
    
    children: (Database | DatabaseGroup)[] = [ ]
    
    
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
    
    schema: DdbDictObj<DdbVectorStringObj>
    
    
    constructor (path: string) {
        this.self = this
        assert(path.startsWith('dfs://'), t('数据库路径应该以 dfs:// 开头'))
        this.key = this.path = path
        
        // 仅单节点和数据节点可以创建表
        const enable_create_table = [NodeType.single, NodeType.data].includes(model.node_type)
        
        const onclick_create_table: React.MouseEventHandler<HTMLSpanElement> = enable_create_table ?
            async event => {
                event.stopPropagation()
                await model.execute(async () => {
                    const schema = (await this.get_schema()).to_dict()
                    await NiceModal.show(CreateTableModal, { database: this, schema })
                    await shell.load_dbs()
                    await shell.refresh_db()
                })
            }
        :
            event => {
                event.stopPropagation()
            }
        
        this.title = <div className='database-title'>
            <span title={path.slice(0, -1)}>{path.slice('dfs://'.length, -1).split('.').at(-1)}</span>
            
            <div className='database-actions'> 
                <Tooltip title={enable_create_table ? t('创建数据表') : t('仅支持单机节点和数据节点创建数据表')} color='grey' destroyTooltipOnHide>
                    <Icon 
                        disabled={!enable_create_table}
                        className={enable_create_table ? '' : 'disabled'}
                        component={SvgCreateTable}
                        onClick={onclick_create_table} 
                    />
                </Tooltip>
            </div>
        </div>
    }
    
    
    async get_schema () {
        if (!this.schema) {
            await shell.define_load_database_schema()
            this.schema = await model.ddb.call<DdbDictObj<DdbVectorStringObj>>(
                'load_database_schema',
                // 调用该函数时，数据库路径不能以 / 结尾
                [this.path.slice(0, -1)],
                model.node_type === NodeType.controller ? { node: model.datanode.name, func_type: DdbFunctionType.UserDefinedFunc } : { }
            )
        }
        
        return this.schema
    }
    
    
    async inspect () {
        shell.set(
            {
                result: {
                    type: 'object',
                    data: await this.get_schema()
                }
            }
        )
    }
}


export class Table implements DataNode {
    type = 'table' as const
    
    kind: TableKind
    
    self: Table
    
    /** 以 / 结尾 */
    key: string
    
    /** 以 dfs:// 开头，以 / 结尾 */
    path: string
    
    name: string
    
    title: React.ReactNode
    
    className = 'table'
    
    icon = <Icon component={SvgTable} />
    
    isLeaf = false
    
    peeked = false
    
    db: Database
    
    children: [Schema, ColumnRoot, PartitionRoot?]
    
    obj: DdbTableObj
    
    schema: DdbDictObj<DdbVectorStringObj>
    
    
    constructor (db: Database, path: string) {
        this.self = this
        this.db = db
        this.key = this.path = path
        this.name = path.slice(db.path.length, -1)
        
        const enable_create_query = [NodeType.computing, NodeType.single, NodeType.data].includes(model.node_type)
        
        const create_query: React.MouseEventHandler<HTMLSpanElement> = e => { 
            e.stopPropagation()
            if (enable_create_query)
                NiceModal.show(QueryGuideModal, { database: this.db.path.slice(0, -1), table: this.name })
            else
                return
        }
        this.title = <div className='table-title'>
            <span> {path.slice(db.path.length, -1)} </span>
            <div className='table-actions'>
                <Tooltip title={enable_create_query ? t('新建查询') : t('仅单机节点、数据节点和计算节点支持新建查询')} color='grey'>
                    <Icon 
                        disabled={!enable_create_query}
                        className={enable_create_query ? '' : 'disabled'}
                        component={SvgQueryGuide}
                        onClick={create_query} 
                    />
                
                </Tooltip>
            </div>
        </div>
       
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
            await shell.define_load_table_schema()
            this.schema = await model.ddb.call<DdbDictObj<DdbVectorStringObj>>(
                // 这个函数在 define_load_schema 中已定义
                'load_table_schema',
                // 调用该函数时，数据库路径不能以 / 结尾
                [this.db.path.slice(0, -1), this.name],
                model.node_type === NodeType.controller ? { node: model.datanode.name, func_type: DdbFunctionType.UserDefinedFunc } : { }
            )
        }
        return this.schema
    }
    
    
    async load_children () {
        if (!this.children && !this.kind) {
            this.kind = Number((await this.get_schema()).to_dict().partitionColumnIndex.value) < 0 ? 
                    TableKind.Table
                :
                    TableKind.PartitionedTable
            
            this.children = this.kind === TableKind.Table ?
                    [new Schema(this), new ColumnRoot(this)]
                :
                    [new Schema(this), new ColumnRoot(this), new PartitionRoot(this)]
        }
    }
}


class Schema implements DataNode {
    type = 'schema' as const
    
    self: Schema
    
    key: string
    
    title = t('结构')
    
    className = 'schema'
    
    icon = <Icon className='schema-icon-color' component={SvgSchema}/>
    
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
                <span className='column-name'>{name}</span>: {typeString.toLowerCase()} {comment} 
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
            <div className='add-column-button' onClick={async event => {
                event.stopPropagation()
                await this.table.db.get_schema()
                NiceModal.show(AddColumnModal, { node: this })
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
        if (!this.children) {
            const table_names_set = new Set(this.table.db.children.map(({ name }) => name))
            
            this.children = (
                    (await shell.load_partitions(this, this)) as PartitionDirectory[]
                ).filter(({ name }) =>
                    // 可能会误伤 __表名 这样的分区，原因是不知道表是不是维度表，只能排除所有表
                    !(name.startsWith('__') && table_names_set.has(name.slice(2)))
                )
        }
    }
}

