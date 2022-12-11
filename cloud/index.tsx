import 'xshell/scroll-bar.sass'

import './index.sass'

import { default as React, useEffect } from 'react'
import { createRoot as create_root } from 'react-dom/client'

import {
    ConfigProvider,
    
    // @ts-ignore 使用了 antd-with-locales 之后 window.antd 变量中有 locales 属性
    locales
} from 'antd'

import { model } from './model.js'

import { language } from '../i18n/index.js'

import { Cloud } from './cloud.js'
import { Shell } from './shell.js'


const locale_names = {
    zh: 'zh_CN',
    en: 'en_US',
    ja: 'ja_JP',
    ko: 'ko_KR'
} as const


function DolphinDB () {
    const { inited } = model.use(['inited'])
    
    useEffect(() => {
        model.init()
    }, [ ])
    
    if (!inited)
        return null
    
    return <ConfigProvider locale={locales[locale_names[language]]} autoInsertSpaceInButton={false}
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
