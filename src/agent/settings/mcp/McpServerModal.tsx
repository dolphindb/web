import {
    Alert,
    Button,
    Form,
    Input,
    Modal,
    Select,
    Tag,
    type FormInstance,
} from 'antd'
import {
    ApiOutlined,
    CloseOutlined,
    SaveOutlined,
} from '@ant-design/icons'

import { t } from '@i18n'
import type {
    IMcpServerInfo,
    IMcpServerTestResult,
    McpServerType,
} from '@/agent/model.ts'
import {
    empty_server_form,
    test_result_text,
    type ServerFormState,
} from './types.ts'


export function McpServerModal ({
    visible,
    editing_server,
    server_form,
    saving,
    testing_form,
    test_result,
    has_mcp_exec,
    on_close,
    on_save,
    on_test,
    on_update_server_type,
}: {
    visible: boolean
    editing_server: IMcpServerInfo | null
    server_form: FormInstance<ServerFormState>
    saving: boolean
    testing_form: boolean
    test_result: IMcpServerTestResult | null
    has_mcp_exec: boolean
    on_close: () => void
    on_save: (values: ServerFormState) => Promise<void>
    on_test: () => Promise<void>
    on_update_server_type: (server_type: McpServerType) => void
}) {
    const server_type = Form.useWatch('serverType', server_form)
    
    return <Modal
        title={editing_server ? t('编辑 MCP Server 配置') : t('添加 MCP Server 配置')}
        open={visible}
        onCancel={on_close}
        onOk={() => { server_form.submit() }}
        okText={t('保存配置')}
        okButtonProps={{ icon: <SaveOutlined /> }}
        cancelButtonProps={{ icon: <CloseOutlined /> }}
        confirmLoading={saving}
        width={720}
        destroyOnHidden
        footer={(_, { CancelBtn, OkBtn }) => <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <CancelBtn />
            <Button icon={<ApiOutlined />} loading={testing_form} onClick={on_test}>
                {t('测试')}
            </Button>
            <OkBtn />
        </div>}
    >
        <Form
            form={server_form}
            layout='vertical'
            onFinish={on_save}
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
                        ? <Tag color={server_type === 'dolphindb' ? 'blue' : 'purple'} style={{ marginTop: 4 }}>
                            {server_type === 'dolphindb' ? t('DolphinDB 内置 MCP') : t('第三方 MCP')}
                        </Tag>
                        : <Select
                            options={[
                                { value: 'dolphindb', label: t('DolphinDB 内置 MCP') },
                                { value: 'third_party', label: t('第三方 MCP') },
                            ]}
                            onChange={on_update_server_type}
                        />
                    }
                </Form.Item>
                <Form.Item
                    name='url'
                    label={t('Server 地址')}
                    required
                    rules={[
                        { required: true },
                        { type: 'url', message: t('Server 地址格式不正确，请输入合法的 URL') },
                        {
                            validator (_, value) {
                                if (value && !/^https?:\/\//.test(value))
                                    return Promise.reject(new Error(t('Server 地址必须以 http:// 或 https:// 开头')))
                                return Promise.resolve()
                            }
                        }
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
                        disabled={server_type === 'dolphindb'}
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
                            label='Token'
                            required={editing_server?.credentialMode !== 'shared_token'}
                            rules={editing_server?.credentialMode === 'shared_token' ? [ ] : [{ required: true, message: t('固定 Token 认证方式需要填写 Token') }]}
                            style={{ marginBottom: 0, gridColumn: '1 / -1' }}
                        >
                            <Input.Password placeholder={editing_server?.credentialMode === 'shared_token' ? t('留空表示不修改') : ''} />
                        </Form.Item>
                }</Form.Item>
                
                {test_result && <div style={{ gridColumn: '1 / -1' }}>
                    <Alert
                        showIcon
                        type={
                            test_result.ok ?
                                (test_result.toolCount === 0 && !has_mcp_exec ? 
                                    'warning'
                                :
                                    'success')
                            : 'error'
                        }
                        title={test_result_text(test_result, has_mcp_exec)}
                    />
                </div>}
            </div>
        </Form>
    </Modal>
}
