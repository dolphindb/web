import './index.sass'

import { useState } from 'react'

import { Layout, Button, Tooltip, Popconfirm, Segmented } from 'antd'
const { Header } = Layout

import { default as Icon, AppstoreOutlined, BarsOutlined } from '@ant-design/icons'

import { delay } from 'xshell/utils.browser.js'

import { t, language } from '../../i18n/index.js'

import { NodeType, DdbNodeState, model, storage_keys } from '../model.js'

import { OverviewTable } from './table.js'
import { OverviewCard } from './card.js'

import SvgRefresh from './icons/refresh.icon.svg'
import SvgStart from './icons/start.icon.svg'
import SvgStop from './icons/stop.icon.svg'
import SvgExpand from './icons/expand.icon.svg'
import SvgCollapse from './icons/collapse.icon.svg'


type DisplayMode = 'table' | 'card'


export function Overview () {
    const { nodes, node_type, logined } = model.use(['nodes', 'node_type', 'logined'])   
    
    const [display_mode, set_display_mode] = useState<DisplayMode>(() => 
        localStorage.getItem(storage_keys.overview_display_mode) as DisplayMode || 'table')
    
    const [isStartLoading, setIsStartLoading] = useState(false)
    const [isStopLoading, setIsStopLoading] = useState(false)
    
    const [selectedNodeNames, setSelectedNodeNames] = useState<string[]>([ ])
    const selecteNodeNamesSet = new Set(selectedNodeNames)
    const selectedNodes = nodes.filter(node => selecteNodeNamesSet.has(node.name))
    
    const [expandedNodes, setExpandedNodes] = useState(nodes.filter(item => (item.name !== model.node.name)))
    const icon_classname = `icon-area ${language}`
    
    return <Layout>
        { node_type !== NodeType.single && <Header className='header-bar'>
            <div className='operations'>
                <div
                    className={icon_classname}
                    onClick={() => {
                        model.get_cluster_perf(true)
                    }}
                >
                    <Button className='refresh' size='large' type='text' block icon={<Icon className='icon-refresh' component={SvgRefresh} />}>
                        <span className='text'>{t('刷新')}</span>
                    </Button>
                </div>
                
                <div className={icon_classname}>
                    <Tooltip title={selectedNodes.length && !logined ? t('当前用户未登录，请登陆后再进行启停操作。') : ''}>
                        <Popconfirm
                            title={t('确认启动以下节点')}
                            disabled={!selectedNodes.filter(node => node.state === DdbNodeState.offline).length || !logined}
                            description={() =>
                                selectedNodes.map(
                                    node =>
                                        node.state === DdbNodeState.offline && (
                                            <p className='model-node' key={node.name}>
                                                {node.name}
                                            </p>
                                        )
                                )
                            }
                            onConfirm={async () => {
                                setIsStartLoading(true)
                                model.start_nodes(selectedNodes.filter(node => node.state === DdbNodeState.offline))
                                await delay(5000)
                                setIsStartLoading(false)
                                await model.get_cluster_perf(false)
                            }}
                            okText={t('确认')}
                            cancelText={t('取消')}
                            okButtonProps={{ disabled: selectedNodes.filter(node => node.state === DdbNodeState.offline).length === 0, loading: isStartLoading }}
                        >
                            <Button
                                type='text'
                                size='large'
                                block
                                disabled={!selectedNodes.filter(node => node.state === DdbNodeState.offline).length || !logined}
                                icon={<Icon className={'icon-start' + (!selectedNodes.length || !logined ? ' grey-icon' : ' blue-icon')} component={SvgStart} />}
                            >
                                {t('启动')}
                            </Button>
                        </Popconfirm>
                    </Tooltip>
                </div>
                
                <div className={icon_classname}>
                    <Tooltip title={selectedNodes.length && !logined ? t('当前用户未登录，请登陆后再进行启停操作。') : ''}>
                        <Popconfirm
                            title={t('确认停止以下节点')}
                            disabled={!selectedNodes.filter(node => node.state === DdbNodeState.online).length || !logined}
                            description={() =>
                                selectedNodes.map(
                                    node =>
                                        node.state === DdbNodeState.online && (
                                            <p className='model-node' key={node.name}>
                                                {node.name}
                                            </p>
                                        )
                                )
                            }
                            onConfirm={async () => {
                                setIsStopLoading(true)
                                model.stop_nodes(selectedNodes.filter(node => node.state === DdbNodeState.online))
                                await delay(5000)
                                setIsStopLoading(false)
                                await model.get_cluster_perf(false)
                            }}
                            okText={t('确认')}
                            cancelText={t('取消')}
                            okButtonProps={{ disabled: selectedNodes.filter(node => node.state === DdbNodeState.online).length === 0, loading: isStopLoading }}
                        >
                            <Button
                                type='text'
                                size='large'
                                block
                                disabled={!selectedNodes.filter(node => node.state === DdbNodeState.online).length || !logined}
                                icon={<Icon className={'icon-stop' + (!selectedNodes.length || !logined ? ' grey-icon' : ' blue-icon')} component={SvgStop} />}
                            >
                                {t('停止')}
                            </Button>
                        </Popconfirm>
                    </Tooltip>
                </div>
                
                { display_mode === 'card' && <>
                    <div className={`icon-expand-area ${language}`} onClick={() =>  { setExpandedNodes(nodes.filter(node => node.mode === NodeType.agent)) }}>
                        <Button type='text' size='large' block icon={<Icon className='icon-expand' component={SvgExpand} />}>{t('全部展开')}</Button>
                    </div>
                    
                    <div className={`icon-collapse-area ${language}`} onClick={() => { setExpandedNodes(nodes) }}>
                        <Button type='text' size='large' block icon={<Icon className='icon-collapse' component={SvgCollapse} />}>{t('全部折叠')}</Button>
                    </div>
                </> }
            </div>
            
            <div className='padding' />
            
            <Segmented<DisplayMode>
                className='display-mode'
                value={display_mode}
                onChange={mode => {
                    localStorage.setItem(storage_keys.overview_display_mode, mode)
                    set_display_mode(mode)
                }}
                size='large'
                options={[
                    { label: t('表格视图'), value: 'table', icon: <BarsOutlined /> },
                    { label: t('卡片视图'), value: 'card', icon: <AppstoreOutlined /> },
                ]}
            />
        </Header>
    }
       {display_mode === 'card' ? <OverviewCard/> : <OverviewTable/>}
    </Layout>
}
