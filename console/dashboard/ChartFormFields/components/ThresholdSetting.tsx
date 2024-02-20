import { Form, InputNumber, Select, Typography } from 'antd'
import { t } from '../../../../i18n/index.js'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { ThresholdShowType, ThresholdType } from '../type.js'
import { concat_name_path } from '../../utils.js'
import { StringColorPicker } from '../../../components/StringColorPicker/index.js'
import cn from 'classnames'
import { FormDependencies } from '../../../components/formily/FormDependcies/index.js'
import { get } from 'lodash'

const show_type_options = [
    {
        label: t('不展示'),
        value: ThresholdShowType.NONE,
    },
    {
        label: t('区域填充'),
        value: ThresholdShowType.FILLED_REGION
    }
]

export function ThresholdSetting () { 
    
    const form = Form.useFormInstance()
    const yAxis = Form.useWatch('yAxis', form)
    
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
            <Select options={show_type_options} />
        </Form.Item>
        <Form.List initialValue={[{ }]} name={concat_name_path('threshold', 'thresholds') }>
            {(fields, { remove, add }) => { 
                return <div className='threshold-list'>
                    {
                        fields.map(field => <div className='threshold-item'>
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
                            <DeleteOutlined className={cn({ 'hidden-delete-icon': !field.name }) } onClick={ () => { remove(field.name) }} />
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
