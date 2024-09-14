import useSWR from 'swr'
import './ParserTemplates.scss'
import { useCallback, useMemo, useState } from 'react'

import { Button, Modal, Space, Table, Tag, Tooltip, Typography, message, type TableProps } from 'antd'

import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'

import NiceModal from '@ebay/nice-modal-react'

import { t } from '@i18n/index.js'

import { format_time } from '@/dashboard/utils.ts'


import { request } from './utils.ts'
import { type IParserTemplate } from './type.js'
import { ParserTemplateModal } from './components/create-parser-template-modal/index.tsx'

import { get_parser_templates } from './api.ts'



const DEFAULT_TEMPLATE_DATA = {
    items: [ ],
    total: 0
}


export function ParserTemplates () {
    const [selected_keys, set_selected_keys] = useState<string[]>([ ])
    
    const { data = DEFAULT_TEMPLATE_DATA, isLoading, mutate: refresh } = useSWR(
        [get_parser_templates.KEY],
        async () => get_parser_templates()
    )
    
    const on_create = useCallback(() => {
        NiceModal.show(ParserTemplateModal, { refresh })
    }, [refresh])
    
    const on_edit = useCallback((editedTemplate: IParserTemplate) => {
        NiceModal.show(ParserTemplateModal, { refresh, editedTemplate })
    }, [refresh])
    
    const delete_templates = useCallback(async (ids: string[]) => {
        await request('dcp_deleteHandler', { ids })
        set_selected_keys(selected_keys.filter(key => !ids.includes(key)))
        message.success(t('删除成功'))
        refresh()
    }, [ selected_keys ])
    
    const on_batch_delete = useCallback(() => {
        Modal.confirm({
            title: t('确定要删除选中的 {{num}} 项模板吗？', { num: selected_keys.length }),
            onOk: async () => delete_templates(selected_keys),
            okButtonProps: { type: 'primary', danger: true }
        })
    }, [selected_keys, delete_templates])
    
    const on_delete = useCallback(({ name, id, citeNumber }: IParserTemplate) => {
        Modal.confirm({
            title: citeNumber 
            ? t('该解析模板被引用 {{citeNumber}} 次, 确定要删除吗？', { citeNumber }) 
            : t('确定要删除模板【{{name}}】吗？', { name }),
            okButtonProps: { type: 'primary', danger: true },
            onOk: async () => delete_templates([id]),
        })
    }, [selected_keys, delete_templates ])
    
    const can_edit = useCallback((template: IParserTemplate ) => template.flag === 0 && template.useNumber === 0, [ ])
    
    const columns = useMemo<TableProps<IParserTemplate>['columns']>(() => [
        {
            title: t('模板名称'),
            dataIndex: 'name',
            key: 'name',
            width: 300,
        },
        {
            title: t('协议'),
            dataIndex: 'protocol',
            width: 200,
            render: protocol => <Tag color='processing' bordered={false}>{protocol}</Tag> 
        },
        {
            title: t('备注'),
            dataIndex: 'comment',
            key: 'comment',
            width: 400,
            render: comment => <Typography.Paragraph className='parser-template-comment' ellipsis={{ rows: 2, expandable: 'collapsible' }}>{comment}</Typography.Paragraph>
        },
        {
            title: t('使用数'),
            dataIndex: 'useNumber',
            width: 200,
        },
        {
            title: t('引用数'),
            dataIndex: 'citeNumber',
            width: 150
        },
        {
            title: t('创建时间'),
            dataIndex: 'createTime',
            key: 'createTime',
            render: time => format_time(time, 'YYYY-MM-DD HH:mm:ss'),
            width: 200
        },
        {
            title: t('更新时间'),
            dataIndex: 'updateTime',
            key: 'updateTime',
            render: time => format_time(time, 'YYYY-MM-DD HH:mm:ss'),
            width: 200
        },
        {
            dataIndex: 'operations',
            key: 'operations',
            title: t('操作'),
            fixed: 'right',
            width: 200,
            render: (_, record) => <Space size='large'>
                {
                    can_edit(record) 
                    ?  <>
                            <Tooltip title={record.citeNumber ? t('当前解析模板已被引用，请谨慎修改') : null}>
                                <Typography.Link onClick={() => { on_edit(record) }}>{t('编辑')}</Typography.Link>
                            </Tooltip>
                            <Typography.Link onClick={async () => { on_delete(record) }} type='danger'>{t('删除')}</Typography.Link>
                        </> 
                    :  <Typography.Link onClick={async () => NiceModal.show(ParserTemplateModal, { refresh, editedTemplate: record, mode: 'view' })}>{t('查看')}</Typography.Link>
                }
               
            </Space>   
        }
        
    ], [on_edit, on_delete, can_edit])
    
   
    return <>
        <h2>{t('解析模板')}</h2>
        <Space className='parser-template-btn-group'>
            <Button onClick={on_create} icon={<PlusOutlined />} type='primary'>{t('新建')}</Button>
            <Button 
                disabled={!selected_keys.length} 
                onClick={on_batch_delete} 
                icon={<DeleteOutlined />} 
                danger
                >
                {t('批量删除')}
            </Button>
        </Space>
        <Table 
            scroll={{ x: '100%' }} 
            rowKey='id' 
            dataSource={data.items} 
            loading={isLoading} 
            columns={columns}
            pagination={{
                defaultPageSize: 10,
                showSizeChanger: true,
                hideOnSinglePage: true,
            }}
            rowSelection={{
                onChange: keys => { set_selected_keys(keys as string[]) },
                getCheckboxProps: record => ({
                    disabled: !can_edit(record)
                }),
            }}
        />
</>
}
