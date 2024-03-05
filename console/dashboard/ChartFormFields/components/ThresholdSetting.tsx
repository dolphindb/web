import { Button, Collapse, Form, InputNumber, Radio, Select, Typography } from 'antd'
import { t } from '../../../../i18n/index.js'
import { DeleteOutlined, PlusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import { AxisType, ILineType, ThresholdShowType, ThresholdType } from '../type.js'
import { concat_name_path } from '../../utils.js'
import { StringColorPicker } from '../../../components/StringColorPicker/index.js'
import { FormDependencies } from '../../../components/formily/FormDependcies/index.js'
import { get } from 'lodash'
import { line_type_options } from '../constant.js'
import { dashboard } from '../../model.js'
import { type CollapseProps } from 'antd/lib/index.js'

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

const form_list_name = 'thresholds'

export function ThresholdSettingList () { 
    const form = Form.useFormInstance()
    
    const { widget } = dashboard.use(['widget'])
    
    return <Form.List name={form_list_name}>
        {(fields, { add, remove }) => { 
            const items: CollapseProps['items'] = fields.map(field => ({
                label: <div className='collapse-label'>
                    {t('阈值 {{name}}', { name: field.name + 1 })}
                    <DeleteOutlined onClick={() => { remove(field.name) }} />
                </div>,
                children: <>
                    <Form.Item label={t('关联轴类型')} initialValue={1} name={concat_name_path(field.name, 'axis_type')}>
                        <Select options={[{ label: t('X 轴'), value: 0 }, { label: t('Y 轴'), value: 1 }]} onSelect={() => { form.setFieldValue(concat_name_path(form_list_name, field.name, 'axis'), undefined) } } />
                    </Form.Item>
                    
                    <FormDependencies dependencies={[concat_name_path(form_list_name, field.name, 'axis_type'), 'yAxis', 'xAxis']} >
                        {value => { 
                            const type = get(value, concat_name_path(form_list_name, field.name, 'axis_type'))
                            const yAxis = get(value, 'yAxis')
                            const xAxis = get(value, 'xAxis')
                            
                            return <Form.Item
                                tooltip={t('仅支持数据轴')}
                                label={type === 0 ? t('关联 X 轴') : t('关联 Y 轴')}
                                name={concat_name_path(field.name, 'axis')}
                            >
                                <Select options={(type === 0 ? [xAxis] : yAxis)
                                    ?.filter(item => item.type === AxisType.VALUE)
                                    ?.map((item, idx) => ({
                                        value: idx,
                                        label: item?.name
                                    }))}
                                />
                            </Form.Item>
                        }}
                    </FormDependencies>
                    
                    <Form.Item label={t('阈值类型')} name={concat_name_path(field.name, 'type')} initialValue={ThresholdType.ABSOLUTE} >
                        <Select options={[{ label: t('绝对值'), value: ThresholdType.ABSOLUTE }, { label: t('百分比'), value: ThresholdType.PERCENTAGE }] } />
                    </Form.Item>
                    
                    <Form.Item label={t('展示类型')} name={concat_name_path(field.name, 'show_type')} initialValue={ThresholdShowType.NONE}>
                        <Select
                            options={show_type_options}
                            /* show_type 改变会影响某些表单项的显隐，如果不加 update_widget，当从隐藏状态更改为显示状态后，表单显示的属性与真实展示情况会不一致，本质上还是由于 form.setFieldValue 不会触发 form 的 onValuesChange 导致的 */
                            onSelect={() => setTimeout(() => { dashboard.update_widget({ ...widget, config: form.getFieldsValue() }) })}
                        />
                    </Form.Item>
                    
                    <FormDependencies dependencies={[concat_name_path(form_list_name, field.name, 'show_type')]}>
                        {value => { 
                            const show_type = get(value, concat_name_path(form_list_name, field.name, 'show_type'))
                            return show_type === ThresholdShowType.LINE
                                ? <>
                                    <Form.Item label={t('线类型')} initialValue={ILineType.SOLID} name={concat_name_path(field.name, 'line_type') }>
                                        <Select options={line_type_options} />
                                    </Form.Item>
                                    <Form.Item label={t('线宽')} initialValue={1} name={concat_name_path(field.name, 'line_width') }>
                                        <InputNumber addonAfter='px' min={1}/>
                                    </Form.Item>
                                </>
                                : null
                        } }
                    </FormDependencies>
                    
                    <Form.List initialValue={[{ }]} name={concat_name_path(field.name, 'values')}>
                        {(fields, { remove, add }) => { 
                            return <div className='threshold-list'>
                                {
                                    fields.map(value_field => <div key={value_field.name} className='threshold-item'>
                                        <Form.Item name={concat_name_path(value_field.name, 'color')}>
                                            <StringColorPicker />
                                        </Form.Item>
                                        <FormDependencies dependencies={[concat_name_path(form_list_name, field.name, 'values', value_field, 'type')]}>
                                            {value => { 
                                                const type = get(value, concat_name_path(form_list_name, field.name, 'values', value_field, 'type'))
                                                return <Form.Item name={concat_name_path(value_field.name, 'value')}>
                                                    <InputNumber addonAfter={type === ThresholdType.PERCENTAGE ? '%' : null} />
                                                </Form.Item>
                                            } }
                                        </FormDependencies>
                                        <DeleteOutlined onClick={ () => { remove(value_field.name) }} />
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
            }))
            return <>
                { !!items.length && <Collapse size='small' items={items} />}
                <Button
                    style={{ marginTop: 12 }}
                    block
                    type='dashed'
                    icon={<PlusCircleOutlined />}
                    onClick={() => { add() }}
                >
                    {t('增加阈值设置')}
                </Button>
            </>
        }}
    </Form.List>
}

