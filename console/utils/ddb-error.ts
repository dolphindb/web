import { t } from '../../i18n/index.js'
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
