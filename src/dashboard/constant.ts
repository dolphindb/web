import { DdbForm } from 'dolphindb/browser.js'

import { t } from '../../i18n/index.js'

export const DATA_SOURCE_TYPE_MAP = {
    [DdbForm.table]: t('表格'),
    [DdbForm.matrix]: t('矩阵')
}


export const DASHBOARD_SHARED_SEARCH_KEY = 'dashboard_share_ids'
