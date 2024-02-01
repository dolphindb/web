import { language, t } from '../../i18n/index.js'
import { error_message } from './ddb-error-message.js'

export function parse_error (error: Error) {
    const DDB_ERROR_JSON_PATTERN = /^{.*"code": "(.*)".*}$/
    const lastArrowIndex = error.message.lastIndexOf('=>')
    const errorMsgStartIndex = lastArrowIndex === -1 ? 0 : lastArrowIndex + 3
    const textErrorMsg = error.message.slice(errorMsgStartIndex)
  
    const jsonErrorMsg = DDB_ERROR_JSON_PATTERN.exec(textErrorMsg)
  
    if (!jsonErrorMsg)
        return error
    
    const jsonError = JSON.parse(jsonErrorMsg[0])
    return new Error(t(error_message[jsonError.code], { variables: jsonError.variables }))
}


export function get_error_code_doc_link (ref_id: string) {
    return language === 'en'
        ? `https://docs.dolphindb.com/en/Maintenance/ErrorCodeReference/${ref_id}.html`
        : `https://docs.dolphindb.cn/zh/error_codes/${ref_id}.html`
}
