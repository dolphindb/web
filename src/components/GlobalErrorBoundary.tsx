import './GlobalErrorBoundary.sass'

import { Component, type PropsWithChildren } from 'react'

import type { HookAPI as ModalHookAPI } from 'antd/es/modal/useModal/index.js'

import type { Model } from 'react-object-model'
import { Button, Result } from 'antd'

import { model } from '../model.js'
import { dashboard } from '../dashboard/model.js'
import { t } from '../../i18n/index.js'


export interface FormatErrorOptions {
    error?: Error
    title?: string
    body?: string
}


export interface ErrorModel <TModel> extends Model<TModel> {
    modal: ModalHookAPI
    
    show_error (options: FormatErrorOptions): void
    
    format_error (error: Error): { title: string, body: string }
}


interface GlobalErrorBoundaryState {
    error?: Error
}


export class GlobalErrorBoundary extends Component<PropsWithChildren<{ }>, GlobalErrorBoundaryState> {
    override state: GlobalErrorBoundaryState = { error: null }
    
    
    static getDerivedStateFromError (error: Error) {
        return { error }
    }
    
    
    /** 挂载到全局的错误处理方法，在 onClick, useEffect 等回调中报错且未 catch 时弹框显示错误 */
    on_global_error = ({ error, reason }: ErrorEvent & PromiseRejectionEvent) => {
        error ??= reason
        
        if (!error.shown) {
            error.shown = true
            
            // 非 Error 类型的错误转换为 Error
            if (error instanceof Error) {
                // 忽略 monaco editor 的错误
                // https://github.com/microsoft/monaco-editor/issues/4325
                if (error.message.includes('getModifierState is not a function'))
                    return
            } else {
                // 忽略 monaco editor 的错误
                // https://github.com/suren-atoyan/monaco-react/issues/57
                if (error.msg?.includes('operation is manually canceled') && error.type === 'cancelation') 
                    return
                
                error = new Error(JSON.stringify(error))
            }
            
            const in_dashboard = new URLSearchParams(location.search).get('dashboard')
            
            if (in_dashboard)
                dashboard.show_error({ error })
            else
                model.show_error({ error })
        }
    }
    
    
    override render () {
        const { error } = this.state
        
        if (error) {
            const { title, body } = model.format_error(error)
            
            return <Result
                className='global-error-result'
                status='error'
                title={title}
                subTitle={body}
                extra={<Button onClick={() => { this.clear_error() }}>{t('关闭')}</Button>}
            />
        } else
            return this.props.children
    }
    
    
    clear_error () {
        this.setState({ error: null })
    }
    
    
    override componentDidMount () {
        window.addEventListener('error', this.on_global_error)
        window.addEventListener('unhandledrejection', this.on_global_error)
    }
    
    
    override componentWillUnmount () {
        window.removeEventListener('error', this.on_global_error)
        window.removeEventListener('unhandledrejection', this.on_global_error)
    }
}

