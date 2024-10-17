import { t } from '@i18n/index.ts'

export const inspectionFrequencyOptions = [
    {
        label: '每日',
        value: 'D',
    },
    {
        label: '每周',
        value: 'W',
    },
    {
        label: '每月',
        value: 'M',
    },
]

export const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export const reportLables = {
    user: t('提交人'),
    startTime: t('开始时间'),
    endTime: t('结束时间'),
    runningTime: t('运行时间'),
    desc: t('巡检描述'),
}

export const metricGroups = [t('集群基础信息'), t('集群运行状态'), t('服务器运行状态')]
