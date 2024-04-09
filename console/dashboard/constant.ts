import { DdbForm } from 'dolphindb'

import { t } from '../../i18n/index.js'

export const DATA_SOURCE_TYPE_MAP = {
    [DdbForm.table]: t('表格'),
    [DdbForm.matrix]: t('矩阵')
}


export const AUTO_SAVE_KEY = "dashboard_auto_save"