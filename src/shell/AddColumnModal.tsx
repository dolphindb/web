import { useMemo } from 'react'

import { Button, Modal, Form, Input, Select, InputNumber, Checkbox } from 'antd'


import NiceModal from '@ebay/nice-modal-react'

import { t } from '@i18n'

import { model } from '@model'
import { type DDBColumnTypeNames } from '@utils'

import { shell } from './model.ts'
import type { ColumnRoot } from './Databases.tsx'

interface Props {
    node: ColumnRoot
}

interface IAddColumnFormValues {
    column: string
    type: DDBColumnTypeNames
    scale?: number
    arrayVector?: boolean
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

const TSDB_ONLY_TYPES: DDBColumnTypeNames[] = [
    'BLOB',
]

const ADD_COLUMN_EXCLUED_TYPES: DDBColumnTypeNames[] = [
    'DATEHOUR',
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

interface GenerateDDBDataTypeLiteralOptions {
    type: DDBColumnTypeNames
    scale?: number
    arrayVector?: boolean
}

export function generateDDBDataTypeLiteral ({ type, scale = 0, arrayVector }: GenerateDDBDataTypeLiteralOptions) {
    let typeLiteral = isDDBDecimalType(type) ? `${type}(${scale})` : type
    
    if (arrayVector)
        typeLiteral = `${typeLiteral}[]`
    
    return typeLiteral
}

export const AddColumnModal = NiceModal.create<Props>(({ node }) => {
    const modal = NiceModal.useModal()
    const [form] = Form.useForm()
    
    const engineType = node.table.db.schema.to_dict().engineType?.value as string
    const isTSDB = engineType === 'TSDB'
    const support_decimal = model.v2 || model.v3
    
    const dataTypeOptions = useMemo(() =>
        DDB_COLUMN_DATA_TYPES
            .filter(type => {
                let can_use_type = true
                
                if (!ADD_COLUMN_EXCLUED_TYPES.includes(type))
                    can_use_type &&= true
                    
                if (!isTSDB)
                    can_use_type &&= !TSDB_ONLY_TYPES.includes(type)
                    
                if (!support_decimal)
                    can_use_type &&= !isDDBDecimalType(type)
                    
                return can_use_type
            })
            .map(type => ({
                label: type,
                value: type,
            }))
        , [isTSDB, support_decimal])
        
    function onTypeChange (type: DDBColumnTypeNames) {
        
        if (!isDDBDecimalType(type))
            form.setFieldValue('scale', undefined)
            
        if (!SUPPORT_ARRAY_VECTOR_TYPES.includes(type))
            form.setFieldValue('arrayVector', false)
            
    }
    
    async function onSubmit (values: IAddColumnFormValues) {
        const { table } = node
        
        try {
            await shell.define_add_column()
            
            // 调用该函数时，数据库路径不能以 / 结尾
            await model.ddb.call('add_column', [
                table.db.path.slice(0, -1),
                table.name,
                values.column,
                generateDDBDataTypeLiteral(values)
            ])
            
            model.message.success(t('添加成功'))
            
            await table.get_schema()
            
            node.children = null
            node.load_children()
            
            shell.set({ dbs: [...shell.dbs] })
            modal.resolve()
            modal.hide()
        } catch (error) {
            console.error('Failed to add column:', error)
            model.modal.error({ title: t('添加失败'), content: error.message })
        }
    }
    
    return <Modal 
        open={modal.visible} 
        onCancel={modal.hide}
        afterClose={modal.remove}
        title={t('添加列')}
        footer={null}
    >
        <Form
            form={form}
            onFinish={onSubmit}
            labelCol={{ span: 6 }}
            wrapperCol={{ span: 18 }}
        >
            <Form.Item
                name='column'
                label={t('列名')}
                rules={[{ required: true, message: t('请输入列名') }]}
            >
                <Input placeholder={t('输入列名，支持包含特殊字符')} />
            </Form.Item>
            
            <Form.Item
                name='type'
                label={t('类型')}
                rules={[{ required: true, message: t('请选择该列的类型') }]}
            >
                <Select
                    placeholder={t('选择类型')}
                    options={dataTypeOptions}
                    showSearch
                    popupMatchSelectWidth={false}
                    onChange={onTypeChange}
                />
            </Form.Item>
            
            <Form.Item
                noStyle
                shouldUpdate={(prev, curr) => prev.type !== curr.type}
            >
                {({ getFieldValue }) => {
                    const type = getFieldValue('type')
                    if (!isDDBDecimalType(type))
                        return null
                        
                    const range = getDecimalScaleRange(type)
                    return <Form.Item
                        name='scale'
                        label={t('小数位数')}
                        rules={[
                            { required: true, message: t('请输入小数位数') },
                            {
                                validator: async (_, value) => {
                                    if (range && (value < range[0] || value > range[1]))
                                        throw new Error(t('小数位数超出限制'))
                                        
                                }
                            }
                        ]}
                    >
                        <InputNumber
                            placeholder={range ? `${range[0]}~${range[1]}` : ''}
                            min={range?.[0]}
                            max={range?.[1]}
                        />
                    </Form.Item>
                }}
            </Form.Item>
            
            <Form.Item
                noStyle
                shouldUpdate={(prev, curr) => prev.type !== curr.type}
            >
                {({ getFieldValue }) => {
                    const type = getFieldValue('type')
                    if (!isTSDB || !SUPPORT_ARRAY_VECTOR_TYPES.includes(type))
                        return null
                        
                    return <Form.Item
                        name='arrayVector'
                        label='Array Vector'
                        valuePropName='checked'
                    >
                        <Checkbox />
                    </Form.Item>
                }}
            </Form.Item>
            
            <Form.Item wrapperCol={{ offset: 6, span: 18 }}>
                <div className='add-column-form-button-group'>
                    <Button type='primary' htmlType='submit'>
                        {t('确定')}
                    </Button>
                    <Button onClick={modal.hide}>
                        {t('取消')}
                    </Button>
                </div>
            </Form.Item>
        </Form>
    </Modal>
})
