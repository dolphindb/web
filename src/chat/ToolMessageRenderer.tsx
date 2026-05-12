import { Button, Collapse, Space, Tooltip, Typography } from 'antd'
import { RedoOutlined } from '@ant-design/icons'
import { marked } from 'marked'

import { t } from '@i18n'
import { Editor } from '@components/Editor/index.tsx'
import { shell } from '@/shell/model.ts'

import { chat_model } from './model.ts'
import type { IMessage } from './model.ts'
import {
    type ToolCallViewModel,
    normalize_args,
    get_arg_text,
    to_message_text,
    to_preview_text,
    is_object_record,
    format_pretty_json,
    should_use_structured_render,
} from './utils/message.ts'


const { Text } = Typography

const MIN_EDITOR_HEIGHT = 120
const MAX_EDITOR_HEIGHT = 320
const DETAIL_MAX_HEIGHT = 320

const STACK_STYLE: React.CSSProperties = {
    marginLeft: 12,
    marginTop: 2,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
}

const ROW_STYLE: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    lineHeight: '20px',
}

const LABEL_STYLE: React.CSSProperties = {
    flexShrink: 0,
    color: '#8c8c8c',
}

const VALUE_STYLE: React.CSSProperties = {
    minWidth: 0,
    wordBreak: 'break-word',
}

const CODE_VIEWER_STYLE: React.CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    background: '#fff',
    border: '1px solid #f0f0f0',
    borderRadius: 8,
}

const CODE_VIEWER_ACTION_STYLE: React.CSSProperties = {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
}

const DETAIL_STYLE: React.CSSProperties = {
    maxHeight: DETAIL_MAX_HEIGHT,
    overflow: 'auto',
    padding: '10px 12px',
    background: '#fff',
    border: '1px solid #f0f0f0',
    borderRadius: 8,
}

const PRE_STYLE: React.CSSProperties = {
    margin: 0,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    lineHeight: 1.6,
}

const MARKDOWN_STYLE: React.CSSProperties = {
    wordBreak: 'break-word',
}


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

interface SummaryRow {
    label: string
    value: React.ReactNode
}

interface DetailSection {
    key: string
    label: string
    children: React.ReactNode
}

interface SectionData {
    param_rows?: SummaryRow[]
    result_rows?: SummaryRow[]
    param_details?: DetailSection[]
    result_details?: DetailSection[]
}


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
        const rows = payload.data.filter(item => item !== null && item !== undefined).length
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


function get_line_count (text: string) {
    if (!text)
        return 0
        
    return text.split(/\r?\n/).length
}


function get_editor_height (content: string) {
    const lines = Math.max(get_line_count(content), 1)
    return Math.min(MAX_EDITOR_HEIGHT, Math.max(MIN_EDITOR_HEIGHT, lines * 22 + 20))
}


function wrap_detail (children: React.ReactNode) {
    return <div style={DETAIL_STYLE}>{children}</div>
}


function compact_sections (sections: Array<DetailSection | null | undefined>): DetailSection[] {
    return sections.filter((section): section is DetailSection => Boolean(section))
}


function create_text_detail (key: string, label: string, value: unknown): DetailSection | null {
    const text = to_message_text(value).trim()
    if (!text)
        return null
        
    return {
        key,
        label,
        children: wrap_detail(<pre style={PRE_STYLE}>{text}</pre>),
    }
}


function create_json_detail (key: string, label: string, value: unknown): DetailSection | null {
    if (value === null || value === undefined)
        return null
        
    return {
        key,
        label,
        children: wrap_detail(<pre style={PRE_STYLE}>{format_pretty_json(value)}</pre>),
    }
}


function create_markdown_detail (key: string, label: string, value: unknown): DetailSection | null {
    const text = to_message_text(value).trim()
    if (!text)
        return null
        
    return {
        key,
        label,
        children: wrap_detail(<div style={MARKDOWN_STYLE} dangerouslySetInnerHTML={{ __html: render_markdown(text) }} />),
    }
}


function create_code_view (code: string, action?: React.ReactNode) {
    return <div style={CODE_VIEWER_STYLE}>
        {action && <div style={CODE_VIEWER_ACTION_STYLE}>{action}</div>}
        <Editor
            value={code}
            readonly
            height={get_editor_height(code)}
            options={{
                automaticLayout: true,
                lineNumbers: 'on',
                glyphMargin: false,
                folding: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                overviewRulerBorder: false,
                overviewRulerLanes: 0,
                wordWrap: 'on',
                padding: { top: 10, bottom: 10 },
            }}
        />
    </div>
}


function get_natural_text (payload: Record<string, unknown> | unknown[] | null) {
    if (!is_object_record(payload))
        return ''
    return to_message_text(payload.naturalText ?? payload.text ?? '').trim()
}


function NaturalTextBlock ({ text }: { text: string }) {
    if (!text)
        return null
    return <div
        style={{
            marginLeft: 12,
            marginBottom: 6,
            color: '#595959',
            wordBreak: 'break-word',
        }}
        dangerouslySetInnerHTML={{ __html: render_markdown(text) }}
    />
}


function create_rerun_button (tool_name: string, script: string) {
    const normalized = tool_name.trim().toLowerCase()
    if (normalized !== 'execute' && normalized !== 'show')
        return null
    
    return <Tooltip title={t('再次执行')}>
        <Button
            size='small'
            icon={<RedoOutlined />}
            onClick={event => {
                event.stopPropagation()
                shell.execute_code(script, 1).catch(error => {
                    console.error('[ai] rerun script failed:', error)
                })
            }}
        >
            {t('再次执行')}
        </Button>
    </Tooltip>
}


function ScriptApprovalActions () {
    return <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
        marginTop: 8,
        padding: '8px 10px',
        border: '1px solid #faad14',
        borderRadius: 6,
        background: '#fffbe6',
    }}>
        <Text type='secondary' style={{ fontSize: 12 }}>
            {t('等待允许执行此 DolphinDB 脚本')}
        </Text>
        <Space size={6}>
            <Button
                size='small'
                danger
                onClick={() => { chat_model.resolve_script_execution_approval('deny') }}
            >
                {t('不允许')}
            </Button>
            <Button
                size='small'
                onClick={() => { chat_model.resolve_script_execution_approval('allow_session') }}
            >
                {t('允许且此会话默认允许')}
            </Button>
            <Button
                size='small'
                type='primary'
                onClick={() => { chat_model.resolve_script_execution_approval('allow') }}
            >
                {t('允许')}
            </Button>
        </Space>
    </div>
}


function create_compact_text_detail (key: string, label: string, value: unknown, preview_max_chars = 160): DetailSection | null {
    const text = to_message_text(value).trim()
    if (!text)
        return null
        
    if (text.length <= preview_max_chars && !text.includes('\n'))
        return null
        
    return create_text_detail(key, label, text)
}


function render_external_link (value: unknown, max_chars = 120) {
    const url = to_message_text(value).trim()
    if (!url)
        return '-'
        
    return <a href={url} target='_blank' rel='noreferrer' style={{ wordBreak: 'break-all' }}>
        {to_preview_text(url, max_chars)}
    </a>
}


function render_rows (rows: SummaryRow[]) {
    if (rows.length === 0)
        return null
        
    return <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {rows.map((row, index) =>
            <div key={`${row.label}-${index}`} style={ROW_STYLE}>
                <Text style={LABEL_STYLE}>{row.label}</Text>
                <div style={VALUE_STYLE}>{row.value}</div>
            </div>
        )}
    </div>
}


function render_details (sections: DetailSection[], collapse_key_prefix: string) {
    if (sections.length === 0)
        return null
        
    return <Collapse
        ghost
        size='small'
        destroyOnHidden
        expandIconPosition='start'
        items={sections.map(section => ({
            key: `${collapse_key_prefix}-${section.key}`,
            label: section.label,
            children: section.children,
        }))}
    />
}


function SummaryBox ({
    rows = [ ],
    details = [ ],
    collapse_key_prefix,
}: {
    rows?: SummaryRow[]
    details?: DetailSection[]
    collapse_key_prefix: string
}) {
    if (rows.length === 0 && details.length === 0)
        return null
        
    return <div>
        {render_rows(rows)}
        {rows.length > 0 && details.length > 0 && <div style={{ height: 4 }} />}
        {render_details(details, collapse_key_prefix)}
    </div>
}


function ParamResultSection ({
    props,
    build_data,
}: {
    props: ToolRendererProps
    build_data: (props: ToolRendererProps) => SectionData
}) {
    const {
        param_rows = [ ],
        result_rows = [ ],
        param_details = [ ],
        result_details = [ ],
    } = build_data(props)
    
    const show_params = !props.is_outcome || !props.has_paired_tool_call
    const show_results = props.is_outcome && (result_rows.length > 0 || result_details.length > 0)
    
    return <div style={STACK_STYLE}>
        {show_params && <SummaryBox
            rows={param_rows}
            details={param_details}
            collapse_key_prefix={`${props.collapse_key_suffix}-params`}
        />}
        {show_results && <SummaryBox
            rows={result_rows}
            details={result_details}
            collapse_key_prefix={`${props.collapse_key_suffix}-results`}
        />}
    </div>
}


function get_outcome_toggle_label (message: IMessage, tool_name: string) {
    if (message.messageType === 'tool_error' || message.messageType === 'agent_error')
        return t('查看错误')
    if (tool_name === 'doc_read')
        return t('查看文档内容')
    return t('查看结果')
}


function render_outcome_detail (message: IMessage, structured_payload: Record<string, unknown> | unknown[] | null) {
    const use_structured = should_use_structured_render(message, structured_payload)
    
    if (use_structured)
        return wrap_detail(<pre style={PRE_STYLE}>{structured_payload ? format_pretty_json(structured_payload) : message.content}</pre>)
        
    const content = message.content.trim()
    if (!content)
        return null
        
    return wrap_detail(<div style={MARKDOWN_STYLE} dangerouslySetInnerHTML={{ __html: render_markdown(content) }} />)
}


function ExecuteLikeRenderer (props: ToolRendererProps) {
    const { args, message, structured_payload, collapse_key_suffix, tool_name } = props
    const { pending_script_approval } = chat_model.use(['pending_script_approval'])
    const arg_list = normalize_args(args)
    const script = to_message_text(arg_list[0]).trim()
    const is_waiting_approval = pending_script_approval?.messageId === message.msgId
    
    if (!props.is_outcome)
        return <div style={STACK_STYLE}>
            {script
                ? <>
                    {create_code_view(script, is_waiting_approval ? null : create_rerun_button(tool_name, script))}
                    {is_waiting_approval && <ScriptApprovalActions />}
                </>
                : <SummaryBox
                    rows={[{ label: t('脚本'), value: to_preview_text(args, 160) }]}
                    collapse_key_prefix={`${collapse_key_suffix}-script`}
                />}
        </div>
        
    const outcome = render_outcome_detail(message, structured_payload)
    if (!outcome)
        return null
        
    return <div style={{ marginLeft: 12, marginTop: 2 }}>
        <Collapse
            ghost
            size='small'
            destroyOnHidden
            expandIconPosition='start'
            items={[{
                key: `execute-outcome-${collapse_key_suffix}`,
                label: get_outcome_toggle_label(message, tool_name),
                children: outcome,
            }]}
        />
    </div>
}


function ColdefsRenderer (props: ToolRendererProps) {
    return <ParamResultSection props={props} build_data={({ args, message, structured_payload }) => {
        const table_handle = get_arg_text(args, 0)
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
        const table_handle = get_arg_text(args, 0)
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
        
    return <ParamResultSection props={props} build_data={({ args, structured_payload }) => {
        const query = get_arg_text(args, 0)
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
        const url = get_arg_text(args, 0)
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


function VfsListRenderer (props: ToolRendererProps) {
    return <ParamResultSection props={props} build_data={({ args, message }) => {
        const query_path = get_arg_text(args, 0)
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
    return <ParamResultSection props={props} build_data={({ args, message }) => {
        const path = get_arg_text(args, 0)
        const content = get_arg_text(args, 1)
        return {
            param_rows: [{ label: t('文件'), value: path || '-' }],
            result_rows: [{ label: t('结果'), value: to_preview_text(message.content, 120) }],
            param_details: compact_sections([
                create_compact_text_detail('content', t('查看内容'), content, 80),
            ]),
        }
    }} />
}


function VfsReadRenderer (props: ToolRendererProps) {
    return <ParamResultSection props={props} build_data={({ args, message }) => {
        const path = get_arg_text(args, 0)
        return {
            param_rows: [{ label: t('文件'), value: path || '-' }],
            result_details: compact_sections([
                create_text_detail('content', t('查看内容'), message.content),
            ]),
        }
    }} />
}


function VfsUpdateRenderer (props: ToolRendererProps) {
    return <ParamResultSection props={props} build_data={({ args, message }) => {
        const path = get_arg_text(args, 0)
        const old_string = get_arg_text(args, 1)
        const new_string = get_arg_text(args, 2)
        return {
            param_rows: [{ label: t('文件'), value: path || '-' }],
            result_rows: [{ label: t('结果'), value: to_preview_text(message.content, 120) }],
            param_details: compact_sections([
                create_compact_text_detail('old-content', t('查看原内容'), old_string, 80),
                create_compact_text_detail('new-content', t('查看新内容'), new_string, 80),
            ]),
        }
    }} />
}


function VfsDeleteRenderer (props: ToolRendererProps) {
    return <ParamResultSection props={props} build_data={({ args, message }) => {
        const path = get_arg_text(args, 0)
        return {
            param_rows: [{ label: t('文件'), value: path || '-' }],
            result_rows: [{ label: t('结果'), value: to_preview_text(message.content, 120) }],
        }
    }} />
}


function ExecuteFileRenderer (props: ToolRendererProps) {
    return <ParamResultSection props={props} build_data={({ args, message }) => {
        const path = get_arg_text(args, 0)
        return {
            param_rows: [{ label: t('脚本'), value: path || '-' }],
            result_details: compact_sections([
                create_compact_text_detail('result', t('查看结果'), message.content, 120),
            ]),
        }
    }} />
}


function StepCreateRenderer (props: ToolRendererProps) {
    return <ParamResultSection props={props} build_data={({ args, message }) => {
        const tasks = normalize_args(args).map(item => to_message_text(item).trim()).filter(Boolean)
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
        const index = get_arg_text(args, 0)
        const checked = get_arg_text(args, 1)
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
        const old_string = get_arg_text(args, 0)
        const new_string = get_arg_text(args, 1)
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
        const skill_id = get_arg_text(args, 0)
        const parsed = is_object_record(structured_payload) ? structured_payload : null
        const nested_skill_data = Array.isArray(parsed?.data) ? parsed.data[0] : null
        const skill_obj = is_object_record(nested_skill_data) ? nested_skill_data : parsed
        const skill_name = skill_obj?.displayName ?? skill_obj?.name ?? skill_obj?.skillName ?? '-'
        const description = skill_obj?.description
        const instruction = skill_obj?.instruction
        const files = Array.isArray(skill_obj?.files) ? skill_obj.files : [ ]
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
        const skill_id = get_arg_text(args, 0)
        const file_paths = normalize_args(args).slice(1).map(item => to_message_text(item)).filter(Boolean)
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


function FallbackRenderer (props: ToolRendererProps) {
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


function AgentErrorRenderer ({ message }: ToolRendererProps) {
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
        <Button size='small' icon={<RedoOutlined />} onClick={() => { chat_model.retry_last_message() }}>
            {t('重试')}
        </Button>
    </div>
}


const TOOL_RENDERERS: Record<string, (props: ToolRendererProps) => React.ReactNode> = {
    coldefs: props => <ColdefsRenderer {...props} />,
    testsql: props => <TestsqlRenderer {...props} />,
    show: props => <ExecuteLikeRenderer {...props} />,
    execute: props => <ExecuteLikeRenderer {...props} />,
    execute_file: props => <ExecuteFileRenderer {...props} />,
    skill_read: props => <SkillReadRenderer {...props} />,
    skill_file_read: props => <SkillFileReadRenderer {...props} />,
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
    const natural_text = !is_outcome ? get_natural_text(structured_payload) : ''
    
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
    
    if (message.messageType === 'agent_error')
        return <AgentErrorRenderer {...renderer_props} />
        
    if (!renderer)
        return <>
            <NaturalTextBlock text={natural_text} />
            <FallbackRenderer {...renderer_props} />
        </>
        
    return <>
        <NaturalTextBlock text={natural_text} />
        {renderer(renderer_props)}
    </>
}
