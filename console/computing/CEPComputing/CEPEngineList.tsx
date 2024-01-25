import { Col, Row, Typography } from "antd";
import { t } from "../../../i18n/index.js";
import { RedoOutlined } from "@ant-design/icons";
import { CEPEngineItem } from "./type.js";
import classNames from "classnames";

const item_list: CEPEngineItem[] = [{
        name: "CEP 引擎1",
        user: "admin",
        status: "string",
        lastErrMsg: "xxxxx",
        useSystemTime: true,
        numOfSubEngine: 1,
        queueDepth: 2,
        eventsReceived: 3,
        eventsEmitted: 3,
        eventsOnOutputQueue: 3
    },
    {
        name: "CEP 引擎2",
        user: "admin",
        status: "string",
        lastErrMsg: "xxxxx",
        useSystemTime: true,
        numOfSubEngine: 1,
        queueDepth: 2,
        eventsReceived: 3,
        eventsEmitted: 3,
        eventsOnOutputQueue: 3
    },
    {
        name: "CEP 引擎3",
        user: "admin",
        status: "string",
        lastErrMsg: "xxxxx",
        useSystemTime: true,
        numOfSubEngine: 1,
        queueDepth: 2,
        eventsReceived: 3,
        eventsEmitted: 3,
        eventsOnOutputQueue: 3
    }]
    
interface IProps { 
    on_select: (name: string) => void
    current: string
}


export function CEPEngineList(props: IProps) { 
    
    const { current, on_select } = props
    
    return <div className="cep-engine-list">
        <div className='cep-engine-list-title'>
            <h3>{t('CEP 引擎')}</h3>
            <Typography.Link>
                <RedoOutlined className="refresh-icon"/>
                {t('刷新')}
            </Typography.Link>
        </div>
        
        {item_list.map(item => <div
            className={classNames('cep-engine-item', { "cep-engine-item-active": item.name === current })}
            key={item.name}
            onClick={ () => on_select(item.name) }
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