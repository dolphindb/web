import './ParserTemplates.sass'

import useSWR from 'swr'
import { useCallback, useMemo, useState } from 'react'

import { Button, Popconfirm, Tooltip, Typography, type TableProps } from 'antd'

import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'

import NiceModal from '@ebay/nice-modal-react'

import { t } from '@i18n'

import { format_time } from '@/dashboard/utils.ts'


import { model } from '@model'

import { DDBTag } from '@/components/tags/index.tsx'

import { DDBTable } from '@/components/DDBTable/index.tsx'

import { TableOperations } from '@/components/TableOperations/index.tsx'

import { request } from './utils.ts'
import { type IParserTemplate } from './type.js'
import { ParserTemplateModal } from './components/create-parser-template-modal/index.tsx'

import { get_parser_templates } from './api.ts'
import { PROTOCOL_MAP } from './constant.ts'



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
        model.message.success(t('删除成功'))
        refresh()
    }, [selected_keys])
    
    const on_batch_delete = useCallback(() => {
        model.modal.confirm({
            title: t('确定要删除选中的 {{num}} 项模板吗？', { num: selected_keys.length }),
            onOk: async () => delete_templates(selected_keys),
            okButtonProps: { type: 'primary', danger: true }
        })
    }, [selected_keys, delete_templates])
    
    
    const can_edit = useCallback((template: IParserTemplate ) => template.flag === 0 && template.useNumber === 0, [ ])
    
    const columns = useMemo<TableProps<IParserTemplate>['columns']>(() => [
        {
            title: t('模板名称'),
            dataIndex: 'name',
            key: 'name',
            width: 200,
            fixed: 'left'
        },
        {
            title: t('协议'),
            dataIndex: 'protocol',
            width: 200,
            render: protocol => <DDBTag>{PROTOCOL_MAP[protocol]}</DDBTag> 
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
            width: 150,
            render: (_, record) => <TableOperations>
                {
                    can_edit(record) 
                    ?  <>
                            <Tooltip title={record.citeNumber ? t('当前解析模板已被引用，请谨慎修改') : null}>
                                <Typography.Link onClick={() => { on_edit(record) }}>{t('编辑')}</Typography.Link>
                            </Tooltip>
                            <Popconfirm 
                                okButtonProps={{ danger: true, type: 'primary' }}
                                title={record.citeNumber 
                                    ? t('该解析模板被引用 {{citeNumber}} 次, 确定要删除吗？', { citeNumber: record.citeNumber }) 
                                    : t('确定要删除模板【{{name}}】吗？', { name: record.name })}
                                onConfirm={() => { delete_templates([record.id]) }}
                            >
                                <Typography.Link type='danger'>{t('删除')}</Typography.Link>
                            </Popconfirm>
                        </> 
                    :  <Typography.Link onClick={async () => NiceModal.show(ParserTemplateModal, { refresh, editedTemplate: record, mode: 'view' })}>{t('查看')}</Typography.Link>
                }
               
            </TableOperations>   
        }
        
    ], [on_edit, can_edit])
    
    
    return <div className='parser-template-content'>
        <DDBTable<IParserTemplate>
            title={t('解析模板')}
            buttons={
                <>
                    <Button type='primary' icon={<PlusOutlined />} onClick={on_create}>{t('新建')}</Button>
                    <Button disabled={!selected_keys?.length} danger onClick={on_batch_delete} icon={<DeleteOutlined/>}>{t('批量删除')}</Button>
                </>
            }
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
    </div>
}
