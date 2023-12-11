import './index.scss'

import { Drawer, Tooltip, Segmented } from 'antd'
import { type ReactElement, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { QueryGuideType } from './type.js'
import { t } from '../../../i18n/index.js'
import { QueryGuide } from './QueryGuide.js'
import { SqlEditGuide } from './SqlEditGuide.js'

import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { DraggableModal } from '../../components/DraggableModal/index.js'

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
        set_type(QueryGuideType.QUERY_GUIDE)
    }, [ ])
    
    const change_type = useCallback(value => {
        set_type(value)
    }, [ ]) 
    
    const Component = useMemo(() => components[type], [type])
    
    return <>
        <DraggableModal
            maskClosable={false}
            destroyOnClose
            footer={footer}
            title={database + '/' + table}
            width={1000}
            className='query-guide-modal'
            open={modal.visible}
            onCancel={modal.hide}
            afterClose={modal.remove}
        >   
            <Segmented
                className='guide-segmented'
                value={type}
                onChange={change_type}
                options={[
                    { label: t('向导界面'), value: QueryGuideType.QUERY_GUIDE },
                    { label: t('编辑界面'), value: QueryGuideType.SQL }
                ]}
            />
            <Component set_footer={set_footer} {...props} />
        </DraggableModal>
    
    </>
 })
