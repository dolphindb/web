import type { ReactNode } from 'react'


export function required_label (label: ReactNode) {
    return <>{label} <span style={{ color: '#ff4d4f' }}>*</span></>
}


export function field_error (error: string, message_text: string) {
    return error === message_text ? <div style={{ color: '#ff4d4f', fontSize: 12, marginTop: 4 }}>{message_text}</div> : null
}
