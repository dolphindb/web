import './index.sass'

import { useCallback, useEffect, useState } from 'react'

import { Resizable } from 're-resizable'

import { delay } from 'xshell/utils.browser.js'


import { model } from '../model.js'
import { shell } from './model.js'

import { ShellEditor } from './ShellEditor.js'
// import { Editor } from './Editor/index.js'
import { Terminal } from './Terminal.js'
import { DataView } from './DataView.js'
import { Databases } from './Databases.js'
import { Variables } from './Variables.js'

export function Shell () {
    const { options } = model.use(['options'])
    
    const [editorState, setEditorState] = useState({
        width: '75%',
        height: '100%',
        maxWidth: '90%',
        enableRight: true
    })
    
    const collpaseHandler = useCallback(async (preCollapsed: boolean) => {
        setEditorState({
            maxWidth: !preCollapsed ? '100%' : '92%', 
            width: !preCollapsed ? '100%' : '75%',
            height: '100%',
            enableRight: preCollapsed
        })
        await delay(200)
        shell.fit_addon?.fit()
    }, [ ])
    
    useEffect(() => {
        shell.options = options
        shell.update_vars()
    }, [options])
    
    useEffect(() => {
        (async () => {
            try {
                await shell.load_dbs()
            } catch (error) {
                model.show_error({ error })
                throw error
            }
        })()
    }, [ ])
    
    return <>
        {/* 左侧三个面板 */}
        <Resizable
            className='left-panels'
            defaultSize={{ height: '100%', width: '13%' }}
            enable={{ top: false, right: true, bottom: false, left: false, topRight: false, bottomRight: false, bottomLeft: false, topLeft: false }}
            onResizeStop={async () => {
                await delay(200)
                shell.fit_addon?.fit()
            }}
        >
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
                    enable={{ top: false, right: editorState.enableRight, bottom: false, left: false, topRight: false, bottomRight: false, bottomLeft: false, topLeft: false }}
                    size={{ height: editorState.height, width: editorState.width }}
                    maxWidth={editorState.maxWidth}
                    handleStyles={{ bottom: { height: 6, bottom: -3 } }}
                    handleClasses={{ bottom: 'resizable-handle' }}
                    onResizeStop={async (e, direction, ref, d) => {
                        setEditorState(preval => ({
                            ...preval,
                            width: preval.width + d.width,
                            height: preval.height + d.height
                        }))
                        await delay(200)
                        shell.fit_addon?.fit()
                    }}
                >
                    <ShellEditor collpaseHandler={collpaseHandler}/>
                    {/* <Editor readonly default_value='objs(true)'/> */}
                </Resizable>
                
                <Terminal />
            </Resizable>
            
            <DataView />
        </div>
    </>
}

