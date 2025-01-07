import { Modal, Transfer, Tag } from 'antd'
import { useState } from 'react'
import { t } from '@i18n/index.ts'

type TransferItem = {
    key: string
    title: string
}

type TransferModalProps = {
    title: string
    confirmTitle: string
    dataSource: TransferItem[]
    originalKeys: string[]
    titles: [string, string]
    searchPlaceholder: string
    onSave: (deleteItems: string[], addItems: string[]) => Promise<void>
    filterItems?: (items: string[]) => string[]
    visible: boolean
    onCancel: () => void
    onRemove: () => void
}

const ItemTags = ({ items, color }: { items: string[], color: string }) => (
    items.map(item => <Tag color={color} key={item}>{item}</Tag>)
)

export function TransferModal (props: TransferModalProps) {
    const {
        title,
        confirmTitle,
        dataSource,
        originalKeys,
        titles,
        searchPlaceholder,
        onSave,
        filterItems = (items: string[]) => items.filter(Boolean),
        visible,
        onCancel,
        onRemove
    } = props
    
    const [step, setStep] = useState<'edit' | 'preview'>('edit')
    
    const [targetKeys, setTargetKeys] = useState<string[]>(originalKeys)
    const [selectedKeys, setSelectedKeys] = useState<string[]>([ ])
    
    function handleCancel () {
        if (step === 'preview') 
            setStep('edit')
         else 
            onCancel()
        
    }
    
    async function handleSave () {
        const filteredOrigin = filterItems(originalKeys)
        const filteredTarget = filterItems(targetKeys)
        
        const deleteItems = filteredOrigin.filter(u => !filteredTarget.includes(u))
        const addItems = filteredTarget.filter(u => !filteredOrigin.includes(u))
        
        if (deleteItems.length || addItems.length) 
            await onSave(deleteItems, addItems)
        
        
        onRemove()
        setSelectedKeys([ ])
        setTargetKeys([ ])
    }
    
    return <Modal
            className='user-group-modal'
            open={visible}
            onCancel={handleCancel}
            afterClose={onRemove}
            title={step === 'edit' ? title : confirmTitle}
            onOk={step === 'edit' ? () => { setStep('preview') } : handleSave}
            okText={step === 'edit' ? t('预览修改') : t('确认')}
        >
            {step === 'edit' ? (
                <Transfer
                    dataSource={dataSource}
                    titles={titles}
                    showSearch
                    locale={{
                        itemUnit: t('个'),
                        itemsUnit: t('个'),
                        searchPlaceholder
                    }}
                    filterOption={(val, item) => item.title.includes(val)}
                    targetKeys={targetKeys}
                    selectedKeys={selectedKeys}
                    onChange={keys => { setTargetKeys(keys as string[]) }}
                    onSelectChange={(s, t) => { setSelectedKeys([...s, ...t] as string[]) }}
                    render={item => item.title}
                />
            ) : (
                <div>
                    <h4>{t('原有项:')}</h4>
                    <ItemTags items={originalKeys} color='cyan' />
                    
                    <h4>{t('移入项:')}</h4>
                    <ItemTags
                        items={targetKeys.filter(u => !originalKeys.includes(u))}
                        color='green'
                    />
                    
                    <h4>{t('移出项:')}</h4>
                    <ItemTags
                        items={originalKeys.filter(u => !targetKeys.includes(u))}
                        color='red'
                    />
                </div>
            )}
        </Modal>
}
