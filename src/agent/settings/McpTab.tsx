import { useEffect, useState } from 'react'
import { use_modal } from 'react-object-model/hooks.js'

import {
    Button,
    Empty,
    Form,
    Popconfirm,
    Space,
    Spin,
    Table,
    Tag,
    Typography,
} from 'antd'
import {
    ApiOutlined,
    CheckCircleOutlined,
    DeleteOutlined,
    EditOutlined,
    PlusOutlined,
    ReloadOutlined,
    StopOutlined,
} from '@ant-design/icons'

import { t } from '@i18n'
import { model } from '@model'

import { chat_model } from '@/agent/model.ts'
import type {
    IMcpServerInfo,
    IMcpServerTestResult,
    McpServerType,
} from '@/agent/model/types.ts'
import {
    McpServerModal,
    build_server_payload,
    build_test_payload,
    empty_server_form,
    validate_server_form,
    type ServerFormState,
} from './mcp/index.ts'


const { Text } = Typography


export function McpTab ({ can_manage_mcp }: { can_manage_mcp: boolean }) {
    const [servers, set_servers] = useState<IMcpServerInfo[]>([ ])
    const [page, set_page] = useState(1)
    const [page_size, set_page_size] = useState(20)
    const [total, set_total] = useState(0)
    const [loading_servers, set_loading_servers] = useState(false)
    const [saving, set_saving] = useState(false)
    const [testing_form, set_testing_form] = useState(false)
    const [testing_server_id, set_testing_server_id] = useState('')
    const [updating_server_id, set_updating_server_id] = useState('')
    const [has_mcp_exec, set_has_mcp_exec] = useState<boolean>(false)
    
    const server_modal = use_modal()
    const [editing_server, set_editing_server] = useState<IMcpServerInfo | null>(null)
    const [server_form] = Form.useForm<ServerFormState>()
    const [test_result, set_test_result] = useState<IMcpServerTestResult | null>(null)
    
    async function load_servers (p = page, ps = page_size) {
        set_loading_servers(true)
        try {
            const offset = (p - 1) * ps
            const result = await chat_model.mcp.load_mcp_server_page({ offset, limit: ps })
            set_servers(result.items)
            set_page(p)
            set_page_size(ps)
            set_total(result.total)
        } finally {
            set_loading_servers(false)
        }
    }
    
    async function refresh () {
        await load_servers(page, page_size)
    }
    
    useEffect(() => {
        load_servers(1, page_size)
        
        ;(async () => {
            set_has_mcp_exec(
                (await model.ddb.invoke<{ MCP_EXEC: string }[]>('getUserAccess', [[model.username], true]))
                    [0].MCP_EXEC  === 'allow')
        })()
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
    
    async function test_form_server () {
        let form_values: ServerFormState
        try {
            form_values = await server_form.validateFields()
        } catch {
            return
        }
        
        const error = validate_server_form(form_values, editing_server)
        if (error) {
            model.message.error(error)
            return
        }
        set_test_result(null)
        set_testing_form(true)
        try {
            const result = await chat_model.mcp.test_mcp_server(build_test_payload(form_values, editing_server))
            set_test_result(result)
            if (result.ok)
                model.message.success(t('MCP Server 连接测试成功'))
            else
                model.message.error(result.message || result.error || t('MCP Server 连接测试失败'))
        } catch (err: any) {
            set_test_result({
                ok: false,
                toolCount: 0,
                toolNames: [ ],
                error: err.message,
                message: err.message,
            })
            model.message.error(err.message || t('MCP Server 连接测试失败'))
        } finally {
            set_testing_form(false)
        }
    }
    
    async function test_saved_server (server: IMcpServerInfo) {
        set_testing_server_id(server.mcpServerId)
        try {
            const result = await chat_model.mcp.test_mcp_server({
                mcpServerId: server.mcpServerId,
            })
            if (result.ok)
                if (result.toolCount === 0 && !has_mcp_exec)
                    model.message.warning(t('MCP Server 连接成功，但当前用户缺少 MCP_EXEC 权限'))
                else
                    model.message.success(t('连接成功，发现 {{count}} 个工具', { count: result.toolCount }))
            else
                model.message.error(result.message || result.error || t('MCP Server 连接测试失败'))
        } catch (err: any) {
            model.message.error(err.message || t('MCP Server 连接测试失败'))
        } finally {
            set_testing_server_id('')
        }
    }
    
    async function save_server (form_values: ServerFormState) {
        const error = validate_server_form(form_values, editing_server)
        if (error) {
            model.message.error(error)
            return
        }
        set_saving(true)
        try {
            const payload = build_server_payload(form_values, editing_server)
            if (editing_server)
                await chat_model.mcp.update_mcp_server(editing_server.mcpServerId, payload)
            else
                await chat_model.mcp.register_mcp_server(payload)
            model.message.success(editing_server ? t('保存成功') : t('注册成功'))
            server_modal.close()
            await refresh()
        } catch (err: any) {
            model.message.error(err.message || t('保存失败'))
        } finally {
            set_saving(false)
        }
    }
    
    async function delete_server (server: IMcpServerInfo) {
        set_updating_server_id(server.mcpServerId)
        try {
            await chat_model.mcp.delete_mcp_server(server.mcpServerId)
            model.message.success(t('已删除'))
            await refresh()
        } catch (err: any) {
            model.message.error(err.message || t('删除失败'))
        } finally {
            set_updating_server_id('')
        }
    }
    
    async function set_server_enabled (server: IMcpServerInfo, enabled: boolean) {
        set_updating_server_id(server.mcpServerId)
        try {
            await chat_model.mcp.update_mcp_server(server.mcpServerId, { enabled })
            model.message.success(enabled ? t('已启用') : t('已禁用'))
            await refresh()
        } catch (err: any) {
            model.message.error(err.message || (enabled ? t('启用失败') : t('禁用失败')))
        } finally {
            set_updating_server_id('')
        }
    }
    
    return <div className='ai-settings-list-detail ai-settings-mcp-page' style={{ height: '100%' }}>
        <div className='ai-settings-detail-header'>
            <div className='ai-settings-detail-title'>{t('MCP 管理')}</div>
        </div>
        <div className='ai-settings-detail-body'>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text type='secondary' style={{ fontSize: 12 }}>
                    {t('管理 MCP Server。每个 Server 可以提供一组外部工具。')}
                </Text>
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={refresh} loading={loading_servers}>
                        {t('刷新')}
                    </Button>
                    {can_manage_mcp && <Button type='primary' icon={<PlusOutlined />} onClick={open_create_server}>
                        {t('添加 Server')}
                    </Button>}
                </Space>
            </div>
            <Spin spinning={loading_servers}>
                {servers.length === 0 && !loading_servers
                    ? <Empty description={t('暂无 MCP Server 配置')} image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 40 }} />
                    : <Table<IMcpServerInfo>
                        dataSource={servers}
                        rowKey='mcpServerId'
                        pagination={{
                            current: page,
                            pageSize: page_size,
                            total,
                            showSizeChanger: true,
                            onChange: (p, ps) => { load_servers(p, ps) },
                        }}
                        size='middle'
                        tableLayout='fixed'
                        columns={[
                            {
                                title: t('名称'),
                                dataIndex: 'name',
                                width: 220,
                                ellipsis: true,
                                render: (text, server) => <Space direction='vertical' size={2} style={{ width: '100%' }}>
                                    <Text strong ellipsis={{ tooltip: text }}>{text}</Text>
                                    <Text type='secondary' style={{ fontSize: 12 }} ellipsis={{ tooltip: server.mcpServerId }}>
                                        {server.mcpServerId}
                                    </Text>
                                </Space>,
                            },
                            {
                                title: t('类型'),
                                width: 140,
                                render: (_: unknown, server) => <Tag color={server.serverType === 'dolphindb' ? 'blue' : 'purple'}>
                                    {server.serverType === 'dolphindb' ? t('DolphinDB 内置') : t('第三方')}
                                </Tag>,
                            },
                            {
                                title: t('Server 地址'),
                                ellipsis: true,
                                render: (_: unknown, server) => <Text
                                    copyable={{ text: server.endpoint.url }}
                                    ellipsis={{ tooltip: server.endpoint.url }}
                                >
                                    {server.endpoint.url}
                                </Text>,
                            },
                            {
                                title: t('认证方式'),
                                width: 150,
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
            
            <McpServerModal
                visible={server_modal.visible}
                editing_server={editing_server}
                server_form={server_form}
                saving={saving}
                testing_form={testing_form}
                test_result={test_result}
                has_mcp_exec={has_mcp_exec}
                on_close={server_modal.close}
                on_save={save_server}
                on_test={test_form_server}
                on_update_server_type={update_server_type}
            />
        </div>
    </div>
}
