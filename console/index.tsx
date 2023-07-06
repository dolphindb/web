import 'xshell/scroll-bar.sass'

import './formily-patch.scss'
import './index.sass'


import { default as React, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import NiceModal from '@ebay/nice-modal-react'

// @ts-ignore 使用了 antd-with-locales 之后 window.antd 变量中有 locales 属性
import { Layout, ConfigProvider, locales } from 'antd'


import { language } from '../i18n/index.js'

import { model } from './model.js'

import { DdbHeader } from './components/DdbHeader.js'
import { DdbSider } from './components/DdbSider.js'

import { Login } from './login.js'
import { Overview } from './overview/index.js'
import { OverviewOld } from './overview/old.js'
import { Shell } from './shell/index.js'
import { DashBoard } from './dashboard.js'
import { Job } from './job.js'
import { Log } from './log.js'


const locale_names = { zh: 'zh_CN', en: 'en_US', ja: 'ja_JP', ko: 'ko_KR' } as const

const views = {
    login: Login,
    overview: Overview,
    'overview-old': OverviewOld,
    shell: Shell,
    dashboard: DashBoard,
    job: Job,
    log: Log,
}

function DdbContent () {
    const { view } = model.use(['view'])
    
    const View = views[view]
    
    if (!View)
        return null
    
    return <div className={`view-card ${view}`}>
        <View />
    </div>
}


function DolphinDB () {
    const { inited, header } = model.use(['inited', 'header'])
    
    useEffect(() => {
        (async () => {
            try {
                await model.init()
            } catch (error) {
                model.show_error({ error })
            }
        })()
    }, [ ])
    
    if (!inited)
        return null
    
    return <ConfigProvider locale={locales[locale_names[language]]} autoInsertSpaceInButton={false}>
        <NiceModal.Provider>
            <Layout className='root-layout'>
                { header && <Layout.Header className='ddb-header'>
                    <DdbHeader />
                </Layout.Header> }
                <Layout className='body' hasSider>
                    <DdbSider />
                    <Layout.Content className='view'>
                        <DdbContent />
                    </Layout.Content>
                </Layout>
            </Layout>
        </NiceModal.Provider>
    </ConfigProvider>
}


createRoot(
    document.querySelector('.root')
).render(<DolphinDB />)
