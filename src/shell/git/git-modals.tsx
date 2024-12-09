import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { t } from '@i18n/index.ts'
import { Modal, Form, Input } from 'antd'

import { GIT_CONSTANTS } from '../constants.ts'

import { get_github_auth_url, get_gitlab_auth_url } from './get-auth-url.ts'

export const GitLabOauthModal = NiceModal.create(() => {
    const modal = useModal()
    const [form] = Form.useForm()
    
    function onFinish (values) {
        localStorage.setItem(GIT_CONSTANTS.ROOT_URL, values.root_url)
        localStorage.setItem(GIT_CONSTANTS.CLIENT_ID, values.client_id)
        localStorage.setItem(GIT_CONSTANTS.REDIRECT_URL, values.redirect_url)
        localStorage.setItem(GIT_CONSTANTS.API_ROOT, values.api_root)
        get_gitlab_auth_url(values.root_url, values.client_id, values.redirect_url).then(url => { window.location.href = url })
        modal.hide()
    }
    
    const defaultRedirectUrl = `${window.location.origin}/oauth-gitlab`
    
    return <Modal
        open={modal.visible}
        onCancel={modal.hide}
        title={t('使用 Oauth 登录到 GitLab')}
        onOk={() => {
            form
                .validateFields()
                .then(values => {
                    form.resetFields()
                    onFinish(values)
                })
                .catch(info => {
                    console.log('Validate Failed:', info)
                })
        }}
    >
        <Form
            form={form}
            name='gitlab_oauth'
            initialValues={{ api_root: '/api/v4', redirect_url: defaultRedirectUrl }}
            layout='vertical'
        >
            <Form.Item
                label='Client ID'
                name='client_id'
                rules={[{ required: true, message: t('请输入 Client ID!') }]}
            >
                <Input placeholder={t('请输入你的 GitLab 应用 Client ID')} />
            </Form.Item>
            
            <Form.Item
                label='Redirect URL'
                name='redirect_url'
                rules={[{ required: true, message: t('请输入 Redirect URL!') }]}
            >
                <Input placeholder={t('请输入你的 GitLab 应用 Redirect URL')} />
            </Form.Item>
            
            <Form.Item
                label='Root URL (GitLab Path)'
                name='root_url'
                rules={[
                    { required: true, message: t('请输入 GitLab 的路径!') },
                    { type: 'url', message: t('请输入有效的 URL!') }
                ]}
            >
                <Input placeholder={t('请输入你的 GitLab 根路径，例如: https://gitlab.com')} />
            </Form.Item>
            
            <Form.Item
                label='API Root (Optional)'
                name='api_root'
            >
                <Input placeholder={t('请输入 GitLab API Root，默认为 /api/v4')} />
            </Form.Item>
        </Form>
    </Modal>
})

export const GitLabAccessTokenModal = NiceModal.create(() => {
    const modal = useModal()
    const [form] = Form.useForm()
    
    function on_finish (values) {
        localStorage.setItem(GIT_CONSTANTS.ACCESS_TOKEN, values.access_token)
        localStorage.setItem(GIT_CONSTANTS.ROOT_URL, values.root_url)
        localStorage.setItem(GIT_CONSTANTS.API_ROOT, values.api_root)
        localStorage.setItem(GIT_CONSTANTS.PROVIDER, 'gitlab')
        window.location.reload()
        modal.hide()
    }
    
    return <Modal
        open={modal.visible}
        onCancel={modal.hide}
        title={t('使用 Access Token 登录到 GitLab')}
        onOk={() => {
            form
                .validateFields()
                .then(values => {
                    form.resetFields()
                    on_finish(values)
                })
                .catch(info => {
                    console.log('Validate Failed:', info)
                })
        }}
    >
        <Form
            form={form}
            name='gitlab_access_token'
            initialValues={{ api_root: '/api/v4' }}
            layout='vertical'
        >
            <Form.Item
                label='Access Token'
                name='access_token'
                rules={[{ required: true, message: t('请输入 Access Token!') }]}
            >
                <Input.Password placeholder={t('请输入你的 GitLab Access Token')} />
            </Form.Item>
            
            <Form.Item
                label='Root URL (GitLab Path)'
                name='root_url'
                rules={[
                    { required: true, message: t('请输入 GitLab 的路径!') },
                    { type: 'url', message: t('请输入有效的 URL!') }
                ]}
            >
                <Input placeholder={t('请输入你的 GitLab 根路径，例如: https://gitlab.com')} />
            </Form.Item>
            
            <Form.Item
                label='API Root (Optional)'
                name='api_root'
            >
                <Input placeholder={t('请输入 GitLab API Root，默认为 /api/v4')} />
            </Form.Item>
        </Form>
    </Modal>
})

export const GitHubAccessTokenModal = NiceModal.create(() => {
    const modal = useModal()
    const [form] = Form.useForm()
    
    function onFinish (values) {
        localStorage.setItem(GIT_CONSTANTS.ACCESS_TOKEN, values.access_token)
        localStorage.setItem(GIT_CONSTANTS.PROVIDER, 'github')
        window.location.reload()
        modal.hide()
    }
    
    return <Modal
        open={modal.visible}
        onCancel={modal.hide}
        title={t('使用 Access Token 登录到 GitHub')}
        onOk={() => {
            form
                .validateFields()
                .then(values => {
                    form.resetFields()
                    onFinish(values)
                })
                .catch(info => {
                    console.log('Validate Failed:', info)
                })
        }}
    >
        <Form
            form={form}
            name='github_access_token'
            layout='vertical'
        >
            <Form.Item
                label='Access Token'
                name='access_token'
                rules={[{ required: true, message: t('请输入 Access Token!') }]}
            >
                <Input.Password placeholder={t('请输入你的 GitHub Access Token')} />
            </Form.Item>
        </Form>
    </Modal>
})

export const GitHubOauthModal = NiceModal.create(() => {
    const modal = useModal()
    const [form] = Form.useForm()
    
    function onFinish (values) {
        localStorage.setItem(GIT_CONSTANTS.CLIENT_ID, values.client_id)
        localStorage.setItem(GIT_CONSTANTS.REDIRECT_URL, values.redirect_url)
        localStorage.setItem(GIT_CONSTANTS.CLIENT_SECRET, values.client_secret) // Store the secret (handle securely in a real app)
        const url = get_github_auth_url(values.client_id, values.redirect_url)
        window.location.href = url
        modal.hide()
    }
    
    const defaultRedirectUrl = `${window.location.origin}/oauth-github` // Example redirect URL for GitHub
    
    return <Modal
        open={modal.visible}
        onCancel={modal.hide}
        title={t('使用 Oauth 登录到 GitHub')}
        onOk={() => {
            form
                .validateFields()
                .then(values => {
                    form.resetFields()
                    onFinish(values)
                })
                .catch(info => {
                    console.log('Validate Failed:', info)
                })
        }}
    >
        <Form
            form={form}
            name='github_oauth'
            initialValues={{ redirect_url: defaultRedirectUrl }}
            layout='vertical'
        >
            <Form.Item
                label='Client ID'
                name='client_id'
                rules={[{ required: true, message: t('请输入 Client ID!') }]}
            >
                <Input placeholder={t('请输入你的 GitHub 应用 Client ID')} />
            </Form.Item>
            
            <Form.Item
                label='Redirect URL'
                name='redirect_url'
                rules={[{ required: true, message: t('请输入 Redirect URL!') }]}
            >
                <Input placeholder={t('请输入你的 GitHub 应用 Redirect URL')} />
            </Form.Item>
            
            <Form.Item
                label='Client Secret'
                name='client_secret'
                rules={[{ required: true, message: t('请输入 Client Secret!') }]}
            >
                <Input.Password placeholder={t('请输入你的 GitHub 应用 Client Secret')} />
            </Form.Item>
        </Form>
    </Modal>
}) 
