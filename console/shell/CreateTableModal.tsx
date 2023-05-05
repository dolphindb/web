import React, {
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react'
import NiceModal from '@ebay/nice-modal-react'
import { Button, Modal, Result, SelectProps, Spin } from 'antd'
import { createForm, Field } from '@formily/core'
import { createSchemaField } from '@formily/react'
import {
    Form,
    FormItem,
    Input,
    Select,
    ArrayTable,
    FormButtonGroup,
    PreviewText,
    Submit,
} from '@formily/antd-v5'

import { t } from '../../i18n/index.js'
import { type Database } from './Databases.js'
import { DDB_COLUMN_DATA_TYPES_SELECT_OPTIONS } from '../constants/column-data-types.js'
import { Editor } from '../components/editor/index.js'
import { CopyIconButton } from '../components/copy/CopyIconButton.js'
import { model } from '../model.js'

import './CreateTableModal.scss'

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

interface CreateTableFormValues {
    readonly dbPath: string
    tableType: TableTypes
    tableName: string
    columns: Array<{
        name: string
        type: string
        comment: string
        compress: string
    }>
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

function useSteps (
    initialStep: CreateTableStepsEnum = CreateTableStepsEnum.FillForm
) {
    const [current, setCurrent] = useState(initialStep)

    const [contextMap, setContextMap] = useState<
        Partial<Record<CreateTableStepsEnum, any>>
    >({})

    const prev = () => {
        const currentIndex = CreateTableSteps.indexOf(current)
        if (currentIndex <= 0) 
            return

        const step = CreateTableSteps[currentIndex - 1]
        setContextMap({
            ...contextMap,
            // delete current step context value
            [current]: undefined,
        })
        setCurrent(step)
    }

    const next = (contextValue: any) => {
        const currentIndex = CreateTableSteps.indexOf(current)
        if (currentIndex >= CreateTableSteps.length - 1) 
            return

        const step = CreateTableSteps[currentIndex - 1]
        setContextMap({
            ...contextMap,
            [step]: contextValue,
        })
        setCurrent(CreateTableSteps[currentIndex + 1])
    }

    const reset = () => {
        setCurrent(initialStep)
        setContextMap({})
    }

    return {
        current,
        contextMap,
        prev,
        next,
        reset,
    }
}

// ================ 建表代码预览 ================

function CreateTableModalPreviewCode () {
    const steps = useContext(StepsContext)
    const database = useContext(DatabaseContext)

    const code = useMemo(
        () => 'getLicenseServerResourceInfo()',
        [steps.contextMap[CreateTableStepsEnum.FillForm]]
    )

    return (
        <div className='create-table-preview-code'>
            <Editor
                value={code}
                className='create-table-preview-code-editor'
                options={{
                    readOnly: true,
                    overviewRulerBorder: false,
                    padding: {
                        top: 8,
                    },
                }}
            />

            <CopyIconButton
                type='link'
                text={code}
                className='create-table-preview-code-copy'
            />

            <div className='create-table-preview-code-action'>
                <Button onClick={steps.prev}>{t('上一步')}</Button>
                <Button
                    type='primary'
                    onClick={() => steps.next(code)}
                >
                    {t('执行')}
                </Button>
            </div>
        </div>
    )
}

// ================ 建表执行效果 ================

function CreateTableModalExecuteResult () {
    const steps = useContext(StepsContext)
    const database = useContext(DatabaseContext)
    const modal = NiceModal.useModal()

    const { ddb } = model.use(['ddb'])
    const [loading, set_loading] = useState(false)
    const [error, set_error] = useState(null)

    useEffect(() => {
        const code = steps.contextMap[CreateTableStepsEnum.PreviewCode]
        ddb.eval(code)
            .then(result => {
                console.log('result', result)
            })
            .then(error => {
                set_error(error)
            })
            .finally(() => {
                set_loading(false)
            })
    }, [])

    if (loading)
        return (
            <Result
                icon={<Spin spinning size='large' />}
                title={t('建表中...')}
            />
        )

    if (error)
        return (
            <Result
                status='error'
                title={t('创建失败')}
                subTitle={error.message}
                extra={[
                    <Button
                        key='prev'
                        type='primary'
                        onClick={steps.prev}
                    >
                        {t('上一步')}
                    </Button>,
                    <Button key='cancel' onClick={() => {
                        modal.reject()
                        modal.hide()
                    }}>{t('取消')}</Button>,
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

const SchemaField = createSchemaField({
    components: {
        FormItem,
        Input,
        Select,
        ArrayTable,
        PreviewText,
    },
})

const DDB_COLUMN_COMPRESS_METHODS_SELECT_OPTIONS: SelectProps['options'] = [
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

    // restore form value from steps context
    const form = useMemo(
        () =>
            createForm({
                initialValues: {
                    dbPath: database.path.slice(0, -1),
                    ...steps.contextMap[CreateTableStepsEnum.FillForm],
                },
            }),
        []
    )

    const onSubmit = useCallback(async (formValues: CreateTableFormValues) => {
        steps.next(formValues)
    }, [])

    /**
     * TODO:
     * 排序列规则验证 https://www.dolphindb.cn/cn/help/200/FunctionsandCommands/FunctionReferences/c/createTable.html
     */

    return (
        <Form
            labelWrap
            labelCol={4}
            form={form}
            className='create-table-form'
            onAutoSubmit={onSubmit}
        >
            <SchemaField>
                <SchemaField.String
                    name='dbPath'
                    title={t('数据库路径')}
                    x-decorator='FormItem'
                    x-component='PreviewText'
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
                    x-validator={{
                        triggerType: 'onBlur',
                        validator (value: string, rule) {
                            return database.children.find(
                                child => child.name === value
                            )
                                ? rule.message
                                : null
                        },
                        message: t('已存在相同名称的表'),
                    }}
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
                            x-component-props={{ title: '列名', width: 120 }}
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
                                                ? ['已存在相同名称的列']
                                                : null,
                                    })
                                }}
                            />
                        </SchemaField.Void>
                        <SchemaField.Void
                            x-component='ArrayTable.Column'
                            x-component-props={{
                                title: '数据类型',
                                width: 100,
                            }}
                        >
                            <SchemaField.String
                                name='type'
                                required
                                x-decorator='FormItem'
                                x-component='Select'
                                enum={DDB_COLUMN_DATA_TYPES_SELECT_OPTIONS}
                            />
                        </SchemaField.Void>
                        <SchemaField.Void
                            x-component='ArrayTable.Column'
                            x-component-props={{ title: '备注', width: 150 }}
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
                                title: '压缩算法',
                                width: 100,
                            }}
                        >
                            <SchemaField.String
                                name='compress'
                                x-decorator='FormItem'
                                x-component='Select'
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
                        title='添加列'
                    />
                </SchemaField.Array>
                <SchemaField.Array
                    required
                    name='partitionColumns'
                    title={t('分区列')}
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
                                    value: COLUMNS_REACTION_STATE_VALUE_EXPRESSION
                                }
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
                    x-reactions={{
                        dependencies: {
                            columns: 'columns',
                        },
                        fulfill: {
                            schema: {
                                enum: COLUMNS_REACTION_FULLFILL_EXPRESSION,
                            },
                            state: {
                                value: COLUMNS_REACTION_STATE_VALUE_EXPRESSION
                            }
                        },
                    }}
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
                    x-reactions={[
                        {
                            dependencies: { type: 'type' },
                            fulfill: {
                                state: {
                                    hidden: `{{ $deps.type === "${TableTypes.Table}" }}`,
                                },
                            },
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

    const steps = useSteps()

    return (
        <Modal
            className='db-modal'
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
