import NiceModal from '@ebay/nice-modal-react'
import { type Database } from './Databases.js'
import { Collapse, Modal, Table, type TableColumnType } from 'antd'
import { t } from '../../i18n/index.js'
import { useMemo, useState } from 'react'


interface Props {
    database: Database
}

const ACCESS_TYPE = {
    database: [ 'DB_MANAGE', 'DBOBJ_CREATE', 'DBOBJ_DELETE', 'DB_INSERT', 'DB_UPDATE', 'DB_DELETE', 'DB_READ'],
    table: [ 'TABLE_READ', 'TABLE_INSERT', 'TABLE_UPDATE', 'TABLE_DELETE'],
}

const cols: TableColumnType<Record<string, any>>[] = [
    {
        title: t('权限'),
        dataIndex: 'type',
        key: 'type',
        width: 200
    },  
    {
        title: t('用户'),
        dataIndex: 'users',
        key: 'users',
    },
]

export const AccessModal = NiceModal.create<Props>(({ database }) => {
    const modal = NiceModal.useModal()
    const [accesses, set_accesses] = useState(null)
    
    const db_rows = useMemo(() => 
        ACCESS_TYPE.database.map(type => ({
            key: type,
            type,
            users: ''
        }))   
    , [accesses])
    
    const items = [
    {
        key: database.key,
        label: `数据库 ${database.key}`,
        children: <Table 
                    columns={cols}
                    dataSource={db_rows}
                    pagination={false}/>
    },
    ...database.children.map(tb => ({
        key: tb.key,
        label: `数据表 ${tb.key}`,
        children: <Table 
                    columns={cols}
                    dataSource={ACCESS_TYPE.table.map(type => ({
                        key: type,
                        type,
                        users: ''
                    }))}    
                    pagination={false}/>,
    }))]
    return <Modal
                width={1000}
                open={modal.visible}
                onCancel={modal.hide}
                maskClosable={false}
                title={t('查看数据库 {{db_name}} 用户权限', { db_name: database.key })}
                afterClose={modal.remove}
                footer={null}
            >
                <Collapse items={items} defaultActiveKey={[database.key]} />
     </Modal> 
}) 

