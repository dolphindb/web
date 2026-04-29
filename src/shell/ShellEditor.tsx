import { useEffect, useMemo, useRef, useState } from 'react'

import { Input, InputNumber, Select, Switch, Tooltip } from 'antd'
import { CloseOutlined, DoubleLeftOutlined, DoubleRightOutlined, FileTextOutlined, PlusOutlined, SettingOutlined } from '@ant-design/icons'

import { storage } from 'xshell/storage.js'

import { t } from '@i18n'

import { model, storage_keys } from '@model'

import { Editor, type monacoapi } from '@components/Editor/index.tsx'

import { chat_model } from '@/chat/model.ts'
import type { ScriptExecuteApprovalMode } from '@/chat/model.ts'

import { shell } from './model.ts'
import { AiTab } from './AiTab.tsx'

import { SelectSqlModal } from './SelectSqlModal.tsx'
import { ExecuteAction } from './ExecuteAction.tsx'
import { UploadAction } from './UploadAction.tsx'

import SvgAi from './icons/ai.icon.svg'


export function ShellEditor ({ collapser }) {
    const { logined } = model.use(['logined'])
    
    const [minimap, set_minimap] = useState(() => 
        storage.get_bool(storage_keys.minimap))
    
    const [enter_completion, set_enter_completion] = useState(() => 
        storage.get_bool(storage_keys.enter_completion))
    
    const [font_size, set_font_size] = useState(() => 
        storage.get(storage_keys.font_size, 16))
    
    const [collapsed, set_collapsed] = useState(false)
    
    const { itab, tabs, monaco_inited } = shell.use(['itab', 'tabs', 'monaco_inited'])
    const current_tab = tabs.find(t => t.index === itab)
    const readonly = current_tab?.read_only
    const is_ai_tab = Boolean(current_tab?.chat_id)
    
    // 标签页关闭前自动保存代码
    useEffect(() => {
        shell.init_tabs()
        
        function beforeunload (event: BeforeUnloadEvent) {
            shell.save()
            // event.returnValue = ''
        }
        
        window.addEventListener('beforeunload', beforeunload)
        
        return () => {
            window.removeEventListener('beforeunload', beforeunload)
        }
    }, [ ])
    
    useEffect(() => {
        localStorage.setItem(storage_keys.current_tab, itab.toString())
    }, [itab])
    
    
    const monaco_options = useMemo<monacoapi.editor.IStandaloneEditorConstructionOptions>(() => ({
            minimap: { enabled: minimap },
            
            acceptSuggestionOnEnter: enter_completion ? 'on' : 'off',
            
            fontSize: font_size,
        }),
        [minimap, enter_completion, font_size])
    
    
    function handle_tab_close (tabId) {
        if (!shell.monaco_inited)
            return
        
        const tab = shell.tabs.find(t => t.index === tabId)
        const { tabs, itab } = shell
        
        function remove_tab () {
            const index = tabs.findIndex(t => t.index === tabId)
            const new_tabs = tabs.filter(t => t.index !== tabId)
            if (tabId === itab)
                if (new_tabs.length === 0)
                    shell.switch_tab(-1)
                else if (index === 0)
                    shell.switch_tab(new_tabs[0].index)
                else
                    shell.switch_tab(new_tabs[index - 1].index)
                    
            shell.remove_tab(tabId as number)
        }
        
        const code = tab.code
        if (code)
            model.modal.confirm({
                title: t('提醒'),
                content: t('关闭标签页将会删除标签页内的所有内容，确认关闭？'),
                onOk: remove_tab,
                okButtonProps: {
                    type: 'primary',
                    danger: true
                }
            })
        else
            remove_tab()
    }
    
    function handle_tab_rename (tabId, newName) {
        const tab = shell.tabs.find(t => t.index === tabId)
        if (tab) {
            tab.name = newName
            shell.set({ tabs: [...shell.tabs] })
            shell.save()
        }
    }
    
    return <div className='shell-editor'>
        { monaco_inited && <Tabs 
            tabs={[
                { key: -1, name: t('默认标签页'), closeable: false, renameable: false, icon: <FileTextOutlined /> }, 
                ...tabs.map(tab => ({
                    key: tab.index,
                    name: tab.name,
                    closeable: true,
                    renameable: true,
                    icon: tab.chat_id ? <SvgAi /> : <FileTextOutlined />
                }))
            ]}
            active_key={itab}
            on_tab_click={id => {
                shell.switch_tab(id as number)
            }}
            on_tab_close={handle_tab_close}
            on_tab_rename={handle_tab_rename}
            show_add_button
            on_add_tab={() => { shell.add_tab() }}
            right_extra={
                <div
                    className='ai-mode-btn'
                    onClick={async () => {
                        try {
                            if (!chat_model.agent_id)
                                await chat_model.init()
                            
                            if (!chat_model.agent_id) {
                                model.message?.warning(t('请先在 AI 设置中创建并配置 Agent'))
                                chat_model.set({ settings_visible: true })
                                return
                            }
                            
                            const session = await chat_model.create_session()
                            await shell.add_ai_tab(session.sessionId)
                        } catch (e) {
                            console.error('Failed to create AI tab:', e)
                            model.message?.error(t('创建 AI 标签页失败'))
                        }
                    }}
                >
                    <SvgAi />
                    <span>{t('AI 模式')}</span>
                </div>
            }
        /> }
        
        { monaco_inited && !is_ai_tab && <div className='toolbar'>
            <div className='actions'>
                <ExecuteAction />
                { logined && <UploadAction /> }
            </div>
            
            <div className='settings'>
                <SettingSwitch
                    title={t('代码地图:')}
                    help={t('控制是否显示缩略图')}
                    checked={minimap}
                    onChange={checked => {
                        set_minimap(checked)
                        storage.set_bool(storage_keys.minimap, checked)
                    }}
                />
                
                <SettingSwitch
                    title={t('回车补全:')}
                    help={t('控制除了 Tab 键以外，Enter 键是否同样可以接受建议。这能减少"插入新行"和"接受建议"命令之间的歧义。')}
                    checked={enter_completion}
                    onChange={checked => {
                        set_enter_completion(checked)
                        storage.set_bool(storage_keys.enter_completion, checked)
                    }}
                />
                
                <Tooltip title={t('设置默认字体大小（临时修改可将鼠标移到编辑器区域，通过 ctrl + 滚轮上下 调整）')}>
                    <span className='setting'>
                        <span className='title'>{t('字体大小:')}</span>
                        <InputNumber
                            className='font-size-input'
                            value={font_size}
                            size='small'
                            min={0}
                            step={1}
                            onChange={(size = 16) => {
                                set_font_size(size)
                                storage.set(storage_keys.font_size, size)
                            }}
                        />
                    </span>
                </Tooltip>
                
                <LanguageSelect />
                
                <SelectSqlModal/>
            </div>
            
            <div className='padding' />
            
            <div
                className='collapse-btn'
                onClick={() => {
                    set_collapsed(!collapsed)
                    collapser(collapsed)
                }}
            >
                {
                    collapsed ?
                        <DoubleLeftOutlined />
                    :
                        <span>
                            {t('隐藏终端') + ' '}
                            <DoubleRightOutlined />
                        </span>
                }
            </div>
        </div> }
        
        { monaco_inited && is_ai_tab && <AiToolbar
            session_id={current_tab.chat_id}
            collapsed={collapsed}
            on_toggle_collapsed={() => {
                set_collapsed(!collapsed)
                collapser(collapsed)
            }}
        /> }
        
        {is_ai_tab && <AiTab session_id={current_tab.chat_id} />}
        <div style={is_ai_tab ? { display: 'none' } : { flex: 1, minHeight: 0 }}>
            <Editor
            readonly={readonly}
            
            observe_resize
            
            options={monaco_options}
            
            on_loaded={(monaco, editor) => {
                editor.setValue(shell.itab > -1 
                    ? shell.tabs.find(t => t.index === shell.itab).code
                    : localStorage.getItem(storage_keys.code) || '')
                
                async function execute (selection: 'line' | 'all') {
                    if (shell.executing)
                        model.message.warning(t('当前连接正在执行作业，请等待'))
                    else
                        try {
                            await shell.execute(selection)
                        } catch (error) {
                            // 忽略用户执行脚本的错误
                        }
                }
                
                
                editor.addAction({
                    id: 'dolphindb.execute',
                    
                    keybindings: [
                        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyE,
                        monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter
                    ],
                    
                    label: t('DolphinDB: 执行当前行代码'),
                    
                    async run () {
                        await execute('line')
                    }
                })
                
                editor.addAction({
                    id: 'dolphindb.execute_all',
                    
                    keybindings: [
                        monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyE
                    ],
                    
                    label: t('DolphinDB: 执行代码'),
                    
                    async run () {
                        await execute('all')
                    }
                })
                
                shell.set({
                    editor,
                    monaco,
                    monaco_inited: true
                })
            }}
            
            on_change={value => {
                shell.save_debounced(value)
            }}
            
            on_save={value => {
                shell.save(value)
            }}
        />
        </div>
    </div>
}


interface ITab {
    key: string | number
    name: string
    closeable?: boolean
    renameable?: boolean
    icon?: React.ReactNode
}

interface TabsProps {
    tabs: ITab[]
    active_key: string | number
    on_tab_click: (tabId: string | number) => void
    on_tab_close?: (tabId: string | number) => void
    on_tab_rename?: (tabId: string | number, newName: string) => void
    show_add_button?: boolean
    on_add_tab?: () => void
    right_extra?: React.ReactNode
}

export function Tabs ({
    tabs,
    active_key,
    on_tab_click,
    on_tab_close,
    on_tab_rename,
    show_add_button = false,
    on_add_tab,
    right_extra
}: TabsProps) {
    let tabs_container_ref = useRef<HTMLDivElement>(undefined)
    
    useEffect(() => {
        function on_wheel (event: WheelEvent) {
            event.preventDefault()
            tabs_container_ref.current.scrollLeft += event.deltaY
            tabs_container_ref.current.scrollLeft += event.deltaX
        }
        
        tabs_container_ref.current.addEventListener('wheel', on_wheel)
        
        return () => { tabs_container_ref.current?.removeEventListener('wheel', on_wheel) }
    }, [ ])
    
    const tabs_content = <>
        {tabs.map(tab => 
            <Tab
                key={tab.key}
                name={tab.name}
                active={tab.key === active_key}
                closeable={tab.closeable}
                renameable={tab.renameable}
                onClick={() => { on_tab_click(tab.key) }}
                onClose={() => { on_tab_close?.(tab.key) }}
                onRename={newName => { on_tab_rename?.(tab.key, newName) }}
                icon={tab.icon}
            />
        )}
        {show_add_button && 
            <div className='add-tab' onClick={on_add_tab}>
                <PlusOutlined style={{ fontSize: 12 }} />
            </div>
        }
    </>
    
    if (right_extra)
        return <div className='tabs-bar'>
            <div className='tabs' ref={tabs_container_ref}>
                {tabs_content}
            </div>
            <div className='tabs-right-extra'>
                {right_extra}
            </div>
        </div>
    
    return <div className='tabs' ref={tabs_container_ref}>
        {tabs_content}
    </div>
}


function Tab ({
    name: initial_name,
    active,
    closeable = true,
    renameable = true,
    onClick,
    onClose,
    onRename,
    icon
}: {
    name: string
    active: boolean
    closeable?: boolean
    renameable?: boolean
    onClick: () => void
    onClose?: () => void
    onRename?: (newName: string) => void
    icon?: React.ReactNode
}) {
    let [name, set_name] = useState(initial_name)
    let [renaming, set_renaming] = useState(false)
    
    function commit_rename () {
        onRename?.(name)
        set_renaming(false)
    }
    
    return <div
        className={`tab ${active ? 'active' : ''}`}
        onClick={onClick}
    >
        {icon && <div className='tab-icon'>{icon}</div>}
        {renaming ? 
            <Input
                placeholder={t('标签页名称')}
                value={name}
                autoFocus
                onChange={event => { set_name(event.currentTarget.value) }}
                variant='borderless'
                size='small'
                onBlur={commit_rename}
                onKeyDown={event => {
                    if (event.key === 'Enter')
                        commit_rename()
                }}
            />
        :
            <div onDoubleClick={() => { renameable && set_renaming(true) }}>
                {name}
            </div>
        }
        {closeable && <div
            className='close-icon'
            onClick={event => {
                event.stopPropagation()
                onClose?.()
            }}
        >
            <CloseOutlined style={{ fontSize: 12 }} />
        </div>}
    </div>
}


function AiToolbar ({
    session_id,
    collapsed,
    on_toggle_collapsed,
}: {
    session_id: string
    collapsed: boolean
    on_toggle_collapsed: () => void
}) {
    const {
        sessions, agents, agent_id, selectable_llms, selected_llm_config_id, script_execute_approval_mode,
    } = chat_model.use(['sessions', 'agents', 'agent_id', 'selectable_llms', 'selected_llm_config_id', 'script_execute_approval_mode'])
    const session = sessions.find(s => s.sessionId === session_id)
    const title = session?.title || t('新会话')
    
    const active_agents = agents.filter(a => a.statusName === 'ACTIVE')
    
    // 构建 LLM 选项，默认模型标注
    const llm_options = selectable_llms.map(llm => ({
        value: llm.llmConfigId,
        label: llm.isAgentDefault ? `${llm.name} (${t('默认')})` : llm.name,
    }))
    
    return <div className='toolbar ai-toolbar'>
        <div className='ai-toolbar-title' title={title}>
            {title}
        </div>
        
        <div className='padding' />
        
        {llm_options.length > 0 && <Select
            size='small'
            value={selected_llm_config_id || undefined}
            placeholder={t('自动选择模型')}
            allowClear
            style={{ minWidth: 120, maxWidth: 200, marginRight: 8 }}
            onChange={(value: string | undefined) => {
                chat_model.set({ selected_llm_config_id: value || '' })
            }}
            options={llm_options}
        />}
        
        <Tooltip title={t('DolphinDB 脚本执行审批')}>
            <Select
                size='small'
                value={script_execute_approval_mode}
                style={{ minWidth: 110, marginRight: 8 }}
                onChange={(value: ScriptExecuteApprovalMode) => { chat_model.set_script_execute_approval_mode(value) }}
                options={[
                    { value: 'approval', label: t('需要审批') },
                    { value: 'auto', label: t('自动执行') },
                ]}
            />
        </Tooltip>
        
        <Select
            size='small'
            value={agent_id || undefined}
            placeholder={t('选择 Agent')}
            style={{ minWidth: 120, maxWidth: 200, marginRight: 8 }}
            disabled={active_agents.length <= 1}
            onChange={async (value: string) => {
                chat_model.select_agent(value)
                await chat_model.load_sessions()
            }}
            options={active_agents.map(a => ({
                value: a.agentId,
                label: a.agentName,
            }))}
        />
        
        <Tooltip title={t('AI 设置')}>
            <div
                className='collapse-btn'
                onClick={() => { chat_model.set({ settings_visible: true }) }}
            >
                <SettingOutlined />
                <span style={{ marginLeft: 4 }}>{t('AI 设置')}</span>
            </div>
        </Tooltip>
        
        <div className='toolbar-divider' />
        
        <div
            className='collapse-btn'
            onClick={on_toggle_collapsed}
        >
            {
                collapsed
                    ? <DoubleLeftOutlined />
                    : <span>
                        {t('隐藏终端') + ' '}
                        <DoubleRightOutlined />
                    </span>
            }
        </div>
    </div>
}


function SettingSwitch ({
    title,
    help,
    checked,
    onChange,
}: {
    title: string
    help: string
    checked: boolean
    onChange: (checked: boolean) => void
}) {
    return <Tooltip title={help}>
        <span className='setting'>
            <span className='title'>{title}</span>
            <Switch
                checked={checked}
                size='small'
                onChange={onChange}
            />
        </span>
    </Tooltip>
}


function LanguageSelect () {
    const { language } = shell.use(['language'])
    
    return <span className='setting'>
        <span className='title'>{t('编程语言:')}</span>
        <Select
            className='select-language'
            value={language}
            size='small'
            options={[
                { value: 'dolphindb', label: 'DolphinDB' },
                { value: 'q', label: 'Q' },
                // 现在是废弃状态不能用
                // { value: 'python', label: 'Python' }
            ]}
            onChange={value => { shell.set_language(value) }}
        />
    </span>
}
