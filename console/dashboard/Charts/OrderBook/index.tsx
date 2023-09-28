import { BasicFormFields } from '../../ChartFormFields/BasicFormFields.js'
import { AxisFormFields, SeriesFormFields } from '../../ChartFormFields/BasicChartFields.js'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts'
import { type Widget } from '../../model.js'
import { useMemo } from 'react'
import { type IChartConfig } from '../../type.js'



interface IProps { 
    widget: Widget
    data_source: any[]
}


export function OrderBook (props: IProps) {
    const { widget, data_source } = props
    console.log(widget)
    console.log(data_source)
    const { title, with_tooltip } = widget.config as IChartConfig
    
    // 先写死，后面再改
    const convert_order_config = useMemo(() => {
      return {
        title: {
          text: title,
          textStyle: {
              color: '#e6e6e6',
          }
        },
        legend: {
          show: false
        },
        tooltip: {
          show: with_tooltip,
          position: 'top'
        },
        grid: {
          height: '70%',
          top: '10%'
        },
        xAxis: {
          type: 'time',
          splitNumber: 5
        },
        yAxis: {
          type: 'value',
          scale: true
        },
        visualMap: {
          min: -10,
          max: 10,
          calculable: true,
          orient: 'horizontal',
          left: 'center',
          bottom: '0%',
          inRange: {
            color: ['rgba(57,117,198,1)', 'rgba(255,255,255,1)', 'rgba(255,0,0,1)']
          }
        },
        series: [
          {   
            name: 'Punch Card',
            type: 'heatmap',
            data: buydata,
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            }
          }
        ]
      }
    }, [title, with_tooltip, data_source]) 
    
    
    return  <ReactEChartsCore
                echarts={echarts}
                notMerge
                option={convert_order_config}
                theme='my-theme'
        />
}


export function OrderConfigForm (props: { col_names: string[] } ) {
    const { col_names = [ ] } = props
    
    return <>
        <BasicFormFields type='chart' />
        {/* <AxisFormFields col_names={col_names} /> */}
    </>
}



const buydata = [
[ '2023-9-27 08:30:21.682', '100.355900000000005', 1 ],
  [ '2023-9-27 08:30:21.664', '100.483699999999998', 2 ],
  [ '2023-9-27 08:30:21.448', '100.959699999999998', 1 ],
  [ '2023-9-27 08:30:21.451', '101.357500000000001', 9 ],
  [ '2023-9-27 08:30:21.608', '101.686400000000006', 5 ],
  [ '2023-9-27 08:30:21.374', '104.0133', 1 ],
  [ '2023-9-27 08:30:21.355', '104.842799999999996', 1 ],
  [ '2023-9-27 08:30:21.604', '101.876499999999992', 1 ],
  [ '2023-9-27 08:30:21.496', '100.255399999999994', 1 ],
  [ '2023-9-27 08:30:21.380', '105.502700000000004', 1 ],
  [ '2023-9-27 08:30:21.586', '99.6383', 1 ],
  [ '2023-9-27 08:30:21.497', '100.233599999999995', 1 ],
  [ '2023-9-27 08:30:21.472', '101.895899999999997', 1 ],
  [ '2023-9-27 08:30:21.218', '101.7329', 1 ],
  [ '2023-9-27 08:30:21.643', '99.439899999999994', 1 ],
  [ '2023-9-27 08:30:21.225', '101.779499999999998', 1 ],
  [ '2023-9-27 08:30:21.376', '105.287599999999997', 1 ],
  [ '2023-9-27 08:30:21.340', '101.856999999999999', 1 ],
  [ '2023-9-27 08:30:21.303', '100.1768', 1 ],
  [ '2023-9-27 08:30:21.534', '101.094099999999997', 1 ],
  [ '2023-9-27 08:30:21.459', '99.319299999999998', 1 ],
  [ '2023-9-27 08:30:21.415', '100.522300000000001', 1 ],
  [ '2023-9-27 08:30:21.280', '101.082899999999995', 1 ],
  [ '2023-9-27 08:30:21.346', '103.854299999999994', 1 ],
  [ '2023-9-27 08:30:21.229', '103.377200000000001', 1 ],
  [ '2023-9-27 08:30:21.337', '103.028099999999994', 1 ],
  [ '2023-9-27 08:30:21.572', '101.194999999999993', 1 ],
  [ '2023-9-27 08:30:21.263', '100.621099999999998', 1 ],
  [ '2023-9-27 08:30:21.456', '101.576899999999994', 1 ],
  [ '2023-9-27 08:30:21.459', '99.100399999999993', 1 ],
  [ '2023-9-27 08:30:21.605', '100.372500000000002', 1 ],
  [ '2023-9-27 08:30:21.573', '100.660200000000003', 1 ],
  [ '2023-9-27 08:30:21.271', '100.740700000000003', 1 ],
  [ '2023-9-27 08:30:21.485', '100.076899999999994', 1 ],
  [ '2023-9-27 08:30:21.488', '100.737999999999999', 1 ],
  [ '2023-9-27 08:30:21.223', '114.494299999999995', 1 ],
  [ '2023-9-27 08:30:21.309', '100.759799999999998', 1 ],
  [ '2023-9-27 08:30:21.523', '103.383300000000005', 1 ],
  [ '2023-9-27 08:30:21.565', '100.7633', 1 ],
  [ '2023-9-27 08:30:21.384', '99.094800000000006', 1 ],
  [ '2023-9-27 08:30:21.304', '100.3001', 1 ],
  [ '2023-9-27 08:30:21.336', '101.192999999999997', 1 ],
  [ '2023-9-27 08:30:21.265', '101.127399999999994', 1 ],
  [ '2023-9-27 08:30:21.646', '100.231200000000001', 1 ],
  [ '2023-9-27 08:30:21.622', '100.153999999999996', 1 ],
  [ '2023-9-27 08:30:21.684', '100.412400000000005', 1 ],
  [ '2023-9-27 08:30:21.610', '100.062200000000004', 1 ],
  [ '2023-9-27 08:30:21.533', '102.552099999999995', 1 ],
  [ '2023-9-27 08:30:21.561', '102.666700000000005', 1 ],
  [ '2023-9-27 08:30:21.233', '107.094399999999993', 1 ],
  [ '2023-9-27 08:30:21.411', '99.483299999999999', 1 ],
  [ '2023-9-27 08:30:21.262', '99.511700000000004', 1 ],
  [ '2023-9-27 08:30:21.552', '100.137600000000006', 1 ],
  [ '2023-9-27 08:30:21.644', '99.606499999999996', 1 ],
  [ '2023-9-27 08:30:21.681', '99.9007', 1 ],
  [ '2023-9-27 08:30:21.526', '99.742599999999995', 1 ],
  [ '2023-9-27 08:30:21.418', '100.299800000000004', 1 ],
  [ '2023-9-27 08:30:21.381', '104.988600000000005', 1 ],
  [ '2023-9-27 08:30:21.685', '100.038700000000005', 1 ],
  [ '2023-9-27 08:30:21.627', '99.722599999999999', 1 ],
  [ '2023-9-27 08:30:21.395', '101.262699999999995', 1 ],
  [ '2023-9-27 08:30:21.421', '101.1554', 1 ],
  [ '2023-9-27 08:30:21.299', '99.730500000000006', 9 ],
  [ '2023-9-27 08:30:21.342', '103.192800000000005', 1 ],
  [ '2023-9-27 08:30:21.419', '102.098299999999994', 1 ],
  [ '2023-9-27 08:30:21.648', '100.231099999999997', 1 ],
  [ '2023-9-27 08:30:21.660', '100.352099999999992', 1 ],
  [ '2023-9-27 08:30:21.260', '99.090699999999998', 1 ],
  [ '2023-9-27 08:30:21.240', '110.447599999999994', 1 ],
]
const senddata = [
    [ '2023-9-27 08:30:21.682', '100.355900000000005' ],
  [ '2023-9-27 08:30:21.664', '100.483699999999998' ],
  [ '2023-9-27 08:30:21.448', '100.959699999999998' ],
  [ '2023-9-27 08:30:21.451', '101.357500000000001' ],
  [ '2023-9-27 08:30:21.608', '101.686400000000006' ],
  [ '2023-9-27 08:30:21.374', '104.0133' ],
  [ '2023-9-27 08:30:21.355', '104.842799999999996' ],
  [ '2023-9-27 08:30:21.604', '101.876499999999992' ],
  [ '2023-9-27 08:30:21.496', '100.255399999999994' ],
  [ '2023-9-27 08:30:21.380', '105.502700000000004' ],
  [ '2023-9-27 08:30:21.586', '99.6383' ],
  [ '2023-9-27 08:30:21.497', '100.233599999999995' ],
  [ '2023-9-27 08:30:21.472', '101.895899999999997' ],
  [ '2023-9-27 08:30:21.218', '101.7329' ],
  [ '2023-9-27 08:30:21.643', '99.439899999999994' ],
  [ '2023-9-27 08:30:21.225', '101.779499999999998' ],
  [ '2023-9-27 08:30:21.376', '105.287599999999997' ],
  [ '2023-9-27 08:30:21.340', '101.856999999999999' ],
  [ '2023-9-27 08:30:21.303', '100.1768' ],
  [ '2023-9-27 08:30:21.534', '101.094099999999997' ],
  [ '2023-9-27 08:30:21.459', '99.319299999999998' ],
  [ '2023-9-27 08:30:21.415', '100.522300000000001' ],
  [ '2023-9-27 08:30:21.280', '101.082899999999995' ],
  [ '2023-9-27 08:30:21.346', '103.854299999999994' ],
  [ '2023-9-27 08:30:21.229', '103.377200000000001' ],
  [ '2023-9-27 08:30:21.337', '103.028099999999994' ],
  [ '2023-9-27 08:30:21.572', '101.194999999999993' ],
  [ '2023-9-27 08:30:21.263', '100.621099999999998' ],
  [ '2023-9-27 08:30:21.456', '101.576899999999994' ],
  [ '2023-9-27 08:30:21.459', '99.100399999999993' ],
  [ '2023-9-27 08:30:21.605', '100.372500000000002' ],
  [ '2023-9-27 08:30:21.573', '100.660200000000003' ],
  [ '2023-9-27 08:30:21.271', '100.740700000000003' ],
  [ '2023-9-27 08:30:21.485', '100.076899999999994' ],
  [ '2023-9-27 08:30:21.488', '100.737999999999999' ],
  [ '2023-9-27 08:30:21.223', '114.494299999999995' ],
  [ '2023-9-27 08:30:21.309', '100.759799999999998' ],
  [ '2023-9-27 08:30:21.523', '103.383300000000005' ],
  [ '2023-9-27 08:30:21.565', '100.7633' ],
  [ '2023-9-27 08:30:21.384', '99.094800000000006' ],
  [ '2023-9-27 08:30:21.304', '100.3001' ],
  [ '2023-9-27 08:30:21.336', '101.192999999999997' ],
  [ '2023-9-27 08:30:21.265', '101.127399999999994' ],
  [ '2023-9-27 08:30:21.646', '100.231200000000001' ],
  [ '2023-9-27 08:30:21.622', '100.153999999999996' ],
  [ '2023-9-27 08:30:21.684', '100.412400000000005' ],
  [ '2023-9-27 08:30:21.610', '100.062200000000004' ],
  [ '2023-9-27 08:30:21.533', '102.552099999999995' ],
  [ '2023-9-27 08:30:21.561', '102.666700000000005' ],
  [ '2023-9-27 08:30:21.233', '107.094399999999993' ],
  [ '2023-9-27 08:30:21.411', '99.483299999999999' ],
  [ '2023-9-27 08:30:21.262', '99.511700000000004' ],
  [ '2023-9-27 08:30:21.552', '100.137600000000006' ],
  [ '2023-9-27 08:30:21.644', '99.606499999999996' ],
  [ '2023-9-27 08:30:21.681', '99.9007' ],
  [ '2023-9-27 08:30:21.526', '99.742599999999995' ],
  [ '2023-9-27 08:30:21.418', '100.299800000000004' ],
  [ '2023-9-27 08:30:21.381', '104.988600000000005' ],
  [ '2023-9-27 08:30:21.685', '100.038700000000005' ],
  [ '2023-9-27 08:30:21.627', '99.722599999999999' ],
  [ '2023-9-27 08:30:21.395', '101.262699999999995' ],
  [ '2023-9-27 08:30:21.421', '101.1554' ],
  [ '2023-9-27 08:30:21.299', '99.730500000000006' ],
  [ '2023-9-27 08:30:21.342', '103.192800000000005' ],
  [ '2023-9-27 08:30:21.419', '102.098299999999994' ],
  [ '2023-9-27 08:30:21.648', '100.231099999999997' ],
  [ '2023-9-27 08:30:21.660', '100.352099999999992' ],
  [ '2023-9-27 08:30:21.260', '99.090699999999998' ],
  [ '2023-9-27 08:30:21.240', '110.447599999999994' ],
]

const option = {
    
}
