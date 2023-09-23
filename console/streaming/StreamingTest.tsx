import { Col, Row } from 'antd'
import { StreamingScatter } from './StreamingScatter.js'
import { StreamingKLine } from './StreamingKLine.js'
import { StreamingSortBar } from './StreamingSortBar.js'
import { StreamingSection } from './StreamingSection.js'
import { StreamingLine } from './StreamingLine.js'
import { StreamingHeatMap } from './StreamingHeatMap.js'

export function StreamingTest () {
    // 监听开始与否
    return <div className='result page'>
            <Row>
                <Col span={24}>
                    <StreamingScatter
                        config={{
                            height: 800,
                            table: 'test_sc',
                            username: 'admin',
                            password: '123456',
                            x_variable: 'x',
                            // x_type: 'TIMESTAMP',
                            x_type: 'NUMBER',
                            y_variable: 'y',
                            y_type: 'NUMBER',
                            size_variable: 'size',
                            color_variable: 'color'
                        }}
                    />
                </Col>
            </Row>
            <Row>
                <Col span={8}>
                    <StreamingKLine
                        config={{
                            table: 'test_kl',
                            username: 'admin',
                            password: '123456',
                            time_variable: 'time',
                            duration: 60 * 10 * 1000,
                            opening_price_variable: 'open',
                            closing_price_variable: 'close',
                            maximum_price_variable: 'max',
                            minimum_price_variable: 'min',
                            height: 500
                        }}
                    />
                </Col>
                <Col span={8}>
                    <StreamingSortBar
                        config={{
                            table: 'test_1',
                            properties: ['aaaa', 'bbbb', 'cccc', 'dddd', 'eeee', 'ffff'],
                            sort: 'ASC',
                            username: 'admin',
                            password: '123456',
                            height: 500,
                            animationDuration: 500
                        }}
                        onError={e => console.log('1')}
                    />
                </Col>
                <Col span={8}>
                    <StreamingLine
                        config={{
                            table: 'test',
                            time_variable: 'time',
                            properties: ['price', 'number'],
                            duration: 60 * 10 * 1000,
                            username: 'admin',
                            password: '123456'
                        }}
                    />
                </Col>
            </Row>
            <Row>
                <Col span={12}>
                    <StreamingSection
                        config={{
                            table: 'test_1',
                            properties: ['aaaa', 'bbbb', 'cccc', 'dddd', 'eeee', 'ffff', 'id'],
                            username: 'admin',
                            password: '123456',
                            column: 2,
                            layout: 'horizontal'
                        }}
                    />
                </Col>
                <Col span={12}>
                    <StreamingHeatMap
                        config={{
                            table: 'test_1',
                            properties: ['aaaa', 'bbbb', 'cccc', 'dddd', 'eeee', 'ffff'],
                            // sort: 'DESC',
                            username: 'admin',
                            password: '123456',
                            column: 2
                        }}
                    />
                </Col>
            </Row>
        </div>
}
