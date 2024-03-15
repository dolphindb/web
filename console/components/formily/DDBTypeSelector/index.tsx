import React, { useMemo } from 'react'

import { isDDBDecimalType } from '../../../utils/ddb-data-types.js'
import { getDecimalScaleRange, isAvailableDecimalScale } from '../../../utils/decimal.js'

import { t } from '../../../../i18n/index.js'
import { type DDBColumnTypeNames, DDB_COLUMN_DATA_TYPES, SUPPORT_ARRAY_VECTOR_TYPES } from '../../../constants/column-data-types.js'

import { SchemaField } from '../SchemaField/index.js'
import { type SelectProps } from 'antd'
import { model } from '../../../model.js'

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
    
    const { is_v2, is_v3 } = model.use(['is_v2', 'is_v3'])
    
    const support_decimal = is_v2 || is_v3
    
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
