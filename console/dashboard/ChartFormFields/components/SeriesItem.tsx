import { Form, Select, Input, InputNumber } from 'antd'
import { type NamePath } from 'antd/es/form/interface'
import { useMemo } from 'react'

import { get } from 'lodash'

import { t } from '../../../../i18n/index.js'
import { BoolRadioGroup } from '../../../components/BoolRadioGroup/index.js'
import { StringColorPicker } from '../../../components/StringColorPicker/index.js'
import { FormDependencies } from '../../../components/formily/FormDependcies/index.js'
import { get_data_source } from '../../DataSource/date-source.js'
import { WidgetChartType, dashboard } from '../../model.js'
import { concat_name_path, convert_list_to_options } from '../../utils.js'
import { chart_type_options, mark_point_options, mark_line_options, line_type_options } from '../constant.js'
import { ILineType } from '../type.js'

interface SeriesItemProps { 
    /** 选传，外层包裹了 Form.List 时为 field.name */
    name?: NamePath
    /** 图类型 */
    type: WidgetChartType
    /** 列名 */
    col_names: string[]
    /** 选传，外层包裹了 Form.List 需传入 Form.List 的 name_path */
    path?: NamePath[] | NamePath
}

/** 数据列配置子项 */
export function SeriesItem (props: SeriesItemProps) {
    const { name, type, col_names, path } = props
    const { widget } = dashboard.use(['widget'])
    
    // 是否为热力图，混合图，复合图
    const [is_heat_map, is_mix_type, is_composite] = useMemo(() => [
        type === WidgetChartType.HEATMAP,
        type === WidgetChartType.MIX,
        type === WidgetChartType.COMPOSITE_GRAPH
    ], [type])
    
    const form = Form.useFormInstance()
    // 复合图是否开启时序模式
    const automatic_mode = Form.useWatch('automatic_mode', form)
    
    /** 数据列选择，复合图需要特殊处理 */
    const select_col_field = useMemo(() => {
        if (is_composite) 
            return automatic_mode ? null : <>
                <Form.Item label={t('数据源')} name={concat_name_path(name, 'data_source_id')}>
                    <Select options={
                        widget.source_id.map(id => {
                            const source = get_data_source(id)
                            return { label: source.name, value: source.id }
                        })} />
                </Form.Item>
                <FormDependencies dependencies={[concat_name_path(path, name, 'data_source_id')]}>
                    {values => {
                        const data_source_id = get(values, concat_name_path(path, name, 'data_source_id'))
                        const col_options = convert_list_to_options(get_data_source(data_source_id).cols)
                        return <>
                            <Form.Item label={t('X 轴数据列')} name={concat_name_path(name, 'x_col_name')}>
                                <Select options={col_options} />
                            </Form.Item>
                            <Form.Item label={t('Y 轴数据列')} name={concat_name_path(name, 'col_name')}>
                                <Select options={col_options} onSelect={on_select_col} />
                            </Form.Item>
                        </>
                    }}
                </FormDependencies>
            </>
        else  
            return <Form.Item name={concat_name_path(name, 'col_name')} label={is_heat_map ? t('热力值列') : t('数据列')} initialValue={col_names?.[0]} >
                <Select
                    options={convert_list_to_options(col_names)}
                    onSelect={on_select_col}
                />
            </Form.Item>
     }, [ is_composite, automatic_mode])
    
    /** 选择数据列的时候，更改数据列名称为当前选中列名 */
    function on_select_col (val) { 
        form.setFieldValue(concat_name_path(path, name, 'name'), val)
        // setFieldValue 并不会触发 form 的 onValuesChange 事件，会出现表单更新但图表展示未更新的情况，需要手动更新表单配置
        dashboard.update_widget({ ...widget, config: form.getFieldsValue() })
    }
    
    return <div className='field-wrapper'>
        {select_col_field}
        {/* 时序图列名会更改，直接用列名作为名称，不能写死名称 */}
        { !automatic_mode && <Form.Item
            name={concat_name_path(name, 'name')}
            label={t('名称')}
            initialValue={col_names[0]}
        > 
            <Input />
        </Form.Item> }
    
        {!is_heat_map && <>
            <Form.Item name={concat_name_path(name, 'type')} label={t('类型')} initialValue={(is_composite || is_mix_type || automatic_mode) ? WidgetChartType.LINE : type}>
                <Select options={chart_type_options} disabled={!is_mix_type && !is_composite && !automatic_mode} />
            </Form.Item>
            <Form.Item name={concat_name_path(name, 'color')} label={t('颜色')} initialValue={null}>
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
                    return <Form.Item hidden={is_heat_map} name={concat_name_path(name, 'yAxisIndex')} label={t('关联 Y 轴')} initialValue={0}>
                        <Select options={options} />
                    </Form.Item>
                } }
            </FormDependencies> 
                
            <Form.Item name={concat_name_path(name, 'mark_point')} label={t('标记点')}>
                <Select options={mark_point_options} mode='multiple'/>
            </Form.Item>
            
            <Form.Item label={t('水平线')} name={concat_name_path(name, 'mark_line')}>
                <Select options={mark_line_options} mode='tags' />
            </Form.Item>
        </>}
    
        {/* 不同类型的特殊配置 */}
        <FormDependencies dependencies={[concat_name_path(path, name, 'type')]}>
            {values => { 
                const series_type = get(values, concat_name_path(path, name, 'type'))
                // const ThresholdSelect = <>
                //     <Form.Item name={[field.name, 'threshold', 'value']} label={t('阈值')}>
                //         <InputNumber />
                //     </Form.Item>
                //     <FormDependencies dependencies={[['series', field.name, 'threshold', 'value']]}>
                //         {({ series }) => { 
                //             const { threshold } = series?.[field.name] || { }
                //             if (isNaN(threshold?.value))
                //                 return null
                                
                //             return <>
                //                 <Form.Item label={t('低于阈值配色')} name={[field.name, 'threshold', 'low_color']}>
                //                     <StringColorPicker />
                //                 </Form.Item>
                //                 <Form.Item label={t('高于阈值配色')} name={[field.name, 'threshold', 'high_color']} >
                //                     <StringColorPicker />
                //                 </Form.Item>
                //             </>
                //         } }
                //     </FormDependencies>
                // </>
                
                if (series_type === WidgetChartType.BAR)
                    return <>
                        <Form.Item tooltip={t('同个类目轴上为数据列配置相同的堆叠值可以堆叠放置')} label={t('堆叠值')} name={[name, 'stack']}>
                            <Input />
                        </Form.Item>
                        {/* {ThresholdSelect} */}
                    </>
                else if (series_type === WidgetChartType.LINE)
                    return <>
                        <Form.Item label={t('线类型')} name={concat_name_path(name, 'line_type')} initialValue={ILineType.SOLID}>
                            <Select options={line_type_options} />
                        </Form.Item>
                        <Form.Item label={t('线宽')} name={concat_name_path(name, 'line_width')}>
                            <InputNumber addonAfter='px'/>
                        </Form.Item>
                        
                        <Form.Item label={t('是否填充') } initialValue={false} name={[name, 'is_filled']}>
                            <BoolRadioGroup />
                        </Form.Item>
                        <FormDependencies dependencies={[concat_name_path(path, name, 'is_filled')]}>
                            {value => { 
                                const is_filled = get(value, concat_name_path(path, name, 'is_filled'))
                                return is_filled
                                    ? <Form.Item label={t('透明度')} name={concat_name_path(name, 'opacity')} initialValue={0.2}>
                                        <InputNumber max={1} min={0}/>
                                    </Form.Item>
                                    : null
                            } }
                        </FormDependencies>
                        
                        <Form.Item name={concat_name_path(name, 'end_label')} label={t('展示端标签')} initialValue={false}>
                            <BoolRadioGroup />
                        </Form.Item>
                        <FormDependencies dependencies={[concat_name_path(path, name, 'end_label')]}>
                            {value => { 
                                const end_label = get(value, concat_name_path(path, name, 'end_label'))
                                if (!end_label)
                                    return null
                                
                                return <Form.Item
                                    name={[name, 'end_label_formatter']}
                                    label={t('自定义端标签')}
                                    tooltip={<>
                                        {t('支持静态标签与模板变量，其中模板变量包含以下几种')}
                                        <br />
                                        {t('{a}：数据列名称')}
                                        <br />
                                        {t('{b}：x 轴值')}
                                        <br />
                                        {t('{c}：当 x 轴为类目轴时显示 y 轴值，其余轴的情况下显示 x 轴值, y 轴值')}
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
                else if (series_type === WidgetChartType.SCATTER)
                    return <>
                        <Form.Item label={t('散点大小')} name={concat_name_path(name, 'symbol_size')} initialValue={10}>
                            <InputNumber min={1} />
                        </Form.Item>
                        <Form.Item label={t('散点标记')} name={concat_name_path(name, 'symbol')} initialValue='circle'>
                            <Select options={convert_list_to_options(['circle', 'rect', 'roundRect', 'triangle', 'diamond', 'pin', 'arrow']) } />
                        </Form.Item>
                    </>
                else if (series_type === WidgetChartType.HEATMAP)
                    return <>
                        <Form.Item label={t('阴暗色')} name={concat_name_path(name, 'in_range', 'color', 'low')} initialValue='#EBE1E1'>
                            <StringColorPicker />
                        </Form.Item>
                        <Form.Item label={t('明亮色')} name={concat_name_path(name, 'in_range', 'color', 'high')} initialValue='#983430'>
                            <StringColorPicker />
                        </Form.Item>
                        <Form.Item label={t('最小值')} name={concat_name_path(name, 'min')}>
                            <InputNumber />
                        </Form.Item>
                        <Form.Item label={t('最大值')} name={concat_name_path(name, 'max')}>
                            <InputNumber />
                        </Form.Item>
                        <Form.Item label={t('展示标签')} name={concat_name_path(name, 'with_label')} initialValue={false}>
                            <BoolRadioGroup />
                        </Form.Item>
                    </>
                else
                    return null
            } }
        </FormDependencies>
    </div>
}
