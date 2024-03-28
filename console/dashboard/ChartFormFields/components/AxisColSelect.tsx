import { WidgetChartType, dashboard } from '../../model.js'
import { get_data_source } from '../../DataSource/date-source.js'
import { Form, Select, Space } from 'antd'
import { concat_name_path, convert_list_to_options } from '../../utils.js'
import { FormDependencies } from '../../../components/formily/FormDependcies/index.js'
import { get } from 'lodash'
import { type NamePath } from 'antd/es/form/interface.js'

interface IProps { 
    label: string
    path: NamePath | NamePath[]
    col_names: string[]
    list_path?: NamePath | NamePath[]
    hidden?: boolean
}

export function AxisColSelect (props: IProps) { 
    const { label, path, col_names, list_path, hidden } = props
    
    const { widget: { source_id = [ ], type } } = dashboard.use(['widget'])
    
    return type === WidgetChartType.COMPOSITE_GRAPH ? <Form.Item label={label}>
        <Space className='col-select-space'>
            <Form.Item name={concat_name_path(path, 'data_source_id')} initialValue={get_data_source(source_id?.[0])?.id}>
                <Select
                    options={source_id.map(id => {
                        const source = get_data_source(id)
                        return { label: source.name, value: source.id }
                    })} />
            </Form.Item>
            <FormDependencies dependencies={concat_name_path(list_path, path, 'data_source_id')}>
                {value => { 
                    const data_source = get(value, concat_name_path(list_path, path, 'data_source_id'))
                    return <Form.Item initialValue={get_data_source(source_id?.[0])?.cols?.[0]} name={concat_name_path(path, 'col_name')}>
                        <Select
                            options={convert_list_to_options(get_data_source(data_source).cols ?? [ ])} />
                    </Form.Item>
                }}
            </FormDependencies>
        </Space>
    </Form.Item>
    :
    <Form.Item
        name={concat_name_path(path, 'col_name')}
        label={label}
        initialValue={col_names[0]}
        hidden={hidden}
    >
        <Select options={convert_list_to_options(col_names)} />
    </Form.Item>
    
}
