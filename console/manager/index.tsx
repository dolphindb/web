import { t } from '../../i18n/index.js'

import { model } from '../model.js'

import { Card } from './Card.js'
import './index.sass'
import { module_infos } from './model.js'

export function Manager () {
    const { admin } = model.use(['admin'])
    
    return admin && <>
        <div className='title'>{t('可选模块')}</div>
        {
            Array.from(module_infos).map(([key]) =>
                <Card module_key={key} key={key}/>
            )
        }
    </>
}
