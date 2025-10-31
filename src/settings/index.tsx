import './index.sass'

import { ApartmentOutlined, default as Icon } from '@ant-design/icons'

import { t } from '@i18n'

import { model } from '@model'


import SvgFinance from '@/guide/icons/finance.icon.svg'
import SvgIot from '@/guide/icons/iot.icon.svg'
import SvgStreamingGraph from '@/streaming-graph/flow.icon.svg'

import { Card } from './Card.tsx'


export function Settings () {
    const { admin, license } = model.use(['admin', 'license'])
    
    return admin && <div className='module-settings'>
        <div className='title'>{t('可选功能')}</div>
        
        <Card
            module_key='finance-guide'
            icon={<Icon className='label-icon' component={SvgFinance} />}
            label={t('金融库表向导')}
            description={t('此功能专为金融用户设计。用户通过此功能无需设计分区方案或编写复杂的 SQL 语句，只需输入库表名称、列名等基本信息，并通过列表选择参数，即可快速生成建库建表脚本，进而完成库表创建。')}
        />
        
        <Card
            module_key='iot-guide'
            icon={<Icon className='label-icon' component={SvgIot} />}
            label={t('物联网库表向导')}
            description={t('此功能专为物联网用户设计。用户通过此功能无需设计分区方案或编写复杂的 SQL 语句，只需输入库表名称、列名等基本信息，并通过列表选择参数，即可快速生成建库建表脚本，进而完成库表创建。')}
        />
        
        { license.product_key !== 'ORCA' && <>
            <Card
                module_key='streaming-graph'
                icon={<Icon className='label-icon' component={SvgStreamingGraph} />}
                label={t('流图监控')}
                description={t('查看流计算图相关信息，通过流图监控模块，用户可以直观监控通过 Orca 创建的流图任务及其运行状态，帮助用户实时掌握各流图的任务数量、执行次数和当前状态等。点击流图名称跳转至详情页面，查看具体任务结构与执行情况。')}
            />
            
            <Card
                module_key='lineage'
                icon={<ApartmentOutlined className='label-icon' />}
                label={t('数据血缘')}
                description={t('查看数据库表、计算引擎的血缘关系，清晰地展示节点的上游拓扑结构，帮助用户直观地理解数据流动路径，从而快速定位问题。')}
            />
        </> }
    </div>
}
