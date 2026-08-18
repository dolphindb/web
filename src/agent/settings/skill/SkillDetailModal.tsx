import { Empty, Input, Modal, Space, Spin, Table, Tabs, Tree, Typography } from 'antd'

import { t } from '@i18n'
import type { ISkillInfo } from '@/agent/model.ts'
import { build_skill_file_tree } from './types.ts'


const { Text } = Typography


export function SkillDetailModal ({
    detail_skill,
    loading_detail,
    skill_instruction,
    skill_files,
    selected_skill_file,
    skill_file_content,
    on_close,
    on_select_file,
}: {
    detail_skill: ISkillInfo | null
    loading_detail: boolean
    skill_instruction: string
    skill_files: string[]
    selected_skill_file: string
    skill_file_content: string
    on_close: () => void
    on_select_file: (file_path: string) => void
}) {
    return <Modal
        title={detail_skill ? t('技能详情：{{name}}', { name: detail_skill.displayName || detail_skill.name }) : t('技能详情')}
        open={Boolean(detail_skill)}
        onCancel={on_close}
        footer={null}
        width={1120}
        styles={{ body: { maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' } }}
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
                                                    on_select_file(file_path)
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
}
