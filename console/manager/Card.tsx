import { Button, Modal } from 'antd'

import { use_modal } from 'react-object-model/hooks.js'

import { t } from '../../i18n/index.js'

import './index.sass'
import { model } from '../model.js'

import { module_infos } from './model.js'

export function Card ({ key }: { key: string }) 
{
    const { visible, open, close } = use_modal()
    const { label, description, load_prompt, unload_prompt, load_function, unload_function } = module_infos.get(key)
    
    return <>
        <div className='card'>
            <div className='left'>
                <div className='label'>{label}</div>
                <div className='description'>{description}</div>
            </div>
            <div className='right'>
                <Button
                    className='button'
                    type='primary'
                    danger={modules.has(key)}
                    onClick={() => {
                        Modal.confirm({
                          title: 'Confirm',
                          content: 'Bla bla ...',
                          onOk: () => { },
                          onCancel: () => { },
                        })
                      }}
                >
                    {modules.has(key) ? t('停用') : t('启用')}
                </Button>
            </div>
        </div>
    </>
}
