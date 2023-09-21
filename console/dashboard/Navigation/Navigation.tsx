import { Divider, Select, Tooltip } from 'antd'

import { DeleteOutlined, EditOutlined, EyeOutlined, FileOutlined, FolderAddOutlined, PauseOutlined, SyncOutlined } from '@ant-design/icons'


import { dashboard } from '../model.js'

import { DataSourceConfig } from '../DataSource/DataSourceConfig.js'


export function Navigation () {
    const { editing } = dashboard.use(['editing'])
    
    
    return <div className='dashboard-navigation'>
        <div className='left'>
            <Select
                className='left-select'
                placeholder='选择 dashboard'
                onChange={(value: string) => {
                    console.log(`selected ${value}`)
                }}
                bordered={false}
                options={[
                    { value: 'dashboard1', label: 'dashboard1' },
                    { value: 'dashboard2', label: 'dashboard2' },
                    { value: 'dashboard3', label: 'dashboard3' },
                ]}
            />
        </div>
        <div className='right'>
            <div className='right-icons'>
                <Tooltip title='保存'>
                    <FileOutlined />
                </Tooltip>
                <Tooltip title='新增'>
                    <FolderAddOutlined />
                </Tooltip>
                <Tooltip title='删除'>
                    <DeleteOutlined />
                </Tooltip>
                <Tooltip title='刷新'>
                    <SyncOutlined />
                </Tooltip>
                <Tooltip title='暂停流数据接收'>
                    <PauseOutlined />
                </Tooltip>
            </div>
            <div className='right-editormode'>
                <span
                    className={
                        `right-editormode-editor ${editing ? 'editormode-selected' : ''}`
                    }
                    onClick={() => { dashboard.set_editing(true) }}
                >
                    <EditOutlined /> 编辑
                </span>
                <span className='divider'>|</span>
                <span
                    className={`right-editormode-preview ${editing ? '' : 'editormode-selected'} `}
                    onClick={() => { dashboard.set_editing(false) }}
                >
                    <EyeOutlined /> 预览
                </span>
            </div>
            <div className='right-config'>
                <DataSourceConfig/>
            </div>
        </div>
    </div>
}
