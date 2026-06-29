import { useEffect, useState } from 'react'
import { use_modal } from 'react-object-model/hooks.js'

import {
    Alert,
    Button,
    Empty,
    Form,
    Input,
    Modal,
    Popconfirm,
    Select,
    Space,
    Spin,
    Table,
    Tag,
    Tooltip,
    Typography,
} from 'antd'
import {
    ApiOutlined,
    CheckCircleOutlined,
    CloseOutlined,
    DeleteOutlined,
    EditOutlined,
    PlusOutlined,
    ReloadOutlined,
    SaveOutlined,
    StopOutlined,
} from '@ant-design/icons'

import { t } from '@i18n'

import { model } from '@model'

import { chat_model } from '@/agent/model.ts'
import type {
    IMcpServerInfo,
    IMcpServerTestPayload,
    IMcpServerTestResult,
    IMcpServerUpsertPayload,
    McpCredentialMode,
    McpServerType,
} from '@/agent/model.ts'


const { Paragraph, Text } = Typography


interface ServerFormState {
    name: string
    serverType: McpServerType
    url: string
    credentialMode: McpCredentialMode
    token: string
}


const empty_server_form: ServerFormState = {
    name: '',
    serverType: 'dolphindb',
    url: '',
    credentialMode: 'dolphindb_current_user',
    token: '',
}


function is_http_url (value: string): boolean {
    const url = new URL(value)
    return (url.protocol === 'http:' || url.protocol === 'https:') && !url.username && !url.password
}


function validate_url (value: string, label: string): string {
    if (!value)
        return ''
    const trimmed = value.trim()
    if (!trimmed)
        return t('请输入{{label}}', { label })
    if (!is_http_url(trimmed))
        return t('{{label}} 必须是 http/https URL，且不能包含用户名或密码', { label })
    return ''
}


export function McpTab ({ can_manage_mcp }: { can_manage_mcp: boolean }) {
    const [servers, set_servers] = useState<IMcpServerInfo[]>([ ])
    const [loading_servers, set_loading_servers] = useState(false)
    const [saving, set_saving] = useState(false)
    const [testing_form, set_testing_form] = useState(false)
    const [testing_server_id, set_testing_server_id] = useState('')
    const [updating_server_id, set_updating_server_id] = useState('')
    
    const server_modal = use_modal()
    const [editing_server, set_editing_server] = useState<IMcpServerInfo | null>(null)
    const [server_form] = Form.useForm<ServerFormState>()
    const [test_result, set_test_result] = useState<IMcpServerTestResult | null>(null)
    
    async function load_servers () {
        set_loading_servers(true)
        try {
            set_servers(await chat_model.mcp.load_mcp_servers())
        } finally {
            set_loading_servers(false)
        }
    }
    
    async function refresh () {
        await load_servers()
    }
    
    useEffect(() => {
        load_servers()
    }, [ ])
    
    function open_create_server () {
        set_editing_server(null)
        server_form.resetFields()
        set_test_result(null)
        server_modal.open()
    }
    
    function open_edit_server (server: IMcpServerInfo) {
        set_editing_server(server)
        server_form.setFieldsValue({
            name: server.name,
            serverType: server.serverType,
            url: server.endpoint.url,
            credentialMode: server.credentialMode,
            token: '',
        })
        set_test_result(null)
        server_modal.open()
    }
    
    function update_server_type (server_type: McpServerType) {
        const current_form = server_form.getFieldsValue()
        server_form.setFieldsValue({
            serverType: server_type,
            credentialMode: server_type === 'dolphindb'
                ? 'dolphindb_current_user'
                : current_form.credentialMode === 'dolphindb_current_user'
                    ? 'none'
                    : current_form.credentialMode,
        })
    }
    
    function validate_server_form (form_values: ServerFormState): string {
        if (!form_values.name.trim())
            return t('请输入 MCP Server 名称')
        const endpoint_error = validate_url(form_values.url, t('Server 地址'))
        if (endpoint_error)
            return endpoint_error
        const credential_mode = form_values.serverType === 'dolphindb'
            ? 'dolphindb_current_user'
            : form_values.credentialMode
        if (credential_mode === 'shared_token') {
            const changing_to_shared_token = !editing_server || editing_server.credentialMode !== 'shared_token'
            if (changing_to_shared_token && !form_values.token.trim())
                return t('固定 Token 认证方式需要填写 Token')
        }
        return ''
    }
    
    function build_server_payload (form_values: ServerFormState): IMcpServerUpsertPayload {
        const endpoint = {
            url: form_values.url.trim(),
        }
        const credential_mode: McpCredentialMode = form_values.serverType === 'dolphindb'
            ? 'dolphindb_current_user'
            : form_values.credentialMode
        const payload: IMcpServerUpsertPayload = {
            name: form_values.name.trim(),
            endpoint,
        }
        if (!editing_server)
            payload.serverType = form_values.serverType
        if (form_values.serverType !== 'dolphindb') {
            const credential_changed = !editing_server || editing_server.credentialMode !== credential_mode
            if (!editing_server || credential_changed || credential_mode !== 'shared_token' || form_values.token.trim())
                payload.credentialMode = credential_mode
            if (credential_mode === 'shared_token' && form_values.token.trim())
                payload.sharedAuthConfig = { type: 'bearer', token: form_values.token.trim() }
        }
        return payload
    }
    function build_test_payload (form_values: ServerFormState): IMcpServerTestPayload {
        return {
            ...(editing_server ? { mcpServerId: editing_server.mcpServerId } : { }),
            ...build_server_payload(form_values),
        }
    }
    
    function test_result_text (result: IMcpServerTestResult): string {
        if (result.ok)
            return t('连接成功，发现 {{count}} 个工具: {{names}}', { count: result.toolCount, names: result.toolNames.join(', ') })
        return result.message || result.error || t('连接失败')
    }
    
    async function test_form_server () {
        let form_values: ServerFormState
        try {
            form_values = await server_form.validateFields()
        } catch {
            return
        }
        
        const error = validate_server_form(form_values)
        if (error) {
            model.message.error(error)
            return
        }
        set_test_result(null)
        set_testing_form(true)
        try {
            const result = await chat_model.mcp.test_mcp_server(build_test_payload(form_values))
            set_test_result(result)
        } catch (error: any) {
            set_test_result({
                ok: false,
                message: error.message || t('连接失败'),
                error: error.message,
                toolCount: 0,
                toolNames: [ ],
            })
        } finally {
            set_testing_form(false)
        }
    }
    
    async function save_server (form_values: ServerFormState) {
        const error = validate_server_form(form_values)
        if (error) {
            model.message.error(error)
            return
        }
        set_saving(true)
        try {
            if (editing_server)
                await chat_model.mcp.update_mcp_server(editing_server.mcpServerId, build_server_payload(form_values))
            else
                await chat_model.mcp.register_mcp_server(build_server_payload(form_values))
            model.message.success(t('配置已保存'))
            server_modal.close()
            await refresh()
        } finally {
            set_saving(false)
        }
    }
    
    async function set_server_enabled (server: IMcpServerInfo, enabled: boolean) {
        set_updating_server_id(server.mcpServerId)
        try {
            await chat_model.mcp.update_mcp_server(server.mcpServerId, { enabled })
            model.message.success(enabled ? t('已启用') : t('已禁用'))
            await load_servers()
        } finally {
            set_updating_server_id('')
        }
    }
    
    function mcp_delete_error_message (error: any): string {
        const raw_message = error?.message ? String(error.message) : ''
        if (raw_message.includes('still bound to an Agent'))
            return t('该 MCP Server 仍被 Agent 绑定，请先解绑后再删除')
        return raw_message || t('删除失败')
    }
    
    async function delete_server (server: IMcpServerInfo) {
        try {
            await chat_model.mcp.delete_mcp_server(server.mcpServerId)
            model.message.success(t('配置已删除'))
            await refresh()
        } catch (error: any) {
            model.message.error(mcp_delete_error_message(error))
        }
    }
    async function test_saved_server (server: IMcpServerInfo) {
        set_testing_server_id(server.mcpServerId)
        try {
            const result = await chat_model.mcp.test_mcp_server({ mcpServerId: server.mcpServerId })
            if (result.ok)
                model.message.success(test_result_text(result), 5)
            else
                model.message.error(test_result_text(result))
        } finally {
            set_testing_server_id('')
        }
    }
    
    return <div style={{ height: '100%', minHeight: 0, overflow: 'auto', padding: '0 4px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
            <div>
                <div style={{ fontSize: 16, fontWeight: 500 }}>{t('MCP Server 配置')}</div>
                <Text type='secondary' style={{ fontSize: 12 }}>{t('配置可供 Agent 绑定和调用的 MCP Server。')}</Text>
            </div>
            <Space size={8}>
                <Tooltip title={t('刷新')}>
                    <Button icon={<ReloadOutlined />} onClick={refresh} />
                </Tooltip>
                <Button type='primary' icon={<PlusOutlined />} disabled={!can_manage_mcp} onClick={open_create_server}>
                    {t('添加 MCP Server')}
                </Button>
            </Space>
        </div>
        
        <Spin spinning={loading_servers}>
            {servers.length === 0
                ? <Empty description={t('暂无 MCP Server 配置')} image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 32 }} />
                : <Table<IMcpServerInfo>
                    size='small'
                    rowKey='mcpServerId'
                    dataSource={servers}
                    pagination={{ pageSize: 8, showSizeChanger: true }}
                    tableLayout='fixed'
                    scroll={{ x: 980 }}
                    columns={[
                        {
                            title: t('名称'),
                            width: 260,
                            render: (_: unknown, server) => <div style={{ minWidth: 0 }}>
                                <Text title={server.name} style={{ display: 'block', maxWidth: '100%' }} ellipsis>{server.name}</Text>
                                <Text type='secondary' style={{ display: 'block', fontSize: 12, wordBreak: 'break-all' }}>{server.mcpServerId}</Text>
                            </div>,
                        },
                        {
                            title: t('MCP 类型'),
                            width: 140,
                            render: (_: unknown, server) => <Tag color={server.serverType === 'dolphindb' ? 'blue' : 'purple'}>
                                {server.serverType === 'dolphindb' ? t('DolphinDB 内置 MCP') : t('第三方 MCP')}
                            </Tag>,
                        },
                        {
                            title: t('Server 地址'),
                            width: 280,
                            render: (_: unknown, server) => <Paragraph style={{ margin: 0, wordBreak: 'break-all' }} ellipsis={{ rows: 2, tooltip: server.endpoint.url }}>
                                {server.endpoint.url || '-'}
                            </Paragraph>,
                        },
                        {
                            title: t('认证方式'),
                            width: 160,
                            render: (_: unknown, server) => <Tag>
                                {server.credentialMode === 'dolphindb_current_user'
                                    ? t('使用当前 DolphinDB 用户')
                                    : server.credentialMode === 'shared_token'
                                        ? t('固定 Token')
                                        : t('无需认证')}
                            </Tag>,
                        },
                        {
                            title: t('状态'),
                            width: 60,
                            render: (_: unknown, server) => <Tag color={server.enabled !== false ? 'green' : 'default'}>
                                {server.enabled !== false ? t('启用') : t('禁用')}
                            </Tag>,
                        },
                        {
                            title: t('操作'),
                            width: 260,
                            render: (_: unknown, server) => <Space size={4}>
                                <Button
                                    type='text'
                                    size='small'
                                    icon={<ApiOutlined />}
                                    loading={testing_server_id === server.mcpServerId}
                                    disabled={!can_manage_mcp}
                                    onClick={() => { test_saved_server(server) }}
                                >{t('测试')}</Button>
                                <Button
                                    type='text'
                                    size='small'
                                    icon={<EditOutlined />}
                                    disabled={!can_manage_mcp}
                                    onClick={() => { open_edit_server(server) }}
                                >{t('编辑')}</Button>
                                {server.enabled === false
                                    ? <Button
                                        type='text'
                                        size='small'
                                        icon={<CheckCircleOutlined />}
                                        loading={updating_server_id === server.mcpServerId}
                                        disabled={!can_manage_mcp}
                                        onClick={() => { set_server_enabled(server, true) }}
                                    >{t('启用')}</Button>
                                    : <Popconfirm
                                        title={t('确定禁用此 MCP Server？')}
                                        onConfirm={() => { set_server_enabled(server, false) }}
                                    >
                                        <Button
                                            type='text'
                                            size='small'
                                            icon={<StopOutlined />}
                                            loading={updating_server_id === server.mcpServerId}
                                            disabled={!can_manage_mcp}
                                        >
                                            {t('禁用')}
                                        </Button>
                                    </Popconfirm>
                                }
                                <Popconfirm
                                    title={t('确定删除此 MCP Server 配置？')}
                                    okButtonProps={{ danger: true }}
                                    onConfirm={() => { delete_server(server) }}
                                >
                                    <Button type='text' size='small' danger icon={<DeleteOutlined />} disabled={!can_manage_mcp}>{t('删除')}</Button>
                                </Popconfirm>
                            </Space>,
                        },
                    ]}
                />
            }
        </Spin>
        
        <Modal
            title={editing_server ? t('编辑 MCP Server 配置') : t('添加 MCP Server 配置')}
            open={server_modal.visible}
            onCancel={server_modal.close}
            onOk={() => { server_form.submit() }}
            okText={t('保存配置')}
            okButtonProps={{ icon: <SaveOutlined /> }}
            cancelButtonProps={{ icon: <CloseOutlined /> }}
            confirmLoading={saving}
            width={720}
            destroyOnHidden
            footer={(_, { CancelBtn, OkBtn }) => (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <CancelBtn />
                    <Button icon={<ApiOutlined />} loading={testing_form} onClick={test_form_server}>
                        {t('测试')}
                    </Button>
                    <OkBtn />
                </div>
            )}
        >
            <Form
                form={server_form}
                layout='vertical'
                onFinish={save_server}
                initialValues={empty_server_form}
            >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
                    <Form.Item
                        name='name'
                        label={t('名称')}
                        required
                        rules={[{ required: true, message: t('请输入 MCP Server 名称') }]}
                        style={{ marginBottom: 0 }}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name='serverType'
                        label={t('MCP 类型')}
                        required
                        rules={[{ required: true, message: t('请选择 MCP 类型') }]}
                        style={{ marginBottom: 0 }}
                    >
                        {editing_server
                            ? <Tag color={server_form.getFieldValue('serverType') === 'dolphindb' ? 'blue' : 'purple'} style={{ marginTop: 4 }}>
                                {server_form.getFieldValue('serverType') === 'dolphindb' ? t('DolphinDB 内置 MCP') : t('第三方 MCP')}
                            </Tag>
                            : <Select
                                options={[
                                    { value: 'dolphindb', label: t('DolphinDB 内置 MCP') },
                                    { value: 'third_party', label: t('第三方 MCP') },
                                ]}
                                onChange={update_server_type}
                            />
                        }
                    </Form.Item>
                    <Form.Item
                        name='url'
                        label={t('Server 地址')}
                        required
                        rules={[
                            { required: true, message: t('请输入 Server 地址') },
                            { validator: (_, value) => {
                                const error = validate_url(value, t('Server 地址'))
                                return error ? Promise.reject(error) : Promise.resolve()
                            }}
                        ]}
                        style={{ marginBottom: 0, gridColumn: '1 / -1' }}
                    >
                        <Input placeholder='https://example.com/mcp' />
                    </Form.Item>
                    <Form.Item
                        name='credentialMode'
                        label={t('认证方式')}
                        required
                        rules={[{ required: true, message: t('请选择认证方式') }]}
                        style={{ marginBottom: 0 }}
                    >
                        <Select
                            disabled={server_form.getFieldValue('serverType') === 'dolphindb'}
                            options={[
                                { value: 'dolphindb_current_user', label: t('使用当前 DolphinDB 用户'), disabled: true },
                                { value: 'none', label: t('无需认证') },
                                { value: 'shared_token', label: t('固定 Token') },
                            ]}
                        />
                    </Form.Item>
                    
                    <Form.Item dependencies={['serverType', 'credentialMode']}>{
                        () => 
                            server_form.getFieldValue('serverType') !== 'dolphindb' && server_form.getFieldValue('credentialMode') === 'shared_token' && <Form.Item
                                name='token'
                                label={t('Token')}
                                required={editing_server?.credentialMode !== 'shared_token'}
                                rules={editing_server?.credentialMode === 'shared_token' ? [] : [{ required: true, message: t('固定 Token 认证方式需要填写 Token') }]}
                                style={{ marginBottom: 0, gridColumn: '1 / -1' }}
                            >
                                <Input.Password placeholder={editing_server?.credentialMode === 'shared_token' ? t('留空表示不修改') : ''} />
                            </Form.Item>
                    }</Form.Item>
                    
                    {test_result && <div style={{ gridColumn: '1 / -1' }}>
                        <Alert
                            showIcon
                            type={test_result.ok ? 'success' : 'error'}
                            title={test_result_text(test_result)}
                        />
                    </div>}
                </div>
            </Form>
        </Modal>
    </div>
}
