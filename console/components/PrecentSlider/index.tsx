import { Col, InputNumber, Row, Slider } from 'antd'
import './index.scss'


export function PercentSlider (props: {
    value?: number
    onChange?: (val: number | null) => void
}) {
    const { onChange, value } = props
    
    return <Row>
        <Col span={12}>
            <Slider min={0} max={1} onChange={onChange} value={typeof value === 'number' ? value : 0} step={0.01} />
        </Col>
        <Col span={4}>
            <InputNumber min={0} max={1} className='percent-input-number' step={0.01} value={value} onChange={onChange} />
        </Col>
    </Row>
}
