import { useModal } from "@ebay/nice-modal-react"
import { Form, Input, Modal } from "antd"
import { access } from "../../model.js"
import { model } from "../../../model.js"
import { language, t } from "../../../../i18n/index.js"

export const ResetPasswordModal = (()=>{
    const { current } = access.use(['users', 'groups', 'current'])
    
    const modal = useModal()
    
    const [reset_password_form] = Form.useForm()
    
    return (
        <Modal
            className='edit-user-modal'
            open={modal.visible}
            afterClose={modal.remove}
            onOk={async () => {
                try {
                    const { password } = await reset_password_form.validateFields()
                    await access.reset_password(current?.name, password)
                    reset_password_form.resetFields()
                    model.message.success(t('密码修改成功'))
                    modal.hide()
                } catch (error) {
                    if (error instanceof Error)
                        throw error
                    console.error(error)
                }
            }}
            title={<div>{t('重置用户 {{user}} 密码', { user: current?.name })}</div>}
            onCancel={() => {
                reset_password_form.resetFields()
                modal.hide()
            }}
        >
            <Form name='basic' form={reset_password_form} labelCol={{ span: language === 'zh' ? 4 : 8 }} labelAlign='right' autoComplete='off'>
                <Form.Item
                    label={t('新密码')}
                    name='password'
                    rules={[
                        { required: true, message: t('请输入密码!') },
                        { min: 6, message: t('密码长度为 6-20 个字符，且不包含空格或中文') },
                        { max: 20, message: t('密码长度为 6-20 个字符，且不包含空格或中文') },
                        { pattern: /^[^\s\u4E00-\u9FFF]+$/, message: t('密码长度为 6-20 个字符，且不包含空格或中文') }
                    ]}
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
                >
                    <Input.Password />
                </Form.Item>
            </Form>
        </Modal>
    )
})