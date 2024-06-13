import NiceModal, { useModal } from "@ebay/nice-modal-react";
import { useEffect, useState } from "react";
import { access } from "../../model.js";
import { Modal, Tag } from "antd";
import { t } from "../../../../i18n/index.js";
import { model } from "../../../model.js";

export const GroupUserConfirmModal = NiceModal.create(({
    edit_close,
    target_users,
    set_target_users,
    set_selected_users,
}:
    {
        edit_close: () => Promise<unknown>;
        target_users: string[];
        set_target_users: (users: string[]) => void;
        set_selected_users: (users: string[]) => void;
    }) => {

    const { current } = access.use(['current'])

    const modal = useModal()

    const [origin_users, set_origin_users] = useState<string[]>([])

    useEffect(() => {
        (async () => {
            set_origin_users(await access.get_users_by_group(current?.name))
        })()
    }, [current])

    return (
        <Modal
            className='edit-confirm-modal'
            open={modal.visible}
            onCancel={modal.hide}
            destroyOnClose
            title={<div>{t('确认对组 {{group}} 进行以下改动吗？', { group: current?.name })}</div>}
            onOk={async () => {
                const delete_users = origin_users.filter(u => !target_users.includes(u)).filter(group => group !== '')
                const add_users = target_users.filter((u: string) => !origin_users.includes(u)).filter(group => group !== '')
                if (delete_users.length || add_users.length) {
                    await Promise.all([
                        ...(delete_users.length ? [access.delete_group_member(delete_users, current?.name)] : []),
                        ...(add_users.length ? [access.add_group_member(add_users, current?.name)] : [])
                    ])
                    model.message.success(t('组成员修改成功'))
                }
                edit_close()
                modal.hide()
                set_selected_users([])
                set_target_users([])
                await access.get_group_list()
            }}
        >
            <div>
                <h4>{t('原组成员:')}</h4>
                {origin_users.map(group => <Tag color='cyan'>{group}</Tag>)}
                <h4>{t('移入用户:')}</h4>
                {target_users
                    .filter((u: string) => !origin_users.includes(u))
                    .filter(group => group !== '')
                    .map(group => <Tag color='green'>{group}</Tag>)}
                <h4>{t('移出用户:')}</h4>
                {origin_users
                    .filter(u => !target_users.includes(u))
                    .filter(group => group !== '')
                    .map(group => <Tag color='red'>{group}</Tag>)}
            </div>
        </Modal>
    )
})