import { ArrayTable, FormItem, Input, NumberPicker, Select } from '@formily/antd-v5'
import { createSchemaField } from '@formily/react'

/**
 * 包含了所有常用组件的 SchemaField
 */
export const SchemaField = createSchemaField({
    components: {
        FormItem,
        Input,
        Select,
        NumberPicker,
        ArrayTable,
    },
})
