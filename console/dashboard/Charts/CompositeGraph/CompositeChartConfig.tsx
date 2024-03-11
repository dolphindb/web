import { DeleteOutlined, PlusCircleOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import { Form, Collapse, type CollapseProps, Select, Input, Button, Tooltip, Typography } from 'antd'
import type { DdbType } from 'dolphindb/browser.js'
import { get, uniq } from 'lodash'
import { useMemo, useState, useCallback } from 'react'

import { t } from '../../../../i18n/index.js'
import { BoolRadioGroup } from '../../../components/BoolRadioGroup/index.js'
import { FormDependencies } from '../../../components/formily/FormDependcies/index.js'
import { DDB_TYPE_MAP } from '../../../constants/ddb-type-maps.js'
import { AxisItem, YAxis, Series, ThresholdFormFields } from '../../ChartFormFields/BasicChartFields.js'
import { BasicFormFields } from '../../ChartFormFields/BasicFormFields.js'
import { SeriesItem } from '../../ChartFormFields/components/SeriesItem.js'
import { AxisType, MatchRuleType } from '../../ChartFormFields/type.js'
import { get_data_source } from '../../DataSource/date-source.js'
import { dashboard } from '../../model.js'
import { convert_list_to_options, concat_name_path } from '../../utils.js'
import { SingleDataSourceUpdate } from './index.js'
import { VALUE_TYPES } from './constant.js'


const series_match_type_options = [
    {
        label: <>
            {t('数据源匹配')}
            <Tooltip title={t('同数据源的数值列采用同配置')}>
                <QuestionCircleOutlined className='series_match_type_tip'/>
            </Tooltip>
        </>,
        value: MatchRuleType.DATA_SOURCE
    },
    {
        label: <>
            {t('列名完全匹配')}
            <Tooltip title={t('为指定名称的列定制配置')}>
                <QuestionCircleOutlined className='series_match_type_tip'/>
            </Tooltip>
        </>,
        value: MatchRuleType.NAME
    },
    {
        label: <>
            {t('列名正则匹配')}
            <Tooltip title={t('为列名匹配正则表达式的列定制配置')}>
                <QuestionCircleOutlined className='series_match_type_tip'/>
            </Tooltip>
        </>,
        value: MatchRuleType.REGEXP
    },
    {
        label: <>
            {t('类型匹配')}
            <Tooltip title={t('为特定 DolphinDB 数据类型的列定制配置，如 INT, DOUBLE')}>
                <QuestionCircleOutlined className='series_match_type_tip'/>
            </Tooltip>
        </>,
        value: MatchRuleType.DATA_TYPE
    }
]


// 时序图不需要配置 y 轴，默认为数据轴
export function CompositeChartConfig () {
    const { widget } = dashboard.use(['widget']) 
    const type = useMemo(() => widget.type, [widget])
    const [update, set_update] = useState({ })
    
    const force_update = useCallback(() => { set_update({ }) }, [ ])
    
    const form = Form.useFormInstance()
    
    // 是否开启自动画图模式
    const automatic_mode = Form.useWatch('automatic_mode', form)
    
    // 所有数据源类型 map
    const type_map = useMemo<Record<string, DdbType>>(() => { 
        return widget.source_id.reduce((prev, id) => ({ ...prev, ...get_data_source(id).type_map }), { })
    }, [update, widget.source_id])
    
    // 所有数据源数值类型列名
    const col_options = useMemo(() => { 
        return convert_list_to_options(
            uniq(widget.source_id.reduce((prev, id) => { 
                const cols = uniq(get_data_source(id).cols).filter(col => VALUE_TYPES.includes(type_map[col]))
                return prev.concat(cols)
            }, [ ]))
        )
    }, [update, widget.source_id, type_map])
    
    
    return <>
        {widget.source_id.map(id => <SingleDataSourceUpdate key={id} source_id={id} force_update={force_update}/>) }
        <BasicFormFields type='chart' />
        <Collapse items={[
            {
                key: 'x_axis',
                label: t('X 轴配置'),
                forceRender: true,
                children: <AxisItem
                    col_names={[ ]}
                    name_path='xAxis'
                    hidden_fields={['col_name']}
                    initial_values={{
                        type: AxisType.CATEGORY
                    }}
                />
            },
            {
                key: 'y_axis',
                label: t('Y 轴配置'),
                forceRender: true,
                children: <YAxis
                    col_names={[ ]}
                    axis_item_props={{ hidden_fields: automatic_mode ? ['col_name', 'type'] : [ ] }} />
            },
            {
                key: 'series',
                label: <div className='collapse-label'>
                    {t('数据列配置')}
                    <Tooltip title={t('单条数据列若命中多个配置规则，以第一项命中的为准') }>
                        <QuestionCircleOutlined />
                    </Tooltip>
                </div>,
                forceRender: true,
                children: !automatic_mode
                    ? <Series col_names={[ ]} />
                    : <Form.List name='series'>
                    {(fields, { add, remove }) => { 
                        const items: CollapseProps['items'] = fields.map(field => ({
                            key: `series_${field.name}`,
                            forceRender: true,
                            label: <div className='collapse-label'>
                                {t('配置规则 {{name}}', { name: field.name + 1 })}
                                <DeleteOutlined onClick={() => { remove(field.name) }}/>
                            </div>,
                            children: <div key={field.name}>
                                {/* 用户选择如何配置应用的范围 */}
                                <Form.Item label={t('匹配类型')} name={[field.name, 'match_type']}>
                                    <Select options={series_match_type_options} onSelect={() => { form.setFieldValue(concat_name_path('series', field.name, 'match_value'), undefined) } } />
                                </Form.Item>
                                <FormDependencies dependencies={[concat_name_path('series', field.name, 'match_type')]}>
                                    {value => {
                                        const match_type = get(value, concat_name_path('series', field.name, 'match_type')) as MatchRuleType
                                        switch (match_type) {
                                            case MatchRuleType.NAME:
                                                return <Form.Item
                                                    label={t('筛选列')}
                                                    name={concat_name_path(field.name, 'match_value')}
                                                >
                                                    <Select mode='tags' options={col_options} />
                                                </Form.Item>
                                            case MatchRuleType.REGEXP:
                                                return <Form.Item
                                                    label={t('正则表达式')}
                                                    tooltip={<>
                                                        <div>{t('支持字面量形式和构造函数形式的正则对象')}</div>
                                                        <ul>
                                                            <li>{t('字面量：/abc/g')}</li>
                                                            <li>{t('构造函数：new RegExp("abc", "g")')}</li>
                                                        </ul> 
                                                    </>}
                                                    name={concat_name_path(field.name, 'match_value')}
                                                >
                                                    <Input placeholder={t('请输入正则表达式') } />
                                                </Form.Item>
                                            case MatchRuleType.DATA_TYPE:
                                                const types = uniq(Object.values(type_map)).filter(type => VALUE_TYPES.includes(type)).map(item => ({ label: DDB_TYPE_MAP[item], value: item }))
                                                return <Form.Item label={t('数据类型')} name={concat_name_path(field.name, 'match_value')}>
                                                    <Select options={types} mode='multiple'/>
                                                </Form.Item>
                                            case MatchRuleType.DATA_SOURCE:
                                                return <Form.Item label={t('数据源')} name={concat_name_path(field.name, 'match_value')}>
                                                    <Select options={widget.source_id.map(id => ({ label: get_data_source(id).name, value: id })) } />
                                                </Form.Item>
                                            default:
                                                return null
                                        }
                                    } }
                                </FormDependencies>
                                
                                {/* 是否展示 */}
                                <FormDependencies dependencies={[concat_name_path('series', field.name, 'match_value')] }>
                                    {value => {
                                        const match_value = get(value, concat_name_path('series', field.name, 'match_value'))
                                        return match_value
                                            ? <Form.Item label={t('是否展示')} name={concat_name_path(field.name, 'show')} initialValue>
                                                <BoolRadioGroup />
                                            </Form.Item>
                                            : null
                                    }}
                                </FormDependencies>
                                
                                 {/* 数据列配置 */}
                                <FormDependencies
                                    dependencies={[
                                        concat_name_path('series', field.name, 'show'),
                                        concat_name_path('series', field.name, 'match_type'),
                                        concat_name_path('series', field.name, 'match_value')
                                    ]}>
                                    {value => { 
                                        const show = get(value, concat_name_path('series', field.name, 'show'))
                                        const match_type = get(value, concat_name_path('series', field.name, 'match_type'))
                                        const data_source = get(value, concat_name_path('series', field.name, 'match_value'))
                                        return show
                                            ? <>
                                                {match_type === MatchRuleType.DATA_SOURCE && <Form.Item name={concat_name_path(field.name, 'x_col_name')} label={t('x 轴数据列')}>
                                                    <Select options={convert_list_to_options(get_data_source(data_source).cols)} />
                                                </Form.Item> }
                                                <SeriesItem col_names={col_options.map(item => item.value) as string[]} type={type} name={field.name} path='series' />
                                            </>
                                            : null
                                    } }
                                </FormDependencies>
                            </div>
                        }))
                        
                        return <>
                            {!!items.length && <Collapse items={items} size='small'/> }
                            <Button
                                style={{ width: '100%', marginTop: 12 }}
                                type='dashed'
                                icon={<PlusCircleOutlined />}
                                onClick={() => { add() }}
                            >
                                {t('增加配置规则')}
                            </Button>
                        </>
                    } }
                </Form.List>
            }
        ]} />
        <ThresholdFormFields />
    </>
}
