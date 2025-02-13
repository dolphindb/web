import './index.sass'

import { useCallback, useState } from 'react'

import { Resizable } from 're-resizable'

import { delay } from 'xshell/utils.browser.js'

import { t } from '@i18n/index.ts'

import { shell } from './model.ts'

import { ShellEditor, Tabs } from './ShellEditor.tsx'
// import { Editor } from './Editor/index.js'
import { Terminal } from './Terminal.tsx'
import { DataView } from './DataView.tsx'
import { Databases } from './Databases.tsx'
import { Variables } from './Variables.tsx'
import { Git } from './git/Git.tsx'


export function Shell () {
    const [editor_state, set_editor_state] = useState({
        width: '75%',
        height: '100%',
        maxWidth: '90%',
        right: true
    })
    
    const collapser = useCallback(async (collapsed: boolean) => {
        set_editor_state({
            maxWidth: !collapsed ? '100%' : '92%', 
            width: !collapsed ? '100%' : '75%',
            height: '100%',
            right: collapsed
        })
        await delay(200)
        shell.fit_addon?.fit()
    }, [ ])
    
    
    const [tab_key, set_tab_key] = useState('shell')
    const is_git = tab_key === 'git'
    
    return <>
        {/* 左侧三个面板 */}
        <Resizable
            className='left-panels'
            defaultSize={{ height: '100%', width: '20%' }}
            enable={{ top: false, right: true, bottom: false, left: false, topRight: false, bottomRight: false, bottomLeft: false, topLeft: false }}
            onResizeStop={async () => {
                await delay(200)
                shell.fit_addon?.fit()
            }}
        >
            <div>
                <Tabs
                    tabs={[
                        { key: 'shell', name: t('数据库'), closeable: false, renameable: false },
                        { key: 'git', name: t('Git 集成'), closeable: false, renameable: false },
                    ]}
                    active_key={tab_key}
                    on_tab_click={key => { set_tab_key(key as string) }}
                />
            </div>
            {
                is_git
                    ? <Git />
                    : <>
                        <Databases />
                        
                        <div className='treeview-resizable-split2'>
                            <div className='treeview-resizable-split21'>
                                <Variables shared={false} />
                            </div>
                            
                            <Resizable
                                className='treeview-resizable-split22'
                                enable={{
                                    top: true,
                                    right: false,
                                    bottom: false,
                                    left: false,
                                    topRight: false,
                                    bottomRight: false,
                                    bottomLeft: false,
                                    topLeft: false
                                }}
                                defaultSize={{ height: '100px', width: '100%' }}
                                minHeight='22px'
                                handleStyles={{ bottom: { height: 20, bottom: -10 } }}
                                handleClasses={{ bottom: 'resizable-handle' }}
                            >
                                <Variables shared />
                            </Resizable>
                        </div>
                    </>
            }
        </Resizable>
        
        
        {/* 右侧编辑器、终端 */}
        <div className='content'>
            <Resizable
                className='top'
                defaultSize={{ height: '63%', width: '100%' }}
                enable={{ top: false, right: false, bottom: true, left: false, topRight: false, bottomRight: false, bottomLeft: false, topLeft: false }}
                onResizeStop={async () => {
                    await delay(200)
                    shell.fit_addon?.fit()
                }}
            >
                <Resizable
                    className='editor-resizable'
                    enable={{ top: false, right: editor_state.right, bottom: false, left: false, topRight: false, bottomRight: false, bottomLeft: false, topLeft: false }}
                    size={{ height: editor_state.height, width: editor_state.width }}
                    maxWidth={editor_state.maxWidth}
                    handleStyles={{ bottom: { height: 6, bottom: -3 } }}
                    handleClasses={{ bottom: 'resizable-handle' }}
                    onResizeStop={async (e, direction, ref, d) => {
                        set_editor_state(preval => ({
                            ...preval,
                            width: preval.width + d.width,
                            height: preval.height + d.height
                        }))
                        await delay(200)
                        shell.fit_addon?.fit()
                    }}
                >
                    <ShellEditor collapser={collapser}/>
                    {/* <Editor readonly default_value='objs(true)'/> */}
                </Resizable>
                
                <Terminal />
            </Resizable>
            
            <DataView/>
        </div>
    </>
}

