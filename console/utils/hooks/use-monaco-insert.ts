import { useCallback } from 'react'

import type { editor } from 'monaco-editor'
import { useMonaco } from '@monaco-editor/react'

export function use_monaco_insert (editor: editor.IStandaloneCodeEditor) {
    const monaco = useMonaco()
    
    const on_monaco_insert = useCallback(
        (content: string) => {
            const position = editor?.getPosition?.()
            editor.executeEdits('', [
                {
                    range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
                    text: content
                }
            ])
            
            editor.setPosition({
                lineNumber: position.lineNumber,
                column: position.column + content.length
            })
            
            editor.focus()
        },
        [editor]
    )
    
    return { on_monaco_insert }
}
