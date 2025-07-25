import './index.scss'

import { Modal, Segmented } from 'antd'
import { type ReactElement, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import NiceModal, { useModal } from '@ebay/nice-modal-react'

import { t } from '@i18n'

import { QueryGuideType } from './type.js'
import { QueryGuide } from './QueryGuide.js'
import { SqlEditGuide } from './SqlEditGuide.js'


import { guide_query_model } from './model.js'

interface IProps { 
    database: string
    table: string
}

const components = {
    [QueryGuideType.QUERY_GUIDE]: QueryGuide,
    [QueryGuideType.SQL]: SqlEditGuide
}

export const QueryGuideModal = NiceModal.create((props: IProps) => {
    const { table, database } = props
    const modal = useModal()
    const [footer, set_footer] = useState<ReactElement>(null)
    
    const [type, set_type] = useState<QueryGuideType>(QueryGuideType.QUERY_GUIDE)
    
    useEffect(() => { 
        guide_query_model.define_query_guide()
    }, [ ])
    
    const change_type = useCallback(value => {
        set_type(value)
    }, [ ]) 
    
    const Component = useMemo(() => components[type], [type])
    
    const on_cancel = useCallback(async () => { 
        guide_query_model.set({ code: undefined, query_values: undefined })
        modal.hide()
    }, [ ])
    
    return <>
        <Modal
            maskClosable={false}
            destroyOnHidden
            footer={footer}
            title={database + '/' + table}
            width={1000}
            className='query-guide-modal'
            open={modal.visible}
            onCancel={on_cancel}
            afterClose={modal.remove}
        >   
            <Segmented
                className='guide-segmented'
                value={type}
                onChange={change_type}
                options={[
                    { label: t('向导查询'), value: QueryGuideType.QUERY_GUIDE },
                    { label: t('脚本查询'), value: QueryGuideType.SQL }
                ]}
            />
            <Component set_footer={set_footer} {...props} />
        </Modal>
    
    </>
 })
