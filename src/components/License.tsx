import { Tag, Popover, Descriptions, Card } from 'antd'

import { t } from '@i18n/index.js'

import dayjs from 'dayjs'

import { date_format } from 'xshell/utils.browser.js'

import { useEffect } from 'react'

import { config } from '@/config/model.ts'

import { model, storage_keys, type DdbLicense, LicenseTypes } from '@/model.ts'



const license_types: Record<DdbLicense['licenseType'], string> = {
    [LicenseTypes.Other]: t('其他方式'),
    [LicenseTypes.MachineFingerprintBind]: t('机器指纹绑定'),
    [LicenseTypes.OnlineVerify]: t('在线验证'),
    [LicenseTypes.LicenseServerVerify]: 'LicenseServer',
}

const authorizations = {
    trial: t('试用版'),
    free: t('社区版'),
    community: t('社区版'),
    commercial: t('商业版'),
    test: t('测试版'),
}

export function License () {
    const { version, version_full, license, admin } = model.use(['version', 'version_full', 'license', 'admin'])
    
    // 在 admin 状态变化时，弹提示
    useEffect(() => {
        if (
            model.production && 
            !expiration_checked && 
            (admin || !config.get_boolean_config('licenseExpirationWarningAdminOnly')) && 
            license
        ) {
            expiration_checked = true
            
            const { license } = model
            
            // license.expiration 是以 date 为单位的数字
            const expiration_date = dayjs(license.expiration)
            const now = dayjs()
            const after_two_week = now.add(2, 'week')
            const is_license_expired = now.isAfter(expiration_date, 'day')
            const is_license_expire_soon = after_two_week.isAfter(expiration_date, 'day')
            
            // 今天展示过了
            if (localStorage.getItem(storage_keys.license_notified_date) !== now.format(date_format)) {
                if (is_license_expired)
                    model.modal.error({
                        title: t('License 过期提醒'),
                        content: t('DolphinDB License 已过期，请联系管理人员立即更新，避免数据库关闭'),
                        width: 600,
                        onOk: () => { localStorage.setItem(storage_keys.license_notified_date, now.format(date_format)) },
                    })
                else if (is_license_expire_soon)
                    model.modal.warning({
                        title: t('License 过期提醒'),
                        content: t('DolphinDB License 将在两周内过期，请提醒管理人员及时更新，避免数据库过期后自动关闭'),
                        width: 700,
                        onOk: () => { localStorage.setItem(storage_keys.license_notified_date, now.format(date_format)) },
                    })
            }
        }
    }, [admin, license])
    
    if (!license)
        return
    
    const auth = authorizations[license.authorization] || license.authorization
    const license_type = license_types[license.licenseType] || license.licenseType
    
    return <Popover
        placement='bottomRight'
        zIndex={1060}
        trigger='hover'
        content={
            <div className='license-card head-bar-info'>
                <Card size='small' bordered={false} title={`${auth} v${version_full}`}>
                    <Descriptions bordered size='small' column={2}>
                        <Descriptions.Item label={t('授权类型')}>{auth}</Descriptions.Item>
                        <Descriptions.Item label={t('授权客户')}>{license.clientName}</Descriptions.Item>
                        <Descriptions.Item label={t('许可类型')}>{license_type}</Descriptions.Item>
                        <Descriptions.Item label={t('过期时间')}>{license.expiration}</Descriptions.Item>
                        <Descriptions.Item label={t('绑定 CPU')}>{String(license.bindCPU)}</Descriptions.Item>
                        <Descriptions.Item label={t('license 版本')}>{license.version}</Descriptions.Item>
                        <Descriptions.Item label={t('模块数量')}>{ license.modules === -1n ? '∞' : String(license.modules) }</Descriptions.Item>
                        <Descriptions.Item label={t('每节点最大可用内存')}>{license.maxMemoryPerNode}</Descriptions.Item>
                        <Descriptions.Item label={t('每节点最大可用核数')}>{license.maxCoresPerNode}</Descriptions.Item>
                        <Descriptions.Item label={t('最大节点数')}>{license.maxNodes}</Descriptions.Item>
                        <Descriptions.Item label={t('web 版本')}>{WEB_VERSION}</Descriptions.Item>
                    </Descriptions>
                </Card>
            </div>
        }
    >
        <Tag className='license' color='#f2f2f2'>{auth} v{version}</Tag>
    </Popover>
}

let expiration_checked = false
