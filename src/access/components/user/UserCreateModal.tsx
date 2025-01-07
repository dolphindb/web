import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { Form, Input, Modal, Select, Switch } from 'antd'

import { language, t } from '@i18n/index.js'

import useSWR, { useSWRConfig } from 'swr'

import { model } from '@/model.js'

import { access } from '@/access/model.js'
import { NAME_CHECK_PATTERN } from '@/access/constants.js'
import { useGroups } from '@/access/hooks/useGroups.ts'


export const UserCreateModal = NiceModal.create(() => {
    const modal = useModal()
    const [add_user_form] = Form.useForm()
    
    const { data: groups = [ ] } = useGroups()
    
    const { mutate } = useSWRConfig()
    
    return <Modal
            className='add-user-modal'
            open={modal.visible}
            onCancel={() => {
                add_user_form.resetFields()
                modal.hide()
            }}
            afterClose={modal.remove}
            destroyOnClose
            title={t('新建用户')}
            onOk={async () => {
                try {
                    const { username, password, is_admin, groups } = await add_user_form.validateFields()
                    await access.create_user({
                        userId: username,
                        password: password,
                        groupIds: groups,
                        isAdmin: is_admin
                    })
                    model.message.success(t('用户创建成功'))
                    modal.hide()
                    add_user_form.resetFields()
                    mutate('users')
                } catch (error) {
                    if (error instanceof Error)
                        throw error
                    console.error(error)
                }
            }}
        >
            <Form name='basic' labelCol={{ span: language === 'zh' ? 4 : 8 }} labelAlign='right' form={add_user_form} autoComplete='off'>
                <Form.Item
                    label={t('用户名')}
                    name='username'
                    rules={[
                        { required: true, message: t('请输入用户名!') },
                        { max: 30, message: t('用户名长度不能超过 30 个字符') },
                        { pattern: NAME_CHECK_PATTERN, message: t('用户名只能包含字母、下划线或数字，并且不能以数字或下划线开头') }
                    ]}
                    validateFirst
                >
                    <Input />
                </Form.Item>
                
                <Form.Item
                    label={t('密码')}
                    name='password'
                    rules={[
                        { required: true, message: t('请输入密码!') },
                        { min: 6, message: t('密码长度为 6-20 个字符，且不包含空格或中文') },
                        { max: 20, message: t('密码长度为 6-20 个字符，且不包含空格或中文') },
                        { pattern: /^[^\s\u4E00-\u9FFF]+$/, message: t('密码长度为 6-20 个字符，且不包含空格或中文') }
                    ]}
                    validateFirst
                >
                    <Input.Password />
                </Form.Item>
                
                <Form.Item
                    label={t('确认密码')}
                    name='confirm_password'
                    dependencies={['password']}
                    hasFeedback
                    rules={[
                        {
                            required: true,
                            message: t('请再次输入密码!')
                        },
                        ({ getFieldValue }) => ({
                            async validator (_, value) {
                                if (!value || getFieldValue('password') === value)
                                    return Promise.resolve()
                                
                                return Promise.reject(new Error(t('两次输入密码需要保持一致!')))
                            }
                        })
                    ]}
                    validateFirst
                >
                    <Input.Password />
                </Form.Item>
                
                <Form.Item label={t('是否管理员')} name='is_admin' initialValue={false}>
                    <Switch />
                </Form.Item>
                
                <Form.Item label={t('组')} name='groups'>
                    <Select
                        mode='multiple'
                        className='group-select'
                        placeholder={t('请选择想要添加的组')}
                        options={groups.map(group => ({ label: group, value: group }))}
                    />
                </Form.Item>
            </Form>
        </Modal>
})
