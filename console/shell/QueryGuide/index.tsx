import './index.scss'

import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { Modal, Radio, type RadioChangeEvent } from 'antd'
import { useCallback, useMemo, useState } from 'react'
import { QueryGuideType } from './type.js'
import { t } from '../../../i18n/index.js'
import { QueryGuide } from './QueryGuide.js'
import { SqlEdit } from './SqlEdit.js'

interface IProps { 
    database: string
    table: string
}

const components = {
    [QueryGuideType.QUERY_GUIDE]: QueryGuide,
    [QueryGuideType.SQL]: SqlEdit
}

export const QueryGuideModal = NiceModal.create((props: IProps) => {
    const modal = useModal()
    
    const [type, set_type] = useState<QueryGuideType>(QueryGuideType.QUERY_GUIDE)
    
    const change_type = useCallback((e: RadioChangeEvent) => {
        set_type(e.target.value)
    }, [ ]) 
    
    const Component = useMemo(() => components[type], [type])
    
    return <Modal className='query-guide-modal' open={modal.visible} onCancel={modal.hide} afterClose={modal.remove}>
         <Radio.Group value={type} onChange={change_type}>
            <Radio.Button value={QueryGuideType.QUERY_GUIDE}>{t('向导界面')}</Radio.Button>
            <Radio.Button value={QueryGuideType.SQL}>{t('编辑界面')}</Radio.Button>
        </Radio.Group>
        
        <Component {...props} />
    </Modal>
 })
