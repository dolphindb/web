import './dashboard.sass'

import { default as React } from 'react'

import { StreamingTable } from './obj.js'


const params = new URLSearchParams(location.search)

export function DashBoard () {
    return <div className='result page'>
        <StreamingTable
            url={`ws://${params.get('hostname') || '127.0.0.1'}:${params.get('port') || '8848'}`}
            autologin={params.get('autologin') === '1'}
            table='prices'
            ctx='page'
        />
    </div>
}
