import type { monacoapi } from './index.js'

export const settings: monacoapi.editor.IStandaloneEditorConstructionOptions = {
    minimap: {
        enabled: false
    },
    
    fontFamily: 'MyFont, Menlo, \'Ubuntu Mono\', Consolas, \'Dejavu Sans Mono\', \'Noto Sans Mono\', PingFangSC, \'Microsoft YaHei\', monospace',
    fontSize: 16,
    insertSpaces: true,
    codeLensFontFamily: 'MyFont, Menlo, \'Ubuntu Mono\', Consolas, \'Dejavu Sans Mono\', \'Noto Sans Mono\', PingFangSC, \'Microsoft YaHei\', monospace',
    folding: true,
    largeFileOptimizations: true,
    matchBrackets: 'always',
    smoothScrolling: false,
    suggest: {
        insertMode: 'replace',
        snippetsPreventQuickSuggestions: false,
    },
    
    wordBasedSuggestions: true,
    
    mouseWheelZoom: true,
    guides: {
        indentation: false,
        bracketPairs: false,
        highlightActiveIndentation: false,
    },
    
    detectIndentation: true,
    tabSize: 4,
    
    codeLens: true,
    roundedSelection: false,
    wordWrap: 'on',
    
    scrollBeyondLastLine: false,
    scrollbar: {
        vertical: 'visible'
    },
    
    find: {
        loop: true,
        seedSearchStringFromSelection: 'selection',
    },
    
    acceptSuggestionOnCommitCharacter: false,
    
    mouseWheelScrollSensitivity: 2,
    dragAndDrop: false,
    renderControlCharacters: true,
    lineNumbers: 'on',
    showFoldingControls: 'mouseover',
    foldingStrategy: 'indentation',
    accessibilitySupport: 'off',
    autoIndent: 'advanced',
    snippetSuggestions: 'none',
    renderLineHighlight: 'none',
    trimAutoWhitespace: false,
    hideCursorInOverviewRuler: true,
    renderWhitespace: 'none',
    overviewRulerBorder: true,
    
    gotoLocation: {
        multipleDeclarations: 'peek',
        multipleTypeDefinitions: 'peek',
        multipleDefinitions: 'peek',
    },
    
    foldingHighlight: false,
    unfoldOnClickAfterEndOfLine: true,
    
    inlayHints: {
        enabled: 'off',
    },
    
    acceptSuggestionOnEnter: 'off',
    
    quickSuggestions: {
        other: true,
        comments: true,
        strings: true,
    },
}
