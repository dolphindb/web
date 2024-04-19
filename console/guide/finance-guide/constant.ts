import { t } from '../../../i18n/index.js'

export const CUSTOM = -1

export const DAILY_INCREASE_DATA_OPTIONS = [
    {
        label: t('0 - 1 万'),
        value: 0
    },
    {
        label: t('1 万 - 10 万'),
        value: 1
    },
    {
        label: t('10 万 - 100 万'),
        value: 2
    },
    {
        label: t('100 万 - 1000 万'),
        value: 3
    },
    {
        label: t('1000 万 - 1 亿'),
        value: 4
    },
    {
        label: t('1 亿 - 10 亿'),
        value: 5
    },
    {
        label: t('10 亿 - 100 亿'),
        value: 6
    },
    {
        label: t('100 亿以上'),
        value: 7
    },
    {
        label: t('总数据量小于 200 万且不新增'),
        value: 8
    },
    {
        label: t('自定义'),
        value: CUSTOM
    },
]
