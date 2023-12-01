import NiceModal from '@ebay/nice-modal-react'
import { type Database } from './Databases.js'
import { Collapse, Modal, Table, type TableColumnType } from 'antd'
import { t } from '../../i18n/index.js'
import { useEffect, useState } from 'react'
import { shell } from './model.js'
import { model } from '../model.js'


interface Props {
    database: Database
}

// const ACCESS_TYPE = {
//     database: [ 'DB_MANAGE', 'DBOBJ_CREATE', 'DBOBJ_DELETE', 'DB_INSERT', 'DB_UPDATE', 'DB_DELETE', 'DB_READ'],
//     table: [ 'TABLE_READ', 'TABLE_INSERT', 'TABLE_UPDATE', 'TABLE_DELETE'],
// }

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
    const [db_rows, set_db_rows] = useState([ ])
    shell.use(['get_access_defined'])
    
    useEffect(() => {
        model.execute(async () => {
            if (!shell.get_access_defined) 
                await shell.define_get_user_grant()
            let rows = [ ]
            const access = (await(model.ddb.call('getUserGrant', [database.key.slice(0, -1)], { urgent: true }))).to_rows()
            for (let ac of access) {
                const { userId, AccessAction } = ac
                let row = rows.find(row => row.type === AccessAction)
                if (!row) {
                    row = {
                        key: AccessAction,
                        type: AccessAction,
                        users: [ ]
                    }
                    rows.push(row)
                }
                row.users.push(userId)
            }
            set_db_rows(rows)
        })
    }, [ shell.get_access_defined])
 
    
    const items = [
    {
        key: database.key,
        label: `数据库 ${database.key}`,
        children: <Table 
                    columns={cols}
                    dataSource={db_rows.map(row => ({ ...row, users: row.users.join(',') }))}
                    pagination={false}/>
    },
    ...database.children.map(tb => ({
        key: tb.key,
        label: `数据表 ${tb.key}`,
        children: <TableAccess tb={tb.key.slice(0, -1)}/>
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


function TableAccess ({
    tb
}: {
    tb: string
}) {
    
    const [tb_rows, set_tb_rows] = useState([ ])
    
    useEffect(() => {
        model.execute(async () => {
            let rows = [ ]
            const access = (await(model.ddb.call('getUserGrant', [tb], { urgent: true }))).to_rows()
            for (let ac of access) {
                const { userId, AccessAction } = ac
                let row = rows.find(row => row.type === AccessAction)
                if (!row) {
                    row = {
                        key: AccessAction,
                        type: AccessAction,
                        users: [ ]
                    }
                    rows.push(row)
                }
                row.users.push(userId)
            }
            set_tb_rows(rows)
        })
    }, [ ])
    
    return <Table 
                columns={cols}
                dataSource={tb_rows.map(row => ({ ...row, users: row.users.join(',') }))}    
                pagination={false}/>
}
