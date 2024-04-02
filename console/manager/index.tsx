import { t } from '../../i18n/index.js'

import { Card } from './Card.js'
import './index.sass'
import { module_infos } from './model.js'

export function Manager () {
    return <>
        <div className='title'>{t('可选模块')}</div>
        {
            Array.from(module_infos).map(([key]) =>
                <Card _key={key} key={key}/>
            )
        }
    </>
}
