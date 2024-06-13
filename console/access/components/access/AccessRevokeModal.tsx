import NiceModal, { useModal } from "@ebay/nice-modal-react";
import { Modal, Tooltip } from "antd";
import { access } from "../../model.js";
import { model } from "../../../model.js";
import { ACCESS } from "./AccessAddModal.js";
import { t } from "../../../../i18n/index.js";

export const AccessRevokeModal = NiceModal.create(({ category, selected_access, reset_selected }: { category: 'database' | 'shared' | 'stream' | 'function_view' | 'script'; selected_access: ACCESS[]; reset_selected: () => void }) => {

    const { databases, shared_tables, stream_tables, function_views, current } = access.use([
        'databases',
        'shared_tables',
        'stream_tables',
        'function_views',
        'current',
        'accesses'
    ])

    let obj_options = []
    switch (category) {
        case 'database':
            obj_options = databases.map(db => db.name)
            break
        case 'shared':
            obj_options = shared_tables
            break
        case 'stream':
            obj_options = stream_tables
            break
        case 'function_view':
            obj_options = function_views
            break
        default:
            break
    }
    const modal = useModal()

    return (
        <Modal
            className='delete-user-modal'
            open={modal.visible}
            onCancel={modal.hide}
            afterClose={modal.remove}
            onOk={async () => {
                await Promise.all(
                    selected_access.map(async ac =>
                        category === 'script' ? access.revoke(current.name, ac.access) : access.revoke(current.name, ac.access, ac.name)
                    )
                )

                model.message.success(t('撤销成功'))
                reset_selected()
                modal.hide()
                access.set({
                    accesses:
                        current.role === 'user'
                            ? (await access.get_user_access([current.name]))[0]
                            : (await access.get_group_access([current.name]))[0]
                })
            }}
            title={<Tooltip>{t('确认撤销选中的 {{num}} 条权限吗？', { num: selected_access.length })}</Tooltip>}
        />
    )
})