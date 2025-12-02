import { useMount, useUnmount, useUpdate, useUpdateEffect } from 'ahooks'
import { Form, type FormInstance } from 'antd'

import type { NamePath } from 'antd/es/form/interface'

interface IInternalFormWatchProps {
    name: NamePath
    onMount?: (value: any) => void
    onChange?: (value: any) => void
    onUnmount?: () => void
    form: FormInstance
    preserve?: boolean
}

function InternalFormWatch (props: IInternalFormWatchProps) {
    const { name, onChange, onMount, onUnmount, form, preserve } = props
    const value = Form.useWatch(name, {
        form,
        preserve
    })
    
    useMount(() => {
        onMount?.(value)
    })
    
    useUnmount(() => {
        onUnmount?.()
    })
    
    useUpdateEffect(() => {
        onChange?.(value)
    }, [value])
    
    return null
}


export function FormDependencies ({ dependencies, form: propForm, children }: {
    dependencies: NamePath[]
    form?: FormInstance
    children: (values: any, form: FormInstance) => React.ReactNode
}) {
    const contextForm = Form.useFormInstance()
    const form = propForm || contextForm
    
    return <>
        {dependencies.map(dep => 
            <InternalFormWatch 
                key={Array.isArray(dep) ? dep.join('.') : dep}
                name={dep} 
                form={form} 
                onChange={useUpdate()} 
            />)}
        {children(form.getFieldsValue(dependencies), form)}
    </>
}
