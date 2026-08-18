import { useEffect, useRef, useState } from 'react'

import {
    Button, Empty, message, Popconfirm, Space, Spin, Table, Tag, Tooltip, Typography,
} from 'antd'
import { CheckCircleOutlined, DeleteOutlined, DownloadOutlined, PlusOutlined, ReloadOutlined, StopOutlined } from '@ant-design/icons'

import { language, t } from '@i18n'

import { chat_model } from '@/agent/model.ts'
import type { ISkillInfo } from '@/agent/model.ts'
import {
    DEFAULT_OVERRIDES,
    SkillCreateForm,
    SkillDetailModal,
    decode_skill_file,
    page_total,
    skill_description,
} from './skill/index.ts'


const { Paragraph, Text } = Typography


export function SkillsTab () {
    const [all_skills, set_all_skills] = useState<ISkillInfo[]>([ ])
    const [loading, set_loading] = useState(false)
    const [skill_page, set_skill_page] = useState(1)
    const [skill_page_size, set_skill_page_size] = useState(20)
    const [skill_total, set_skill_total] = useState(0)
    const [creating, set_creating] = useState(false)
    const [form_error, set_form_error] = useState('')
    const [detail_skill, set_detail_skill] = useState<ISkillInfo | null>(null)
    const [skill_instruction, set_skill_instruction] = useState('')
    const [skill_files, set_skill_files] = useState<string[]>([ ])
    const [selected_skill_file, set_selected_skill_file] = useState('')
    const [skill_file_content, set_skill_file_content] = useState('')
    const [loading_detail, set_loading_detail] = useState(false)
    const [skill_file, set_skill_file] = useState<File | null>(null)
    const [downloading_skill_id, set_downloading_skill_id] = useState('')
    const detail_request_ref = useRef(0)
    const file_request_ref = useRef(0)
    const [overrides, set_overrides] = useState({ ...DEFAULT_OVERRIDES })
    
    async function load (page = skill_page, page_size = skill_page_size, known_total?: number) {
        set_loading(true)
        try {
            const offset = (page - 1) * page_size
            const result = await chat_model.skill.load_skill_page({ offset, limit: page_size + 1 })
            const items = result.items.slice(0, page_size)
            if (items.length === 0 && page > 1) {
                await load(page - 1, page_size, (page - 1) * page_size)
                return
            }
            set_all_skills(items)
            set_skill_total(known_total ?? page_total(result.offset, page_size, items.length, result.items.length > page_size, result.total))
            set_skill_page(Math.floor(result.offset / page_size) + 1)
            set_skill_page_size(page_size)
        } catch {
            message.error(t('加载技能列表失败'))
        } finally {
            set_loading(false)
        }
    }
    
    useEffect(() => { load() }, [ ])
    
    async function open_skill_file (file_path: string) {
        if (!detail_skill)
            return
        const skill_id = detail_skill.skillId
        const current_request = ++file_request_ref.current
        setSelected_skill_file_state(file_path)
        set_loading_detail(true)
        try {
            const file_info = await chat_model.skill.get_skill_file(skill_id, file_path)
            if (current_request !== file_request_ref.current)
                return
            set_skill_file_content(decode_skill_file(file_info.content, file_info.encoding))
        } catch (error: any) {
            if (current_request !== file_request_ref.current)
                return
            set_skill_file_content('')
            message.error(error.message || t('加载文件内容失败'))
        } finally {
            if (current_request === file_request_ref.current)
                set_loading_detail(false)
        }
    }
    
    function setSelected_skill_file_state (file_path: string) {
        set_selected_skill_file(file_path)
        set_skill_file_content('')
    }
    
    async function open_skill_detail (skill: ISkillInfo) {
        const current_request = ++detail_request_ref.current
        file_request_ref.current += 1
        set_detail_skill(skill)
        set_skill_instruction('')
        set_skill_files([ ])
        setSelected_skill_file_state('')
        set_loading_detail(true)
        try {
            const [instruction, files] = await Promise.all([
                skill.enabled !== false && skill.hasInstruction !== false
                    ? chat_model.skill.load_skill_instruction(skill.skillId).catch(error => {
                        console.error('Load skill instruction failed:', error)
                        message.error(t('加载技能指令失败'))
                        return null
                    })
                    : null,
                chat_model.skill.load_skill_files(skill.skillId).catch(error => {
                    console.error('Load skill files failed:', error)
                    message.error(t('加载技能文件失败'))
                    return { items: [ ] }
                }),
            ])
            if (current_request !== detail_request_ref.current)
                return
            const file_items = files.items || [ ]
            const file_paths = file_items
                .map(file => typeof file === 'string' ? file : file.filePath)
                .filter((file_path): file_path is string => typeof file_path === 'string' && Boolean(file_path.trim()))
                .map(file_path => file_path.trim())
            if (file_paths.length !== file_items.length)
                message.error(t('技能文件列表格式异常，已忽略无效文件'))
            if (instruction)
                set_skill_instruction(instruction.instruction || instruction.content || JSON.stringify(instruction, null, 2))
            set_skill_files(file_paths)
        } catch (error: any) {
            if (current_request !== detail_request_ref.current)
                return
            message.error(error.message || t('加载技能详情失败'))
        } finally {
            if (current_request === detail_request_ref.current)
                set_loading_detail(false)
        }
    }
    
    async function handle_register_skill () {
        if (!skill_file) {
            set_form_error(t('请选择技能包 ZIP 文件'))
            return
        }
        set_form_error('')
        set_loading(true)
        try {
            const override_obj: Record<string, string> = { }
            for (const [k, v] of Object.entries(overrides))
                if (v.trim())
                    override_obj[k] = v.trim()
                    
            await chat_model.skill.register_skill(
                skill_file,
                Object.keys(override_obj).length > 0 ? override_obj : undefined,
            )
            message.success(t('技能注册成功'))
            set_creating(false)
            set_skill_file(null)
            set_overrides({ ...DEFAULT_OVERRIDES })
            await load(1, skill_page_size)
        } catch (e: any) {
            message.error(e.message || t('注册失败'))
        } finally {
            set_loading(false)
        }
    }
    
    async function download_skill (skill: ISkillInfo) {
        set_downloading_skill_id(skill.skillId)
        try {
            const { blob, filename } = await chat_model.skill.download_skill(skill.skillId)
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = filename || `${(skill.name || skill.skillId).replace(/[\\/:*?"<>|]/g, '_')}.zip`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)
        } catch (error: any) {
            message.error(error.message || t('下载失败'))
        } finally {
            set_downloading_skill_id('')
        }
    }
    
    return <div className='ai-settings-list-detail' style={{ height: '100%' }}>
        <div className='ai-settings-detail-header'>
            <div className='ai-settings-detail-title'>{t('技能管理')}</div>
        </div>
        <div className='ai-settings-detail-body'>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                <Text type='secondary' style={{ fontSize: 12 }}>{t('配置可供 Agent 绑定和调用的技能。')}</Text>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Tooltip title={t('刷新')}>
                        <Button icon={<ReloadOutlined />} disabled={creating} onClick={() => { load() }} />
                    </Tooltip>
                    <Button type='primary' icon={<PlusOutlined />} disabled={creating} onClick={() => {
                        set_creating(true)
                        set_form_error('')
                    }}>
                        {t('注册技能')}
                    </Button>
                </div>
            </div>
            {creating && <SkillCreateForm
                form_error={form_error}
                skill_file={skill_file}
                set_skill_file={set_skill_file}
                overrides={overrides}
                set_overrides={set_overrides}
                loading={loading}
                on_cancel={() => {
                    set_creating(false)
                    set_skill_file(null)
                    set_form_error('')
                    set_overrides({ ...DEFAULT_OVERRIDES })
                }}
                on_submit={handle_register_skill}
            />}
            
            <Spin spinning={loading && !creating}>
                {all_skills.length === 0
                ? <Empty description={t('暂无可用技能，请先创建')} image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 32 }} />
                : <Table
                    size='small'
                    rowKey='skillId'
                    dataSource={all_skills}
                    pagination={{
                        current: skill_page,
                        pageSize: skill_page_size,
                        total: skill_total,
                        showSizeChanger: true,
                        onChange: load,
                    }}
                    tableLayout='fixed'
                    scroll={language === 'en' ? { x: 'max-content' } : undefined}
                    columns={[
                        {
                            title: t('技能'),
                            width: language === 'en' ? 360 : undefined,
                            render: (_: unknown, s: ISkillInfo) => <div style={{ minWidth: 0 }}>
                                <Text title={s.displayName || s.name} style={{ display: 'block', maxWidth: '100%' }} ellipsis>
                                    {s.displayName || s.name}
                                </Text>
                                <Paragraph
                                    type='secondary'
                                    style={{ margin: 0, wordBreak: 'break-word' }}
                                    ellipsis={{ rows: 3, tooltip: skill_description(s) }}
                                >
                                    {skill_description(s)}
                                </Paragraph>
                            </div>,
                        },
                        {
                            title: t('分类'),
                            width: 150,
                            render: (_: unknown, s: ISkillInfo) => s.category
                                ? <Tag title={s.category} style={{ maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', verticalAlign: 'middle' }}>{s.category}</Tag>
                                : '-',
                        },
                        {
                            title: t('版本'),
                            width: 110,
                            render: (_: unknown, s: ISkillInfo) => s.version
                                ? <Tag color='blue' title={`v${s.version}`} style={{ maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', verticalAlign: 'middle' }}>v{s.version}</Tag>
                                : '-',
                        },
                        {
                            title: t('状态'),
                            width: language === 'en' ? 100 : 90,
                            render: (_: unknown, s: ISkillInfo) => <Tag color={s.enabled !== false ? 'green' : 'default'}>{s.enabled !== false ? t('启用') : t('禁用')}</Tag>,
                        },
                        {
                            title: t('操作'),
                            width: language === 'en' ? 410 : 280,
                            fixed: language === 'en' ? 'right' : undefined,
                            render: (_: unknown, s: ISkillInfo) => <Space size={4} style={{ whiteSpace: 'nowrap' }}>
                                <Button size='small' onClick={() => { open_skill_detail(s) }}>{t('详情')}</Button>
                                <Button size='small' icon={<DownloadOutlined />} loading={downloading_skill_id === s.skillId} onClick={() => { download_skill(s) }}>{t('下载')}</Button>
                                {s.enabled === false
                                    ? <Button
                                        size='small'
                                        icon={<CheckCircleOutlined />}
                                        onClick={async () => {
                                            try {
                                                await chat_model.skill.set_skill_enabled(s.skillId, true)
                                                message.success(t('已激活'))
                                                await load(skill_page, skill_page_size)
                                            } catch (e: any) {
                                                message.error(e.message || t('操作失败'))
                                            }
                                        }}
                                    >{t('启用')}</Button>
                                    : <Popconfirm
                                        title={t('确定禁用此技能？')}
                                        onConfirm={async () => {
                                            try {
                                                await chat_model.skill.set_skill_enabled(s.skillId, false)
                                                message.success(t('已禁用'))
                                                await load(skill_page, skill_page_size)
                                            } catch (e: any) {
                                                message.error(e.message || t('操作失败'))
                                            }
                                        }}
                                    >
                                        <Button size='small' icon={<StopOutlined />}>{t('禁用')}</Button>
                                    </Popconfirm>
                                }
                                <Popconfirm
                                    title={t('确定删除此技能？')}
                                    okButtonProps={{ danger: true }}
                                    onConfirm={async () => {
                                        try {
                                            await chat_model.skill.delete_skill(s.skillId)
                                            message.success(t('已删除'))
                                            await load(skill_page, skill_page_size)
                                        } catch (e: any) {
                                            message.error(e.message || t('删除失败'))
                                        }
                                    }}
                                >
                                    <Button size='small' danger icon={<DeleteOutlined />}>{t('删除')}</Button>
                                </Popconfirm>
                            </Space>,
                        },
                    ]}
                />
            }
            </Spin>
            <SkillDetailModal
                detail_skill={detail_skill}
                loading_detail={loading_detail}
                skill_instruction={skill_instruction}
                skill_files={skill_files}
                selected_skill_file={selected_skill_file}
                skill_file_content={skill_file_content}
                on_close={() => {
                    detail_request_ref.current += 1
                    file_request_ref.current += 1
                    set_detail_skill(null)
                }}
                on_select_file={open_skill_file}
            />
        </div>
    </div>
}
