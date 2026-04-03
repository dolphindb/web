import { useEffect } from 'react'
import dayjs from 'dayjs'
import { Tag, Popover, Descriptions, Card } from 'antd'

import { date_format, map_keys } from 'xshell/utils.browser.js'
import { storage } from 'xshell/storage.js'

import { t } from '@i18n'
import { model, storage_keys, type DdbLicense, LicenseType } from '@model'
import { config } from '@/config/model.ts'



const license_types: Record<DdbLicense['license_type'], string> = {
    [LicenseType.Other]: t('其他方式'),
    [LicenseType.MachineFingerprintBind]: t('机器指纹绑定'),
    [LicenseType.OnlineVerify]: t('在线验证'),
    [LicenseType.LicenseServerVerify]: 'LicenseServer',
}

const authorizations = {
    trial: t('试用版'),
    free: t('社区版'),
    community: t('社区版'),
    commercial: t('商业版'),
    test: t('测试版'),
}

export function License () {
    const { version, version_full, license, admin, shf, logined } = 
        model.use(['version', 'version_full', 'license', 'admin', 'shf', 'logined'])
    
    // 在 admin 状态变化时，弹提示
    useEffect(() => {
        if (
            // 稳定后开发环境可忽略这个提示
            // !model.production ||
            
            !logined ||
            
            expiration_checked ||
            (!admin && config.get_boolean_config('licenseExpirationWarningAdminOnly')) ||
            !license
        )
            return
        
        ;(async () => {
            expiration_checked = true
            
            const { license } = model
            let { modal, ddb } = model
            
            const expiration = dayjs(license.expiration)
            const now = dayjs()
            
            const nowstr = now.format(date_format)
            
            // 今天展示过了
            if (storage.getstr(storage_keys.license_notified) === nowstr) 
                return
            
            function onOk () {
                storage.set(storage_keys.license_notified, nowstr)
            }
            
            const width = 700
            
            if (license.license_type === LicenseType.LicenseServerVerify) {
                const {
                    is_connected: connected,
                    seconds_until_shutdown
                } = map_keys<{
                    is_connected: boolean
                    seconds_until_shutdown: number
                }>(await ddb.invoke('getLicenseServerStatus'))
                
                if (!connected) {
                    modal.error({
                        title: t('License Server 连接断开'),
                        width,
                        onOk,
                        content: t('与 License Server 的连接已断开，剩余可用时间：{{days}} 天 {{hours}} 小时，请尽快恢复连接以避免服务关闭', {
                            days: Math.floor(seconds_until_shutdown / 86400),
                            hours: Math.floor((seconds_until_shutdown % 86400) / 3600)
                        })
                    })
                    
                    return
                }
            }
            
            const title = t('License 过期提醒')
            
            if (now.isAfter(expiration, 'day')) {
                modal.error({
                    title, width, onOk,
                    content: t('License 已过期，请联系管理人员立即更新，避免程序关闭')
                })
                
                return
            }
            
            if (now.add(2, 'week').isAfter(expiration, 'day'))
                modal.warning({
                    title, width, onOk,
                    content: t('License 将在两周内过期，请提醒管理人员及时更新，避免程序过期后自动关闭')
                })
        })()
    }, [admin, logined, license])
    
    if (!license)
        return
    
    const auth = authorizations[license.authorization] || license.authorization
    const license_type = license_types[license.license_type] || license.license_type
    
    return <Popover
        placement='bottomRight'
        zIndex={1060}
        trigger='hover'
        classNames={{ container: 'header-card' }}
        content={
            <Card size='small' variant='borderless' title={`${auth} v${version_full}`}>
                <Descriptions
                    bordered
                    size='small'
                    column={2}
                    items={[
                        { label: t('授权类型'), children: auth },
                        { label: t('授权客户'), children: license.client_name },
                        { label: t('许可类型'), children: license_type },
                        { label: t('过期时间'), children: license.expiration },
                        { label: t('绑定 CPU'), children: String(license.bind_cpu) },
                        { label: t('license 版本'), children: license.version },
                        { label: t('每节点最大可用内存'), children: license.max_memory_per_node },
                        { label: t('每节点最大可用核数'), children: license.max_cores_per_node },
                        { label: t('最大节点数'), children: license.max_nodes, span: 'filled' },
                        { label: t('授权模块'), children: license.modules.join(' '), span: 'filled'  },
                        { label: t('web 版本'), children: WEB_VERSION, span: 'filled' },
                    ]}
                />
            </Card>
        }
    >
        <Tag className='license' color={shf ? 'black' : '#f2f2f2'}>{auth} v{version}</Tag>
    </Popover>
}

let expiration_checked = false
