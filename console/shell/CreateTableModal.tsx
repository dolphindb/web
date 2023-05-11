import './CreateTableModal.scss'

import { default as React, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import NiceModal from '@ebay/nice-modal-react'
import { Button, Modal, Result, SelectProps, Spin, message } from 'antd'
import { createForm, Field } from '@formily/core'
import {
    Form,
    FormButtonGroup,
    Submit,
} from '@formily/antd-v5'
import { castArray, mapKeys } from 'lodash'

import { DdbType } from 'dolphindb/browser.js'
import { DdbObj } from 'dolphindb'

import { t } from '../../i18n/index.js'
import { type Database } from './Databases.js'
import {
    DDBTypeNames,
    DDB_COLUMN_DATA_TYPES_SELECT_OPTIONS,
    SUPPORT_SORT_COLUMN_TYPES,
} from '../constants/column-data-types.js'
import { CopyIconButton } from '../components/copy/CopyIconButton.js'
import { model } from '../model.js'
import { generateDDBDataTypeLiteral, isDDBDecimalType, isDDBTemporalType } from '../utils/ddb-data-types.js'
import { useSteps } from '../utils/hooks/use-steps.js'
import { useAsyncEffect } from '../utils/hooks/use-async-effect.js'
import { Editor } from './Editor/index.js'
import { DDBTypeSelectorSchemaFields, SchemaField } from '../components/formily/index.js'


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
    type: DDBTypeNames
    scale?: number
    comment: string
    compress: string
}

interface CreateTableFormValues {
    readonly dbPath: string
    tableType: TableTypes
    tableName: string
    columns: ICreateTableColumnFormValue[]
    partitionColumns: string[]
    sortColumns: string[]
    keepDuplicates: KeepDuplicatesValues
}

enum CreateTableStepsEnum {
    FillForm = 'fill-form',
    PreviewCode = 'preview-code',
    ExecuteResult = 'execute-result',
}

const DatabaseContext = React.createContext({} as Database)

const StepsContext = React.createContext({} as ReturnType<typeof useSteps>)

const escapeColumnName = (name: string) => `_${JSON.stringify(name)}`

// ================ 建表代码预览 ================

function CreateTableModalPreviewCode () {
    const steps = useContext(StepsContext)
    const database = useContext(DatabaseContext)

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

        const partition = form_values.partitionColumns?.length ?
            `partitioned by ${form_values.partitionColumns.map(escapeColumnName).join(', ')}`
            : null
        const sorts = form_values.sortColumns?.length ?
            `sortColumns=[${form_values.sortColumns.map(column => `"${column}"`).join(', ')}]`
            : null
        const keepDuplicates = form_values.keepDuplicates ?
            `keepDuplicates=${form_values.keepDuplicates}`
            : null

        const generatedCode =
            `create table "${form_values.dbPath}"."${form_values.tableName}" (\n` +
            `${columns}\n` +
            ')\n' +
            `${[partition, sorts, keepDuplicates].filter(Boolean).join(',\n')}`


        return generatedCode
    }, [steps.context_map[CreateTableStepsEnum.FillForm], database])

    return (
        <div className='create-table-preview-code'>
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
                <Button type='primary' onClick={() => steps.next(code)}>
                    {t('执行')}
                </Button>
            </div>
        </div>
    )
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
    }, [])

    if (loading)
        return <Result
            icon={<Spin spinning size='large' />}
            title={t('建表中...')}
        />
        
    
    if (error)
        return (
            <Result
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
                        onClick={() => {
                            modal.reject()
                            modal.hide()
                        }}
                    >
                        {t('取消')}
                    </Button>,
                ]}
            />
        )

    return (
        <Result
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
    )
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

const COLUMNS_REACTION_FULLFILL_EXPRESSION =
    '{{ $deps.columns?.filter(col => col.name).map(column => ({ label: column.name, value: column.name })) || []  }}'
const COLUMNS_REACTION_STATE_VALUE_EXPRESSION =
    '{{ $self.value?.filter(col => $deps.columns.some(depCol => depCol.name === col)) || []  }}'

function CreateTableModalFillForm () {
    const steps = useContext(StepsContext)
    const database = useContext(DatabaseContext)
    
    useEffect(() => {
        model.ddb.eval(`schema(database("${database.path}"))`).then(res => {
            const schema = res.to_dict()
            const partitionTypeNameList = castArray(schema.partitionTypeName.value as string | string[])
            const partitionSchemaList = castArray(schema.partitionSchema.value as number | DdbObj).map(v => v instanceof DdbObj ? DdbType[v.type].toUpperCase() : v)
            form.setFieldState('partitionInfo', {
                value: partitionTypeNameList.map((typeName, index) => 
                    `${typeName}(${partitionSchemaList[index]})`
                ).join(', ')
            })
        }).catch(() => {
            message.error(t('分区信息获取失败'))
        })
    }, [database])

    // restore form value from steps context
    const form = useMemo(
        () =>
            createForm({
                initialValues: {
                    dbPath: database.path.slice(0, -1),
                    ...steps.context_map[CreateTableStepsEnum.FillForm],
                },
            }),
        []
    )

    const onSubmit = useCallback(async (formValues: CreateTableFormValues) => {
        steps.next(formValues)
    }, [])

    return (
        <Form
            labelWrap
            labelCol={4}
            form={form}
            className='create-table-form'
            onAutoSubmit={onSubmit}
        >
            <SchemaField scope={{ ...DDBTypeSelectorSchemaFields.ScopeValues }}>
                <SchemaField.String
                    name='dbPath'
                    title={t('数据库路径')}
                    x-decorator='FormItem'
                    x-component='Input'
                    x-component-props={{
                        disabled: true,
                    }}
                />
                <SchemaField.String
                    name='partitionInfo'
                    title={t('分区规则')}
                    x-decorator='FormItem'
                    x-component='Input'
                    x-component-props={{
                        disabled: true,
                    }}
                />
                <SchemaField.String
                    required
                    name='type'
                    title={t('表类型')}
                    x-decorator='FormItem'
                    x-component='Select'
                    default={TableTypes.PartitionedTable}
                    enum={[
                        {
                            label: t('分布式表'),
                            value: TableTypes.PartitionedTable,
                        },
                        {
                            label: t('维度表'),
                            value: TableTypes.Table,
                        },
                    ]}
                />
                <SchemaField.String
                    required
                    name='tableName'
                    title={t('表名')}
                    x-decorator='FormItem'
                    x-component='Input'
                    x-validator={[
                        {
                            triggerType: 'onBlur',
                            validator (value: string, rule) {
                                return database.children.find(
                                    child => child.name === value
                                )
                                    ? rule.message
                                    : null
                            },
                            message: t('已存在相同名称的表'),
                        },
                    ]}
                />
                <SchemaField.Array
                    required
                    name='columns'
                    title={t('数据列')}
                    x-decorator='FormItem'
                    x-component='ArrayTable'
                    x-component-props={{
                        className: 'create-table-form-columns-table',
                        pagination: {
                            pageSize: 10,
                        },
                    }}
                >
                    <SchemaField.Object>
                        <SchemaField.Void
                            x-component='ArrayTable.Column'
                            x-component-props={{ width: 50, align: 'center' }}
                        >
                            <SchemaField.Void
                                x-decorator='FormItem'
                                x-component='ArrayTable.SortHandle'
                            />
                        </SchemaField.Void>
                        <SchemaField.Void
                            x-component='ArrayTable.Column'
                            x-component-props={{ title: t('列名'), width: 120 }}
                        >
                            <SchemaField.String
                                name='name'
                                required
                                x-decorator='FormItem'
                                x-component='Input'
                                x-reactions={(field: Field) => {
                                    const hasSameColumn =
                                        field
                                            .query('columns')
                                            .value()
                                            .filter(
                                                column =>
                                                    column.name === field.value
                                            ).length >= 2
                                    field.setState({
                                        selfErrors:
                                            field.value && hasSameColumn
                                                ? [t('已存在相同名称的列')]
                                                : null,
                                    })
                                }}
                            />
                        </SchemaField.Void>
                        <SchemaField.Void
                            x-component='ArrayTable.Column'
                            x-component-props={{
                                title: t('数据类型'),
                                width: 100,
                            }}
                        >
                            <SchemaField.String
                                name='type'
                                required
                                x-decorator='FormItem'
                                x-component='Select'
                                x-component-props={{
                                    showSearch: true,
                                }}
                                // 标准 SQL 语句还不支持 DECIMAL 类型，所以暂时不开放，支持后可以直接替换成下面的 DDBTypeSelectorSchemaFields
                                enum={DDB_COLUMN_DATA_TYPES_SELECT_OPTIONS.filter(item => !isDDBDecimalType(item.value as DDBTypeNames))}
                            />
                            {/* <DDBTypeSelectorSchemaFields 
                                typeField={{
                                    title: null,
                                }}
                                scaleField={{
                                    ['x-decorator-props']: {
                                        className: 'create-table-form-columns-table-scale',
                                    },
                                }}
                            /> */}
                        </SchemaField.Void>
                        <SchemaField.Void
                            x-component='ArrayTable.Column'
                            x-component-props={{ title: t('备注'), width: 150 }}
                        >
                            <SchemaField.String
                                name='comment'
                                x-decorator='FormItem'
                                x-component='Input'
                            />
                        </SchemaField.Void>
                        <SchemaField.Void
                            x-component='ArrayTable.Column'
                            x-component-props={{
                                title: t('压缩算法'),
                                width: 100,
                            }}
                        >
                            <SchemaField.String
                                name='compress'
                                x-decorator='FormItem'
                                x-component='Select'
                                default=''
                                enum={
                                    DDB_COLUMN_COMPRESS_METHODS_SELECT_OPTIONS
                                }
                            />
                        </SchemaField.Void>
                        <SchemaField.Void
                            x-component='ArrayTable.Column'
                            x-component-props={{
                                title: t('操作'),
                                dataIndex: 'operations',
                                width: 80,
                                fixed: 'right',
                            }}
                        >
                            <SchemaField.Void x-component='FormItem'>
                                <SchemaField.Void x-component='ArrayTable.Remove' />
                                <SchemaField.Void x-component='ArrayTable.MoveDown' />
                                <SchemaField.Void x-component='ArrayTable.MoveUp' />
                            </SchemaField.Void>
                        </SchemaField.Void>
                    </SchemaField.Object>
                    <SchemaField.Void
                        x-component='ArrayTable.Addition'
                        title={t('添加列')}
                    />
                </SchemaField.Array>
                <SchemaField.Array
                    // TODO: 通过 schema(database('dfs://A.compo')) 的分区类型判断分区列是否必填
                    name='partitionColumns'
                    title={t('分区列')}
                    description={t('请根据分区规则顺序选择分区列')}
                    x-decorator='FormItem'
                    x-component='Select'
                    x-component-props={{ mode: 'multiple' }}
                    x-reactions={[
                        {
                            dependencies: {
                                type: 'type',
                            },
                            fulfill: {
                                state: {
                                    hidden: `{{ $deps.type === "${TableTypes.Table}" }}`,
                                },
                            },
                        },
                        {
                            dependencies: {
                                columns: 'columns',
                            },
                            fulfill: {
                                schema: {
                                    enum: COLUMNS_REACTION_FULLFILL_EXPRESSION,
                                },
                                state: {
                                    value: COLUMNS_REACTION_STATE_VALUE_EXPRESSION,
                                },
                            },
                        },
                    ]}
                />
                <SchemaField.Array
                    name='sortColumns'
                    title={t('排序列')}
                    x-decorator='FormItem'
                    x-component='Select'
                    x-component-props={{ mode: 'multiple' }}
                    x-reactions={[
                        {
                            dependencies: {
                                columns: 'columns',
                            },
                            fulfill: {
                                schema: {
                                    enum: COLUMNS_REACTION_FULLFILL_EXPRESSION,
                                },
                                state: {
                                    value: COLUMNS_REACTION_STATE_VALUE_EXPRESSION,
                                },
                            },
                        },
                        (field: Field) => {
                            const columnsMap: Record<
                                string,
                                ICreateTableColumnFormValue
                            > = mapKeys(
                                field.query('columns').value(),
                                column => column.name
                            )
                            const sortColumns: string[] = field.value

                            const unsupportSortColumns = sortColumns.filter(
                                column => {
                                    const sortColumn = columnsMap[column]
                                    return !SUPPORT_SORT_COLUMN_TYPES.includes(
                                        sortColumn.type
                                    )
                                }
                            )

                            if (unsupportSortColumns.length) {
                                field.setState({
                                    selfErrors: [
                                        t('列 {{columns}} 不支持排序', {
                                            columns:
                                                unsupportSortColumns.join(', '),
                                        }),
                                    ],
                                })
                                return
                            }

                            if (sortColumns.length > 1) {
                                const lastColumnName =
                                    sortColumns[sortColumns.length - 1]
                                const lastColumn = columnsMap[lastColumnName]
                                const indexesColumns = sortColumns.slice(0, -1)
                                const unsupportIndexesColumns =
                                    indexesColumns.filter(column => {
                                        return [
                                            'TIME',
                                            'TIMESTAMP',
                                            'NANOTIME',
                                            'NANOTIMESTAMP',
                                        ].includes(columnsMap[column].type)
                                    })
                                if (
                                    isDDBTemporalType(lastColumn.type) &&
                                    unsupportIndexesColumns.length
                                ) {
                                    field.setState({
                                        selfErrors: [
                                            t(
                                                '索引列 {{columns}} 不能为 TIME, TIMESTAMP, NANOTIME, NANOTIMESTAMP 类型',
                                                {
                                                    columns:
                                                        unsupportIndexesColumns.join(
                                                            ', '
                                                        ),
                                                }
                                            ),
                                        ],
                                    })
                                    return
                                }
                            }

                            field.setState({
                                selfErrors: null,
                            })
                        },
                    ]}
                />
                <SchemaField.String
                    required
                    name='keepDuplicates'
                    title={t('重复值处理方式')}
                    x-decorator='FormItem'
                    x-component='Select'
                    default={KeepDuplicatesValues.ALL}
                    enum={[
                        {
                            label: t('保留全部'),
                            value: KeepDuplicatesValues.ALL,
                        },
                        {
                            label: t('保留最后一项'),
                            value: KeepDuplicatesValues.LAST,
                        },
                        {
                            label: t('保留第一项'),
                            value: KeepDuplicatesValues.FIRST,
                        },
                    ]}
                />
            </SchemaField>

            <FormButtonGroup align='right'>
                <Submit type='primary'>{t('下一步')}</Submit>
            </FormButtonGroup>
        </Form>
    )
}

// ================ 建表弹框 ================

const CreateTableSteps = [
    CreateTableStepsEnum.FillForm,
    CreateTableStepsEnum.PreviewCode,
    CreateTableStepsEnum.ExecuteResult,
]

interface Props {
    database: Database
}

export const CreateTableModal = NiceModal.create<Props>(({ database }) => {
    const modal = NiceModal.useModal()

    const steps = useSteps<CreateTableStepsEnum>(
        CreateTableStepsEnum.FillForm,
        CreateTableSteps
    )

    return (
        <Modal
            width={1000}
            open={modal.visible}
            onCancel={() => {
                modal.reject()
                modal.hide()
            }}
            maskClosable={false}
            title={t('创建数据表')}
            afterClose={modal.remove}
            footer={null}
        >
            <DatabaseContext.Provider value={database}>
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
            </DatabaseContext.Provider>
        </Modal>
    )
})
