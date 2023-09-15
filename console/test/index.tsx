import './index.sass'

import { model } from '../model.js'

import { StreamingTable } from '../obj.js'
// import { StreamingTest } from '../streaming/StreamingTest.js'


export function Test () {
    const { ddb: { url, username, password } } = model
    
    return <div className='result page'>
        <StreamingTable
            ctx='page'
            table='prices' 
            url={url}
            username={username}
            password={password}
        />
        {/* <StreamingTest /> */}
    </div>
}
