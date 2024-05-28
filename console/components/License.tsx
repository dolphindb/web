
import { date2str } from 'dolphindb/browser.js'

import { Tag, Popover, Descriptions, Card } from 'antd'


import { t } from '../../i18n/index.js'

import { model, type DdbLicense, LicenseTypes } from '../model.js'


const licenseTypes: Record<DdbLicense['licenseType'], string> = {
    [LicenseTypes.Other]: t('其他方式'),
    [LicenseTypes.MachineFingerprintBind]: t('机器指纹绑定'),
    [LicenseTypes.OnlineVerify]: t('在线验证'),
    [LicenseTypes.LicenseServerVerify]: 'LicenseServer',
}

const authorizations = {
    trial: t('试用版'),
    free: t('试用版'),
    community: t('社区版'),
    commercial: t('商业版'),
    test: t('测试版'),
}

export function License () {
    const { version, license, license_server } = model.use(['version', 'license', 'license_server'])
    
    if (!license)
        return
    
    const auth = authorizations[license.authorization] || license.authorization
    const license_type = licenseTypes[license.licenseType] || license.licenseType
    const is_license_server_node = license_server?.is_license_server_node
    
    return <Popover
        placement='bottomRight'
        zIndex={1060}
        trigger='hover'
        content={
            <div className='license-card head-bar-info'>
                <Card size='small' bordered={false} title={`${auth} v${version}`}>
                    <Descriptions bordered size='small' column={2}>
                        <Descriptions.Item label={t('授权类型')}>{auth}</Descriptions.Item>
                        <Descriptions.Item label={t('授权客户')}>{license.clientName}</Descriptions.Item>
                        <Descriptions.Item label={t('许可类型')}>{license_type}</Descriptions.Item>
                        {license.licenseType === LicenseTypes.LicenseServerVerify && <Descriptions.Item label={t('是否为 LicenseServer')}>{is_license_server_node ? t('是') : t('否')}</Descriptions.Item>}
                        <Descriptions.Item label={t('过期时间')}>{date2str(license.expiration)}</Descriptions.Item>
                        <Descriptions.Item label={t('绑定 CPU')}>{String(license.bindCPU)}</Descriptions.Item>
                        <Descriptions.Item label={t('license 版本')}>{license.version}</Descriptions.Item>
                        <Descriptions.Item label={t('模块数量')}>{ license.modules === -1n ? '∞' : String(license.modules) }</Descriptions.Item>
                        {
                            is_license_server_node ?
                            <>
                                <Descriptions.Item label={t('所有节点可用内存之和')}>{license_server.resource?.maxMemory}</Descriptions.Item>
                                <Descriptions.Item label={t('所有节点可用核数之和')}>{license_server.resource?.maxCores}</Descriptions.Item>
                            </>
                            : 
                            <>
                                <Descriptions.Item label={t('每节点最大可用内存')}>{license.maxMemoryPerNode}</Descriptions.Item>
                                <Descriptions.Item label={t('每节点最大可用核数')}>{license.maxCoresPerNode}</Descriptions.Item>
                            </>
                        }
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
