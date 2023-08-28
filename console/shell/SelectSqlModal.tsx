import { useRef } from 'react'

import { Modal, Select } from 'antd'

import { default as Icon, WarningFilled  } from '@ant-design/icons'

import { SqlStandard } from 'dolphindb/browser.js'

import { use_modal } from 'react-object-model/modal.js'

import { storage_keys, model } from '../model.js'
import { t } from '../../i18n/index.js'

import SvgArrowDown from '../components/icons/arrow.down.icon.svg'


export function SelectSqlModal () {
    const { visible, open, close } = use_modal()
    
    let ref_selected_sql = useRef<string>()
    
    return <>
        <Modal
            className='select-sql-modal'
            title={<div className='title'>
                <WarningFilled className='modal-warning-icon'/>
                <span>{t('确认切换 SQL 标准？')}</span>
            </div>}
            open={visible}
            onOk={() => {
                localStorage.setItem(storage_keys.sql, ref_selected_sql.current)
                close()
                location.reload()
            }} 
            onCancel={close}
        >
            <p>{t('切换 SQL Standard 后，当前页面将会刷新，且内存变量会清空')}</p>
        </Modal>
        
        <span className='setting sql' title={t('设置当前代码执行的 SQL 标准')}>
            <span className='text' title={t('SQL 标准')}>SQL:</span>
            <Select
                value={SqlStandard[model.sql]}
                size='small'
                className='select-sql'
                suffixIcon={<Icon className='arrow-down' component={SvgArrowDown} />}
                onSelect={ value => {
                    ref_selected_sql.current = value
                    open()
                }}
                popupMatchSelectWidth={false}
                options={[
                    { value: 'DolphinDB' },
                    { value: 'Oracle' },
                    { value: 'MySQL' },
                ]}
            />
        </span>
    </>
}
