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
    render_external_link,
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


function DocSearchRenderer (props: ToolRendererProps) {
    if (!props.is_outcome)
        return null
        
    return <ParamResultSection props={props} build_data={({ args, message, structured_payload }) => {
        const query = get_arg_text(args, 0, ['query'])
        const parsed = is_object_record(structured_payload) ? structured_payload : null
        const total = to_message_text(parsed?.totalSearchItems).trim()
        const items = Array.isArray(parsed?.items) ? parsed.items : [ ]
        const count = total || String(items.length)
        return {
            result_rows: [{ label: t('文档搜索'), value: `${query || '-'}，${t('匹配')} ${count} ${t('条文档')}` }],
        }
    }} />
}


function DocReadRenderer (props: ToolRendererProps) {
    return <ParamResultSection props={props} build_data={({ args, message, structured_payload, is_outcome }) => {
        const url = get_arg_text(args, 0, ['url'])
        const parsed = is_object_record(structured_payload) ? structured_payload : null
        const title = to_message_text(parsed?.title).trim()
        const page_url = to_message_text(parsed?.url).trim()
        const content = to_message_text(parsed?.content ?? message.content).trim()
        
        return {
            param_rows: !is_outcome
                ? [{ label: t('读取文档'), value: to_preview_text(url || '-', 120) }]
                : [ ],
            result_rows: !props.has_paired_tool_call && is_outcome
                ? [{ label: t('读取文档'), value: title || render_external_link(page_url || url) }]
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


function SkillFileReadRenderer (props: ToolRendererProps) {
    return <ParamResultSection props={props} build_data={({ args, message, structured_payload }) => {
        const skill_id = get_arg_text(args, 0, ['skill_id', 'skillId'])
        const first = normalize_args(args)[0]
        const file_paths = is_object_record(first)
            ? [first.file_path, first.filePath, first.file_paths, first.filePaths, first.paths]
                .flatMap(item => Array.isArray(item) ? item : item ? [item] : [ ])
                .map(item => to_message_text(item).trim())
                .filter(Boolean)
            : normalize_args(args).slice(1).map(item => to_message_text(item)).filter(Boolean)
        const parsed = is_object_record(structured_payload) ? structured_payload : null
        const files = Array.isArray(parsed?.files) ? parsed.files.filter(is_object_record) : [ ]
        const single_content = to_message_text(parsed?.content ?? message.content).trim()
        const size = to_message_text(parsed?.size).trim()
        const file_path = to_message_text(parsed?.filePath).trim() || file_paths[0] || ''
        
        if (files.length > 0)
            return {
                param_rows: [
                    { label: 'skillId', value: skill_id || to_message_text(parsed?.skillId).trim() || '-' },
                    { label: t('文件'), value: `${files.length} ${t('个')}` },
                ],
                result_rows: [
                    { label: t('已读取'), value: files.map(file => to_message_text(file.filePath).trim()).filter(Boolean).join(', ') },
                ],
                result_details: compact_sections(files.map((file, index) =>
                    create_text_detail(
                        `content-${index}`,
                        to_message_text(file.filePath).trim() || t('文件 {{index}}', { index: index + 1 }),
                        file.content
                    )
                )),
            }
        
        return {
            param_rows: [
                { label: 'skillId', value: skill_id || '-' },
                { label: t('文件'), value: file_path || '-' },
            ],
            result_rows: size ? [{ label: t('大小'), value: `${size} bytes` }] : [ ],
            result_details: compact_sections([
                create_text_detail('content', t('查看内容'), single_content),
            ]),
        }
    }} />
}


function SkillFileCopyRenderer (props: ToolRendererProps) {
    return <ParamResultSection props={props} build_data={({ args, message, structured_payload }) => {
        const skill_id = get_arg_text(args, 0, ['skill_id', 'skillId'])
        const source_path = get_arg_text(args, 1, ['file_path', 'filePath'])
        const target_path = get_arg_text(args, 2, ['target_path', 'targetPath'])
        const parsed = is_object_record(structured_payload) ? structured_payload : null
        const result_target = to_message_text(parsed?.targetPath ?? parsed?.target_path).trim()
        const hash = to_message_text(parsed?.hash).trim()
        return {
            param_rows: [
                { label: 'skillId', value: skill_id || '-' },
                { label: t('源文件'), value: source_path || '-' },
                { label: t('目标文件'), value: target_path || result_target || '-' },
            ],
            result_rows: [
                ...(result_target ? [{ label: t('已复制'), value: result_target }] : [ ]),
                ...(hash ? [{ label: 'hash', value: hash }] : [ ]),
                ...(!result_target && !hash ? [{ label: t('结果'), value: to_preview_text(message.content, 120) }] : [ ]),
            ],
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
    skill_file_search: props => <VfsSearchRenderer {...props} />,
    skill_file_read: props => <SkillFileReadRenderer {...props} />,
    skill_file_copy: props => <SkillFileCopyRenderer {...props} />,
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
