import { Tag, Popover, Descriptions, Card } from 'antd'


import { t } from '@i18n/index.js'

import { model, type DdbLicense, LicenseTypes } from '@/model.ts'


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
    const { version, version_full, license } = model.use(['version', 'version_full', 'license'])
    
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
