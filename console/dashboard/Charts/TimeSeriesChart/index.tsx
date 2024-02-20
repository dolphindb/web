import './index.scss'

import { Button, Collapse, type CollapseProps, Form, Select, Typography, Tooltip, Input, InputNumber } from 'antd'
import { BasicFormFields } from '../../ChartFormFields/BasicFormFields.js'
import { t } from '../../../../i18n/index.js'
import { AxisItem, ThresholdFormFields, YAxis } from '../../ChartFormFields/BasicChartFields.js'
import { AxisType, ITimeFormat } from '../../ChartFormFields/type.js'
import { DeleteOutlined, LinkOutlined, PlusCircleOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import { FormDependencies } from '../../../components/formily/FormDependcies/index.js'
import { concat_name_path, convert_chart_config, convert_list_to_options, format_time } from '../../utils.js'
import { get, uniq } from 'lodash'
import { DdbType } from 'dolphindb'
import { DDB_TYPE_MAP } from '../../../constants/ddb-type-maps.js'

import { type Widget, dashboard } from '../../model.js'
import { SeriesItem } from '../../ChartFormFields/components/SeriesItem.js'
import { useCallback, useEffect, useMemo, useState } from 'react'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts'
import { type ISeriesConfig, type IChartConfig } from '../../type.js'
import { get_data_source } from '../../DataSource/date-source.js'
import { BoolRadioGroup } from '../../../components/BoolRadioGroup/index.js'


enum MatchRuleType {
    NAME,
    REGEXP,
    DATA_TYPE
}

interface ITimeSeriesItemConfig extends Omit<ISeriesConfig, 'type' | 'col_name'> { 
    match_type: MatchRuleType
    match_value: any
    show: boolean
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
    const { widget, data_source } = props
    const [update, set_update] = useState(null)
    
    // 存储每个数据源的时间列和数据列
    const [source_col_map, set_source_col_map] = useState<Record<string, { time_col: string, series_col: string[] }>>({ })
    
    useEffect(() => { set_source_col_map({ }) }, [widget.source_id])
    
    useEffect(() => { 
        for (let id of widget.source_id) { 
            const { cols, type_map } = get_data_source(id)
            // 第一个时间类型的列作为时间列，其余作为数据列
            const time_col = cols.find(col => TIME_TYPES.includes(type_map[col]))
            const series_col = cols.filter(item => item !== time_col)
            set_source_col_map(map => ({
                ...map,
                [id]: { time_col, series_col }
            }))
        }
    }, [update])
    
    const type_map = useMemo<Record<string, DdbType>>(() => { 
        return widget.source_id.reduce((prev, id) => ({ ...prev, ...get_data_source(id).type_map }), { })
    }, [update, widget.source_id])
    
    const options = useMemo(() => { 
        const { series: series_config = [ ], xAxis, yAxis = [ ], ...others } = widget.config as unknown as ITimeSeriesChartConfig
        let series = [ ]
        for (let [data_source_id, item] of Object.entries(source_col_map)) { 
            const { series_col, time_col } = item
            for (let col of series_col) { 
                // 查找匹配规则
                const match_rule = series_config.filter(Boolean).find(item => {
                    const { match_type, match_value } = item
                    switch (match_type) { 
                        case MatchRuleType.NAME:
                            return match_value?.includes(col)
                        case MatchRuleType.DATA_TYPE:
                            return match_value?.includes(type_map[col])
                        case MatchRuleType.REGEXP:
                            try { return eval(match_value)?.test(col) }
                            catch (e) { return false }
                        default:
                            return false
                    }
                })
                // 选了不展示数据列则不添加，其他情况下都添加
                if (!(match_rule?.show === false))
                    series.push({ data_source_id, time_col, col_name: col, type: 'line', name: col, yAxisIndex: 0, ...match_rule })
            }
        }
        
        const config = {
            ...others,
            xAxis,
            yAxis: yAxis.map(item => ({ ...item, type: AxisType.VALUE })),
            series,
        }
        
        const default_options = convert_chart_config({ ...widget, config } as unknown as  Widget, data_source)
        console.log(default_options, 'default_options')
        return {
            ...default_options,
            xAxis: { ...default_options.xAxis, data: null },
            series: default_options.series.map((item, idx) => {
                const { data_source_id, time_col, col_name } = series[idx] ?? { }
                const get_cols = (data_source_id, col) => get_data_source(data_source_id).data.map(item => item[col])
                const x_data = get_cols(data_source_id, time_col).map(x => format_time(x, config.xAxis.time_format))
                const y_data = get_cols(data_source_id, col_name)
                return {
                    ...item,
                    data: x_data.map((x, idx) => ([x, y_data[idx]]))
                }
            })
        }
    }, [widget.config, update, source_col_map, type_map])
    
    console.log(options, 'options')
    
    return <>
        {widget.source_id.map(id => <SingleDataSourceUpdate key={id} source_id={id} force_update={() => { set_update({ }) }}/>) }
        <ReactEChartsCore
            echarts={echarts}
            notMerge={dashboard.editing}
            option={options}
            className='dashboard-line-chart'
            theme='my-theme'
        />
    </>
   
}

/** 用于更新多数据源 */
function SingleDataSourceUpdate (props: { source_id: string, force_update: () => void }) {
    const { source_id, force_update } = props
    const data_node = get_data_source(source_id)
    const { cols, data } = data_node.use(['cols', 'data'])
    
    useEffect(() => { force_update() }, [cols, data ])
    
    return null
}

/** 用于更新多数据源 */
function SingleDataSourceColUpdate (props: { source_id: string, force_update: () => void }) {
    const { source_id, force_update } = props
    const data_node = get_data_source(source_id)
    const { cols } = data_node.use(['cols'])
    
    useEffect(() => { force_update() }, [cols])
    
    return null
}

// 时序图不需要配置 y 轴，默认为数据轴，但是可以配置 x 轴更改时间列
export function TimeSeriesChartConfig () {
    const { widget } = dashboard.use(['widget']) 
    const type = useMemo(() => widget.type, [widget])
    const [update, set_update] = useState({ })
    
    const update_cols = useCallback(() => { set_update({ }) }, [ ])
    
    // 所有数据源列名
    const col_options = useMemo(() => { 
        return widget.source_id.reduce((prev, id) => prev.concat(convert_list_to_options(uniq(get_data_source(id).cols))), [ ])
    }, [update, widget.source_id])
    
    // 所有数据源类型 map
    const type_map = useMemo<Record<string, DdbType>>(() => { 
        return widget.source_id.reduce((prev, id) => ({ ...prev, ...get_data_source(id).type_map }), { })
    }, [update, widget.source_id])
    
    return <>
        {widget.source_id.map(id => <SingleDataSourceColUpdate key={id} source_id={id} force_update={update_cols}/>) }
        <BasicFormFields type='chart' />
        <Collapse items={[
            {
                key: 'x_axis',
                label: t('X 轴配置'),
                forceRender: true,
                children: <AxisItem
                    col_names={col_options.map(item => item.value)}
                    name_path='xAxis'
                    hidden_fields={['col_name']}
                    initial_values={{
                        type: AxisType.TIME,
                        time_format: ITimeFormat.DATE_SECOND,
                    }}
                />
            },
            {
                key: 'y_axis',
                label: t('Y 轴配置'),
                forceRender: true,
                children: <YAxis col_names={col_options.map(item => item.value)} axis_item_props={{ hidden_fields: ['col_name', 'type'] } } />
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
                                {t('配置规则 {{name}}', { name: field.name + 1 })}
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
                                                    extra={<Typography.Link target='_blank' href={REGEXP_LINK}>
                                                        <LinkOutlined style={{ marginRight: 8 }}/>
                                                        {t('正则表达式书写规则')}
                                                    </Typography.Link>}
                                                >
                                                    <Input placeholder={t('请输入正则表达式') } />
                                                </Form.Item>
                                            case MatchRuleType.DATA_TYPE:
                                                const types = uniq(Object.values(type_map)).map(item => ({ label: DDB_TYPE_MAP[item], value: item }))
                                                return <Form.Item label={t('数据类型')} name={concat_name_path(field.name, 'match_value')}>
                                                    <Select options={types} mode='multiple'/>
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
                                <FormDependencies dependencies={[concat_name_path('series', field.name, 'show')]}>
                                    {value => { 
                                        const show = get(value, concat_name_path('series', field.name, 'show'))
                                        return show
                                            ? <SeriesItem col_names={col_options.map(item => item.value)} type={type} name={field.name} path='series' />
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
