import { I18N } from 'xshell/i18n'

import _dict from './dict.json'

const i18n = new I18N(_dict)

const { t, Trans, language } = i18n

export { i18n, t, Trans, language }
