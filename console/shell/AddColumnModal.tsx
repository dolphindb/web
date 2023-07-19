import { useMemo } from 'react'

import { Button, Modal, message } from 'antd'

import { createForm } from '@formily/core'
import { Form, FormButtonGroup, Submit } from '@formily/antd-v5'

import NiceModal from '@ebay/nice-modal-react'

import type { ColumnRoot } from './Databases.js'
import { t } from '../../i18n/index.js'
import { DDBTypeSelectorSchemaFields, SchemaField } from '../components/formily/index.js'
import { shell } from './model.js'
import { model } from '../model.js'
import { generateDDBDataTypeLiteral } from '../utils/ddb-data-types.js'
import { DDBTypeNames } from '../constants/column-data-types.js'

interface Props {
    node: ColumnRoot
}

interface IAddColumnFormValues {
    column: string
    type: DDBTypeNames
    scale?: number
}

export const AddColumnModal = NiceModal.create<Props>(({ node }) => {
    const modal = NiceModal.useModal()
    const form = useMemo(
        () => createForm(),
        [ ]
    )
    
    async function onSubmit (formValues: IAddColumnFormValues) {
        try {
            const { table } = node
            
            await shell.define_add_column()
            // 调用该函数时，数据库路径不能以 / 结尾
            await model.ddb.call('add_column', [
                table.db.path.slice(0, -1),
                table.name,
                formValues.column,
                generateDDBDataTypeLiteral(formValues)
            ])
            message.success(t('添加成功'))
            node.children = null
            table.schema = null
            await node.load_children()
            shell.set({ dbs: [...shell.dbs] })
            modal.resolve()
            modal.hide()
        } catch (error) {
            model.show_error({ error })
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
            className='add-column-modal-form'
            labelCol={6}
            form={form}
            onAutoSubmit={onSubmit}
        >
            <SchemaField scope={{
                ...DDBTypeSelectorSchemaFields.ScopeValues
            }}>
                <SchemaField.String
                    name='column'
                    title={t('列名')}
                    x-decorator='FormItem'
                    x-component='Input'
                    x-component-props={{
                        placeholder: t('输入列名，支持包含特殊字符')
                    }}
                    required
                    x-validator={{
                        required: true,
                        message: t('请输入列名')
                    }}
                />
                <DDBTypeSelectorSchemaFields />
            </SchemaField>
            <FormButtonGroup align='right'>
                <Submit type='primary'>{t('确定')}</Submit>
                <Button htmlType='button' onClick={modal.hide}>
                    {t('取消')}
                </Button>
            </FormButtonGroup>
        </Form>
    </Modal>
})
