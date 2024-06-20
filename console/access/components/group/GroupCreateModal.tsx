import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { Form, Input, Modal, Transfer } from 'antd'

import { useState } from 'react'

import { language, t } from '../../../../i18n/index.js'
import { access } from '../../model.js'
import { model } from '../../../model.js'

export const GroupCreateModal = NiceModal.create(() => {
    const { users } = access.use(['users'])
    
    const [target_users, set_target_users] = useState<string[]>([ ])
    
    const [selected_users, set_selected_users] = useState<string[]>([ ])
    
    const [add_group_form] = Form.useForm()
    
    const modal = useModal()
    
    return <Modal
            className='add-group-modal'
            open={modal.visible}
            onCancel={() => {
                add_group_form.resetFields()
                modal.hide()
            }}
            destroyOnClose
            title={t('新建组')}
            onOk={async () => {
                try {
                    const { group_name, users } = await add_group_form.validateFields()
                    await access.create_group(group_name, users ?? [ ])
                    model.message.success(t('组创建成功'))
                    modal.hide()
                    set_selected_users([ ])
                    set_target_users([ ])
                    add_group_form.resetFields()
                    await access.get_group_list()
                } catch (error) {
                    if (error instanceof Error)
                        throw error
                    console.error(error)
                }
            }}
        >
            <Form name='basic' labelCol={{ span: language === 'zh' ? 3 : 5 }} labelAlign='right' form={add_group_form} autoComplete='off'>
                <Form.Item
                    label={t('组名')}
                    name='group_name'
                    rules={[
                        { required: true, message: t('请输入组名') },
                        { max: 30, message: t('组名长度不能超过 30 个字符') },
                        { pattern: /^(?![\d_])[\w\d]+$/, message: t('组名只能包含字母、下划线或数字，并且不能以数字或下划线开头') }
                    ]}
                    validateFirst
                >
                    <Input />
                </Form.Item>
                <Form.Item label={t('成员')} name='users'>
                    <Transfer
                        dataSource={users.map(user => ({
                            key: user,
                            title: user
                        }))}
                        titles={[t('非组成员'), t('组成员')]}
                        showSearch
                        locale={{ itemUnit: t('个'), itemsUnit: t('个'), searchPlaceholder: t('请输入想要搜索的用户') }}
                        filterOption={(val, user) => user.title.includes(val)}
                        targetKeys={target_users}
                        selectedKeys={selected_users}
                        onChange={keys => { set_target_users(keys as string[]) }}
                        onSelectChange={(s, t) => {
                            set_selected_users([...s, ...t] as string[])
                        }}
                        render={item => item.title}
                    />
                </Form.Item>
            </Form>
        </Modal>
})
