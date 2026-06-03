import { useCallback } from 'react'

import type { editor } from 'monaco-editor'
import type { Monaco } from '@components/Editor/index.tsx'

export function use_monaco_insert (monaco: Monaco, editor: editor.IStandaloneCodeEditor) {
    return useCallback(
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
        [monaco, editor])
}
