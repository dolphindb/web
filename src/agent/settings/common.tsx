import type { ReactNode } from 'react'

import { Alert } from 'antd'


export function required_label (label: ReactNode) {
    return <>{label} <span style={{ color: '#ff4d4f' }}>*</span></>
}


export function form_error_alert (error: string) {
    return error ? <Alert type='error' showIcon message={error} style={{ marginBottom: 12 }} /> : null
}
