import { Modal, Transfer, Tag } from 'antd'
import { useState } from 'react'

import { t } from '@i18n'

type TransferItem = {
    key: string
    title: string
}

type TransferModalProps = {
    title: string
    confirm_title: string
    data_source: TransferItem[]
    original_keys: string[]
    titles: [string, string]
    search_placeholder: string
    on_save: (delete_items: string[], add_items: string[]) => Promise<void>
    filter_items?: (items: string[]) => string[]
    visible: boolean
    on_cancel: () => void
    on_remove: () => void
}

const ItemTags = ({ items, color }: { items: string[], color: string }) => (
    items.map(item => <Tag color={color} key={item}>{item}</Tag>)
)

export function TransferModal ({
    title,
    confirm_title: confirmTitle,
    data_source,
    original_keys,
    titles,
    search_placeholder,
    on_save,
    filter_items = (items: string[]) => items.filter(Boolean),
    visible,
    on_cancel,
    on_remove
}: TransferModalProps) {
    const [step, set_step] = useState<'edit' | 'preview'>('edit')
    
    const [target_keys, set_target_keys] = useState<string[]>(original_keys)
    const [selected_keys, set_selected_keys] = useState<string[]>([ ])
    
    function cancel () {
        if (step === 'preview') 
            set_step('edit')
         else 
            on_cancel()
        
    }
    
    async function save () {
        const filtered_origin = filter_items(original_keys)
        const filtered_target = filter_items(target_keys)
        
        const delete_items = filtered_origin.filter(u => !filtered_target.includes(u))
        const add_items = filtered_target.filter(u => !filtered_origin.includes(u))
        
        if (delete_items.length || add_items.length) 
            await on_save(delete_items, add_items)
        
        
        on_remove()
        set_selected_keys([ ])
        set_target_keys([ ])
    }
    
    return <Modal
            className='user-group-modal'
            open={visible}
            onCancel={cancel}
            afterClose={on_remove}
            title={step === 'edit' ? title : confirmTitle}
            onOk={step === 'edit' ? () => { set_step('preview') } : save}
            okText={step === 'edit' ? t('预览修改') : t('确认')}
            width={1000}
        >
            {step === 'edit' ? (
                <Transfer
                    dataSource={data_source}
                    titles={titles}
                    showSearch
                    locale={{
                        itemUnit: t('个'),
                        itemsUnit: t('个'),
                        searchPlaceholder: search_placeholder
                    }}
                    filterOption={(val, item) => item.title.includes(val)}
                    targetKeys={target_keys}
                    selectedKeys={selected_keys}
                    onChange={keys => { set_target_keys(keys as string[]) }}
                    onSelectChange={(s, t) => { set_selected_keys([...s, ...t] as string[]) }}
                    render={item => item.title}
                />
            ) : (
                <div>
                    <h4>{t('原有项:')}</h4>
                    <ItemTags items={original_keys} color='cyan' />
                    
                    <h4>{t('移入项:')}</h4>
                    <ItemTags
                        items={target_keys.filter(u => !original_keys.includes(u))}
                        color='green'
                    />
                    
                    <h4>{t('移出项:')}</h4>
                    <ItemTags
                        items={original_keys.filter(u => !target_keys.includes(u))}
                        color='red'
                    />
                </div>
            )}
        </Modal>
}
