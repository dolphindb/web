import './index.sass'

import { model } from '../model.js'

import { StreamingTable } from '../obj.js'
// import { StreamingTest } from '../streaming/StreamingTest.js'


export function Test () {
    const { ddb: { url, username, password } } = model
    
    return <div className='obj-result themed page'>
        <StreamingTable
            ctx='page'
            url={url}
            username={username}
            password={password}
            on_error={error => {
                model.show_error({ error })
            }}
        />
        {/* <StreamingTest /> */}
    </div>
}
