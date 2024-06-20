import { CheckCircleFilled, CloseCircleFilled, MinusCircleFilled } from '@ant-design/icons'

import { t } from '../../i18n/index.js'

export const NeedInputAccess = ['DB_OWNER', 'QUERY_RESULT_MEM_LIMIT', 'TASK_GROUP_MEM_LIMIT']

export const ACCESS_TYPE = {
    database: ['DB_MANAGE', 'DB_OWNER', 'DB_WRITE', 'DBOBJ_CREATE', 'DBOBJ_DELETE', 'DB_INSERT', 'DB_UPDATE', 'DB_DELETE', 'DB_READ'],
    table: ['TABLE_WRITE', 'TABLE_INSERT', 'TABLE_UPDATE', 'TABLE_DELETE', 'TABLE_READ'],
    shared: ['TABLE_WRITE', 'TABLE_READ', 'TABLE_INSERT', 'TABLE_UPDATE', 'TABLE_DELETE'],
    stream: ['TABLE_WRITE', 'TABLE_READ', 'TABLE_INSERT', 'TABLE_UPDATE', 'TABLE_DELETE'],
    function_view: ['VIEW_EXEC'],
    script: ['SCRIPT_EXEC', 'TEST_EXEC', 'VIEW_OWNER', 'QUERY_RESULT_MEM_LIMIT', 'TASK_GROUP_MEM_LIMIT']
}

export const TABLE_NAMES = {
    database: t('数据库'),
    shared: t('共享内存表'),
    stream: t('流数据表'),
    function_view: t('函数视图'),
    script: t('全局权限')
}


export type TABLE_ACCESS = {
    name: string
    access?: object
    stat?: string
    tables?: string[]
}


export const access_options = {
    database: ACCESS_TYPE.database.concat(ACCESS_TYPE.table),
    shared: ['TABLE_WRITE', 'TABLE_READ'],
    stream: ['TABLE_WRITE', 'TABLE_READ'],
    function_view: ACCESS_TYPE.function_view,
    script: ACCESS_TYPE.script
}


export const STAT_ICONS = {
    allow: <CheckCircleFilled className='green' />,
    deny: <CloseCircleFilled className='red' />,
    none: <MinusCircleFilled className='gray' />
}
