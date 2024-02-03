import './index.scss'

import { Button, Collapse, type CollapseProps, Form, Select, Typography, Tooltip, Input, InputNumber } from 'antd'
import { BasicFormFields } from '../../ChartFormFields/BasicFormFields.js'
import { t } from '../../../../i18n/index.js'
import { AxisItem, YAxis } from '../../ChartFormFields/BasicChartFields.js'
import { AxisType, ILineType, ITimeFormat } from '../../ChartFormFields/type.js'
import { DeleteOutlined, LinkOutlined, PlusCircleOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import { FormDependencies } from '../../../components/formily/FormDependcies/index.js'
import { convert_list_to_options } from '../../utils.js'
import { get, uniq } from 'lodash'
import { type DdbType } from 'dolphindb'
import { DDB_TYPE_MAP } from '../../../constants/ddb-type-maps.js'
import { type } from 'os'
import { BoolRadioGroup } from '../../../components/BoolRadioGroup/index.js'
import { StringColorPicker } from '../../../components/StringColorPicker/index.js'
import { chart_type_options, mark_point_options, mark_line_options, line_type_options } from '../../ChartFormFields/constant.js'
import { get_data_source } from '../../DataSource/date-source.js'
import { WidgetChartType } from '../../model.js'


enum MatchType { 
    NAME,
    REGEXP,
    DATA_TYPE
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
        value: MatchType.NAME
    },
    {
        label: <>
            {t('列名正则匹配')}
            <Tooltip title={t('为列名匹配正则表达式的列定制配置')}>
                <QuestionCircleOutlined className='series_match_type_tip'/>
            </Tooltip>
        </>,
        value: MatchType.REGEXP
    },
    {
        label: <>
            {t('类型匹配')}
            <Tooltip title={t('为特定 DolphinDB 数据类型的列定制配置，如 INT, DOUBLE')}>
                <QuestionCircleOutlined className='series_match_type_tip'/>
            </Tooltip>
        </>,
        value: MatchType.DATA_TYPE
    }
]

export function TimeSeriesChart () {
    return <>时序图</>
}


// 时序图不需要配置 y 轴，默认为数据轴，但是可以配置 x 轴更改时间列
export function TimeSeriesChartConfig ({ col_names, type_map }: { col_names: string[], type_map: Record<string, DdbType> }) { 
    
    return <>
        <BasicFormFields type='chart' />
        <Collapse items={[
            {
                key: 'x_axis',
                label: t('X 轴配置'),
                forceRender: true,
                children: <AxisItem hidden_fields={['col_name', 'type']} name_path='series' col_names={col_names} initial_values={{ type: AxisType.TIME, time_format: ITimeFormat.DATE_SECOND }} />
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
                children: <Form.List name='series_config'>
                    {(fields, { add, remove }) => { 
                        const items: CollapseProps['items'] = fields.map(field => ({
                            key: `series_${field.name}`,
                            forceRender: true,
                            label: <div className='collapse-label'>
                                {t(`配置 ${field.name + 1}`)}
                                <DeleteOutlined onClick={() => { remove(field.name) }}/>
                            </div>,
                            children: <div key={field.name}>
                                {/* 用户选择如何配置应用的范围 */}
                                <Form.Item label={t('匹配规则')} name={[field.name, 'match_type']}>
                                    <Select options={series_match_type_options} />
                                </Form.Item>
                                <FormDependencies dependencies={[['series_config', field.name, 'match_type']]}>
                                    {value => { 
                                        const match_type = get(value, ['series_config', field.name, 'match_type'])
                                        switch (match_type) {
                                            case MatchType.NAME:
                                                return <Form.Item label={t('筛选列')} name='match_value'>
                                                    <Select mode='multiple' options={convert_list_to_options(col_names)} />
                                                </Form.Item>
                                            case MatchType.REGEXP:
                                                return <Form.Item
                                                    label={t('正则表达式')}
                                                    name='match_value'
                                                    extra={<Typography.Link target='_blank' href={REGEXP_LINK}>
                                                        <LinkOutlined style={{ marginRight: 8 }}/>
                                                        {t('正则表达式书写规则')}
                                                    </Typography.Link>}
                                                >
                                                    <Input placeholder={t('请输入字面量形式的正则表达式，如 /[0-9]+/g') } />
                                                </Form.Item>
                                            case MatchType.DATA_TYPE:
                                                const type_options = uniq(Object.values(type_map)).map(item => ({ label: DDB_TYPE_MAP[item], value: item }))
                                                return <Form.Item label={t('数据类型')} name='match_value'>
                                                    <Select options={type_options}/>
                                                </Form.Item>
                                        }
                                    } }
                                </FormDependencies>
                                
                                <div className='field-wrapper'>
                       
                                    <Form.Item
                                        name={[field.name, 'name']}
                                        label={t('名称')}
                                        initialValue={col_names[0]}
                                    > 
                                        <Input />
                                    </Form.Item>
                        
                                   
                                    <Form.Item name={[field.name, 'type']} label={t('类型')} initialValue={WidgetChartType.LINE}>
                                        <Select options={chart_type_options} />
                                    </Form.Item>
                                    <Form.Item name={[field.name, 'color']} label={t('颜色')} initialValue={null}>
                                        <StringColorPicker />
                                    </Form.Item>
                        
                                    {/* 数据关联的y轴选择 */}
                                    <FormDependencies dependencies={['yAxis']}>
                                        { value => {
                                            const { yAxis } = value
                                            const options = yAxis.map((item, idx) => ({
                                                value: idx,
                                                label: item?.name
                                            }))
                                            return <Form.Item name={[field.name, 'yAxisIndex']} label={t('关联 Y 轴')} initialValue={0}>
                                                <Select options={options} />
                                            </Form.Item>
                                        } }
                                    </FormDependencies>
                        
                        
                                    <Form.Item name={[field.name, 'mark_point']} label={t('标记点')}>
                                        <Select options={mark_point_options} mode='multiple'/>
                                    </Form.Item>
                                    
                                    <Form.Item label={t('水平线')} name={[field.name, 'mark_line']}>
                                        <Select options={mark_line_options} mode='tags' />
                                    </Form.Item>
                       
                        {/* 仅折线图可选择线类型 */}
                        
                        <FormDependencies dependencies={[['series', field.name, 'type']]}>
                            {({ series }) => { 
                                const { type: seriesType } = series.find(item => !!item)
                                
                                if (seriesType === WidgetChartType.BAR)
                                    return <>
                                        <Form.Item tooltip={t('同个类目轴上为数据列配置相同的堆叠值可以堆叠放置')} label={t('堆叠值')} name={[field.name, 'stack']}>
                                            <Input />
                                        </Form.Item>
                                        {/* {ThresholdSelect} */}
                                    </>
                                else if (seriesType === WidgetChartType.LINE)
                                    return <>
                                        <Form.Item label={t('线类型')} name={[field.name, 'line_type']} initialValue={ILineType.SOLID}>
                                            <Select options={line_type_options} />
                                        </Form.Item>
                                        <Form.Item label={t('线宽')} name={[field.name, 'line_width']}>
                                            <InputNumber addonAfter='px'/>
                                        </Form.Item>
                                        <Form.Item name={[field.name, 'end_label']} label={t('展示端标签')} initialValue={false}>
                                            <BoolRadioGroup />
                                        </Form.Item>
                                        <FormDependencies dependencies={[['series', field.name, 'end_label']]}>
                                            {value => { 
                                                if (!value.series?.[field.name]?.end_label)
                                                    return null
                                                
                                                return <Form.Item
                                                name={[field.name, 'end_label_formatter']}
                                                label={t('自定义端标签')}
                                                tooltip={<>
                                                    {t('支持静态标签与模板变量，其中模板变量包含以下几种')}
                                                    <br />
                                                    {t('{a}：数据列名称')}
                                                    <br />
                                                    {t('{b}：x 轴值')}
                                                    <br />
                                                    {t('{c}：当 x 轴为类目轴时显示 y 轴值，其余轴的情况下显示 x轴值,y轴值')}
                                                    <br />
                                                    {t('示例: 名称-{a}')}
                                                    <br />
                                                    {t('请注意，不填自定义端标签时默认展示 y 轴值') }
                                                </>}
                                            >
                                                    <Input placeholder={t('请输入自定义端标签')} />
                                            </Form.Item>
                                            } }
                                        </FormDependencies>
                                    </>
                                else if (seriesType === WidgetChartType.SCATTER)
                                    return <>
                                        <Form.Item label={t('散点大小')} name={[field.name, 'symbol_size']} initialValue={10}>
                                            <InputNumber min={1} />
                                        </Form.Item>
                                        <Form.Item label={t('散点标记')} name={[field.name, 'symbol']} initialValue='circle'>
                                            <Select options={convert_list_to_options(['circle', 'rect', 'roundRect', 'triangle', 'diamond', 'pin', 'arrow']) } />
                                        </Form.Item>
                                    </>
                                else if (seriesType === WidgetChartType.HEATMAP)
                                    return <>
                                        <Form.Item label={t('阴暗色')} name={[field.name, 'in_range', 'color', 'low']} initialValue='#EBE1E1'>
                                            <StringColorPicker />
                                        </Form.Item>
                                        <Form.Item label={t('明亮色')} name={[field.name, 'in_range', 'color', 'high']} initialValue='#983430'>
                                            <StringColorPicker />
                                        </Form.Item>
                                        <Form.Item label={t('最小值')} name={[field.name, 'min']}>
                                            <InputNumber />
                                        </Form.Item>
                                        <Form.Item label={t('最大值')} name={[field.name, 'max']}>
                                            <InputNumber />
                                        </Form.Item>
                                        <Form.Item label={t('展示标签')} name={[field.name, 'with_label']} initialValue={false}>
                                            <BoolRadioGroup />
                                        </Form.Item>
                                    </>
                                else
                                    return null
                            } }
                        </FormDependencies>
                    </div>
                                
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
