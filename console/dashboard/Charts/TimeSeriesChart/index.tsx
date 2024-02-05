import './index.scss'

import { Button, Collapse, type CollapseProps, Form, Select, Typography, Tooltip, Input, InputNumber } from 'antd'
import { BasicFormFields } from '../../ChartFormFields/BasicFormFields.js'
import { t } from '../../../../i18n/index.js'
import { AxisItem, YAxis } from '../../ChartFormFields/BasicChartFields.js'
import { AxisType, ITimeFormat } from '../../ChartFormFields/type.js'
import { DeleteOutlined, LinkOutlined, PlusCircleOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import { FormDependencies } from '../../../components/formily/FormDependcies/index.js'
import { concat_name_path, convert_chart_config, convert_list_to_options } from '../../utils.js'
import { get, uniq } from 'lodash'
import { DdbType } from 'dolphindb'
import { DDB_TYPE_MAP } from '../../../constants/ddb-type-maps.js'

import { type Widget, dashboard } from '../../model.js'
import { SeriesItem } from '../../ChartFormFields/components/SeriesItem.js'
import { useEffect, useMemo } from 'react'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts'
import { type ISeriesConfig, type IChartConfig, type AxisConfig } from '../../type'


enum MatchRuleType {
    NAME,
    REGEXP,
    DATA_TYPE
}

interface ITimeSeriesItemConfig extends Omit<ISeriesConfig, 'type' | 'col_name'> { 
    match_type: MatchRuleType
    match_value: any
}

interface ITimeSeriesChartConfig extends Omit<IChartConfig, 'series'> { 
    series: ITimeSeriesItemConfig[]
}

interface ITimeSeriesChart { 
    data_source: {}[]
    col_names: string[]
    type_map: Record<string, DdbType>
    widget: Widget
}

interface ITimeSeriesChartConfigProps { 
    col_names: string[]
    type_map: Record<string, DdbType>
}

const REGEXP_LINK = 'https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/RegExp'

const series_match_type_options = [
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

const TIME_TYPES = [
    DdbType.date,
    DdbType.month,
    DdbType.time,
    DdbType.minute,
    DdbType.second,
    DdbType.datetime,
    DdbType.timestamp,
    DdbType.nanotime,
    DdbType.nanotimestamp,
    DdbType.datehour
]


export function TimeSeriesChart (props: ITimeSeriesChart) {
    const { widget, data_source, col_names, type_map } = props
    
    const options = useMemo(() => { 
        const { series = [ ], xAxis, yAxis = [ ], ...others } = widget.config as unknown as ITimeSeriesChartConfig
        const x_axis_col = xAxis?.col_name
        
        const config = {
            ...others,
            xAxis,
            yAxis: yAxis.map(item => ({ ...item, type: AxisType.VALUE })),
            // 将 X 轴过滤，其他列均作为数据列
            series: col_names.filter(item => item !== x_axis_col).map(col => {
                // 按照匹配规则为配置数据列，如果没有匹配中的就使用默认的
                const match_rule = series.filter(Boolean).find(item => {
                    const { match_type, match_value } = item
                    
                    if (match_type === MatchRuleType.NAME)
                        return item.match_value?.includes(col)
                    else if (match_type === MatchRuleType.DATA_TYPE)
                        return match_value === type_map[col]
                    else if (match_type === MatchRuleType.REGEXP)  
                        try { return eval(match_value)?.test(col) }
                        catch (e) { return false }
                })
                return { col_name: col, type: 'line', name: col, ...match_rule }
            })
        }
        return convert_chart_config({ ...widget, config } as unknown as  Widget, data_source)
    }, [widget.config, col_names, type_map, data_source])
    
    console.log(options, 'options')
    
    return <ReactEChartsCore
        echarts={echarts}
        notMerge={dashboard.editing}
        option={options}
        className='dashboard-line-chart'
        theme='my-theme'
    />
}

// 时序图不需要配置 y 轴，默认为数据轴，但是可以配置 x 轴更改时间列
export function TimeSeriesChartConfig (props: ITimeSeriesChartConfigProps) {
    const { col_names, type_map } = props
    const { widget } = dashboard.use(['widget']) 
    const type = useMemo(() => widget.type, [widget])
    
    const form = Form.useFormInstance()
    
    useEffect(() => {
        const time_col = col_names.find(col => TIME_TYPES.includes(type_map[col]))
        const config = widget.config as IChartConfig
        form.setFieldValue(concat_name_path('xAxis', 'col_name'), time_col)
        dashboard.update_widget({ ...widget, config: { ...config, xAxis: { ...config?.xAxis, col_name: time_col } } })
    }, [col_names, type_map, widget.id])
    
    return <>
        <BasicFormFields type='chart' />
        <Collapse items={[
            {
                key: 'x_axis',
                label: t('X 轴配置'),
                forceRender: true,
                children: <AxisItem
                    col_names={col_names}
                    name_path='xAxis'
                    initial_values={{
                        type: AxisType.TIME,
                        time_format: ITimeFormat.DATE_SECOND,
                        /** 第一个时间类型的列作为 X 轴 */
                        col_name: col_names.find(col => TIME_TYPES.includes(type_map[col]))
                    }}
                />
            },
            {
                key: 'y_axis',
                label: t('Y 轴配置'),
                forceRender: true,
                children: <YAxis col_names={col_names} axis_item_props={{ hidden_fields: ['col_name', 'type'] } } />
            },
            {
                key: 'series',
                label: t('数据列配置'),
                forceRender: true,
                children: <Form.List name='series'>
                    {(fields, { add, remove }) => { 
                        const items: CollapseProps['items'] = fields.map(field => ({
                            key: `series_${field.name}`,
                            forceRender: true,
                            label: <div className='collapse-label'>
                                {t(`配置规则 ${field.name + 1}`)}
                                <DeleteOutlined onClick={() => { remove(field.name) }}/>
                            </div>,
                            children: <div key={field.name}>
                                {/* 用户选择如何配置应用的范围 */}
                                <Form.Item label={t('匹配类型')} name={[field.name, 'match_type']}>
                                    <Select options={series_match_type_options} />
                                </Form.Item>
                                <FormDependencies dependencies={[concat_name_path('series', field.name, 'match_type')]}>
                                    {value => { 
                                        const match_type = get(value, concat_name_path('series', field.name, 'match_type'))
                                        switch (match_type) {
                                            case MatchRuleType.NAME:
                                                return <Form.Item label={t('筛选列')} name={concat_name_path(field.name, 'match_value')}>
                                                    <Select mode='multiple' options={convert_list_to_options(col_names)} />
                                                </Form.Item>
                                            case MatchRuleType.REGEXP:
                                                return <Form.Item
                                                    label={t('正则表达式')}
                                                    name={concat_name_path(field.name, 'match_value')}
                                                    extra={<Typography.Link target='_blank' href={REGEXP_LINK}>
                                                        <LinkOutlined style={{ marginRight: 8 }}/>
                                                        {t('正则表达式书写规则')}
                                                    </Typography.Link>}
                                                >
                                                    <Input placeholder={t('请输入字面量形式的正则表达式，如 /[0-9]+/g') } />
                                                </Form.Item>
                                            case MatchRuleType.DATA_TYPE:
                                                const type_options = uniq(Object.values(type_map)).map(item => ({ label: DDB_TYPE_MAP[item], value: item }))
                                                return <Form.Item label={t('数据类型')} name={concat_name_path(field.name, 'match_value')}>
                                                    <Select options={type_options}/>
                                                </Form.Item>
                                            default:
                                                return null
                                        }
                                    } }
                                </FormDependencies>
                                
                                {/* 数据列配置 */}
                                <FormDependencies dependencies={[concat_name_path(concat_name_path('series', field.name, 'match_value'))] }>
                                    {value => {
                                        const match_value = get(value, concat_name_path('series', field.name, 'match_value'))
                                        return match_value
                                            ? <SeriesItem col_names={col_names} type={type} name={field.name} path='series' />
                                            : null
                                    }}
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
                                {t('增加数据列配置')}
                            </Button>
                        </>
                    } }
                </Form.List>
            }
        ]} />
    </>
}
