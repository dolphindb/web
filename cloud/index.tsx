import 'antd/dist/antd.css'

import 'xshell/scroll-bar.sass'
import '../myfont.sass'

import './index.sass'

import { default as React, useEffect } from 'react'
import { createRoot as create_root } from 'react-dom/client'
import {
    Layout, 
    ConfigProvider,
} from 'antd'
import zh from 'antd/lib/locale/zh_CN.js'
import en from 'antd/lib/locale/en_US.js'
import ja from 'antd/lib/locale/ja_JP.js'
import ko from 'antd/lib/locale/ko_KR.js'

import { model } from './model.js'

import { language } from '../i18n/index.js'

import { Cloud } from './cloud.js'
import { Shell } from './shell.js'


const locales = { zh, en, ja, ko }


function DolphinDB () {
    const { inited } = model.use(['inited'])
    
    useEffect(() => {
        model.init()
    }, [ ])
    
    if (!inited)
        return null
    
    return <ConfigProvider
        locale={locales[language] as any}
        autoInsertSpaceInButton={false}
    >
        <DdbHeader />
        <DdbContent />
    </ConfigProvider>
}


function DdbHeader () {
    return <div className='header'>
        <img className='logo' src='./cloud.svg' />
        
        <div className='padding' />
    </div>
}


const views = {
    cloud: Cloud,
    shell: Shell
} as const

function DdbContent () {
    const { view } = model.use(['view'])
    
    const View = views[view]
    
    if (!View)
        return null
    
    return <div className={`view ${view}`}>
        <View/>
    </div>
}

create_root(
    document.querySelector('.root')
).render(<DolphinDB/>)
