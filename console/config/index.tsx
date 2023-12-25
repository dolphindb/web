import './index.sass'

import { useState } from 'react'

import { Tabs } from 'antd'
import { t } from '../../i18n/index.js'

import { ControllerConfig } from './ControllerConfig.js'
import { NodesManagement } from './NodesManagement.js'
import { NodesConfig } from './NodesConfig.js'

import SvgControllerConfig from './icons/controller.config.icon.svg'
import SvgNodesConfig from './icons/nodes.config.icon.svg'
import SvgNodesManagement from './icons/nodes.management.icon.svg'

export function Config () {
    const [tab_key, set_tab_key] = useState('controller_config')
    return <Tabs
                type='card'
                accessKey={tab_key}
                onChange={set_tab_key}
                items={[
                {
                    key: 'controller_config',
                    label: <div className='tab-header'>
                        <SvgControllerConfig/>
                        {t('控制节点配置')}
                    </div>,
                    children: <ControllerConfig/>
                    
                },
                {
                    key: 'nodes_management',
                    label: <div className='tab-header'>
                        <SvgNodesManagement/>
                        {t('集群节点管理')}
                    </div>,
                    children: <NodesManagement/>
                },
                {
                    key: 'nodes_config',
                    label: <div className='tab-header'>
                        <SvgNodesConfig/>
                        {t('集群节点配置')}
                    </div>,
                    children: <NodesConfig/>
                }
                ]}
        />
}

