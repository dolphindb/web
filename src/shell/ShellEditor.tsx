import { useEffect, useState, type MouseEvent } from 'react'

import { Input, Switch } from 'antd'
import { CloseOutlined, DoubleLeftOutlined, DoubleRightOutlined, PlusOutlined } from '@ant-design/icons'

import { t } from '@i18n/index.js'

import { model, storage_keys } from '@/model.ts'

import { Editor, type monacoapi } from '@/components/Editor/index.tsx'

import { shell, type Tab } from './model.ts'

import { SelectSqlModal } from './SelectSqlModal.tsx'
import { ExecuteAction } from './ExecuteAction.tsx'


export function ShellEditor ({ collapser }) {
    const [minimap, set_minimap] = useState(() => 
        localStorage.getItem(storage_keys.minimap) === '1'
    )
    
    const [enter_completion, set_enter_completion] = useState(() => 
        localStorage.getItem(storage_keys.enter_completion) === '1'
    )
    
    const [collapsed, set_collapsed] = useState(false)
    
    const { tabs, current_tab_index, is_monaco_init } = shell.use(['tabs', 'current_tab_index', 'is_monaco_init'])
    
    // 标签页关闭前自动保存代码
    useEffect(() => {
        function beforeunload (event: BeforeUnloadEvent) {
            shell.save()
            // event.returnValue = ''
        }
        
        window.addEventListener('beforeunload', beforeunload)
        
        shell.init_tabs()
        
        return () => {
            window.removeEventListener('beforeunload', beforeunload)
        }
    }, [ ])
    
    function get_tab_views () {
        
        function close_tab (ev: MouseEvent<HTMLSpanElement>, tab_index: number) {
            ev.stopPropagation()
            if (!is_monaco_init)
                return
            function remove_tab () {
                const index = tabs.findIndex(t => t.index === tab_index)
                const new_tabs = tabs.filter(t => t.index !== tab_index)
                if (tab_index === current_tab_index)
                    if (new_tabs.length === 0)
                        shell.switch_tab(-1)
                    else if (index === 0)
                        shell.switch_tab(new_tabs[0].index)
                    else
                        shell.switch_tab(new_tabs[index - 1].index)
                        
                shell.remove_tab(tab_index)
            }
            model.modal.confirm(
                {
                    title: t('提醒'),
                    content: t('关闭标签页将会删除标签页内的所有内容，确认关闭？'),
                    onOk: remove_tab,
                    okType: 'danger',
                }
            )
        }
        
        function rename_tab (tab_index: number, name: string) {
            const index = tabs.findIndex(t => t.index === tab_index)
            const new_tabs = [...tabs]
            new_tabs[index].name = name
            shell.set({ tabs: new_tabs })
            shell.save()
        }
        
        const tab_views = tabs.map(tab => <DdbTab
            tab={tab}
            key={tab.index}
            on_close={close_tab}
            on_rename={rename_tab}
            current_tab_index={current_tab_index}
            on_click={tab_index => { shell.switch_tab(tab_index) }}
        />
        )
        
        return <>
            <div className={`tab ${(current_tab_index < 0) ? 'active' : ''}`} key='default' onClick={() => { shell.switch_tab(-1) }}>
                {t('默认标签页')}
            </div>
            {tab_views}
            <div className='add-tab' onClick={shell.add_tab}><PlusOutlined style={{ fontSize: 12 }} /></div>
        </>
    }
    
    const tab_views = get_tab_views()
    
    return <div className='shell-editor'>
        <div className='tabs'>
            {tab_views}
        </div>
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
            
            enter_completion={enter_completion}
            
            on_mount={(editor, monaco) => {
                editor.setValue(localStorage.getItem(storage_keys.code) || '')
                
                
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
                
                
                shell.set({ editor, monaco })
                shell.set({ is_monaco_init: true })
            }}
            
            on_change={(value, event) => {
                shell.save_debounced(value)
            }}
        />
    </div>
}

interface DdbSheelTabProps {
    tab: Tab
    on_close: (ev: MouseEvent<HTMLSpanElement>, tab_index: number) => void
    on_rename: (tab_index: number, name: string) => void
    on_click: (tab_index: number) => void
    current_tab_index: number
}
function DdbTab (props: DdbSheelTabProps) {
    const { tab, on_close, on_rename, on_click, current_tab_index } = props
    const [name, set_name] = useState(tab.name)
    const [is_rename, set_is_rename] = useState(false)
    return <div className={`tab ${tab.index === current_tab_index ? 'active' : ''}`} key={tab.index} onClick={() => { on_click(tab.index) }}>
        {!is_rename && <div
            onDoubleClick={() => { set_is_rename(true) }}>
            {tab.name}
        </div>
        }
        {is_rename && <Input
            placeholder={t('标签页名称')}
            value={name}
            autoFocus
            onChange={ev => { set_name(ev.target.value) }}
            variant='borderless'
            size='small'
            onBlur={
                () => {
                    on_rename(tab.index, name)
                    set_is_rename(false)
                }}
        />}
        <div onClick={ev => { on_close(ev, tab.index) }}
            className='close-icon'>
            <CloseOutlined style={{ fontSize: 12 }} />
        </div>
    </div>
}
