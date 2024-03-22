import './GlobalErrorBoundary.sass'

import { Component, type PropsWithChildren } from 'react'

import type { HookAPI as ModalHookAPI } from 'antd/es/modal/useModal/index.js'

import type { Model } from 'react-object-model'
import { Button, Result } from 'antd'

import { dashboard } from '../dashboard/model.js'


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


export class GlobalErrorBoundary <TModel> extends Component<PropsWithChildren<{ model: ErrorModel<TModel> }>, GlobalErrorBoundaryState> {
    override state: GlobalErrorBoundaryState = { error: null }
    
    
    static getDerivedStateFromError (error: Error) {
        return { error }
    }
    
    
    on_global_error = ({ error, reason }: ErrorEvent & PromiseRejectionEvent) => {
        error ??= reason
        
        if (!error.shown) {
            error.shown = true
            
            // 非 Error 类型的错误转换为 Error
            if (!(error instanceof Error))
                error = new Error(JSON.stringify(error))
            
            this.props.model.show_error({ error })
        }
    }
    
    
    override render () {
        const { error } = this.state
        
        if (error) {
            const { title, body } = this.props.model.format_error(error)
            
            // 不一定加载并使用 antd 组件
            return <Result
                className='global-error-result'
                status='error'
                title={title}
                subTitle={body}
                extra={<Button onClick={() => { this.clear_error() }}>关闭</Button>}
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

