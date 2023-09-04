import { DatabaseOutlined, DeleteOutlined, FileOutlined, FolderAddOutlined, PauseOutlined, SyncOutlined } from '@ant-design/icons'
import { Select, Tooltip } from 'antd'


export function Navigation ({ editing, change_editing }) {
    
    const handleChange = (value: string) => {
        console.log(`selected ${value}`)
    }
    return <div className='dashboard-navigation'>
        <div className='dashboard-navigation-left'>
            <Select
                className='dashboard-navigation-left-select'
                placeholder='选择dashboard'
                onChange={handleChange}
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
            <div className='dashboard-navigation-right-editor'>
                <span className={editing ? '' : 'dashboard-navigation-right-editor-unselected'} style={{ marginRight: '10px' }} onClick={() => { change_editing(true) }}>编辑</span>
                <span className={editing ? 'dashboard-navigation-right-editor-unselected' : ''} onClick={() => { change_editing(false) }}>预览</span>
            </div>
            <div className='dashboard-navigation-right-configuration'>
                <div className='dashboard-navigation-right-configuration-datasource'>
                    <DatabaseOutlined style={{ marginRight: '5px' }}/>
                    数据源
                </div>
            </div>
        </div>
    </div>
}
