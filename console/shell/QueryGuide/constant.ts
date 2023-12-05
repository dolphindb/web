import { type DatePicker } from 'antd'
import { StringDatePicker } from '../../components/StringDatePicker/index.js'

export const VALUE_OPERATIONS = [
    {
        label: '等于（=）',
        value: 1
    },
    {
        label: '不等于(!=)',
        value: 2
    },
    {
        label: '大于(>)',
        value: 3
    },
    {
        label: '小于(<)',
        value: 4
    },
    {
        label: '大于等于(>=)',
        value: 5
    },
    {
        label: '小于等于(<=)',
        value: 6
    }, 
] 


export const STRING_OPERATIONS = [
    {
        label: '等于（=）',
        value: 1
    },
    {
        label: '不等于(!=)',
        value: 2
    },
    {
        label: '匹配(like) ',
        value: 7
    },
    {
        label: '不匹配(not like)',
        value: 8
    },
    {
        label: '包含(in)',
        value: 9
    },
    {
        label: '不包含(not in)',
        value: 10
    }
]


export const VALUE_TYPES = ['INT', 'SHORT', 'DOUBLE', 'FLOAT', 'LONG']


