import React, { useMemo } from 'react'

import { type SelectProps } from 'antd'

import { t } from '@i18n/index.js'

import { SchemaField } from '../SchemaField/index.js'

import { type DDBColumnTypeNames } from '@/utils.ts'


import { model } from '@/model.js'

interface DDBTypeSelectorSchemaFieldsProps {
    typeField?: Partial<React.ComponentProps<(typeof SchemaField.String)>>
    scaleField?: Partial<React.ComponentProps<(typeof SchemaField.Number)>>
    isTSDBEngine?: boolean
    isAddColumn?: boolean
}

const TSDB_ONLY_TYPES: DDBColumnTypeNames[] = [
    'BLOB',
]

const ADD_COLUMN_EXCLUED_TYPES: DDBColumnTypeNames[] = [
    'DATEHOUR',
]

/** DDB 数据类型选择组件，包含了联动和校验逻辑，使用时需要在 SchemaField 上设置 scope
    @example
    ```
    <SchemaField scope={{
       ...DDBTypeSelectorSchemaFields.ScopeValues
    }}>
    ```
    @returns  */
export function DDBTypeSelectorSchemaFields (props: DDBTypeSelectorSchemaFieldsProps) {
    const { isTSDBEngine, isAddColumn, scaleField, typeField } = props
    
    const support_decimal = model.v2 || model.v3
    
    const dataTypesOptions: SelectProps['options'] = useMemo(() =>
        DDB_COLUMN_DATA_TYPES.map(type => ({
            label: type,
            value: type,
        }))
            .filter(({ value }) => {
                let can_use_type = true
                
                if (isAddColumn)
                    can_use_type &&= !ADD_COLUMN_EXCLUED_TYPES.includes(value)
                
                if (!isTSDBEngine)
                    can_use_type &&= !TSDB_ONLY_TYPES.includes(value)
                    
                if (!support_decimal)
                    can_use_type &&= !isDDBDecimalType(value)
                    
                return can_use_type
            })
        , [isTSDBEngine])
        
    return <>
        <SchemaField.String
            key='type'
            name='type'
            title={t('类型')}
            x-decorator='FormItem'
            x-component='Select'
            x-component-props={{
                placeholder: t('选择类型'),
                showSearch: true,
                popupMatchSelectWidth: false,
                ...(typeField?.['x-component-props'] ?? { })
            }}
            enum={dataTypesOptions}
            required
            x-validator={{
                required: true,
                message: t('请选择该列的类型')
            }}
            {...typeField}
        />
        <SchemaField.Number
            key='scale'
            name='scale'
            title={t('小数位数')}
            x-decorator='FormItem'
            x-component='NumberPicker'
            required
            x-validator={[{
                required: true,
                message: t('请输入小数位数')
            }, {
                validator: (value: number, rule, context, render) => {
                    const type = context.field.query('.type').value()
                    return isAvailableDecimalScale(type, value) ? null : t('小数位数超出限制')
                }
            }]}
            x-reactions={[{
                dependencies: {
                    type: '.type'
                },
                fulfill: {
                    state: {
                        visible: '{{ DDBTypeSelector.isDDBDecimalType($deps.type) }}',
                    },
                    schema: {
                        'x-component-props': {
                            placeholder: "{{ DDBTypeSelector.isDDBDecimalType($deps.type) ? DDBTypeSelector.getDecimalScaleRange($deps.type).join('~') : '' }}"
                        }
                    }
                },
            }]}
            {...scaleField}
        />
        <SchemaField.Boolean
            key='arrayVector'
            name='arrayVector'
            title='Array Vector'
            x-decorator='FormItem'
            x-component='Checkbox'
            x-reactions={[field => {
                const type = field.query('.type').value()
                field.setState({
                    visible: isTSDBEngine && SUPPORT_ARRAY_VECTOR_TYPES.includes(type)
                })
            }]}
        />
    </>
}

DDBTypeSelectorSchemaFields.ScopeValues = {
    DDBTypeSelector: {
        isDDBDecimalType,
        getDecimalScaleRange,
    }
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

