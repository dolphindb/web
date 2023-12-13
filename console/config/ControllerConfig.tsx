import { Button, Input, Table, type TableColumnType } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { t } from '../../i18n/index.js'
import { config } from './model.js'
import { model } from '../model.js'
import { DeleteOutlined, EditOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons'

export function ControllerConfig () {
    const [configs, set_configs] = useState<string[]>([ ])
    
    useEffect(() => {
        model.execute(async () => {
            const { value } = await config.load_controller_configs()
            set_configs(value as [])
        })
    }, [ ])
    
    
    const cols: TableColumnType<Record<string, any>>[] = useMemo(() => ([
        {
            title: t('Name'),
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: t('Value'),
            dataIndex: 'value',
            key: 'value',
        },
        {
            title: t('Actions'),
            dataIndex: 'actions',
            key: 'actions',
            width: 200
        },
    ]), [ ])
    return <Table 
                columns={cols}
                dataSource={configs.map(config => {
                    const [name, value] = config.split('=')
                    return {
                        name,
                        value,
                        actions: <div className='row-actions'>
                            <Button type='link' icon={<EditOutlined />}>{t('修改')}</Button>
                            <Button type='link' danger icon={<DeleteOutlined />}>{t('删除')}</Button>
                        </div>
                    }
                })}
                pagination={{
                    defaultPageSize: 15
                }}
                tableLayout='fixed'
                title={() => <div className='table-header'>
                    <Button icon={<PlusOutlined />} type='primary' className='table-header-btn'>{t('新增配置')}</Button>
                    <Input prefix={<SearchOutlined />} className='table-header-search' placeholder={t('请输入你想要搜索的配置项')}/>
                </div>}
                />
}
