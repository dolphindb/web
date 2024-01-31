import { Col, Row, Typography } from 'antd'
import { t } from '../../../i18n/index.js'
import { RedoOutlined } from '@ant-design/icons'
import { type ICEPEngineDetail, type CEPEngineItem } from './type.js'
import classNames from 'classnames'
    
interface IProps { 
    on_select: (name: string) => void
    current: ICEPEngineDetail
    data: CEPEngineItem[]
    on_refresh: () => void
}


export function CEPEngineList (props: IProps) { 
    
    const { current, on_select, data = [ ], on_refresh } = props
    
    return <div className='cep-engine-list'>
        <div className='cep-engine-list-title'>
            <h3>{t('CEP 引擎')}</h3>
            <Typography.Link onClick={on_refresh}>
                <RedoOutlined className='refresh-icon'/>
                {t('刷新')}
            </Typography.Link>
        </div>
        
        {data.map(item => <div
            className={classNames('cep-engine-item', { 'cep-engine-item-active': item.name === current?.EngineStat?.name })}
            key={item.name}
            onClick={ () => { on_select(item.name) } }
        >
            <div className='cep-engine-item-title'>{item.name}</div>
            <Row>
                <Col span={12}>
                    <Typography.Paragraph type='secondary'>
                        {t('创建人：{{name}}', { name: item.user }) }
                    </Typography.Paragraph>
                </Col>
                <Col span={12}>
                    <Typography.Paragraph type='secondary'>
                        {t('子引擎数量：{{num}}', { num: item.numOfSubEngine }) }
                    </Typography.Paragraph>
                </Col>
            </Row>
        </div>)}
    </div>
}
