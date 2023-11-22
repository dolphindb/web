import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { Button, Modal } from 'antd'
import { type SecondStepInfo } from '../../../type.js'
import { CommonSortCols } from './CommonSortCols.js'
import { type SelectProps } from 'antd/lib'
import { useCallback } from 'react'

interface IProps { 
    col_options: SelectProps['options']
    recommended_sort_keys: SecondStepInfo['otherSortKeys']
    on_apply_recommend: () => void
    on_apply_mine: any
}

export const RecommendModal = NiceModal.create((props: IProps) => { 
    const { col_options, recommended_sort_keys, on_apply_recommend, on_apply_mine } = props
    const modal = useModal()
    
    const on_ok = useCallback(() => {
        on_apply_recommend()
        modal.hide()
    }, [on_apply_recommend])
    
    
    return <Modal
        open={modal.visible}
        footer={<>
            <Button onClick={on_apply_mine} >使用我的配置</Button>
            <Button onClick={on_ok} type='primary'>应用推荐配置</Button>
        </>}
        onCancel={modal.hide}
        afterClose={modal.remove}
    >
        <CommonSortCols initial_value={recommended_sort_keys} col_options={col_options} mode='readonly'/>
    </Modal>
})
