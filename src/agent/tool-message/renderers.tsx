import { Button, Collapse, Typography } from 'antd'
import { RedoOutlined } from '@ant-design/icons'

import { t } from '@i18n'
import {
    normalize_args,
    get_arg_text,
    to_message_text,
    to_preview_text,
    is_object_record,
    get_tool_result_print,
} from '@/agent/utils/message.ts'
import {
    compact_sections,
    create_code_view,
    create_compact_text_detail,
    create_json_detail,
    create_markdown_detail,
    create_rerun_button,
    create_text_detail,
    get_outcome_toggle_label,
    get_table_like_summary,
    ParamResultSection,
    PRINT_STYLE,
    render_outcome_detail,
    ScriptApprovalActions,
    STACK_STYLE,
    SummaryBox,
    type ToolRendererProps,
} from './common.tsx'


const { Text } = Typography


function ExecuteLikeRenderer (props: ToolRendererProps) {
    const { args, chat, message, structured_payload, collapse_key_suffix, tool_name } = props
    const { pending_script_approval } = chat.use(['pending_script_approval'])
    const script = get_arg_text(args, 0, ['script'])
    const is_waiting_approval = pending_script_approval?.messageId === message.msgId
    
    if (!props.is_outcome)
        return <div style={STACK_STYLE}>
            {script
                ? <>
                    {create_code_view(script, is_waiting_approval ? null : create_rerun_button(tool_name, script))}
                    {is_waiting_approval && <ScriptApprovalActions chat={chat} />}
                </>
                : <SummaryBox
                    rows={[{ label: t('脚本'), value: to_preview_text(args, 160) }]}
                    collapse_key_prefix={`${collapse_key_suffix}-script`}
                />}
        </div>
        
    const print_messages = get_tool_result_print(message.content)
    const outcome = render_outcome_detail(message, structured_payload)
    if (!outcome && !print_messages.length)
        return null
        
    return <div style={STACK_STYLE}>
        {print_messages.length > 0 && <div>
            <Text strong style={{ color: '#d48806', fontSize: 13 }}>PRINT</Text>
            <pre style={{ ...PRINT_STYLE, marginTop: 6 }}>{print_messages.join('\n')}</pre>
        </div>}
        {outcome && <Collapse
            ghost
            size='small'
            destroyOnHidden
            expandIconPosition='start'
            items={[{
                key: `execute-outcome-${collapse_key_suffix}`,
                label: get_outcome_toggle_label(message, tool_name),
                children: outcome,
            }]}
        />}
    </div>
}


function ColdefsRenderer (props: ToolRendererProps) {
    return <ParamResultSection props={props} build_data={({ args, message, structured_payload }) => {
        const table_handle = get_arg_text(args, 0, ['table'])
        const summary = get_table_like_summary(structured_payload)
        return {
            param_rows: [{ label: t('表'), value: table_handle || '-' }],
            result_rows: [
                { label: t('字段'), value: summary?.columns?.length ? summary.columns.join(', ') : to_preview_text(message.content, 140) },
            ],
            result_details: compact_sections([
                create_json_detail('structured', t('查看详情'), structured_payload),
            ]),
        }
    }} />
}


function TestsqlRenderer (props: ToolRendererProps) {
    return <ParamResultSection props={props} build_data={({ args, message, structured_payload }) => {
        const table_handle = get_arg_text(args, 0, ['table'])
        const summary = get_table_like_summary(structured_payload)
        return {
            param_rows: [{ label: t('表'), value: table_handle || '-' }],
            result_rows: [
                { label: t('样例'), value: summary ? `${summary.rows} ${t('行')}` : to_preview_text(message.content, 120) },
            ],
            result_details: compact_sections([
                create_json_detail('structured', t('查看详情'), structured_payload),
                create_compact_text_detail('text', t('查看结果'), message.content, 120),
            ]),
        }
    }} />
}


function clean_doc_search_summary (value: unknown): string {
    const text = to_message_text(value)
        .replace(/<[^>]+>/g, ' ')
        .replace(/(^|\s)#{1,6}\s*/g, ' ')
        .replace(/[`*_]+/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    return to_preview_text(text, 220)
}


function render_doc_search_results (results: unknown[]): string {
    return results.map((item, index) => {
        const record = is_object_record(item) ? item : null
        const id = to_message_text(record?.id).trim()
        const title = to_message_text(record?.title).trim()
        const summary = clean_doc_search_summary(record?.summary)
        return [
            `${index + 1}. ${title || id || '-'}`,
            summary ? `摘要: ${summary}` : '',
            id ? `id: ${id}` : '',
        ].filter(Boolean).join('\n')
    }).filter(Boolean).join('\n\n')
}


function DocSearchRenderer (props: ToolRendererProps) {
    if (!props.is_outcome)
        return null
        
    return <ParamResultSection props={props} build_data={({ args, message, structured_payload }) => {
        const query = get_arg_text(args, 0, ['query'])
        const parsed = is_object_record(structured_payload) ? structured_payload : null
        const results = Array.isArray(parsed?.results) ? parsed.results : [ ]
        return {
            result_rows: [{ label: t('文档搜索'), value: `${query || '-'}，${t('匹配')} ${results.length} ${t('条文档')}` }],
            result_details: compact_sections([
                create_text_detail('doc-search-candidates', t('查看候选文档'), render_doc_search_results(results)),
                create_json_detail('doc-search-results', t('查看结果'), structured_payload || message.content),
            ]),
        }
    }} />
}


function DocReadRenderer (props: ToolRendererProps) {
    return <ParamResultSection props={props} build_data={({ args, message, structured_payload, is_outcome }) => {
        const id = get_arg_text(args, 0, ['id'])
        const parsed = is_object_record(structured_payload) ? structured_payload : null
        const title = to_message_text(parsed?.title).trim()
        const content = to_message_text(parsed?.content ?? message.content).trim()
        
        return {
            param_rows: !is_outcome
                ? [{ label: t('读取文档'), value: to_preview_text(id || '-', 120) }]
                : [ ],
            result_rows: !props.has_paired_tool_call && is_outcome
                ? [{ label: t('读取文档'), value: title || id || '-' }]
                : [ ],
            result_details: compact_sections([
                create_markdown_detail('doc-content', t('查看文档内容'), content),
            ]),
        }
    }} />
}


function get_named_arg_text (args: unknown): string {
    return get_arg_text(args, 0, ['name', 'path'])
}


function parse_json_or_text (content: string): unknown {
    try { return JSON.parse(content) } catch { return content }
}


function VfsListRenderer (props: ToolRendererProps) {
    return <ParamResultSection props={props} build_data={({ args, message }) => {
        const query_path = get_named_arg_text(args)
        const lines = message.content.split('\n').map(line => line.trim()).filter(Boolean)
        return {
            param_rows: [{ label: t('路径'), value: query_path || t('全部') }],
            result_rows: [{ label: t('数量'), value: String(lines.length) }],
            result_details: compact_sections([
                create_compact_text_detail('list', t('查看列表'), message.content, 80),
            ]),
        }
    }} />
}


function VfsCreateRenderer (props: ToolRendererProps) {
    return <ParamResultSection props={props} build_data={({ args, message, structured_payload }) => {
        const path = get_named_arg_text(args)
        const content = get_arg_text(args, 1, ['content'])
        const parsed = is_object_record(structured_payload) ? structured_payload : null
        const hash = to_message_text(parsed?.hash).trim()
        return {
            param_rows: [{ label: t('文件'), value: path || '-' }],
            result_rows: [
                { label: t('结果'), value: to_preview_text(message.content, 120) },
                ...(hash ? [{ label: 'hash', value: hash }] : [ ]),
            ],
            param_details: compact_sections([
                create_compact_text_detail('content', t('查看内容'), content, 80),
            ]),
        }
    }} />
}


function VfsReadRenderer (props: ToolRendererProps) {
    return <ParamResultSection props={props} build_data={({ args, message, structured_payload }) => {
        const path = get_named_arg_text(args)
        const parsed = is_object_record(structured_payload) ? structured_payload : null
        const content = to_message_text(parsed?.content ?? message.content)
        const hash = to_message_text(parsed?.hash).trim()
        return {
            param_rows: [{ label: t('文件'), value: path || to_message_text(parsed?.path).trim() || '-' }],
            result_rows: hash ? [{ label: 'hash', value: hash }] : [ ],
            result_details: compact_sections([
                create_text_detail('content', t('查看内容'), content),
            ]),
        }
    }} />
}


function VfsUpdateRenderer (props: ToolRendererProps) {
    return <ParamResultSection props={props} build_data={({ args, message, structured_payload }) => {
        const path = get_named_arg_text(args)
        const hash = get_arg_text(args, 1, ['hash'])
        const replacements = get_arg_text(args, 2, ['replacements'])
        const parsed = is_object_record(structured_payload) ? structured_payload : null
        const new_hash = to_message_text(parsed?.hash).trim()
        return {
            param_rows: [{ label: t('文件'), value: path || '-' }],
            result_rows: [
                { label: t('结果'), value: to_preview_text(message.content, 120) },
                ...(new_hash ? [{ label: 'hash', value: new_hash }] : [ ]),
            ],
            param_details: compact_sections([
                create_compact_text_detail('hash', 'hash', hash, 80),
                create_json_detail('replacements', t('查看替换'), parse_json_or_text(replacements)),
            ]),
        }
    }} />
}


function VfsSearchRenderer (props: ToolRendererProps) {
    return <ParamResultSection props={props} build_data={({ args, structured_payload }) => ({
        param_rows: [{ label: t('搜索'), value: to_preview_text(get_arg_text(args, 0, ['query']) || args, 120) }],
        result_details: compact_sections([
            create_json_detail('search-result', t('查看搜索结果'), structured_payload),
        ]),
    })} />
}


function VfsDeleteRenderer (props: ToolRendererProps) {
    return <ParamResultSection props={props} build_data={({ args, message }) => {
        const path = get_named_arg_text(args)
        return {
            param_rows: [{ label: t('文件'), value: path || '-' }],
            result_rows: [{ label: t('结果'), value: to_preview_text(message.content, 120) }],
        }
    }} />
}


function ExecuteFileRenderer (props: ToolRendererProps) {
    return <ParamResultSection props={props} build_data={({ args, message, structured_payload, tool_name, is_outcome }) => {
        const path = get_named_arg_text(args)
        const outcome = is_outcome ? render_outcome_detail(message, structured_payload) : null
        return {
            param_rows: [{ label: t('脚本'), value: path || '-' }],
            result_details: compact_sections([
                outcome ? { key: 'result', label: get_outcome_toggle_label(message, tool_name), children: outcome } : null,
            ]),
        }
    }} />
}


function StepCreateRenderer (props: ToolRendererProps) {
    return <ParamResultSection props={props} build_data={({ args, message }) => {
        const first = normalize_args(args)[0]
        const tasks = is_object_record(first) && first.tasks !== undefined
            ? (Array.isArray(first.tasks) ? first.tasks : [first.tasks]).map(item => to_message_text(item).trim()).filter(Boolean)
            : normalize_args(args).map(item => to_message_text(item).trim()).filter(Boolean)
        return {
            param_rows: [{ label: t('任务'), value: String(tasks.length) }],
            result_rows: [{ label: t('结果'), value: to_preview_text(message.content, 120) }],
            param_details: compact_sections([
                tasks.length > 1 ? create_text_detail('tasks', t('查看任务'), tasks.join('\n')) : null,
            ]),
        }
    }} />
}


function StepUpdateRenderer (props: ToolRendererProps) {
    return <ParamResultSection props={props} build_data={({ args, message }) => {
        const index = get_arg_text(args, 0, ['index'])
        const checked = get_arg_text(args, 1, ['checked'])
        return {
            param_rows: [
                { label: t('索引'), value: index || '-' },
                { label: t('状态'), value: checked || '-' },
            ],
            result_rows: [{ label: t('结果'), value: to_preview_text(message.content, 120) }],
        }
    }} />
}


function StepClearRenderer (props: ToolRendererProps) {
    return <ParamResultSection props={props} build_data={({ message }) => ({
        result_rows: [{ label: t('结果'), value: to_preview_text(message.content, 120) }],
    })} />
}


function WorkspaceStateReadRenderer (props: ToolRendererProps) {
    return <ParamResultSection props={props} build_data={({ message }) => ({
        result_details: compact_sections([
            create_text_detail('workspace-state', t('查看内容'), message.content),
        ]),
    })} />
}


function WorkspaceStateUpdateRenderer (props: ToolRendererProps) {
    return <ParamResultSection props={props} build_data={({ args, message }) => {
        const old_string = get_arg_text(args, 0, ['old_string', 'oldString'])
        const new_string = get_arg_text(args, 1, ['new_string', 'newString'])
        return {
            result_rows: [{ label: t('结果'), value: to_preview_text(message.content, 120) }],
            param_details: compact_sections([
                create_compact_text_detail('old-state', t('查看原内容'), old_string, 80),
                create_compact_text_detail('new-state', t('查看新内容'), new_string, 80),
            ]),
        }
    }} />
}


function SkillReadRenderer (props: ToolRendererProps) {
    return <ParamResultSection props={props} build_data={({ args, message, structured_payload }) => {
        const skill_id = get_arg_text(args, 0, ['skill_id', 'skillId'])
        const parsed = is_object_record(structured_payload) ? structured_payload : null
        const nested_skill_data = Array.isArray(parsed?.data) ? parsed.data[0] : null
        const skill_obj = is_object_record(nested_skill_data) ? nested_skill_data : parsed
        const skill_name = skill_obj?.displayName ?? skill_obj?.name ?? skill_obj?.skillName ?? '-'
        const description = skill_obj?.description
        const instruction = skill_obj?.instruction
        const files = Array.isArray(skill_obj?.files)
            ? skill_obj.files
            : is_object_record(skill_obj?.filesDetail) && Array.isArray(skill_obj.filesDetail.items)
                ? skill_obj.filesDetail.items
                : [ ]
        return {
            param_rows: [{ label: 'skillId', value: skill_id || '-' }],
            result_rows: [
                { label: t('技能'), value: to_preview_text(skill_name, 80) },
                { label: t('文件'), value: String(files.length) },
            ],
            result_details: compact_sections([
                create_compact_text_detail('description', t('查看描述'), description ?? message.content, 100),
                create_markdown_detail('instruction', t('查看技能指令'), instruction),
                create_json_detail('file-tree', t('查看文件目录'), skill_obj?.fileTree),
            ]),
        }
    }} />
}


function extract_mcp_text (value: unknown): string {
    if (typeof value === 'string')
        return value
    if (Array.isArray(value)) {
        const texts = value.map(item => {
            if (typeof item === 'string')
                return item
            if (is_object_record(item))
                return to_message_text(item.text ?? item.content).trim()
            return ''
        }).filter(Boolean)
        return texts.join('\n')
    }
    if (is_object_record(value))
        return to_message_text(value.text ?? value.message ?? value.content).trim()
    return ''
}


export function McpToolResultRenderer (props: ToolRendererProps) {
    return <ParamResultSection props={props} build_data={({ message, structured_payload, tool_name }) => {
        const parsed = is_object_record(structured_payload) ? structured_payload : null
        const preview = is_object_record(parsed?.preview) ? parsed.preview : null
        const content_value = preview?.content ?? parsed?.content ?? message.content
        const normalized_content = typeof content_value === 'string' ? parse_json_or_text(content_value) : content_value
        const raw_value = preview?.raw ?? preview ?? structured_payload
        const is_error = message.messageType === 'tool_error' || parsed?.ok === false || preview?.ok === false || preview?.isError === true
        const server_id = to_message_text(preview?.mcpServerId ?? preview?.serverId).trim()
        const original_name = to_message_text(preview?.originalName ?? preview?.toolName ?? parsed?.tool ?? tool_name).trim()
        const error = to_message_text(parsed?.error ?? preview?.error ?? preview?.message).trim()
        const content_text = extract_mcp_text(normalized_content).trim()
        
        return {
            result_rows: [
                { label: 'MCP', value: <Text type={is_error ? 'danger' : 'success'}>{is_error ? t('调用失败') : t('调用成功')}</Text> },
                server_id && { label: 'Server', value: server_id },
                original_name && { label: 'Tool', value: original_name },
                error && { label: t('错误'), value: to_preview_text(error, 160) },
                content_text && { label: t('结果'), value: to_preview_text(content_text, 180) },
            ].filter(Boolean),
            
            result_details: compact_sections([
                error ? create_text_detail('mcp-error', t('查看错误'), error) : null,
                content_text
                    ? create_markdown_detail('mcp-content-text', t('查看内容'), content_text)
                    : create_json_detail('mcp-content', t('查看内容'), normalized_content),
                create_json_detail('mcp-raw', t('查看原始响应'), raw_value),
            ])
        }
    }} />
}


export function FallbackRenderer (props: ToolRendererProps) {
    return <ParamResultSection props={props} build_data={({ args, message, structured_payload, is_outcome }) => {
        const arg_list = normalize_args(args)
        return {
            param_rows: arg_list.length > 0
                ? [{ label: t('参数'), value: to_preview_text(arg_list[0], 120) }]
                : [ ],
            result_rows: is_outcome
                ? [{ label: t('结果'), value: to_preview_text(message.content, 120) }]
                : [ ],
            param_details: compact_sections([
                arg_list.length > 1 || (arg_list.length === 1 && typeof arg_list[0] !== 'string')
                    ? create_json_detail('args', t('查看参数'), args)
                    : create_compact_text_detail('arg0', t('查看参数'), arg_list[0], 80)
            ]),
            result_details: compact_sections([
                create_json_detail('structured', t('查看结果'), structured_payload),
                !structured_payload ? create_compact_text_detail('text', t('查看结果'), message.content, 120) : null,
            ]),
        }
    }} />
}


export function AgentErrorRenderer ({ chat, message }: ToolRendererProps) {
    const content = message.content.trim() || t('助手执行出现错误')
    return <div
        style={{
            marginLeft: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
            wordBreak: 'break-word',
        }}
    >
        <Text type='danger'>{content}</Text>
        <Button size='small' icon={<RedoOutlined />} onClick={() => { chat.runtime.retry_last_message() }}>
            {t('重试')}
        </Button>
    </div>
}


export const TOOL_RENDERERS: Record<string, (props: ToolRendererProps) => React.ReactNode> = {
    coldefs: props => <ColdefsRenderer {...props} />,
    testsql: props => <TestsqlRenderer {...props} />,
    show: props => <ExecuteLikeRenderer {...props} />,
    execute: props => <ExecuteLikeRenderer {...props} />,
    execute_file: props => <ExecuteFileRenderer {...props} />,
    skill_read: props => <SkillReadRenderer {...props} />,
    doc_search: props => <DocSearchRenderer {...props} />,
    doc_read: props => <DocReadRenderer {...props} />,
    vfs_list: props => <VfsListRenderer {...props} />,
    vfs_create: props => <VfsCreateRenderer {...props} />,
    vfs_read: props => <VfsReadRenderer {...props} />,
    vfs_search: props => <VfsSearchRenderer {...props} />,
    vfs_update: props => <VfsUpdateRenderer {...props} />,
    vfs_delete: props => <VfsDeleteRenderer {...props} />,
    step_create: props => <StepCreateRenderer {...props} />,
    step_update: props => <StepUpdateRenderer {...props} />,
    step_clear: props => <StepClearRenderer {...props} />,
    workspace_state_read: props => <WorkspaceStateReadRenderer {...props} />,
    workspace_state_update: props => <WorkspaceStateUpdateRenderer {...props} />,
}
