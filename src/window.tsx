import 'xshell/scroll-bar.sass'

import './window.sass'
import './pagination.sass'


import { useEffect } from 'react'
import { createRoot as create_root } from 'react-dom/client'

import { App, ConfigProvider } from 'antd'
import zh from 'antd/es/locale/zh_CN.js'
import en from 'antd/locale/en_US.js'
import ja from 'antd/locale/ja_JP.js'
import ko from 'antd/locale/ko_KR.js'


import { Model } from 'react-object-model'

import {
    DdbForm,
    type DDB,
    type DdbObj,
    type InspectOptions,
} from 'dolphindb/browser.js'

import { delay } from 'xshell/utils.browser.js'
import { storage } from 'xshell/storage.js'

import { language } from '@i18n'

import {
    Obj,
    type DdbObjRef,
    type Remote,
} from './obj.tsx'

import { apply_favicon } from './utils.common.ts'


const locales = { zh, en, ja, ko }


export class WindowModel extends Model<WindowModel> {
    obj?: DdbObj
    objref?: DdbObjRef
    
    remote?: Remote
    
    ddb?: DDB
    
    options?: InspectOptions
    
    product_name = 'DolphinDB'
    
    assets_root: string
}

let model = window.model = new WindowModel()


create_root(
    document.querySelector('.root')
).render(<Root />)


function Root () {
    return <ConfigProvider
        locale={locales[language] as any}
        button={{ autoInsertSpace: false }}
        theme={{ hashed: false, token: { borderRadius: 0, motion: false } }}
    >
        <App className='app'>
            <DdbObjWindow />
        </App>
    </ConfigProvider>
}


function DdbObjWindow () {
    const { obj, objref, remote, ddb, options, product_name, assets_root } = model.use(
        ['obj', 'objref', 'remote', 'ddb', 'options', 'product_name', 'assets_root'])
    
    // App 组件通过 Context 提供上下文方法调用，因而 useApp 需要作为子组件才能使用
    Object.assign(model, App.useApp())
    
    useEffect(() => {
        (async () => {
            let i = 0
            while (!(window as any).resolve) {
                if (i >= 10)
                    return
                await delay(200)
                ++i
            }
            
            (window as any).resolve()
        })()
    }, [ ])
    
    useEffect(() => {
        if (!obj && !objref)
            return
        
        const { name, form } = obj || objref
        
        document.title = `${ name || DdbForm[form] } - ${product_name}`
        
        ;(async () => {
            await delay(200)
            
            const $table = document.querySelector<HTMLTableElement>('table')
            if (!$table)
                return
            
            window.resizeTo(
                Math.min($table.offsetWidth + 40, screen.width - 100),
                Math.min($table.offsetHeight + 140,  screen.height - 100))
        })()
    }, [obj, objref, product_name])
    
    useEffect(() => {
        apply_favicon(storage.getstr('ddb.shf') === '1')
    }, [ ])
    
    if (!obj && !objref)
        return null
    
    return <div className='obj-result themed window'>
        <Obj
            obj={obj}
            objref={objref}
            ctx='window'
            remote={remote}
            ddb={ddb}
            options={options}
            product_name={product_name}
            assets_root={assets_root}
        />
    </div>
}

