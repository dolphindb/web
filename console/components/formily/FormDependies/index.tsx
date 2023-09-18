import { useMount, useUnmount, useUpdate, useUpdateEffect } from 'ahooks'
import { Form, FormInstance } from 'antd'
import { NamePath } from 'antd/es/form/interface'

interface IInternalFormWatchProps {
  name: NamePath
  onMount?: (value: any) => void
  onChange?: (value: any) => void
  onUnmount?: () => void
  form: FormInstance
  preserve?: boolean
}

function Internal_FormWatch (props: IInternalFormWatchProps) {
  const { name, onChange, onMount, onUnmount, form, preserve } = props
  const value = Form.useWatch(name, {
    form,
    preserve,
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

const serializeNamePath = (name: NamePath) => {
  return Array.isArray(name) ? name.join('.') : name
}
interface IFormDependenciesProps {
  dependencies: NamePath[]
  form?: FormInstance
  children: (values: any, form: FormInstance) => React.ReactNode
}

export function FormDependencies (props: IFormDependenciesProps) {
  const { dependencies, form: propForm, children } = props
  const contextForm = Form.useFormInstance()
  const form = propForm || contextForm
  
  const forceUpdate = useUpdate()
  const depValues = form.getFieldsValue(dependencies)
  
  return <>
      {dependencies.map(dep => <Internal_FormWatch
          key={serializeNamePath(dep)}
          name={dep}
          form={form}
          onChange={forceUpdate}
        />)}
      {children(depValues, form)}
    </>
}
