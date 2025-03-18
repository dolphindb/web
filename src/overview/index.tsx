import './index.sass'

import { useEffect, useState } from 'react'

import { Layout, Button, Tooltip, Popconfirm, Segmented } from 'antd'
const { Header } = Layout

import { AppstoreOutlined, BarsOutlined, RedoOutlined, StopOutlined, DownOutlined, UpOutlined, PlayCircleOutlined } from '@ant-design/icons'

import { delay } from 'xshell/utils.browser.js'

import { t, language } from '@i18n'

import { NodeType, DdbNodeState, model, storage_keys, type DdbNode } from '@model'

import { OverviewTable } from './table.tsx'
import { OverviewCard } from './card.tsx'

// import SvgRefresh from './icons/refresh.icon.svg'
// import SvgStart from './icons/start.icon.svg'
// import SvgStop from './icons/stop.icon.svg'
// import SvgExpand from './icons/expand.icon.svg'
// import SvgCollapse from './icons/collapse.icon.svg'

type DisplayMode = 'table' | 'card'

export function Overview () {
    const { nodes, node_type, logined } = model.use(['nodes', 'node_type', 'logined'])
    
    const [display_mode, set_display_mode] = useState<DisplayMode>(
        () => (localStorage.getItem(storage_keys.overview_display_mode) as DisplayMode) || 'table'
    )
    
    useEffect(() => {
        let flag = true
        ;(async () => {
            while (true) {
                await delay(10000)
                if (!flag)
                    break
                await model.get_cluster_perf(false)
            }
        })()
        return () => {
            flag = false
        }
    }, [ ])
    
    const [isStartLoading, setIsStartLoading] = useState(false)
    const [isStopLoading, setIsStopLoading] = useState(false)
    
    const [selectedNodeNames, setSelectedNodeNames] = useState<string[]>([ ])
    const selecteNodeNamesSet = new Set(selectedNodeNames)
    const selectedNodes = nodes.filter(node => selecteNodeNamesSet.has(node.name))
    
    const [expandedNodes, setExpandedNodes] = useState<DdbNode[]>(nodes.filter(item => item.name !== model.node.name))
    const icon_classname = `icon-area ${language}`
    
    const [startOpen, setStartOpen] = useState(false)
    const [stopOpen, setStopOpen] = useState(false)
    
    return <Layout>
            <Header className='header-bar'>
                <Segmented<DisplayMode>
                    value={display_mode}
                    onChange={mode => {
                        localStorage.setItem(storage_keys.overview_display_mode, mode)
                        set_display_mode(mode)
                    }}
                    options={[
                        { label: t('表格视图'), value: 'table', icon: <BarsOutlined /> },
                        { label: t('卡片视图'), value: 'card', icon: <AppstoreOutlined /> }
                    ]}
                />
                
                <div className='operations'>
                    
                    {node_type !== NodeType.single && (
                        <>
                            <div className={icon_classname}>
                                <Popconfirm
                                    open={startOpen}
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
                                        try {
                                            setIsStartLoading(true)
                                            setStartOpen(false)
                                            await model.start_nodes(selectedNodes.filter(node => node.state === DdbNodeState.offline))
                                            await delay(5000)
                                            await model.get_cluster_perf(false)
                                            model.message.success(t('启动指令发送成功'))
                                            setSelectedNodeNames([ ])
                                        } finally {
                                            setIsStartLoading(false)
                                        }
                                    }}
                                    onCancel={() => {
                                        setStartOpen(false)
                                    }}
                                    okText={t('确认')}
                                    cancelText={t('取消')}
                                    okButtonProps={{
                                        disabled: selectedNodes.filter(node => node.state === DdbNodeState.offline).length === 0,
                                        loading: isStartLoading
                                    }}
                                >
                                    <Tooltip title={selectedNodes.length && !logined ? t('当前用户未登录，请登陆后再进行启停操作。') : ''}>
                                        <Button
                                            block
                                            loading={isStartLoading}
                                            onClick={() => {
                                                setStartOpen(true)
                                            }}
                                            disabled={!selectedNodes.filter(node => node.state === DdbNodeState.offline).length || !logined}
                                            icon={
                                                <PlayCircleOutlined />
                                            }
                                        >
                                            {t('启动')}
                                        </Button>
                                    </Tooltip>
                                    
                                </Popconfirm>
                            </div>
                            
                            <div className={icon_classname}>
                                <Popconfirm
                                    title={t('确认停止以下节点')}
                                    open={stopOpen}
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
                                        try {
                                            setIsStopLoading(true)
                                            setStopOpen(false)
                                            await model.stop_nodes(selectedNodes.filter(node => node.state === DdbNodeState.online))
                                            await delay(5000)
                                            await model.get_cluster_perf(false)
                                            model.message.success(t('停止指令发送成功'))
                                            setSelectedNodeNames([ ])
                                        } finally {
                                            setIsStopLoading(false)
                                        }
                                    }}
                                    onCancel={() => {
                                        setStopOpen(false)
                                    }}
                                    okText={t('确认')}
                                    cancelText={t('取消')}
                                    okButtonProps={{
                                        disabled: selectedNodes.filter(node => node.state === DdbNodeState.online).length === 0,
                                        loading: isStopLoading
                                    }}
                                >
                                    <Tooltip title={selectedNodes.length && !logined ? t('当前用户未登录，请登陆后再进行启停操作。') : ''}>
                                        <Button
                                           
                                            block
                                            loading={isStopLoading}
                                            onClick={() => {
                                                setStopOpen(true)
                                            }}
                                            disabled={!selectedNodes.filter(node => node.state === DdbNodeState.online).length || !logined}
                                            icon={
                                                <StopOutlined />
                                            }
                                        >
                                            {t('停止')}
                                        </Button>
                                    </Tooltip>
                                </Popconfirm>
                            </div>
                        </>
                    )}
                    
                    {display_mode === 'card' && node_type !== NodeType.single && (
                        <>
                            <div
                                className={`icon-expand-area ${language}`}
                                onClick={() => {
                                    setExpandedNodes(nodes.filter(node => node.mode === NodeType.agent))
                                }}
                            >
                                <Button block icon={<DownOutlined />}>
                                    {t('全部展开')}
                                </Button>
                            </div>
                            
                            <div
                                className={`icon-collapse-area ${language}`}
                                onClick={() => {
                                    setExpandedNodes(nodes)
                                }}
                            >
                                <Button block icon={<UpOutlined />}>
                                    {t('全部折叠')}
                                </Button>
                            </div>
                        </>
                    )}
                    
                    <div
                        className={icon_classname}
                        onClick={() => {
                            setSelectedNodeNames([ ])
                            model.get_cluster_perf(true)
                        }}
                    >
                        <Button className='refresh' block icon={<RedoOutlined />}>
                            {t('刷新')}
                        </Button>
                    </div>
                </div>
              
            </Header>
            {display_mode === 'card' ? (
                <OverviewCard
                    selectedNodeNames={selectedNodeNames}
                    setSelectedNodeNames={setSelectedNodeNames}
                    expandedNodes={expandedNodes}
                    setExpandedNodes={setExpandedNodes}
                />
            ) : (
                <OverviewTable selectedNodeNames={selectedNodeNames} setSelectedNodeNames={setSelectedNodeNames} />
            )}
        </Layout>
}
