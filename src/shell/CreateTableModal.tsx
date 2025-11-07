import './CreateTableModal.scss'

import { default as React, useCallback, useContext, useMemo, useState, useEffect, type DependencyList } from 'react'
import NiceModal from '@ebay/nice-modal-react'
import { Button, Modal, Result, type SelectProps, Spin, Form, Input, InputNumber, Select, Table, Checkbox, Space, Row, Col } from 'antd'
import { mapKeys, isFunction } from 'lodash'

import { DdbType, type DdbObj } from 'dolphindb/browser.js'

import { use_rerender } from 'react-object-model/hooks.js'

import { DownOutlined, UpOutlined } from '@ant-design/icons'
 
import { t } from '@i18n'

import { type DDBColumnTypeNames } from '@utils'
import { CopyIconButton } from '../components/copy/CopyIconButton.js'
import { model } from '../model.js'

import { Editor } from '../components/Editor/index.js'

import { type Database } from './Databases.tsx'

// Table（维度表）不支持 partitionColumns
enum TableTypes {
    Table = 'Table',
    PartitionedTable = 'PartitionedTable',
}

enum KeepDuplicatesValues {
    ALL = 'ALL',
    LAST = 'LAST',
    FIRST = 'FIRST',
}

interface ICreateTableColumnFormValue {
    name: string
    type: DDBColumnTypeNames
    scale?: number
    comment: string
    compress: string
    arrayVector?: boolean
}

interface CreateTableFormValues {
    readonly dbPath: string
    type: TableTypes
    tableName: string
    columns: ICreateTableColumnFormValue[]
    partitionColumns?: string[]
    sortColumns?: string[]
    keepDuplicates: KeepDuplicatesValues
}

enum CreateTableStepsEnum {
    FillForm = 'fill-form',
    PreviewCode = 'preview-code',
    ExecuteResult = 'execute-result',
}

const PropsContext = React.createContext({ } as Props)

const StepsContext = React.createContext({ } as ReturnType<typeof useSteps>)

const escapeColumnName = (name: string) => `_${JSON.stringify(name)}`

// ================ 建表代码预览 ================

function CreateTableModalPreviewCode () {
    const steps = useContext(StepsContext)
    const { schema } = useContext(PropsContext)
    
    // 1.30 没有 engineType
    const engineType = schema.engineType?.value as string
    const isTSDB = engineType === 'TSDB'
    
    const code = useMemo(() => {
        const form_values: CreateTableFormValues =
            steps.context_map[CreateTableStepsEnum.FillForm]
            
        const columns = form_values.columns
            .map(column => {
                const str = `${column.name} ${generateDDBDataTypeLiteral(column)}`
                const comment = column.comment ? `comment=${JSON.stringify(column.comment)}` : ''
                const compress = column.compress ? `compress="${column.compress}"` : ''
                const options = [comment, compress].filter(Boolean).join(', ')
                return str + (options ? `[${options}]` : '')
            })
            // indent and comma join
            .map(line => `    ${line}`)
            .join(',\n')
            
        const partition = (form_values.type === TableTypes.PartitionedTable && form_values.partitionColumns?.length) ?
            `partitioned by ${form_values.partitionColumns.map(escapeColumnName).join(', ')}`
            : null
        const sorts = isTSDB && form_values.sortColumns?.length ?
            `sortColumns=[${form_values.sortColumns.map(column => `"${column}"`).join(', ')}]`
            : null
        const keepDuplicates = isTSDB && form_values.keepDuplicates ?
            `keepDuplicates=${form_values.keepDuplicates}`
            : null
            
        const generatedCode =
            `create table "${form_values.dbPath}"."${form_values.tableName}" (\n` +
            `${columns}\n` +
            ')\n' +
            `${[partition, sorts, keepDuplicates].filter(Boolean).join(',\n')}`
            
            
        return generatedCode
    }, [steps.context_map[CreateTableStepsEnum.FillForm], isTSDB])
    
    return <div className='create-table-preview-code'>
        <div className='create-table-preview-code-editor'>
            <Editor
                value={code}
                readonly
                options={{
                    padding: { top: 8 },
                    overviewRulerBorder: false
                }}
            />
            <CopyIconButton
                type='link'
                text={code}
                className='create-table-preview-code-copy'
            />
        </div>
        <div className='create-table-preview-code-action'>
            <Button onClick={steps.prev}>{t('上一步')}</Button>
            <Button type='primary' onClick={() => { steps.next(code) }}>
                {t('执行')}
            </Button>
        </div>
    </div>
}

// ================ 建表执行效果 ================

function CreateTableModalExecuteResult () {
    const steps = useContext(StepsContext)
    const modal = NiceModal.useModal()
    
    const { ddb } = model.use(['ddb'])
    const [loading, set_loading] = useState(false)
    const [error, set_error] = useState(null)
    
    useAsyncEffect(async () => {
        const code = steps.context_map[CreateTableStepsEnum.PreviewCode]
        set_loading(true)
        try {
            await ddb.eval(code)
        } catch (error) {
            set_error(error)
        } finally {
            set_loading(false)
        }
    }, [ ])
    
    if (loading)
        return <Result
            icon={<Spin spinning size='large' />}
            title={t('建表中...')}
        />
        
        
    if (error)
        return <Result
            status='error'
            title={t('创建失败')}
            subTitle={error.message}
            className='create-table-result__error'
            extra={[
                <Button key='prev' type='primary' onClick={steps.prev}>
                    {t('上一步')}
                </Button>,
                <Button
                    key='cancel'
                    onClick={modal.hide}
                >
                    {t('取消')}
                </Button>,
            ]}
        />
        
    return <Result
        status='success'
        title={t('创建成功')}
        extra={[
            <Button
                key='complete'
                type='primary'
                onClick={() => {
                    modal.resolve()
                    modal.hide()
                }}
            >
                {t('完成')}
            </Button>,
        ]}
    />
}

// ================ 建表表单 ================

const DDB_COLUMN_COMPRESS_METHODS_SELECT_OPTIONS: SelectProps['options'] = [
    {
        label: t('默认'),
        value: '',
    },
    {
        label: 'LZ4',
        value: 'lz4',
    },
    {
        label: 'Delta',
        value: 'delta',
    },
]

// 自定义表格组件，替代 ArrayTable
function ColumnsTable ({ value = [ ], onChange }) {
    function handleNameChange (index, name) {
        const newColumns = [...value]
        newColumns[index] = { ...newColumns[index], name }
        onChange(newColumns)
    }
    
    function handleTypeChange (index, type) {
        const newColumns = [...value]
        newColumns[index] = { ...newColumns[index], type }
        onChange(newColumns)
    }
    
    function handleScaleChange (index, scale) {
        const newColumns = [...value]
        newColumns[index] = { ...newColumns[index], scale }
        onChange(newColumns)
    }
    
    function handleCommentChange (index, comment) {
        const newColumns = [...value]
        newColumns[index] = { ...newColumns[index], comment }
        onChange(newColumns)
    }
    
    function handleCompressChange (index, compress) {
        const newColumns = [...value]
        newColumns[index] = { ...newColumns[index], compress }
        onChange(newColumns)
    }
    
    function handleArrayVectorChange (index, checked) {
        const newColumns = [...value]
        newColumns[index] = { ...newColumns[index], arrayVector: checked }
        onChange(newColumns)
    }
    
    function addColumn () {
        onChange([...value, { name: '', type: undefined, comment: '', compress: '' }])
    }
    
    function removeColumn (index) {
        const newColumns = [...value]
        newColumns.splice(index, 1)
        onChange(newColumns)
    }
    
    function moveColumn (index, direction) {
        if ((direction < 0 && index === 0) || (direction > 0 && index === value.length - 1)) 
            return
        
        
        const newColumns = [...value]
        const temp = newColumns[index]
        newColumns[index] = newColumns[index + direction]
        newColumns[index + direction] = temp
        onChange(newColumns)
    }
    
    const columns = [
        {
            title: '',
            key: 'sort',
            width: 30,
            render: (text, record, index) => <Space size='small'>
                    <Button type='text' size='small' onClick={() => { moveColumn(index, -1) }}><UpOutlined/></Button>
                    <Button type='text' size='small' onClick={() => { moveColumn(index, 1) }}><DownOutlined/></Button>
                </Space>,
        },
        {
            title: t('列名'),
            key: 'name',
            width: 100,
            render: (text, record, index) => <Input 
                    value={record.name} 
                    onChange={e => { handleNameChange(index, e.target.value) }}
                    status={value.filter(col => col.name === record.name).length > 1 && record.name ? 'error' : ''}
                />,
        },
        {
            title: t('数据类型'),
            key: 'type',
            width: 120,
            render: (text, record, index) => <Row gutter={8}>
                    <Col span={isDDBDecimalType(record.type) ? 12 : 24}>
                        <Select
                            value={record.type}
                            onChange={value => { handleTypeChange(index, value) }}
                            options={DDB_COLUMN_DATA_TYPES.map(type => ({ label: type, value: type }))}
                            showSearch
                            style={{ width: '100%' }}
                        />
                    </Col>
                    {isDDBDecimalType(record.type) && (
                        <Col span={12}>
                            <InputNumber
                                value={record.scale}
                                onChange={value => { handleScaleChange(index, value) }}
                                min={0}
                                max={isDDBDecimalType(record.type) ? getDecimalScaleRange(record.type)[1] : undefined}
                                style={{ width: '100%' }}
                            />
                        </Col>
                    )}
                    {record.type && SUPPORT_ARRAY_VECTOR_TYPES.includes(record.type) && (
                        <Col span={24}>
                            <Checkbox 
                                checked={record.arrayVector} 
                                onChange={e => { handleArrayVectorChange(index, e.target.checked) }}
                            >
                                Array Vector
                            </Checkbox>
                        </Col>
                    )}
                </Row>,
        },
        {
            title: t('备注'),
            key: 'comment',
            width: 150,
            render: (text, record, index) => <Input
                    value={record.comment}
                    onChange={e => { handleCommentChange(index, e.target.value) }}
                />,
        },
        {
            title: t('压缩算法'),
            key: 'compress',
            width: 80,
            render: (text, record, index) => <Select
                    value={record.compress || ''}
                    onChange={value => { handleCompressChange(index, value) }}
                    options={DDB_COLUMN_COMPRESS_METHODS_SELECT_OPTIONS}
                    style={{ width: '100%' }}
                />,
        },
        {
            title: t('操作'),
            key: 'operation',
            width: 80,
            render: (text, record, index) => <Button type='text' danger onClick={() => { removeColumn(index) }}>
                    {t('删除')}
                </Button>,
        },
    ]
    
    return <div>
        <Table
            dataSource={value}
            columns={columns}
            pagination={{ pageSize: 10 }}
            rowKey={(record, index) => index.toString()}
            className='create-table-form-columns-table'
        />
        <Button type='dashed' onClick={addColumn} style={{ marginTop: 16, width: '100%' }}>
            {t('添加列')}
        </Button>
    </div>
}

function CreateTableModalFillForm () {
    const steps = useContext(StepsContext)
    const { database, schema } = useContext(PropsContext)
    
    const [form] = Form.useForm()
    
    // 设置初始值
    useEffect(() => {
        const initialValues = {
            dbPath: database.path.slice(0, -1),
            type: TableTypes.PartitionedTable,
            keepDuplicates: KeepDuplicatesValues.ALL,
            ...steps.context_map[CreateTableStepsEnum.FillForm],
        }
        form.setFieldsValue(initialValues)
    }, [ ])
    const partitionList = useMemo(() => {
        const partitions: IPartition[] = [ ]
        if (Array.isArray(schema.partitionTypeName.value))
            partitions.push(...schema.partitionTypeName.value.map((typeName, index) => ({
                typeName,
                schema: schema.partitionSchema.value[index] as DdbObj,
                columnType: schema.partitionColumnType?.value?.[index],
            })))
        else
            partitions.push({
                typeName: schema.partitionTypeName.value as PartitionTypeName,
                schema: schema.partitionSchema,
                columnType: schema.partitionColumnType?.value as number,
            })
            
        return partitions
    }, [schema])
    
    const configurablePartitions = useMemo(
        // SEQ 顺序分区不配置方案，需要排除
        () => partitionList.filter(({ typeName }) => typeName !== PartitionTypeName.SEQ),
        [partitionList]
    )
    
    const engineType = schema.engineType?.value as string
    const isTSDB = engineType === 'TSDB'
    
    async function validateSortColumns (rule, value) {
        if (!value || !value.length)
            return
        
        const columns = form.getFieldValue('columns') || [ ]
        const columnsMap = mapKeys(columns, column => column.name)
        
        const unsupportSortColumns = value.filter(column => {
            const sortColumn = columnsMap[column]
            return !SUPPORT_SORT_COLUMN_TYPES.includes(sortColumn?.type)
        })
        
        if (unsupportSortColumns.length)
            return Promise.reject(t('列 {{columns}} 不支持排序', {
                columns: unsupportSortColumns.join(', '),
            }))
        
        if (value.length > 1) {
            const lastColumnName = value[value.length - 1]
            const lastColumn = columnsMap[lastColumnName]
            const indexesColumns = value.slice(0, -1)
            const unsupportIndexesColumns = indexesColumns.filter(column => [
                'TIME', 'TIMESTAMP', 'NANOTIME', 'NANOTIMESTAMP'
            ].includes(columnsMap[column]?.type))
            
            if (isDDBTemporalType(lastColumn?.type) && unsupportIndexesColumns.length) 
                return Promise.reject(t('索引列 {{columns}} 不能为 TIME, TIMESTAMP, NANOTIME, NANOTIMESTAMP 类型', {
                    columns: unsupportIndexesColumns.join(', '),
                }))
        }
    }
    
    function onFinish (values) {
        console.log('创建表:', values)
        steps.next(values)
    }
    
    const rerender = use_rerender()
    
    return <Form
            form={form}
            layout='horizontal'
            labelCol={{ span: 4 }}
            className='create-table-form'
            onFinish={onFinish}
            onValuesChange={rerender}
        >
            <Form.Item
                name='dbPath'
                label={t('数据库路径')}
                rules={[{ required: true }]}
            >
                <Input disabled />
            </Form.Item>
            
            <Form.Item
                name='type'
                label={t('表类型')}
                rules={[{ required: true }]}
            >
                <Select
                    options={[
                        { label: t('分布式表'), value: TableTypes.PartitionedTable },
                        { label: t('维度表'), value: TableTypes.Table },
                    ]}
                />
            </Form.Item>
            
            <Form.Item
                name='tableName'
                label={t('表名')}
                rules={[
                    { required: true },
                    {
                        validator: async (_, value) => {
                            if (database.children.find(child => child.name === value)) 
                                return Promise.reject(t('已存在相同名称的表'))
                            
                            return Promise.resolve()
                        },
                    },
                ]}
            >
                <Input />
            </Form.Item>
            
            <Form.Item
                name='columns'
                label={t('数据列')}
                rules={[{ required: true }]}
            >
                {/* @ts-expect-error nocheck auto onchange and value */}
                <ColumnsTable />
            </Form.Item>
            
            {form.getFieldValue('type') !== TableTypes.Table && (
                <Form.Item
                    label={t('分区列')}
                    required={configurablePartitions.length > 0}
                >
                    {configurablePartitions.length > 0 ? (
                        configurablePartitions.map((partition, index) => <Form.Item
                                key={index}
                                name={['partitionColumns', index]}
                                label={getPartitionSchemeDescription(partition)}
                                rules={[{ required: true }]}
                                labelCol={{ span: 5 }}
                                labelAlign='left'
                            >
                                <Select
                                    options={(form.getFieldValue('columns') || [ ])
                                        .filter(col => col.name)
                                        .map(column => ({ label: column.name, value: column.name }))}
                                />
                            </Form.Item>)
                    ) : (
                        <p className='no-partition-scheme'>{t('该数据库没有需要配置的分区列')}</p>
                    )}
                </Form.Item>
            )}
            
            {isTSDB && (
                <>
                    <Form.Item
                        name='sortColumns'
                        label={t('排序列')}
                        rules={[{ validator: validateSortColumns }]}
                    >
                        <Select
                            mode='multiple'
                            options={(form.getFieldValue('columns') || [ ])
                                .filter(col => col.name)
                                .map(column => ({ label: column.name, value: column.name }))}
                        />
                    </Form.Item> 
                    
                    <Form.Item
                        name='keepDuplicates'
                        label={t('重复值处理方式')}
                        rules={[{ required: true }]}
                    >
                        <Select
                            options={[
                                { label: t('保留全部'), value: KeepDuplicatesValues.ALL },
                                { label: t('保留最后一项'), value: KeepDuplicatesValues.LAST },
                                { label: t('保留第一项'), value: KeepDuplicatesValues.FIRST },
                            ]}
                        />
                    </Form.Item>
                </>
            )}
            
            <div style={{ textAlign: 'right' }}>
                <Button type='primary' htmlType='submit'>
                    {t('下一步')}
                </Button>
            </div>
        </Form>
}

// ================ 建表弹框 ================

const CreateTableSteps = [
    CreateTableStepsEnum.FillForm,
    CreateTableStepsEnum.PreviewCode,
    CreateTableStepsEnum.ExecuteResult,
]

interface Props {
    database: Database
    schema: Record<string, DdbObj>
}

export const CreateTableModal = NiceModal.create<Props>(props => {
    const modal = NiceModal.useModal()
    
    const steps = useSteps<CreateTableStepsEnum>(
        CreateTableStepsEnum.FillForm,
        CreateTableSteps
    )
    
    return <Modal
        width={1000}
        open={modal.visible}
        onCancel={modal.hide}
        maskClosable={false}
        title={t('创建数据表')}
        afterClose={modal.remove}
        footer={null}
    >
        <PropsContext.Provider value={props}>
            <StepsContext.Provider value={steps}>
                {steps.current === CreateTableStepsEnum.FillForm && (
                    <CreateTableModalFillForm />
                )}
                {steps.current === CreateTableStepsEnum.PreviewCode && (
                    <CreateTableModalPreviewCode />
                )}
                {steps.current === CreateTableStepsEnum.ExecuteResult && (
                    <CreateTableModalExecuteResult />
                )}
            </StepsContext.Provider>
        </PropsContext.Provider>
    </Modal>
})


/** 支持排序的列类型 */
export const SUPPORT_SORT_COLUMN_TYPES: DDBColumnTypeNames[] = [
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
    'STRING',
    'SYMBOL',
    
    'DECIMAL32',
    'DECIMAL64',
    'DECIMAL128',
]


enum PartitionTypeName {
    SEQ = 'SEQ',
    RANGE = 'RANGE',
    HASH = 'HASH',
    VALUE = 'VALUE',
    LIST = 'LIST',
    COMPO = 'COMPO'
}


function isDDBTemporalType (type: DDBColumnTypeNames) {
    return [
        'DATE',
        'MONTH',
        'TIME',
        'MINUTE',
        'SECOND',
        'DATETIME',
        'TIMESTAMP',
        'NANOTIME',
        'NANOTIMESTAMP'
    ].includes(type)
}


function isAsyncGenerator (
    val: AsyncGenerator<void, void, void> | Promise<void>
): val is AsyncGenerator<void, void, void> {
    return isFunction(val[Symbol.asyncIterator])
}

/** 支持异步函数的 `useEffect`，文档参考：
    https://ahooks.gitee.io/zh-CN/hooks/use-async-effect
    @param effect 
    @param deps  */
function useAsyncEffect (
    effect: () => AsyncGenerator<void, void, void> | Promise<void>,
    deps?: DependencyList
) {
    useEffect(() => {
        const e = effect()
        let cancelled = false
        async function execute () {
            if (isAsyncGenerator(e))
                while (true) {
                    const result = await e.next()
                    if (result.done || cancelled)
                        break
                }
            else
                await e
        }
        execute()
        return () => {
            cancelled = true
        }
    }, deps)
}


function useSteps <StepsEnum extends string> (
    initial_step: StepsEnum,
    steps: StepsEnum[]
) {
    const [current, set_current] = useState<StepsEnum>(initial_step)
    
    const [context_map, set_context_map] = useState<
        Partial<Record<StepsEnum, any>>
    >({ })
    
    function prev () {
        const current_index = steps.indexOf(current)
        if (current_index <= 0)
            return
            
        const step = steps[current_index - 1]
        set_context_map({
            ...context_map,
            // delete current step context value
            [current]: undefined,
        })
        set_current(step)
    }
    
    function next (context_value: any) {
        const currentIndex = steps.indexOf(current)
        if (currentIndex >= steps.length - 1)
            return
            
        set_context_map({
            ...context_map,
            [current]: context_value,
        })
        set_current(steps[currentIndex + 1])
    }
    
    function reset () {
        set_current(initial_step)
        set_context_map({ })
    }
    
    return {
        current,
        context_map,
        prev,
        next,
        reset,
    }
}

function getPartitionSchemeDescription ({ schema, typeName, columnType }: IPartition) {
    let schemaType = ''
    
    if (columnType) 
        schemaType = DdbType[columnType].toUpperCase()
    else 
        switch (typeName) {
            case PartitionTypeName.LIST:
                // 列表分区参数是 any vector，为了获取正确的数据类型（类型是唯一的），需要多取一层
                schemaType = DdbType[schema.value[0].type].toUpperCase()
                break
            case PartitionTypeName.SEQ:
                // 顺序分区没有确定的数据类型，只取数量作为描述
                schemaType = schema.value.toString()
                break
            case PartitionTypeName.HASH:
                // FIXME: HASH 分区服务器返回有误，没有返回数据类型，只返回了分区数量，无法正确展示，待服务器修复
                schemaType = schema.value.toString()
                break
            default:
                // RANGE(TYPE), VALUE(TYPE)
                schemaType = DdbType[schema.type].toUpperCase()
                break
        }
        
    return `${typeName}(${schemaType})`
}

interface IPartition {
    typeName: PartitionTypeName
    schema: DdbObj
    /** columnType 来自 partitionColumnType 属性，仅 1.30.22, 2.00.10, 2.10.00 之后的服务器版本可以使用，
        不支持的情况下需要从 partitionSchema 中推断（HASH 分区存在数据缺失，无法推断）  */
    columnType: number
}

/** 数据表的列数据类型 */
const DDB_COLUMN_DATA_TYPES: DDBColumnTypeNames[] = [
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
    'DATEHOUR',
    'IPADDR',
    'INT128',
    'BLOB',
    'COMPLEX',
    'POINT',
    
    'DECIMAL32',
    'DECIMAL64',
    'DECIMAL128',
]

const SUPPORT_ARRAY_VECTOR_TYPES: DDBColumnTypeNames[] = [
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
    'DATEHOUR',
    'FLOAT',
    'DOUBLE',
    'IPADDR',
    'UUID',
    'INT128',
    'DECIMAL32',
    'DECIMAL64',
    'DECIMAL128',
]

function isDDBDecimalType (type: DDBColumnTypeNames) {
    return [
        'DECIMAL32',
        'DECIMAL64',
        'DECIMAL128',
    ].includes(type)
}

export function generateDDBDataTypeLiteral ({ type, scale = 0, arrayVector }: GenerateDDBDataTypeLiteralOptions) {
    let typeLiteral = isDDBDecimalType(type) ? `${type}(${scale})` : type
    
    if (arrayVector)
        typeLiteral = `${typeLiteral}[]`
    
    return typeLiteral
}

interface GenerateDDBDataTypeLiteralOptions {
    type: DDBColumnTypeNames
    scale?: number
    arrayVector?: boolean
}

function getDecimalScaleRange (decimalType: DDBColumnTypeNames) {
    switch (decimalType) {
        case 'DECIMAL32':
            return [0, 9]
        case 'DECIMAL64':
            return [0, 18]
        case 'DECIMAL128':
            return [0, 38]
        default:
            return null
    }
}

function isAvailableDecimalScale (decimalType: DDBColumnTypeNames, scale: number) {
    const range = getDecimalScaleRange(decimalType)
    
    if (range) 
        return scale >= range[0] && scale <= range[1]
    
    return false
}

const TSDB_ONLY_TYPES: DDBColumnTypeNames[] = [
    'BLOB',
]

const ADD_COLUMN_EXCLUED_TYPES: DDBColumnTypeNames[] = [
    'DATEHOUR',
]
