import { Form, InputNumber, Select, Typography } from 'antd'
import { t } from '../../../../i18n/index.js'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { ILineType, ThresholdShowType, ThresholdType } from '../type.js'
import { concat_name_path } from '../../utils.js'
import { StringColorPicker } from '../../../components/StringColorPicker/index.js'
import { FormDependencies } from '../../../components/formily/FormDependcies/index.js'
import { get } from 'lodash'
import { line_type_options } from '../constant.js'
import { dashboard } from '../../model.js'

const show_type_options = [
    {
        label: t('不展示'),
        value: ThresholdShowType.NONE,
    },
    {
        label: t('区域填充'),
        value: ThresholdShowType.FILLED_REGION
    },
    {
        label: t('线条'),
        value: ThresholdShowType.LINE
    },
]

export function ThresholdSetting () { 
    
    const form = Form.useFormInstance()
    const yAxis = Form.useWatch('yAxis', form)
    
    const { widget } = dashboard.use(['widget'])
    
    
    return <>
        <Form.Item initialValue={0} label={t('关联 Y 轴')} name={concat_name_path('threshold', 'related_y_axis')}>
            <Select options={yAxis?.map((item, idx) => ({
                value: idx,
                label: item?.name
            }))} />
        </Form.Item>
        <Form.Item initialValue={ThresholdType.ABSOLUTE} name={concat_name_path('threshold', 'type') } label={t('阈值类型')}>
            <Select options={[{ label: t('绝对值'), value: ThresholdType.ABSOLUTE }, { label: t('百分比'), value: ThresholdType.PERCENTAGE }] } />
        </Form.Item>
        <Form.Item name={concat_name_path('threshold', 'show_type')} label={t('展示类型')} initialValue={ThresholdShowType.NONE}>
            <Select
                options={show_type_options}
                /* show_type 改变会影响某些表单项的显隐，如果不加 update_widget，当从隐藏状态更改为显示状态后，表单显示的属性与真实展示情况会不一致，本质上还是由于 form.setFieldValue 不会触发 form 的 onValuesChange 导致的 */
                onSelect={() => setTimeout(() => { dashboard.update_widget({ ...widget, config: form.getFieldsValue() }) })}
            />
        </Form.Item>
        <FormDependencies dependencies={[concat_name_path('threshold', 'show_type')]}>
            {value => { 
                const show_type = get(value, concat_name_path('threshold', 'show_type'))
                return show_type === ThresholdShowType.LINE
                    ? <>
                        <Form.Item initialValue={ILineType.SOLID} label={t('线类型')} name={concat_name_path('threshold', 'line_type') }>
                            <Select options={line_type_options} />
                        </Form.Item>
                        <Form.Item initialValue={1} label={t('线宽')} name={concat_name_path('threshold', 'line_width') }>
                            <InputNumber addonAfter='px' min={1}/>
                        </Form.Item>
                    </>
                    : null
            } }
        </FormDependencies>
        <Form.List initialValue={[{ }]} name={concat_name_path('threshold', 'thresholds') }>
            {(fields, { remove, add }) => { 
                return <div className='threshold-list'>
                    {
                        fields.map(field => <div key={field.name} className='threshold-item'>
                            <Form.Item name={concat_name_path(field.name, 'color')}>
                                <StringColorPicker />
                            </Form.Item>
                            <FormDependencies dependencies={[concat_name_path('threshold', 'type')]}>
                                {value => { 
                                    const type = get(value, concat_name_path('threshold', 'type'))
                                    return <Form.Item name={concat_name_path(field.name, 'value')}>
                                        <InputNumber addonAfter={type === ThresholdType.PERCENTAGE ? '%' : null} />
                                    </Form.Item>
                                } }
                            </FormDependencies>
                            <DeleteOutlined onClick={ () => { remove(field.name) }} />
                        </div>)
                    }
                    <div className='threshold-add-btn'>
                        <Typography.Link onClick={() => { add() }} >
                            <PlusOutlined className='threshold-add-icon'/>
                            {t('增加阈值')}
                        </Typography.Link>
                    </div>
                </div>
            } }
        </Form.List>
    </>
}
