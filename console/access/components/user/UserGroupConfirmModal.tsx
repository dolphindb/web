import NiceModal, { useModal } from "@ebay/nice-modal-react";
import { access } from "../../model.js";
import { t } from "../../../../i18n/index.js";
import { Modal, Tag } from "antd";
import { model } from "../../../model.js";
import { useEffect, useState } from "react";

export const UserGroupConfirmModal = NiceModal.create(({
    edit_close,
    target_groups,
    set_target_groups,
    set_selected_groups,
    set_users_info
}:
    {
        edit_close: () => Promise<unknown>;
        target_groups: string[];
        set_target_groups: (groups: string[]) => void;
        set_selected_groups: (groups: string[]) => void;
        set_users_info: (users: any[]) => void
    }

) => {
    const modal = useModal()

    const { users, current } = access.use(['users', 'groups', 'current'])

    const [origin_groups, set_origin_groups] = useState<string[]>([])

    useEffect(() => {
        (async () => {
            set_origin_groups((await access.get_user_access([current?.name]))[0].groups.split(',').filter(group => group !== ''))
        })()
    }, [current])

    return (
        <Modal
            className='edit-confirm-modal'
            open={modal.visible}
            onCancel={modal.hide}
            afterClose={modal.remove}
            title={<div>{t('确认对用户 {{user}} 进行以下改动吗？', { user: current?.name })}</div>}
            onOk={async () => {
                const origin_groups = (await access.get_user_access([current?.name]))[0].groups.split(',').filter(group => group !== '')
                const delete_groups = origin_groups.filter(u => !target_groups.includes(u)).filter(group => group !== '')
                const add_groups = target_groups.filter((u: string) => !origin_groups.includes(u)).filter(group => group !== '')
                console.log("🚀 ~ onOk={ ~ add_groups:", origin_groups, delete_groups, add_groups)
                if (delete_groups.length || add_groups.length) {
                    await Promise.all([
                        ...(delete_groups.length ? [access.delete_group_member(current?.name, delete_groups)] : []),
                        ...(add_groups.length ? [access.add_group_member(current?.name, add_groups)] : [])
                    ])
                    model.message.success(t('用户所属组修改成功'))
                }
                edit_close()
                modal.hide()
                set_selected_groups([])
                set_target_groups([])
                set_users_info(await access.get_user_access(users))
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

    )
})