import { Button, Collapse, Typography } from 'antd'
import { RedoOutlined } from '@ant-design/icons'

import { t } from '@i18n'
import { chat_model } from '@/agent/model.ts'
import { no_available_llm_config_message } from '@/agent/model/agent.ts'
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
    const is_waiting_approval = pending_script_approval?.messageId === message.msgId
    const script = get_arg_text(args, 0, ['script']) || (is_waiting_approval ? pending_script_approval?.script : '') || ''
    
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
    const { pending_script_approval } = props.chat.use(['pending_script_approval'])
    if (!props.is_outcome && pending_script_approval?.messageId === props.message.msgId)
        return <ExecuteLikeRenderer {...props} args={{ script: pending_script_approval.script }} />
    
    return <ParamResultSection props={props} build_data={({ args, message, structured_payload }) => {
        const table_handle = get_arg_text(args, 0, ['table'])
        const parsed = is_object_record(structured_payload) ? structured_payload : null
        const raw_columns = Array.isArray(parsed?.columns) && parsed.columns.every(is_object_record)
            ? parsed.columns
            : parsed?.data
        const columns = Array.isArray(raw_columns) ? raw_columns.filter(is_object_record) : [ ]
        const column_names = columns.map(column => to_message_text(column.name)).filter(Boolean)
        return {
            param_rows: [{ label: t('表'), value: table_handle || '-' }],
            result_rows: [
                { label: t('字段'), value: column_names.length ? column_names.join(', ') : to_preview_text(message.content, 140) },
            ],
            result_details: compact_sections([
                create_json_detail('structured', t('查看详情'), structured_payload),
            ]),
        }
    }} />
}


function TestsqlRenderer (props: ToolRendererProps) {
    const { pending_script_approval } = props.chat.use(['pending_script_approval'])
    if (!props.is_outcome && pending_script_approval?.messageId === props.message.msgId)
        return <ExecuteLikeRenderer {...props} args={{ script: pending_script_approval.script }} />
    
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


function render_doc_search_results (results: unknown[]) {
    return results.map((item, index) => {
        const record = is_object_record(item) ? item : null
        const id = to_message_text(record?.id).trim()
        const title = to_message_text(record?.title).trim()
        const summary = clean_doc_search_summary(record?.summary)
        const url = to_message_text(record?.url).trim()
        return <div className='ai-doc-search-result' key={id || `${title}-${index}`}>
            <div className='ai-doc-search-result-title'>
                <span className='ai-doc-search-result-index'>{index + 1}</span>
                {url
                    ? <Typography.Link href={url} target='_blank' rel='noreferrer'>{title || id || '-'}</Typography.Link>
                    : <Text>{title || id || '-'}</Text>}
            </div>
            {summary && <Text type='secondary' className='ai-doc-search-result-summary'>{summary}</Text>}
        </div>
    })
}


function DocSearchRenderer (props: ToolRendererProps) {
    if (!props.is_outcome)
        return null
        
    return <ParamResultSection props={props} build_data={({ args, structured_payload }) => {
        const query = get_arg_text(args, 0, ['query'])
        const parsed = is_object_record(structured_payload) ? structured_payload : null
        const results = Array.isArray(parsed?.results) ? parsed.results : [ ]
        return {
            result_rows: [{ label: t('文档搜索'), value: `${query || '-'}，${t('匹配')} ${results.length} ${t('条文档')}` }],
            result_details: compact_sections([
                results.length ? {
                    key: 'doc-search-candidates',
                    label: t('查看候选文档'),
                    children: <div className='ai-doc-search-results'>{render_doc_search_results(results)}</div>,
                } : null,
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


function get_kb_source_text (item: Record<string, unknown>) {
    const source = is_object_record(item.source) ? item.source : { }
    const file_name = to_message_text(item.file || item.fileName || source.fileName)
    const page_no = item.pageNo !== undefined && item.pageNo !== null
        ? Number(item.pageNo)
        : (source.pageNo !== undefined && source.pageNo !== null ? Number(source.pageNo) : null)
    return file_name ? `${file_name}${page_no !== null ? ` (P.${page_no})` : ''}` : ''
}


function KbChunkSource ({ item }: { item: Record<string, unknown> }) {
    const source_text = get_kb_source_text(item)
    return source_text
        ? <Text type='secondary' style={{ display: 'block', fontSize: 11, marginBottom: 4 }} ellipsis={{ tooltip: source_text }}>
            {source_text}
        </Text>
        : null
}


function KbListRenderer (props: ToolRendererProps) {
    return <ParamResultSection props={props} build_data={({ message, structured_payload }) => {
        const parsed = is_object_record(structured_payload) ? structured_payload : null
        const raw_kbs = Array.isArray(parsed?.knowledgeBases)
            ? parsed.knowledgeBases
            : Array.isArray(parsed?.items)
                ? parsed.items
                : [ ]
        const items = raw_kbs.filter(is_object_record)
        return {
            result_rows: [
                { label: t('知识库'), value: t('共 {{count}} 个可用知识库', { count: items.length }) },
            ],
            result_details: compact_sections([
                items.length ? {
                    key: 'kb-list-items',
                    label: t('查看知识库列表'),
                    children: <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {items.map((kb, idx) => <div key={to_message_text(kb.knowledgeBaseId) || idx} style={{ padding: '4px 8px', background: 'var(--ant-color-fill-quaternary)', borderRadius: 4 }}>
                                <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span>{to_message_text(kb.name) || to_message_text(kb.knowledgeBaseId)}</span>
                                    <Text type='secondary' style={{ fontSize: 11 }}>({to_message_text(kb.knowledgeBaseId)})</Text>
                                </div>
                                {to_message_text(kb.description) && <Text type='secondary' style={{ fontSize: 12 }}>{to_message_text(kb.description)}</Text>}
                            </div>)}
                    </div>,
                } : null,
                !items.length ? create_compact_text_detail('text', t('查看结果'), message.content, 120) : null,
            ]),
        }
    }} />
}


function RetrievalSearchRenderer (props: ToolRendererProps) {
    return <ParamResultSection props={props} build_data={({ args, message, structured_payload, is_outcome }) => {
        const is_attachment_search = props.tool_name === 'attachment_search'
        const kb_id = is_attachment_search ? '' : get_arg_text(args, 0, ['knowledge_base_id', 'knowledgeBaseId'])
        const query = get_arg_text(args, is_attachment_search ? 0 : 1, ['query'])
        const normalized_args = normalize_args(args)
        const first_arg = normalized_args[0]
        const raw_attachment_ids = !is_attachment_search
            ? undefined
            : is_object_record(first_arg)
                ? first_arg.attachment_ids ?? first_arg.attachmentIds
                : normalized_args[1]
        const attachment_ids = Array.isArray(raw_attachment_ids)
            ? raw_attachment_ids.map(to_message_text).filter(Boolean).join(', ')
            : to_message_text(raw_attachment_ids)
        const parsed = is_object_record(structured_payload) ? structured_payload : null
        const items = Array.isArray(parsed?.items) ? parsed.items.filter(is_object_record) : [ ]
        const status = to_message_text(parsed?.resultStatus)
        
        return {
            param_rows: [
                { label: t('检索词'), value: query || '-' },
                ...(kb_id ? [{ label: t('知识库'), value: kb_id }] : [ ]),
                ...(attachment_ids ? [{ label: 'attachmentIds', value: attachment_ids }] : [ ]),
            ],
            result_rows: is_outcome ? [
                {
                    label: t('检索结果'),
                    value: items.length > 0
                        ? t('召回 {{count}} 条相关片段', { count: items.length })
                        : status === 'NO_RELEVANT_EVIDENCE' ? t('未找到相关内容') : to_preview_text(message.content, 120),
                },
            ] : [ ],
            result_details: compact_sections([
                items.length ? {
                    key: 'retrieval-search-results',
                    label: t('查看召回片段'),
                    children: <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {items.map((item, idx) => {
                            const source_text = get_kb_source_text(item)
                            const content = to_message_text(item.content)
                            return <div key={to_message_text(item.chunkId) || idx} style={{ padding: 8, background: 'var(--ant-color-fill-quaternary)', borderRadius: 6 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <Text strong style={{ minWidth: 0, fontSize: 12 }} ellipsis={{ tooltip: source_text }}>
                                        {source_text || `Chunk #${idx + 1}`}
                                    </Text>
                                    <Text type='secondary' style={{ fontSize: 11 }}>{to_message_text(item.chunkId)}</Text>
                                </div>
                                <div style={{ fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap', maxHeight: 200, overflowY: 'auto' }}>
                                    {content}
                                </div>
                            </div>
                        })}
                    </div>,
                } : null,
                !items.length ? create_compact_text_detail('text', t('查看结果'), message.content, 120) : null,
            ]),
        }
    }} />
}


function KbReadRenderer (props: ToolRendererProps) {
    return <ParamResultSection props={props} build_data={({ args, message, structured_payload, is_outcome }) => {
        const chunk_id = get_arg_text(args, 1, ['chunk_id', 'chunkId']) || get_arg_text(args, 0, ['chunk_id', 'chunkId'])
        const parsed = is_object_record(structured_payload) ? structured_payload : null
        
        const has_stitched_content = typeof parsed?.content === 'string'
        const file_name = to_message_text(parsed?.file || parsed?.fileName)
        const page_no = parsed?.pageNo !== undefined && parsed?.pageNo !== null ? Number(parsed.pageNo) : null
        const source_desc = file_name ? `${file_name}${page_no !== null ? ` (P.${page_no})` : ''}` : ''
        const content_str = to_message_text(parsed?.content)
        
        const item = is_object_record(parsed?.item) ? parsed.item : null
        const before = Array.isArray(parsed?.before) ? parsed.before.filter(is_object_record) : [ ]
        const after = Array.isArray(parsed?.after) ? parsed.after.filter(is_object_record) : [ ]
        const total_chunks = (item ? 1 : 0) + before.length + after.length
        
        return {
            param_rows: [
                { label: 'chunkId', value: chunk_id || to_message_text(item?.chunkId) || '-' },
                ...(source_desc ? [{ label: t('来源'), value: source_desc }] : [ ]),
            ],
            result_rows: is_outcome ? [
                {
                    label: t('读取结果'),
                    value: has_stitched_content
                        ? (content_str ? t('读取成功') : to_preview_text(message.content, 120))
                        : (total_chunks > 0 ? t('共读取 {{count}} 个片段', { count: total_chunks }) : to_preview_text(message.content, 120)),
                },
            ] : [ ],
            result_details: compact_sections([
                has_stitched_content && content_str ? create_markdown_detail('kb-content', t('查看完整正文'), content_str) : null,
                !has_stitched_content && total_chunks > 0 ? {
                    key: 'kb-read-chunks',
                    label: t('查看完整正文'),
                    children: <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {before.map((b, idx) => <div key={`before-${idx}`} style={{ padding: 8, background: 'var(--ant-color-fill-quaternary)', borderRadius: 6, opacity: 0.85 }}>
                                <Text type='secondary' style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>{t('前置片段')} ({to_message_text(b.chunkId)})</Text>
                                <KbChunkSource item={b} />
                                <div style={{ fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{to_message_text(b.content)}</div>
                            </div>)}
                        {item && <div style={{ padding: 8, background: 'var(--ant-color-primary-bg)', border: '1px solid var(--ant-color-primary-border)', borderRadius: 6 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <Text strong style={{ color: 'var(--ant-color-primary)' }}>{t('目标片段')}</Text>
                                <Text type='secondary' style={{ fontSize: 11 }}>{to_message_text(item.chunkId)}</Text>
                            </div>
                            <KbChunkSource item={item} />
                            <div style={{ fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{to_message_text(item.content)}</div>
                        </div>}
                        {after.map((a, idx) => <div key={`after-${idx}`} style={{ padding: 8, background: 'var(--ant-color-fill-quaternary)', borderRadius: 6, opacity: 0.85 }}>
                                <Text type='secondary' style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>{t('后置片段')} ({to_message_text(a.chunkId)})</Text>
                                <KbChunkSource item={a} />
                                <div style={{ fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{to_message_text(a.content)}</div>
                            </div>)}
                    </div>,
                } : null,
                !content_str && total_chunks === 0 ? create_compact_text_detail('text', t('查看结果'), message.content, 120) : null,
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
    const { pending_script_approval } = props.chat.use(['pending_script_approval'])
    if (!props.is_outcome && pending_script_approval?.messageId === props.message.msgId)
        return <>
            <SummaryBox
                rows={[{ label: t('脚本'), value: get_named_arg_text(props.args) || '-' }]}
                collapse_key_prefix={`${props.collapse_key_suffix}-path`}
            />
            <ExecuteLikeRenderer {...props} args={{ script: pending_script_approval.script }} />
        </>
        
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
    const llm_config_unavailable = Boolean(chat.agent_id && !chat.agent.has_available_llm_config())
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
        <Text type='danger'>{llm_config_unavailable ? no_available_llm_config_message() : content}</Text>
        {llm_config_unavailable
            ? <Button size='small' type='link' onClick={() => { chat_model.set({ settings_visible: true }) }}>
                {t('前往配置')}
            </Button>
            : <Button size='small' icon={<RedoOutlined />} onClick={() => { chat.runtime.retry_last_message() }}>
                {t('重试')}
            </Button>}
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
    kb_list: props => <KbListRenderer {...props} />,
    kb_search: props => <RetrievalSearchRenderer {...props} />,
    attachment_search: props => <RetrievalSearchRenderer {...props} />,
    kb_read: props => <KbReadRenderer {...props} />,
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
