import React, { useMemo } from 'react'

import { isDDBArrayVectorSupportType, isDDBDecimalType } from '../../../utils/ddb-data-types.js'
import { getDecimalScaleRange, isAvailableDecimalScale } from '../../../utils/decimal.js'

import { t } from '../../../../i18n/index.js'
import { type DDBColumnTypeNames, DDB_COLUMN_DATA_TYPES } from '../../../constants/column-data-types.js'

import { SchemaField } from '../SchemaField/index.js'
import { type SelectProps } from 'antd'

interface DDBTypeSelectorSchemaFieldsProps {
    typeField?: Partial<React.ComponentProps<(typeof SchemaField.String)>>
    scaleField?: Partial<React.ComponentProps<(typeof SchemaField.Number)>>
    isTSDBEngine?: boolean
}

const TSDB_ONLY_TYPES: DDBColumnTypeNames[] = [
    'BLOB',
    'DECIMAL32',
    'DECIMAL64',
    'DECIMAL128'
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
    const { isTSDBEngine, scaleField, typeField } = props
    
    const dataTypesOptions: SelectProps['options'] = useMemo(() =>
        DDB_COLUMN_DATA_TYPES.map(type => ({
            label: type,
            value: type,
        })).filter(({ value }) => isTSDBEngine ? true : !TSDB_ONLY_TYPES.includes(value))
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
            x-reactions={[{
                dependencies: {
                    type: '.type'
                },
                fulfill: {
                    state: {
                        visible: '{{ DDBTypeSelector.isDDBArrayVectorSupportType($deps.type) }}',
                    },
                },
            }]}
        />
    </>
}

DDBTypeSelectorSchemaFields.ScopeValues = {
    DDBTypeSelector: {
        isDDBArrayVectorSupportType,
        isDDBDecimalType,
        getDecimalScaleRange,
    }
}
