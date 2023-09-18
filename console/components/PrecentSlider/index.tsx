import { Col, InputNumber, Row, Slider } from 'antd'
import './index.scss'



interface IProps {
  value?: number
  onChange?: (val: number | null) => void
}

export default function PercentSlider (props: IProps) {
  const { onChange, value } = props
  
  return <Row>
      <Col span={12}>
        <Slider
          min={0}
          max={1}
          onChange={onChange}
          value={typeof value === 'number' ? value : 0}
          step={0.01}
        />
      </Col>
      <Col span={4}>
        <InputNumber
          min={0}
          max={1}
          className='input-number'
          step={0.01}
          value={value}
          onChange={onChange}
        />
      </Col>
    </Row>
}
