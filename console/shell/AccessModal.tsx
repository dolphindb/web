import NiceModal from '@ebay/nice-modal-react'
import { type Database } from './Databases.js'
import { Modal, Table, type TableColumnType } from 'antd'
import { t } from '../../i18n/index.js'
import { useEffect, useMemo, useState } from 'react'
import { model } from '../model.js'
import { DdbVectorString } from 'dolphindb/browser.js'


interface Props {
    database: Database
}

const ACCESS_TYPE = {
    database: [ 'DB_MANAGE', 'DBOBJ_CREATE', 'DBOBJ_DELETE', 'DB_INSERT', 'DB_UPDATE', 'DB_DELETE', 'DB_READ'],
    table: [ 'TABLE_READ', 'TABLE_INSERT', 'TABLE_UPDATE', 'TABLE_DELETE'],
}

const db_cols: TableColumnType<Record<string, any>>[] = [
    {
        title: t('类型'),
        dataIndex: 'type',
        key: 'type',
    },
    ...ACCESS_TYPE.database.map(type => ({
        title: type,
        dataIndex: type,
        key: type,
}))]

const tb_cols: TableColumnType<Record<string, any>>[] = 
    ACCESS_TYPE.table.map(type => ({
        title: type,
        dataIndex: type,
        key: type,
}))

export const AccessModal = NiceModal.create<Props>(({ database }) => {
    const modal = NiceModal.useModal()
    const [accesses, set_accesses] = useState(null)
    
    useEffect(() => {
        model.execute(async () => {
            const users = (await model.ddb.call('getUserList', [ ], { urgent: true })).value as string[]
            const accesses = (await model.ddb.call('getUserAccess', [new DdbVectorString(users)], { urgent: true })).to_rows()
            set_accesses(accesses)
        })
    }, [ ])   
    
    const db_rows = useMemo(() => {
        if (!accesses)
            return
        let rows = { 
            grant: Object.fromEntries(ACCESS_TYPE.database.map(type => ([type, [ ]]))), 
            deny: Object.fromEntries(ACCESS_TYPE.database.map(type => ([type, [ ]])))
        }
        for (let type of ACCESS_TYPE.database) 
            for (let access of accesses) 
                if (access[type + '_allowed'] && access[type + '_allowed'].split(',').includes(database.key.slice(0, database.key.length - 1))) 
                    rows.grant[type].push(access.userId)
                else if (access[type + '_denied'] && access[type + '_denied'].split(',').includes(database.key.slice(0, database.key.length - 1)))
                    rows.deny[type].push(access.userId)
                
        
        return [
            {
                type: 'grant',
                ...Object.fromEntries(Object.entries(rows.grant).map(([k, v]) => (
                    [k, v.join(',')]
                )))
            },
            {
                type: 'deny',
                ...Object.fromEntries(Object.entries(rows.deny).map(([k, v]) => (
                    [k, v.join(',')]
                )))
            }
        ]
    }, [accesses])
    
    console.log(db_rows)
    return <Modal
                width={1000}
                open={modal.visible}
                onCancel={modal.hide}
                maskClosable={false}
                title={t('查看数据库 {{db_name}} 用户权限', { db_name: database.key })}
                afterClose={modal.remove}
                footer={null}
            >
                <Table 
                    columns={db_cols}
                    dataSource={db_rows}/>
     </Modal> 
}) 

