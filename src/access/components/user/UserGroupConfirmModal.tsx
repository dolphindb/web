import NiceModal, { useModal } from '@ebay/nice-modal-react'

import { Modal, Tag } from 'antd'

import { useEffect, useState } from 'react'

import useSWR, { useSWRConfig } from 'swr'

import { t } from '@i18n/index.js'

import { access } from '@/access/model.js'
import { model } from '@/model.js'




export const UserGroupConfirmModal = NiceModal.create(({
    edit_close,
    target_groups,
    set_target_groups,
    set_selected_groups,
    name
}:
    {
        edit_close: () => Promise<unknown>
        target_groups: string[]
        set_target_groups: (groups: string[]) => void
        set_selected_groups: (groups: string[]) => void
        name: string
    }
    
) => {
    const modal = useModal()
    
    const { mutate } = useSWRConfig()
    
    const [origin_groups, set_origin_groups] = useState<string[]>([ ])
    
    useSWR(['user/groups', name], async () => access.get_user_access([name]), {
        onSuccess: data => {
            set_origin_groups(data[0].groups.split(',').filter(group => group !== ''))
        }
    })
    
    // useEffect(() => {
    //     (async () => {
    //         set_origin_groups((await access.get_user_access([name]))[0].groups.split(',').filter(group => group !== ''))
    //     })()
    // }, [name])
    
    return <Modal
            className='edit-confirm-modal'
            open={modal.visible}
            onCancel={modal.hide}
            afterClose={modal.remove}
            title={<div>{t('确认对用户 {{user}} 进行以下改动吗？', { user: name })}</div>}
            onOk={async () => {
                const origin_groups = (await access.get_user_access([name]))[0].groups.split(',').filter(group => group !== '')
                const delete_groups = origin_groups.filter(u => !target_groups.includes(u)).filter(group => group !== '')
                const add_groups = target_groups.filter((u: string) => !origin_groups.includes(u)).filter(group => group !== '')
                if (delete_groups.length || add_groups.length) {
                    await Promise.all([
                        ...(delete_groups.length ? [access.delete_group_member(name, delete_groups)] : [ ]),
                        ...(add_groups.length ? [access.add_group_member(name, add_groups)] : [ ])
                    ])
                    model.message.success(t('用户所属组修改成功'))
                }
                edit_close()
                modal.hide()
                set_selected_groups([ ])
                set_target_groups([ ])
                mutate('users/access')
            }}
        >
            <div>
                <h4>{t('原有组:')}</h4>
                {origin_groups.map(group => <Tag color='cyan'>{group}</Tag>)}
                <h4>{t('移入组:')}</h4>
                {target_groups
                    .filter((u: string) => !origin_groups.includes(u))
                    .filter(group => group !== '')
                    .map(group => <Tag color='green'>{group}</Tag>)}
                <h4>{t('移出组:')}</h4>
                {origin_groups
                    .filter(u => !target_groups.includes(u))
                    .filter(group => group !== '')
                    .map(group => <Tag color='red'>{group}</Tag>)}
            </div>
        </Modal>
})
