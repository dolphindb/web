import { useEffect, useRef, useState } from 'react'

import {
    Button, Empty, Input, message, Modal, Popconfirm, Space, Spin, Table, Tabs, Tag, Tree, Typography, Upload, type TreeDataNode,
} from 'antd'
import { CheckCircleOutlined, DeleteOutlined, PlusOutlined, StopOutlined, UploadOutlined } from '@ant-design/icons'

import { t } from '@i18n'

import { chat_model } from '@/chat/model.ts'
import type { ISkillFileInfo, ISkillInfo } from '@/chat/model.ts'
import { field_error, required_label } from './common.tsx'


const { Text } = Typography


export function SkillsTab () {
    const [all_skills, set_all_skills] = useState<ISkillInfo[]>([ ])
    const [loading, set_loading] = useState(false)
    const [creating, set_creating] = useState(false)
    const [form_error, set_form_error] = useState('')
    const [detail_skill, set_detail_skill] = useState<ISkillInfo | null>(null)
    const [skill_instruction, set_skill_instruction] = useState('')
    const [skill_files, set_skill_files] = useState<string[]>([ ])
    const [selected_skill_file, set_selected_skill_file] = useState('')
    const [skill_file_content, set_skill_file_content] = useState('')
    const [loading_detail, set_loading_detail] = useState(false)
    const [skill_file, set_skill_file] = useState<File | null>(null)
    const detail_request_ref = useRef(0)
    const file_request_ref = useRef(0)
    const [overrides, set_overrides] = useState({
        name: '',
        displayName: '',
        description: '',
        category: '',
        version: '',
    })
    
    async function load () {
        set_loading(true)
        try {
            const skills = await chat_model.load_skills()
            set_all_skills(skills)
        } catch {
            message.error(t('加载技能列表失败'))
        } finally {
            set_loading(false)
        }
    }
    
    useEffect(() => { load() }, [ ])
    
    function decode_skill_file (content: string, encoding?: string) {
        if (encoding !== 'base64')
            return content
        try {
            const bytes = Uint8Array.from(atob(content), char => char.charCodeAt(0))
            return new TextDecoder().decode(bytes)
        } catch {
            return content
        }
    }
    
    
    function build_skill_file_tree (paths: string[]) {
        type FileTreeNode = TreeDataNode & { children?: FileTreeNode[] }
        
        const roots: FileTreeNode[] = [ ]
        const node_map = new Map<string, FileTreeNode>()
        for (const file_path of paths) {
            const parts = file_path.split(/[\\/]/).filter(Boolean)
            let current_path = ''
            let siblings = roots
            parts.forEach((part, index) => {
                const is_file = index === parts.length - 1
                current_path = current_path ? `${current_path}/${part}` : part
                let node = node_map.get(current_path)
                if (!node) {
                    node = {
                        key: current_path,
                        title: part,
                        isLeaf: is_file,
                        selectable: is_file,
                        children: is_file ? undefined : [ ],
                    }
                    node_map.set(current_path, node)
                    siblings.push(node)
                }
                if (!is_file) {
                    node.isLeaf = false
                    node.selectable = false
                    node.children ||= [ ]
                    siblings = node.children
                }
            })
        }
        return roots
    }
    
    
    function get_skill_file_paths (items: (ISkillFileInfo | string)[]) {
        const paths = items
            .map(item => typeof item === 'string' ? item : item.filePath)
            .filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
            .map(item => item.trim())
        if (paths.length !== items.length) {
            console.error('Invalid skill files list:', items)
            message.error(t('技能文件列表格式异常，已忽略无效文件'))
        }
        return paths
    }
    
    
    async function open_skill_detail (skill: ISkillInfo) {
        const request_id = ++detail_request_ref.current
        file_request_ref.current += 1
        set_detail_skill(skill)
        set_skill_instruction('')
        set_skill_files([ ])
        set_selected_skill_file('')
        set_skill_file_content('')
        set_loading_detail(true)
        try {
            const [instruction, files] = await Promise.all([
                chat_model.load_skill_instruction(skill.skillId).catch(error => {
                    console.error('Load skill instruction failed:', error)
                    message.error(t('加载技能指令失败'))
                    return null
                }),
                chat_model.load_skill_files(skill.skillId).catch(error => {
                    console.error('Load skill files failed:', error)
                    message.error(t('加载技能文件失败'))
                    return { items: [ ] }
                }),
            ])
            if (request_id !== detail_request_ref.current)
                return
            if (instruction)
                set_skill_instruction(instruction.instruction || instruction.content || JSON.stringify(instruction, null, 2))
            set_skill_files(get_skill_file_paths(files.items || [ ]))
        } finally {
            if (request_id === detail_request_ref.current)
                set_loading_detail(false)
        }
    }
    
    
    async function open_skill_file (file_path: string) {
        if (!detail_skill)
            return
        const request_id = ++file_request_ref.current
        const skill_id = detail_skill.skillId
        set_selected_skill_file(file_path)
        set_skill_file_content('')
        set_loading_detail(true)
        try {
            const file = await chat_model.get_skill_file(skill_id, file_path)
            if (request_id !== file_request_ref.current || skill_id !== detail_skill.skillId)
                return
            set_skill_file_content(decode_skill_file(file.content, file.encoding))
        } catch (error) {
            if (request_id === file_request_ref.current)
                message.error(error instanceof Error ? error.message : t('加载文件失败'))
        } finally {
            if (request_id === file_request_ref.current)
                set_loading_detail(false)
        }
    }
    
    if (loading && !creating)
        return <div style={{ textAlign: 'center', padding: 60 }}><Spin /></div>
        
    return <div style={{ maxHeight: 520, overflow: 'auto' }}>
        <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
            <Button
                type='dashed'
                icon={<PlusOutlined />}
                onClick={() => {
                    set_creating(!creating)
                    set_form_error('')
                }}
            >
                {t('注册技能')}
            </Button>
        </div>
        
        {creating && <div style={{
            border: '1px solid #d9d9d9', borderRadius: 6, padding: 16, marginBottom: 16,
        }}>
            <div style={{ marginBottom: 12 }}>
                <div style={{ marginBottom: 4, fontSize: 13 }}>{required_label(<>{t('技能包')} (ZIP)</>)}</div>
                <Upload
                    accept='.zip'
                    maxCount={1}
                    beforeUpload={file => {
                        set_skill_file(file)
                        return false
                    }}
                    onRemove={() => { set_skill_file(null) }}
                >
                    <Button icon={<UploadOutlined />}>{t('选择 ZIP 文件')}</Button>
                </Upload>
                <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                    {t('ZIP 包须包含 SKILL.md 入口文件（含 YAML frontmatter 元数据和 Markdown 指令体）')}
                </div>
                {field_error(form_error, t('请选择技能包 ZIP 文件'))}
            </div>
            <div style={{ marginBottom: 8, fontSize: 13, color: '#666' }}>{t('覆盖元数据（可选，覆盖 SKILL.md 中的同名字段）')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
                <div>
                    <div style={{ marginBottom: 4, fontSize: 13 }}>{t('名称')}</div>
                    <Input
                        value={overrides.name}
                        onChange={e => { set_overrides({ ...overrides, name: e.target.value }) }}
                        placeholder={t('例如: search-database')}
                    />
                </div>
                <div>
                    <div style={{ marginBottom: 4, fontSize: 13 }}>{t('显示名称')}</div>
                    <Input
                        value={overrides.displayName}
                        onChange={e => { set_overrides({ ...overrides, displayName: e.target.value }) }}
                        placeholder={t('例如: 数据库搜索')}
                    />
                </div>
                <div>
                    <div style={{ marginBottom: 4, fontSize: 13 }}>{t('分类')}</div>
                    <Input
                        value={overrides.category}
                        onChange={e => { set_overrides({ ...overrides, category: e.target.value }) }}
                        placeholder={t('例如: database')}
                    />
                </div>
                <div>
                    <div style={{ marginBottom: 4, fontSize: 13 }}>{t('版本')}</div>
                    <Input
                        value={overrides.version}
                        onChange={e => { set_overrides({ ...overrides, version: e.target.value }) }}
                        placeholder={t('例如: 1.0.0')}
                    />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                    <div style={{ marginBottom: 4, fontSize: 13 }}>{t('描述')}</div>
                    <Input.TextArea
                        value={overrides.description}
                        onChange={e => { set_overrides({ ...overrides, description: e.target.value }) }}
                        placeholder={t('技能描述，会作为 Agent 调用技能时的参考信息')}
                        rows={3}
                    />
                </div>
            </div>
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <Button onClick={() => {
                    set_creating(false)
                    set_skill_file(null)
                    set_form_error('')
                    set_overrides({ name: '', displayName: '', description: '', category: '', version: '' })
                }}>{t('取消')}</Button>
                <Button type='primary' loading={loading} onClick={async () => {
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
                                
                        await chat_model.register_skill(
                            skill_file,
                            Object.keys(override_obj).length > 0 ? override_obj : undefined,
                        )
                        message.success(t('技能注册成功'))
                        set_creating(false)
                        set_skill_file(null)
                        set_overrides({ name: '', displayName: '', description: '', category: '', version: '' })
                        await load()
                    } catch (e: any) {
                        message.error(e.message || t('注册失败'))
                    } finally {
                        set_loading(false)
                    }
                }}>{t('注册')}</Button>
            </div>
        </div>}
        
        {all_skills.length === 0
            ? <Empty description={t('暂无可用技能，请先创建')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
            : <Table
                size='small'
                rowKey='skillId'
                dataSource={all_skills}
                pagination={false}
                columns={[
                    {
                        title: t('技能'),
                        render: (_: unknown, s: ISkillInfo) => <div>
                            <div>{s.displayName || s.name}</div>
                            <Text type='secondary'>{s.description || t('无描述')}</Text>
                        </div>,
                    },
                    {
                        title: t('分类'),
                        width: 110,
                        render: (_: unknown, s: ISkillInfo) => s.category ? <Tag>{s.category}</Tag> : '-',
                    },
                    {
                        title: t('版本'),
                        width: 90,
                        render: (_: unknown, s: ISkillInfo) => s.version ? <Tag color='blue'>v{s.version}</Tag> : '-',
                    },
                    {
                        title: t('状态'),
                        width: 90,
                        render: (_: unknown, s: ISkillInfo) => <Tag color={s.enabled !== false ? 'green' : 'default'}>{s.enabled !== false ? t('启用') : t('禁用')}</Tag>,
                    },
                    {
                        title: t('操作'),
                        width: 220,
                        render: (_: unknown, s: ISkillInfo) => <Space size={4}>
                            <Button size='small' onClick={() => { open_skill_detail(s) }}>{t('详情')}</Button>
                            {s.enabled === false
                                ? <Button
                                    size='small'
                                    icon={<CheckCircleOutlined />}
                                    onClick={async () => {
                                        try {
                                            await chat_model.set_skill_enabled(s.skillId, true)
                                            message.success(t('已激活'))
                                            await load()
                                        } catch (e: any) {
                                            message.error(e.message || t('操作失败'))
                                        }
                                    }}
                                >{t('启用')}</Button>
                                : <Popconfirm
                                    title={t('确定禁用此技能？')}
                                    onConfirm={async () => {
                                        try {
                                            await chat_model.set_skill_enabled(s.skillId, false)
                                            message.success(t('已禁用'))
                                            await load()
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
                                        await chat_model.delete_skill(s.skillId)
                                        message.success(t('已删除'))
                                        await load()
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
        <Modal
            title={detail_skill ? t('技能详情：{{name}}', { name: detail_skill.displayName || detail_skill.name }) : t('技能详情')}
            open={Boolean(detail_skill)}
            onCancel={() => {
                detail_request_ref.current += 1
                file_request_ref.current += 1
                set_detail_skill(null)
            }}
            footer={null}
            width={1120}
            styles={{ body: { maxHeight: 'calc(100vh - 140px)', overflowY: 'auto' } }}
        >
            {detail_skill && <Spin spinning={loading_detail}>
                <Space direction='vertical' style={{ width: '100%' }}>
                    <Tabs
                        items={[
                            {
                                key: 'basic',
                                label: t('基本信息'),
                                children: <Space direction='vertical' style={{ width: '100%' }}>
                                    <Table
                                        size='small'
                                        pagination={false}
                                        showHeader={false}
                                        rowKey='key'
                                        dataSource={[
                                            { key: 'id', label: 'ID', value: detail_skill.skillId },
                                            { key: 'name', label: t('名称'), value: detail_skill.name },
                                            { key: 'displayName', label: t('显示名称'), value: detail_skill.displayName || '-' },
                                            { key: 'category', label: t('分类'), value: detail_skill.category || '-' },
                                            { key: 'version', label: t('版本'), value: detail_skill.version || '-' },
                                            { key: 'common', label: t('公共技能'), value: detail_skill.isCommon ? t('是') : t('否') },
                                            { key: 'owner', label: t('所有者'), value: detail_skill.ownerUserId || '-' },
                                            { key: 'license', label: 'License', value: detail_skill.license || '-' },
                                            { key: 'compatibility', label: t('兼容性'), value: detail_skill.compatibility || '-' },
                                            { key: 'argumentHint', label: t('参数提示'), value: detail_skill.argumentHint || '-' },
                                            { key: 'contentRevision', label: t('内容版本'), value: detail_skill.contentRevision ?? '-' },
                                            { key: 'contentHash', label: t('内容 Hash'), value: detail_skill.contentHash || '-' },
                                            { key: 'updateTime', label: t('更新时间'), value: detail_skill.updateTime || '-' },
                                        ]}
                                        columns={[
                                            { dataIndex: 'label', width: 120 },
                                            { dataIndex: 'value', render: (value: unknown) => String(value) },
                                        ]}
                                    />
                                    <div>
                                        <div style={{ marginBottom: 8, fontWeight: 500 }}>{t('技能指令')}</div>
                                        <Input.TextArea value={skill_instruction || t('暂无指令')} rows={16} readOnly />
                                    </div>
                                </Space>,
                            },
                            {
                                key: 'files',
                                label: t('技能文件'),
                                children: skill_files.length === 0
                                    ? <Empty description={t('暂无技能文件')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                                    : <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 12, height: 'calc(100vh - 260px)', minHeight: 520 }}>
                                        <div style={{ border: '1px solid #f0f0f0', borderRadius: 6, padding: 8, overflow: 'auto', minHeight: 0 }}>
                                            <Tree
                                                blockNode
                                                defaultExpandAll
                                                selectedKeys={selected_skill_file ? [selected_skill_file] : [ ]}
                                                treeData={build_skill_file_tree(skill_files)}
                                                onSelect={keys => {
                                                    const file_path = String(keys[0] || '')
                                                    if (file_path)
                                                        open_skill_file(file_path)
                                                }}
                                            />
                                        </div>
                                        <div style={{ minWidth: 0, minHeight: 0 }}>
                                            <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                                <Text strong>{t('文件预览')}</Text>
                                                <Text type='secondary' ellipsis>{selected_skill_file || t('请选择左侧文件')}</Text>
                                            </div>
                                            <Input.TextArea
                                                value={selected_skill_file ? skill_file_content || t('文件内容为空') : t('请选择左侧文件')}
                                                style={{ height: 'calc(100% - 32px)', resize: 'none' }}
                                                readOnly
                                            />
                                        </div>
                                    </div>,
                            },
                        ]}
                    />
                </Space>
            </Spin>}
        </Modal>
    </div>
}
