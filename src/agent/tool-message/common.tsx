import { Button, Collapse, Space, Tooltip, Typography } from 'antd'
import { RedoOutlined } from '@ant-design/icons'
import { marked } from 'marked'
import { useEffect, useState } from 'react'

import { t } from '@i18n'
import { copy } from '@utils'
import { shell } from '@/shell/model.ts'

import type { ChatModel, IMessage } from '@/agent/model.ts'
import {
    type ToolCallViewModel,
    to_message_text,
    to_preview_text,
    is_object_record,
    format_pretty_json,
    should_use_structured_render,
} from '@/agent/utils/message.ts'


const { Text } = Typography

export const MIN_EDITOR_HEIGHT = 120
export const MAX_EDITOR_HEIGHT = 320
export const DETAIL_MAX_HEIGHT = 320

export const STACK_STYLE: React.CSSProperties = {
    marginLeft: 12,
    marginTop: 2,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
}

export const ROW_STYLE: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    lineHeight: '20px',
}

export const LABEL_STYLE: React.CSSProperties = {
    flexShrink: 0,
    color: '#8c8c8c',
}

export const VALUE_STYLE: React.CSSProperties = {
    minWidth: 0,
    wordBreak: 'break-word',
}

export const CODE_VIEWER_STYLE: React.CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    background: '#fff',
    border: '1px solid #f0f0f0',
    borderRadius: 8,
}

export const CODE_VIEWER_ACTION_STYLE: React.CSSProperties = {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
}

export const DETAIL_STYLE: React.CSSProperties = {
    maxHeight: DETAIL_MAX_HEIGHT,
    overflow: 'auto',
    padding: '10px 12px',
    background: '#fff',
    border: '1px solid #f0f0f0',
    borderRadius: 8,
}

export const PRE_STYLE: React.CSSProperties = {
    margin: 0,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    lineHeight: 1.6,
}

export const MARKDOWN_STYLE: React.CSSProperties = {
    wordBreak: 'break-word',
}

export const PRINT_STYLE: React.CSSProperties = {
    ...PRE_STYLE,
    padding: '8px 10px',
    background: '#fff',
    border: '1px solid #f0f0f0',
    borderRadius: 6,
}


export interface ToolRendererProps {
    chat: ChatModel
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

export interface SummaryRow {
    label: string
    value: React.ReactNode
}

export interface DetailSection {
    key: string
    label: string
    children: React.ReactNode
}

export interface SectionData {
    param_rows?: SummaryRow[]
    result_rows?: SummaryRow[]
    param_details?: DetailSection[]
    result_details?: DetailSection[]
}


export function render_markdown (content: string): string {
    try {
        return (marked.parse(content) as string).replace(
            /<pre><code(.*?)>([\s\S]*?)<\/code><\/pre>/g,
            `<pre class="ai-code-block"><button class="ai-code-copy" type="button">${t('复制')}</button><code$1>$2</code></pre>`
        )
    } catch {
        return content
    }
}


export function get_table_like_summary (payload: unknown): { rows: number, columns: string[] } | null {
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


export function get_line_count (text: string) {
    if (!text)
        return 0
        
    return text.split(/\r?\n/).length
}


export function get_editor_height (content: string) {
    const lines = Math.max(get_line_count(content), 1)
    return Math.min(MAX_EDITOR_HEIGHT, Math.max(MIN_EDITOR_HEIGHT, lines * 22 + 20))
}


export function wrap_detail (children: React.ReactNode) {
    return <div style={DETAIL_STYLE}>{children}</div>
}


export function compact_sections (sections: Array<DetailSection | null | undefined>): DetailSection[] {
    return sections.filter((section): section is DetailSection => Boolean(section))
}


export function create_text_detail (key: string, label: string, value: unknown): DetailSection | null {
    const text = to_message_text(value).trim()
    if (!text)
        return null
        
    return {
        key,
        label,
        children: wrap_detail(<pre style={PRE_STYLE}>{text}</pre>),
    }
}


export function create_json_detail (key: string, label: string, value: unknown): DetailSection | null {
    if (value === null || value === undefined)
        return null
        
    return {
        key,
        label,
        children: wrap_detail(<pre style={PRE_STYLE}>{format_pretty_json(value)}</pre>),
    }
}


export function create_markdown_detail (key: string, label: string, value: unknown): DetailSection | null {
    const text = to_message_text(value).trim()
    if (!text)
        return null
        
    return {
        key,
        label,
        children: wrap_detail(<div style={MARKDOWN_STYLE} dangerouslySetInnerHTML={{ __html: render_markdown(text) }} />),
    }
}


export function create_code_view (code: string, action?: React.ReactNode) {
    return <div style={CODE_VIEWER_STYLE}>
        <div style={CODE_VIEWER_ACTION_STYLE}>
            <Space size={6}>
                {create_copy_button(code)}
                {action}
            </Space>
        </div>
        <pre style={{
            ...PRE_STYLE,
            maxHeight: get_editor_height(code),
            overflow: 'auto',
            padding: '42px 10px 10px',
        }}>{code}</pre>
    </div>
}


export function create_copy_button (code: string) {
    return <CodeCopyButton code={code} />
}


function CodeCopyButton ({ code }: { code: string }) {
    const [copied, set_copied] = useState(false)
    
    useEffect(() => {
        if (!copied)
            return
        const timer = setTimeout(() => { set_copied(false) }, 1500)
        return () => { clearTimeout(timer) }
    }, [copied])
    
    return <Button
        size='small'
        onClick={async event => {
            event.stopPropagation()
            try {
                await copy(code)
                set_copied(true)
            } catch (error) {
                console.error('[ai] copy script failed:', error)
            }
        }}
    >
        {copied ? t('已复制') : t('复制')}
    </Button>
}


export function NaturalTextBlock ({ text }: { text: string }) {
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


export function create_rerun_button (tool_name: string, script: string) {
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


export function ScriptApprovalActions ({ chat }: { chat: ChatModel }) {
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
                onClick={() => { chat.runtime.resolve_script_execution_approval('deny') }}
            >
                {t('不允许')}
            </Button>
            <Button
                size='small'
                onClick={() => { chat.runtime.resolve_script_execution_approval('allow_session') }}
            >
                {t('允许且此会话默认允许')}
            </Button>
            <Button
                size='small'
                type='primary'
                onClick={() => { chat.runtime.resolve_script_execution_approval('allow') }}
            >
                {t('允许')}
            </Button>
        </Space>
    </div>
}


export function create_compact_text_detail (key: string, label: string, value: unknown, preview_max_chars = 160): DetailSection | null {
    const text = to_message_text(value).trim()
    if (!text)
        return null
        
    if (text.length <= preview_max_chars && !text.includes('\n'))
        return null
        
    return create_text_detail(key, label, text)
}


export function render_external_link (value: unknown, max_chars = 120) {
    const url = to_message_text(value).trim()
    if (!url)
        return '-'
        
    return <a href={url} target='_blank' rel='noreferrer' style={{ wordBreak: 'break-all' }}>
        {to_preview_text(url, max_chars)}
    </a>
}


export function render_rows (rows: SummaryRow[]) {
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


export function render_details (sections: DetailSection[], collapse_key_prefix: string) {
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


export function SummaryBox ({
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


export function ParamResultSection ({
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


export function get_outcome_toggle_label (message: IMessage, tool_name: string) {
    if (message.messageType === 'tool_error' || message.messageType === 'agent_error')
        return t('查看错误')
    if (tool_name === 'doc_read')
        return t('查看文档内容')
    return t('查看结果')
}


export function render_outcome_detail (message: IMessage, structured_payload: Record<string, unknown> | unknown[] | null) {
    const use_structured = should_use_structured_render(message, structured_payload)
    
    if (use_structured)
        return wrap_detail(<pre style={PRE_STYLE}>{structured_payload ? format_pretty_json(structured_payload) : message.content}</pre>)
        
    const content = message.content.trim()
    if (!content)
        return null
        
    return wrap_detail(<div style={MARKDOWN_STYLE} dangerouslySetInnerHTML={{ __html: render_markdown(content) }} />)
}


export function is_outcome_message (mtype?: string): boolean {
    return mtype === 'tool_result' || mtype === 'skill_result' || mtype === 'tool_error' || mtype === 'agent_error'
}


export function resolve_args (current_tool_call: ToolCallViewModel | null, previous_tool_call: ToolCallViewModel | null): unknown {
    if (current_tool_call)
        return current_tool_call.args
    if (previous_tool_call)
        return previous_tool_call.args
    return [ ]
}
