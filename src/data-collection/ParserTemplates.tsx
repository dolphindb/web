import useSWR from 'swr'
import './ParserTemplates.scss'
import { useCallback, useId, useMemo, useState } from 'react'

import { Button, Modal, Result, Space, Spin, Table, Tag, Tooltip, Typography, message, type TableProps } from 'antd'

import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'

import NiceModal from '@ebay/nice-modal-react'

import { t } from '../../i18n/index.js'

import { format_time } from '../dashboard/utils.js'

import { request } from './utils.js'
import { InitStatus, type IParserTemplate } from './type.js'
import { ParserTemplateModal } from './components/create-parser-template-modal/index.js'

import { get_parser_templates, is_inited } from './api.js'
import { InitPage } from './components/init-page/index.js'

import { model, NodeType } from '@/model.js'


const DEFAULT_TEMPLATE_DATA = {
    items: [ ],
    total: 0
}


export function ParserTemplates () {
    
    
    if (model.node_type === NodeType.controller) 
        return <Result
            status='warning'
            title={t('请注意，控制节点无法使用数采平台')}
        />
    
    
    const id = useId()
    const [selected_keys, set_selected_keys] = useState<string[]>([ ])
    
    const { data: isInited = InitStatus.UNKONWN, mutate: test_init } = useSWR(
        [is_inited.KEY, id],
        is_inited
    )
    
    const { data = DEFAULT_TEMPLATE_DATA, isLoading, mutate: refresh } = useSWR(
        isInited === InitStatus.INITED ? [get_parser_templates.KEY, id] : null,
        async () => get_parser_templates()
    )
    
    const on_create = useCallback(() => {
        NiceModal.show(ParserTemplateModal, { refresh })
    }, [refresh])
    
    const on_edit = useCallback((editedTemplate: IParserTemplate) => {
        NiceModal.show(ParserTemplateModal, { refresh, editedTemplate })
    }, [refresh])
    
    const on_batch_delete = useCallback(() => {
        Modal.confirm({
            title: t('确定要删除选中的 {{num}} 项模板吗？', { num: selected_keys.length }),
            onOk: async () => {
                await request('dcp_deleteHandler', { ids: selected_keys })
                set_selected_keys([ ])
                message.success(t('删除成功'))
                refresh()
            },
            okButtonProps: { type: 'primary', danger: true }
        })
    }, [selected_keys, refresh])
    
    const on_delete = useCallback(({ name, id, citeNumber }: IParserTemplate) => {
        Modal.confirm({
            title: citeNumber 
            ? t('该解析模板被引用 {{citeNumber}} 次, 确定要删除吗？', { citeNumber }) 
            : t('确定要删除模板【{{name}}】吗？', { name }),
            okButtonProps: { type: 'primary', danger: true },
            onOk: async () => {
                await await request('dcp_deleteHandler', { ids: [id] })
                if (selected_keys.includes(id))
                    set_selected_keys(selected_keys.filter(key => key !== id))
                message.success(t('删除成功'))
                refresh()
            }
        })
    }, [selected_keys, refresh])
    
    const canEdit = useCallback((template: IParserTemplate ) => {
        if (template.flag === 0 && template.useNumber === 0)
            return true
    }, [ ])
    
    const columns = useMemo<TableProps<IParserTemplate>['columns']>(() => [
        {
            title: t('模板名称'),
            dataIndex: 'name',
            key: 'name',
            width: 200,
        },
        {
            title: t('协议'),
            dataIndex: 'protocol',
            width: 100,
            render: protocol => <Tag color='processing' bordered={false}>{protocol}</Tag> 
        },
        {
            title: t('备注'),
            dataIndex: 'comment',
            key: 'comment',
            width: 400,
            render: comment => <Typography.Paragraph className='parser-template-comment' ellipsis={{ rows: 2 }}>{comment}</Typography.Paragraph>
        },
        {
            title: t('使用数'),
            dataIndex: 'useNumber',
            width: 100,
        },
        {
            title: t('引用数'),
            dataIndex: 'citeNumber',
            width: 100
        },
        {
            title: t('创建时间'),
            dataIndex: 'createTime',
            key: 'createTime',
            render: time => format_time(time, 'YYYY-MM-DD HH:mm:ss'),
            width: 250
        },
        {
            title: t('更新时间'),
            dataIndex: 'updateTime',
            key: 'updateTime',
            render: time => format_time(time, 'YYYY-MM-DD HH:mm:ss'),
            width: 250
        },
        {
            dataIndex: 'operations',
            key: 'operations',
            title: t('操作'),
            fixed: 'right',
            width: 200,
            render: (_, record) => <Space size='large'>
                {
                    canEdit(record) && <>
                        <Tooltip title={record.citeNumber ? t('当前解析模板已被引用，请谨慎修改') : null}>
                            <Typography.Link onClick={() => { on_edit(record) }}>{t('编辑')}</Typography.Link>
                        </Tooltip>
                        
                        <Typography.Link onClick={async () => { on_delete(record) }} type='danger'>{t('删除')}</Typography.Link>
                       
                    </>
                }
                {
                    !canEdit(record) && <Typography.Link onClick={async () => NiceModal.show(ParserTemplateModal, { refresh, editedTemplate: record, mode: 'view' })}>{t('查看')}</Typography.Link>
                }
                
            </Space>   
        }
        
    ], [on_edit, on_delete])
    
    if (isInited === InitStatus.UNKONWN || isLoading)
        return  <Spin>
            <div className='center-spin-div'/>
        </Spin> 
    
    return isInited === InitStatus.INITED ? <>
        <div className='parser-template-title'>
            <h3>{t('解析模板')}</h3>
            <Space>
                <Button onClick={on_create} icon={<PlusOutlined />} type='primary'>{t('新建')}</Button>
                <Button disabled={!selected_keys.length} onClick={on_batch_delete} icon={<DeleteOutlined />} danger>{t('批量删除')}</Button>
            </Space>
        </div>
        <Table 
            scroll={{ x: '100%' }} 
            rowKey='id' 
            dataSource={data.items} 
            loading={isLoading} 
            columns={columns}
            rowSelection={{
                onChange: keys => { set_selected_keys(keys as string[]) },
                getCheckboxProps: record => ({
                    disabled: !canEdit(record)
                }),
            }}
        />
    </> : <InitPage test_init={test_init as any}/>
}
