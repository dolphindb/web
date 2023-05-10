import { isDDBDecimalType } from '../../../utils/ddb-data-types.js'
import { getDecimalScaleRange, isAvailableDecimalScale } from '../../../utils/decimal.js'
import React from 'react'
import { t } from '../../../../i18n/index.js'
import { DDB_COLUMN_DATA_TYPES_SELECT_OPTIONS } from '../../../constants/column-data-types.js'
import { SchemaField } from '../SchemaField/index.js'

interface DDBTypeSelectorSchemaFieldsProps {
    typeField?: Partial<React.ComponentProps<(typeof SchemaField.String)>>
    scaleField?: Partial<React.ComponentProps<(typeof SchemaField.Number)>>
}

/**
 * DDB 数据类型选择组件，包含了联动和校验逻辑，使用时需要在 SchemaField 上设置 scope
 * @example
 * ```
 * <SchemaField scope={{
 *    ...DDBTypeSelectorSchemaFields.ScopeValues
 * }}>
 * ```
 * @returns 
 */
export function DDBTypeSelectorSchemaFields (props: DDBTypeSelectorSchemaFieldsProps) {
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
                ...(props.typeField?.['x-component-props'] ?? {})
            }}
            enum={DDB_COLUMN_DATA_TYPES_SELECT_OPTIONS}
            required
            x-validator={{
                required: true,
                message: t('请选择该列的类型')
            }}
            {...props.typeField}
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
                        visible: '{{ isDDBDecimalType($deps.type) }}',
                    },
                    schema: {
                        'x-component-props': {
                            placeholder: "{{ isDDBDecimalType($deps.type) ? getDecimalScaleRange($deps.type).join('~') : '' }}"
                        }
                    }
                },
            }]}
            {...props.scaleField}
        />
    </>
}

DDBTypeSelectorSchemaFields.ScopeValues = {
    isDDBDecimalType,
    getDecimalScaleRange,
}
