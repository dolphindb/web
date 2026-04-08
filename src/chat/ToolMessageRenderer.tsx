import { Collapse, Typography } from 'antd'

import { marked } from 'marked'

import { t } from '@i18n'

import type { IMessage } from './model.ts'
import {
    type ToolCallViewModel,
    normalize_args,
    get_arg_text,
    to_message_text,
    to_preview_text,
    is_object_record,
    parse_maybe_json,
    format_pretty_json,
    should_use_structured_render,
    get_structured_label,
} from './utils/message.ts'


const { Text } = Typography


interface ToolRendererProps {
    message: IMessage
    tool_name: string
    current_tool_call: ToolCallViewModel | null
    previous_tool_call: ToolCallViewModel | null
    structured_payload: Record<string, unknown> | unknown[] | null
    collapse_key_suffix: string
    args: unknown
    is_outcome: boolean
    has_paired_tool_call: boolean
}

interface ParamResultRow {
    label: string
    value: string
}


const PRE_STYLE: React.CSSProperties = {
    marginTop: 6,
    marginBottom: 0,
    padding: '8px 10px',
    background: '#fafafa',
    borderLeft: '3px solid #d9d9d9',
    overflowX: 'auto',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
}

const ROW_STYLE: React.CSSProperties = { marginBottom: 4, wordBreak: 'break-word' }


function render_markdown (content: string): string {
    try {
        return marked.parse(content) as string
    } catch {
        return content
    }
}


function get_table_like_summary (payload: unknown): { rows: number, columns: string[] } | null {
    if (Array.isArray(payload)) {
        if (payload.length === 0)
            return { rows: 0, columns: [ ] }
        const first = payload[0]
        if (is_object_record(first))
            return { rows: payload.length, columns: Object.keys(first) }
        return { rows: payload.length, columns: [ ] }
    }
    
    if (!is_object_record(payload))
        return null
    
    if (Array.isArray(payload.data)) {
        const rows = payload.data.filter(item => item != null).length
        const first = payload.data[0]
        const columns = is_object_record(first) ? Object.keys(first) : [ ]
        return { rows, columns }
    }
    
    const keys = Object.keys(payload)
    if (keys.length === 0)
        return null
    const first_val = payload[keys[0]]
    if (Array.isArray(first_val))
        return { rows: first_val.length, columns: keys }
    
    return null
}


function RenderRows ({ rows }: { rows: ParamResultRow[] }) {
    if (rows.length === 0)
        return <Text type='secondary'>-</Text>
    
    return <>
        {rows.map(row =>
            <div key={`${row.label}-${row.value}`} style={ROW_STYLE}>
                <Text strong>{row.label}：</Text>
                <Text>{row.value || '-'}</Text>
            </div>
        )}
    </>
}


function ParamResultSection ({ props, build_rows }: {
    props: ToolRendererProps
    build_rows: (p: ToolRendererProps) => { param_rows: ParamResultRow[], result_rows: ParamResultRow[] }
}) {
    const { param_rows, result_rows } = build_rows(props)
    const show_params = !props.is_outcome || !props.has_paired_tool_call
    const show_results = props.is_outcome && result_rows.length > 0
    
    return <div style={{ marginLeft: 12, marginTop: 2 }}>
        {show_params && <div style={{ marginBottom: show_results ? 8 : 0 }}>
            <Text type='secondary' style={{ fontSize: 12 }}>{t('参数')}</Text>
            <div style={{ marginTop: 4 }}><RenderRows rows={param_rows} /></div>
        </div>}
        {show_results && <div>
            <Text type='secondary' style={{ fontSize: 12 }}>{t('结果')}</Text>
            <div style={{ marginTop: 4 }}><RenderRows rows={result_rows} /></div>
        </div>}
    </div>
}


function ExecuteLikeRenderer (props: ToolRendererProps) {
    const { message, args, structured_payload, is_outcome, collapse_key_suffix } = props
    
    if (!is_outcome)
        return <div style={{ marginTop: 2 }}>
            <Collapse
                ghost
                size='small'
                expandIconPosition='start'
                style={{ marginTop: 0 }}
                items={[{
                    key: `tool-call-args-${collapse_key_suffix}`,
                    label: t('参数'),
                    children: <pre style={PRE_STYLE}>{format_pretty_json(args)}</pre>,
                }]}
            />
        </div>
    
    const use_structured = should_use_structured_render(message, structured_payload)
    if (use_structured)
        return <div style={{ marginTop: 2 }}>
            <Collapse
                ghost
                size='small'
                expandIconPosition='start'
                style={{ marginTop: 0 }}
                items={[{
                    key: `structured-content-${collapse_key_suffix}`,
                    label: get_structured_label(message),
                    children: <pre style={PRE_STYLE}>{structured_payload ? format_pretty_json(structured_payload) : message.content}</pre>,
                }]}
            />
        </div>
    
    if (!message.content.trim())
        return null
    
    return <div style={{ wordBreak: 'break-word', marginLeft: 12 }}>
        <div dangerouslySetInnerHTML={{ __html: render_markdown(message.content) }} />
    </div>
}


function ColdefsRenderer (props: ToolRendererProps) {
    return <ParamResultSection props={props} build_rows={({ args, message, structured_payload }) => {
        const table_handle = get_arg_text(args, 0)
        const summary = get_table_like_summary(structured_payload)
        return {
            param_rows: [{ label: '表句柄', value: table_handle || '-' }],
            result_rows: [
                { label: '行数', value: summary ? String(summary.rows) : '-' },
                { label: '字段', value: summary && summary.columns.length > 0 ? summary.columns.join(', ') : to_preview_text(message.content, 160) },
            ],
        }
    }} />
}


function TestsqlRenderer (props: ToolRendererProps) {
    return <ParamResultSection props={props} build_rows={({ args, message, structured_payload }) => {
        const table_handle = get_arg_text(args, 0)
        const summary = get_table_like_summary(structured_payload)
        return {
            param_rows: [{ label: '表句柄', value: table_handle || '-' }],
            result_rows: [
                { label: '样例行数', value: summary ? String(summary.rows) : '-' },
                { label: '字段', value: summary && summary.columns.length > 0 ? summary.columns.join(', ') : '-' },
                { label: '摘要', value: to_preview_text(message.content, 140) },
            ],
        }
    }} />
}


function DocSearchRenderer (props: ToolRendererProps) {
    return <ParamResultSection props={props} build_rows={({ args, structured_payload }) => {
        const query = get_arg_text(args, 0)
        const page = get_arg_text(args, 1) || '1'
        const parsed = is_object_record(structured_payload) ? structured_payload : null
        const items = Array.isArray(parsed?.items) ? parsed.items : [ ]
        const first_title = is_object_record(items[0]) ? to_message_text(items[0].title) : ''
        return {
            param_rows: [
                { label: '关键词', value: query || '-' },
                { label: '页码', value: page },
            ],
            result_rows: [
                { label: '命中数量', value: String(items.length) },
                { label: '首条标题', value: first_title ? to_preview_text(first_title, 120) : '-' },
            ],
        }
    }} />
}


function DocReadRenderer (props: ToolRendererProps) {
    return <ParamResultSection props={props} build_rows={({ args, message, structured_payload }) => {
        const url = get_arg_text(args, 0)
        const max_chars = get_arg_text(args, 1) || '50000'
        const parsed = is_object_record(structured_payload) ? structured_payload : null
        return {
            param_rows: [
                { label: '文档地址', value: to_preview_text(url || '-', 100) },
                { label: '最大字符', value: max_chars },
            ],
            result_rows: [
                { label: '标题', value: to_preview_text(parsed?.title ?? '-', 120) },
                { label: '已截断', value: String(parsed?.truncated === true) },
                { label: '内容摘要', value: to_preview_text(parsed?.content ?? message.content, 150) },
            ],
        }
    }} />
}


function VfsListRenderer (props: ToolRendererProps) {
    return <ParamResultSection props={props} build_rows={({ args, message }) => {
        const query_path = get_arg_text(args, 0)
        const lines = message.content.split('\n').map(l => l.trim()).filter(Boolean)
        return {
            param_rows: [{ label: '路径过滤', value: query_path || '(全部)' }],
            result_rows: [
                { label: '文件数', value: String(lines.length) },
                { label: '示例', value: lines.length > 0 ? to_preview_text(lines[0], 120) : '-' },
            ],
        }
    }} />
}


function VfsCreateRenderer (props: ToolRendererProps) {
    return <ParamResultSection props={props} build_rows={({ args, message }) => {
        const path = get_arg_text(args, 0)
        const content = get_arg_text(args, 1)
        return {
            param_rows: [
                { label: '文件路径', value: path || '-' },
                { label: '内容长度', value: String(content.length) },
            ],
            result_rows: [{ label: '结果', value: to_preview_text(message.content, 180) }],
        }
    }} />
}


function VfsReadRenderer (props: ToolRendererProps) {
    return <ParamResultSection props={props} build_rows={({ args, message }) => {
        const path = get_arg_text(args, 0)
        return {
            param_rows: [{ label: '文件路径', value: path || '-' }],
            result_rows: [
                { label: '内容长度', value: String(message.content.length) },
                { label: '内容摘要', value: to_preview_text(message.content, 180) },
            ],
        }
    }} />
}


function VfsUpdateRenderer (props: ToolRendererProps) {
    return <ParamResultSection props={props} build_rows={({ args, message }) => {
        const path = get_arg_text(args, 0)
        const old_string = get_arg_text(args, 1)
        const new_string = get_arg_text(args, 2)
        return {
            param_rows: [
                { label: '文件路径', value: path || '-' },
                { label: '原字符串长度', value: String(old_string.length) },
                { label: '新字符串长度', value: String(new_string.length) },
            ],
            result_rows: [{ label: '结果', value: to_preview_text(message.content, 180) }],
        }
    }} />
}


function VfsDeleteRenderer (props: ToolRendererProps) {
    return <ParamResultSection props={props} build_rows={({ args, message }) => {
        const path = get_arg_text(args, 0)
        return {
            param_rows: [{ label: '文件路径', value: path || '-' }],
            result_rows: [{ label: '结果', value: to_preview_text(message.content, 180) }],
        }
    }} />
}


function ExecuteFileRenderer (props: ToolRendererProps) {
    return <ParamResultSection props={props} build_rows={({ args, message }) => {
        const path = get_arg_text(args, 0)
        return {
            param_rows: [{ label: '脚本路径', value: path || '-' }],
            result_rows: [{ label: '执行结果', value: to_preview_text(message.content, 220) }],
        }
    }} />
}


function StepCreateRenderer (props: ToolRendererProps) {
    return <ParamResultSection props={props} build_rows={({ args, message }) => {
        const tasks = normalize_args(args).map(item => to_message_text(item).trim()).filter(Boolean)
        return {
            param_rows: [
                { label: '任务数量', value: String(tasks.length) },
                { label: '首个任务', value: tasks[0] ? to_preview_text(tasks[0], 120) : '-' },
            ],
            result_rows: [{ label: '结果', value: to_preview_text(message.content, 220) }],
        }
    }} />
}


function StepUpdateRenderer (props: ToolRendererProps) {
    return <ParamResultSection props={props} build_rows={({ args, message }) => {
        const index = get_arg_text(args, 0)
        const checked = get_arg_text(args, 1)
        return {
            param_rows: [
                { label: '待办索引', value: index || '-' },
                { label: '完成状态', value: checked || '-' },
            ],
            result_rows: [{ label: '结果', value: to_preview_text(message.content, 220) }],
        }
    }} />
}


function StepClearRenderer (props: ToolRendererProps) {
    return <ParamResultSection props={props} build_rows={({ message }) => ({
        param_rows: [{ label: '参数', value: '无' }],
        result_rows: [{ label: '结果', value: to_preview_text(message.content, 220) }],
    })} />
}


function WorkspaceStateReadRenderer (props: ToolRendererProps) {
    return <ParamResultSection props={props} build_rows={({ message }) => ({
        param_rows: [{ label: '参数', value: '无' }],
        result_rows: [
            { label: '状态长度', value: String(message.content.length) },
            { label: '状态摘要', value: to_preview_text(message.content, 180) },
        ],
    })} />
}


function WorkspaceStateUpdateRenderer (props: ToolRendererProps) {
    return <ParamResultSection props={props} build_rows={({ args, message }) => {
        const old_string = get_arg_text(args, 0)
        const new_string = get_arg_text(args, 1)
        return {
            param_rows: [
                { label: '原文本长度', value: String(old_string.length) },
                { label: '新文本长度', value: String(new_string.length) },
            ],
            result_rows: [{ label: '结果', value: to_preview_text(message.content, 220) }],
        }
    }} />
}


function SkillReadRenderer (props: ToolRendererProps) {
    const { args, message, structured_payload, is_outcome, has_paired_tool_call } = props
    const arg_list = normalize_args(args)
    const skill_id = to_message_text(arg_list[0]).trim()
    const parsed = is_object_record(structured_payload) ? structured_payload : null
    const skill_data = Array.isArray(parsed?.data) ? parsed.data[0] : null
    const skill_obj = is_object_record(skill_data) ? skill_data : null
    const show_params = !is_outcome || !has_paired_tool_call
    const show_results = is_outcome
    
    return <div style={{ marginLeft: 12, marginTop: 2 }}>
        {show_params && <div style={{ marginBottom: show_results ? 8 : 0 }}>
            <Text type='secondary' style={{ fontSize: 12 }}>{t('参数')}</Text>
            <div style={{ marginTop: 4 }}>
                <div style={ROW_STYLE}>
                    <Text strong>skillId：</Text>
                    <Text>{skill_id || '-'}</Text>
                </div>
            </div>
        </div>}
        {show_results && <div>
            <Text type='secondary' style={{ fontSize: 12 }}>{t('结果')}</Text>
            <div style={{ marginTop: 4 }}>
                <div style={ROW_STYLE}>
                    <Text strong>技能：</Text>
                    <Text>{to_preview_text(skill_obj?.skillName ?? '-', 80)}</Text>
                </div>
                <div style={ROW_STYLE}>
                    <Text strong>描述：</Text>
                    <Text>{to_preview_text(skill_obj?.description ?? message.content, 160)}</Text>
                </div>
            </div>
        </div>}
    </div>
}


function FallbackRenderer (props: ToolRendererProps) {
    const { args, message, is_outcome, has_paired_tool_call } = props
    const arg_list = normalize_args(args)
    const param_rows: ParamResultRow[] = arg_list.length > 0
        ? arg_list.map((arg, index) => ({ label: `参数${index + 1}`, value: to_preview_text(arg, 180) }))
        : [{ label: '参数', value: '-' }]
    
    const result_rows: ParamResultRow[] = is_outcome
        ? [{ label: '结果', value: to_preview_text(message.content, 320) }]
        : [ ]
    
    const show_params = !is_outcome || !has_paired_tool_call
    const show_results = is_outcome
    
    return <div style={{ marginLeft: 12, marginTop: 2 }}>
        {show_params && <div style={{ marginBottom: show_results ? 8 : 0 }}>
            <Text type='secondary' style={{ fontSize: 12 }}>{t('参数')}</Text>
            <div style={{ marginTop: 4 }}><RenderRows rows={param_rows} /></div>
        </div>}
        {show_results && <div>
            <Text type='secondary' style={{ fontSize: 12 }}>{t('结果')}</Text>
            <div style={{ marginTop: 4 }}><RenderRows rows={result_rows} /></div>
        </div>}
    </div>
}


const TOOL_RENDERERS: Record<string, (props: ToolRendererProps) => React.ReactNode> = {
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
    vfs_update: props => <VfsUpdateRenderer {...props} />,
    vfs_delete: props => <VfsDeleteRenderer {...props} />,
    step_create: props => <StepCreateRenderer {...props} />,
    step_update: props => <StepUpdateRenderer {...props} />,
    step_clear: props => <StepClearRenderer {...props} />,
    workspace_state_read: props => <WorkspaceStateReadRenderer {...props} />,
    workspace_state_update: props => <WorkspaceStateUpdateRenderer {...props} />,
}


function is_outcome_message (mtype?: string): boolean {
    return mtype === 'tool_result' || mtype === 'skill_result' || mtype === 'tool_error' || mtype === 'agent_error'
}


function resolve_args (current_tool_call: ToolCallViewModel | null, previous_tool_call: ToolCallViewModel | null): unknown {
    if (current_tool_call)
        return current_tool_call.args
    if (previous_tool_call)
        return previous_tool_call.args
    return [ ]
}


export interface ToolMessageRendererProps {
    message: IMessage
    tool_name: string
    current_tool_call: ToolCallViewModel | null
    previous_tool_call: ToolCallViewModel | null
    structured_payload: Record<string, unknown> | unknown[] | null
    collapse_key_suffix: string
}


export function ToolMessageRenderer ({
    message,
    tool_name,
    current_tool_call,
    previous_tool_call,
    structured_payload,
    collapse_key_suffix,
}: ToolMessageRendererProps) {
    const normalized = tool_name.trim().toLowerCase()
    const args = resolve_args(current_tool_call, previous_tool_call)
    const is_outcome = is_outcome_message(message.messageType)
    const has_paired_tool_call = is_outcome && Boolean(previous_tool_call)
    const renderer = TOOL_RENDERERS[normalized]
    
    const renderer_props: ToolRendererProps = {
        message,
        tool_name,
        current_tool_call,
        previous_tool_call,
        structured_payload,
        collapse_key_suffix,
        args,
        is_outcome,
        has_paired_tool_call,
    }
    
    if (!renderer)
        return <FallbackRenderer {...renderer_props} />
    
    return <>{renderer(renderer_props)}</>
}
