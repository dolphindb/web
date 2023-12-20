import { EditableProTable, type ProColumns } from '@ant-design/pro-components'
import { type Config } from './type.js'
import { useMemo, useState } from 'react'
import { t } from '../../i18n/index.js'
import { Button, Popconfirm } from 'antd'
import { DeleteOutlined, EditOutlined } from '@ant-design/icons'

export function NodesManagement () {
    
    const [nodes, set_nodes] = useState()
    
    const cols: ProColumns<Config>[] = useMemo(() => ([
        {
            title: t('Name'),
            dataIndex: 'name',
            key: 'name',
            fieldProps: {
                placeholder: t('请输入配置名'),
            },
            formItemProps: {
                rules: [{
                    required: true,
                    message: t('请输入配置名！')
                },
            ]
            }
        },
        {
            title: t('Value'),
            dataIndex: 'value',
            key: 'value',
            fieldProps: {
                placeholder: t('请输入配置值'),
            },
            formItemProps: {
                rules: [{
                    required: true,
                    message: t('请输入配置值！')
                }]
            }
        },
        {
            title: t('Actions'),
            valueType: 'option',
            key: 'actions',
            width: 240,
            render: (text, record, _, action) => [
              <Button
                type='link'
                key='editable'
                className='mr-btn'
                icon={<EditOutlined />}
                onClick={() => {
                    console.log('edit config', record)
                    action?.startEditable?.(record.id)
                }}
              >
                {t('编辑')}
              </Button>,
              <Popconfirm 
                title={t('确认删除此配置项？')}
                key='delete'
                >
                <Button
                    type='link'
                    danger
                    icon={<DeleteOutlined />}
                >
                    {t('删除')}
                </Button>
              </Popconfirm>
            ],
          },
    ]), [ ])
    
    return <EditableProTable
                columns={cols}
                
            />
}
