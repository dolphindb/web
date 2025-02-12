import { useEffect, useRef, useState } from 'react'

import { Input, Switch } from 'antd'
import { CloseOutlined, DoubleLeftOutlined, DoubleRightOutlined, PlusOutlined } from '@ant-design/icons'

import { t } from '@i18n/index.js'

import { model, storage_keys } from '@/model.ts'

import { Editor, type monacoapi } from '@/components/Editor/index.tsx'

import { shell, type Tab } from './model.ts'

import { SelectSqlModal } from './SelectSqlModal.tsx'
import { ExecuteAction } from './ExecuteAction.tsx'


interface ITab {
    key: string | number
    name: string
    closeable?: boolean
    renameable?: boolean
}

interface TabsProps {
    tabs: ITab[]
    active_key: string | number
    on_tab_click: (tabId: string | number) => void
    on_tab_close?: (tabId: string | number) => void
    on_tab_rename?: (tabId: string | number, newName: string) => void
    default_tab_key?: string | number
    default_taba_name?: string
    show_add_button?: boolean
    on_add_tab?: () => void
    show_default_tab?: boolean
}

export function Tabs ({
    tabs,
    active_key,
    on_tab_click,
    on_tab_close,
    on_tab_rename,
    default_tab_key = -1,
    show_default_tab = true,
    default_taba_name = t('默认标签页'),
    show_add_button = false,
    on_add_tab
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
    
    return <div className='tabs' ref={tabs_container_ref}>
        {show_default_tab && <div
            className={`tab ${active_key === default_tab_key ? 'active' : ''}`}
            onClick={() => { on_tab_click(default_tab_key) }}
        >
            {default_taba_name}
        </div>}
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
            />
        )}
        {show_add_button && 
            <div className='add-tab' onClick={on_add_tab}>
                <PlusOutlined style={{ fontSize: 12 }} />
            </div>
        }
    </div>
}

interface TabProps {
    name: string
    active: boolean
    closeable?: boolean
    renameable?: boolean
    onClick: () => void
    onClose?: () => void
    onRename?: (newName: string) => void
}

export function Tab ({
    name: initialName,
    active,
    closeable = true,
    renameable = true,
    onClick,
    onClose,
    onRename
}: TabProps) {
    let [name, set_name] = useState(initialName)
    let [renaming, set_renaming] = useState(false)
    
    function commit_rename () {
        onRename?.(name)
        set_renaming(false)
    }
    
    return <div
        className={`tab ${active ? 'active' : ''}`}
        onClick={onClick}
    >
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

export function ShellEditor ({ collapser }) {
    const [minimap, set_minimap] = useState(() => 
        localStorage.getItem(storage_keys.minimap) === '1'
    )
    
    const [enter_completion, set_enter_completion] = useState(() => 
        localStorage.getItem(storage_keys.enter_completion) === '1'
    )
    
    const [collapsed, set_collapsed] = useState(false)
    
    const { itab, tabs } = shell.use(['itab', 'tabs'])
    const current_tab = tabs.find(t => t.index === itab)
    const readonly = current_tab?.read_only
    
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
    
    function handle_tab_click (tabId) { shell.switch_tab(tabId as number) }
    
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
                okType: 'danger'
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
        <Tabs 
            tabs={tabs.map(tab => ({
                key: tab.index,
                name: tab.name,
                closeable: true,
                renameable: true
            }))}
            active_key={itab}
            on_tab_click={handle_tab_click}
            on_tab_close={handle_tab_close}
            on_tab_rename={handle_tab_rename}
            show_add_button
            on_add_tab={() => { shell.add_tab() }}
        />
        
        <div className='toolbar'>
            <div className='actions'>
                <ExecuteAction />
            </div>
            
            <div className='settings'>
                <span className='setting' title={t('控制是否显示缩略图')}>
                    <span className='text'>{t('代码地图:')}</span>
                    <Switch
                        checked={minimap}
                        size='small'
                        onChange={ checked => {
                            set_minimap(checked)
                            localStorage.setItem(storage_keys.minimap, checked ? '1' : '0')
                        }} />
                </span>
                
                <span className='setting' title={t('控制除了 Tab 键以外，Enter 键是否同样可以接受建议。这能减少“插入新行”和“接受建议”命令之间的歧义。')}>
                    <span className='text'>{t('回车补全:')}</span>
                    <Switch
                        checked={enter_completion}
                        size='small'
                        onChange={ checked => {
                            set_enter_completion(checked)
                            localStorage.setItem(storage_keys.enter_completion, checked ? '1' : '0')
                        }} />
                </span>
                
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
        </div>
        
        <Editor
            minimap={minimap}
            
            readonly={readonly}
            
            enter_completion={enter_completion}
            
            on_mount={(editor, monaco) => {
                editor.setValue(shell.itab > -1 
                    ? shell.tabs.find(t => t.index === shell.itab).code
                    : localStorage.getItem(storage_keys.code) || ''
                )
                
                async function execute (selection: 'line' | 'all') {
                    if (shell.executing)
                        model.message.warning(t('当前连接正在执行作业，请等待'))
                    else
                        try {
                            await shell.execute_(selection)
                        } catch (error) {
                            // 忽略用户执行脚本的错误
                        }
                }
                
                
                editor.addAction({
                    id: 'dolphindb.execute',
                    
                    keybindings: [
                        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyE
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
                
                editor.addAction({
                    id: 'dolphindb.save',
                    
                    keybindings: [
                        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS
                    ],
                    
                    label: t('DolphinDB: 保存代码'),
                    
                    run () {
                        shell.save()
                    },
                })
                
                editor.addAction({
                    id: 'duplicate_line',
                    
                    keybindings: [
                        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyD
                    ],
                    
                    label: t('向下复制行'),
                    
                    async run (editor: monacoapi.editor.IStandaloneCodeEditor) {
                        await editor.getAction('editor.action.copyLinesDownAction').run()
                    }
                })
                
                editor.addAction({
                    id: 'delete_lines',
                    
                    keybindings: [
                        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyY
                    ],
                    
                    label: t('删除行'),
                    
                    async run (editor: monacoapi.editor.IStandaloneCodeEditor) {
                        await editor.getAction('editor.action.deleteLines').run()
                    }
                })
                
                
                shell.set({
                    editor,
                    monaco,
                    monaco_inited: true
                })
            }}
            
            on_change={(value, event) => {
                shell.save_debounced(value)
            }}
        />
    </div>
}
