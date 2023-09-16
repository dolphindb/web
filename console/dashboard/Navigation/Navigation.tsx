import { Select, Tooltip } from 'antd'

import { DeleteOutlined, FileOutlined, FolderAddOutlined, PauseOutlined, SyncOutlined } from '@ant-design/icons'


import { dashboard } from '../model.js'

import { DataSource } from '../DataSource/DataSource.js'


export function Navigation () {
    const { editing } = dashboard.use(['editing'])
    
    
    return <div className='dashboard-navigation'>
        <div className='dashboard-navigation-left'>
            <Select
                className='dashboard-navigation-left-select'
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
        <div className='dashboard-navigation-right'>
            <div className='dashboard-navigation-right-icons'>
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
            <div className='dashboard-navigation-right-editormode'>
                <span
                    className={
                        `dashboard-navigation-right-editormode-editor${editing ? ' editormode-selected' : ''}`
                    }
                    onClick={() => { dashboard.set_editing(true) }}
                >
                    编辑
                </span>
                <span
                    className={
                        `dashboard-navigation-right-editormode-preview${editing ? '' : ' editormode-selected'} `
                    }
                    onClick={() => { dashboard.set_editing(false) }}
                >
                    预览
                </span>
            </div>
            <div className='dashboard-navigation-right-config'>
                <DataSource/>
            </div>
        </div>
    </div>
}
