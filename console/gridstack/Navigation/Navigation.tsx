import { DatabaseOutlined, DeleteOutlined, FileOutlined, FolderAddOutlined, PauseOutlined, SyncOutlined } from '@ant-design/icons'
import { Select } from 'antd'


const handleChange = (value: string) => {
    console.log(`selected ${value}`)
}
export function Navigation () {
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
                <FileOutlined />
                <FolderAddOutlined />
                <DeleteOutlined />
                <SyncOutlined />
                <PauseOutlined />
            </div>
            <div className='dashboard-navigation-right-editor'>
                <span style={{ marginRight: '10px' }}>编辑</span>
                <span className='dashboard-navigation-right-editor-unselected'>预览</span>
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
