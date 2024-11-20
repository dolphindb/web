import { useState } from 'react'
import './git.sass'

import { Resizable } from 're-resizable'

import { Repos } from './repos.tsx'
import { Files } from './files.tsx'
import { Commit } from './commit.tsx'

export function Git () {
    const [selected_repo, set_selected_repo] = useState<string | undefined>(undefined)
    
    function handle_repo_change (id: string) {
        set_selected_repo(id)
    }
    
    function handle_back () {
        set_selected_repo('')
    }
    
    return <div className='git'>
        <Commit />
        <Resizable
            className='treeview-resizable-split22'
            enable={{
                top: false,
                right: false,
                bottom: true,
                left: false,
                topRight: false,
                bottomRight: false,
                bottomLeft: false,
                topLeft: false
            }}
            defaultSize={{ height: '300px', width: '100%' }}
            minHeight='200px'
            handleStyles={{ bottom: { height: 20, bottom: -10 } }}
            handleClasses={{ bottom: 'resizable-handle' }}
        >
            <Files repo_id={selected_repo} on_back={handle_back} />
        </Resizable>
        <Repos on_select_repo={handle_repo_change} />
    </div>
}
