import './shell.old.sass'

import React from 'react'
import { Descriptions } from 'antd'
import { SyncOutlined } from '@ant-design/icons'

import { t } from '../i18n/index.js'
import { model } from './model.js'


export function ShellOld () {
    return <>
        <iframe src='./nodedetail.html' width='100%' />
    </>
}

