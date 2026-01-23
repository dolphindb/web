import { t } from '@i18n'

export const InspectionFrequencyOptions = [
    {
        label: t('每日'),
        value: 'D',
    },
    {
        label: t('每周'),
        value: 'W',
    },
    {
        label: t('每月'),
        value: 'M',
    },
]

export const WeekDays = [t('周日'), t('周一'), t('周二'), t('周三'), t('周四'), t('周五'), t('周六')]

export const ReportLables = {
    user: t('提交人'),
    startTime: t('开始时间'),
    endTime: t('结束时间'),
    runningTime: t('运行时间'),
    desc: t('巡检描述'),
}

export const MetricGroups = [t('集群基础信息'), t('集群运行状态'), t('服务器运行状态')]

export const EmailConfigMessages = [t('正常'), t('存在未安装 httpClient 插件的节点。'), t('httpClient 插件版本与 server 版本的前3位不一致。')]
