import { I18N } from 'xshell/i18n/index.js'
import { i18n as i18n_xsh } from 'xshell/i18n/instance.js'
import { i18n as i18n_api } from 'dolphindb/i18n/index.js'

import _dict from './dict.json'

const i18n = new I18N(_dict)

// 未知语言默认为英文
if (!I18N.LANGUAGE_REGEXP.test(Intl.DateTimeFormat().resolvedOptions().locale.slice(0, 2)))
    i18n.language = i18n_api.language = i18n_xsh.language = 'en'

const { t, Trans, language } = i18n

export { i18n, t, Trans, language }
