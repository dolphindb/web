import { CheckCircleFilled, CloseCircleFilled, MinusCircleFilled } from '@ant-design/icons'

import { t } from '@i18n'

export const NEED_INPUT_ACCESS = new Set(['DB_OWNER', 'QUERY_RESULT_MEM_LIMIT', 'TASK_GROUP_MEM_LIMIT'])

export const ACCESS_TYPE = {
    catalog: ['CATALOG_MANAGE', 'CATALOG_READ', 'CATALOG_WRITE', 'CATALOG_INSERT', 'CATALOG_UPDATE', 'CATALOG_DELETE'],
    schema: [  'SCHEMA_MANAGE', 'SCHEMAOBJ_CREATE', 'SCHEMAOBJ_DELETE', 'SCHEMA_READ', 'SCHEMA_WRITE', 'SCHEMA_INSERT', 'SCHEMA_UPDATE', 'SCHEMA_DELETE'],
    database: [ 'DB_MANAGE', 'DB_OWNER', 'DBOBJ_CREATE', 'DBOBJ_DELETE', 'DB_READ', 'DB_WRITE', 'DB_INSERT', 'DB_UPDATE', 'DB_DELETE'],
    table: ['TABLE_WRITE', 'TABLE_INSERT', 'TABLE_UPDATE', 'TABLE_DELETE', 'TABLE_READ'],
    shared: ['TABLE_WRITE', 'TABLE_READ', 'TABLE_INSERT', 'TABLE_UPDATE', 'TABLE_DELETE'],
    stream: ['TABLE_WRITE', 'TABLE_READ', 'TABLE_INSERT', 'TABLE_UPDATE', 'TABLE_DELETE'],
    function_view: ['VIEW_EXEC'],
    compute_group: ['COMPUTE_GROUP_EXEC'],
    script: ['SCRIPT_EXEC', 'TEST_EXEC', 'VIEW_OWNER', 'QUERY_RESULT_MEM_LIMIT', 'TASK_GROUP_MEM_LIMIT'],
}

export const TABLE_NAMES = {
    catalog: t('目录'),
    database: t('DFS 数据库'),
    table: t('DFS 表'),
    shared: t('共享内存表'),
    stream: t('流数据表'),
    function_view: t('函数视图'),
    compute_group: t('计算组'),
    script: t('全局权限')
}

export const ACCESS_OPTIONS = {
    catalog:  ACCESS_TYPE.catalog.concat(ACCESS_TYPE.database, ACCESS_TYPE.schema, ACCESS_TYPE.table),
    database: ACCESS_TYPE.database.concat(ACCESS_TYPE.table),
    shared: ['TABLE_WRITE', 'TABLE_READ'],
    stream: ['TABLE_WRITE', 'TABLE_READ'],
    function_view: ACCESS_TYPE.function_view,
    compute_group: ACCESS_TYPE.compute_group,
    script: ACCESS_TYPE.script
}


export const STAT_ICONS = {
    allow: <CheckCircleFilled className='green' />,
    deny: <CloseCircleFilled className='red' />,
    none: <MinusCircleFilled className='gray' />,
    default: null
}

export const DATABASES_WITHOUT_CATALOG = '[DATABASES WITHOUT CATALOG]'

export const NAME_CHECK_PATTERN = /^(?![\d_])[\w\d]+$/

/** https://dolphindb1.atlassian.net/wiki/spaces/DolphinDB/pages/1450607195/D20-22935 */
export const USERNAME_CHECK_PATTERN = /^[a-zA-Z][0-9a-zA-Z\-_]*$/
