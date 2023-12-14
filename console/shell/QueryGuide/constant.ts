

export const LIKE = 7
export const NOT_LIKE = 8
export const IN = 9
export const NOT_IN = 10


export const VALUE_OPERATIONS = [
    {
        label: '等于 (=)',
        value: 1
    },
    {
        label: '不等于 (!=)',
        value: 2
    },
    {
        label: '大于 (>)',
        value: 3
    },
    {
        label: '小于 (<)',
        value: 4
    },
    {
        label: '大于等于 (>=)',
        value: 5
    },
    {
        label: '小于等于 (<=)',
        value: 6
    }, 
] 


export const STRING_OPERATIONS = [
    {
        label: '等于 (=)',
        value: 1
    },
    {
        label: '不等于 (!=)',
        value: 2
    },
    {
        label: '匹配 (like) ',
        value: LIKE
    },
    {
        label: '不匹配 (not like)',
        value: NOT_LIKE
    }
]


export const IN_OPERATIONS = [{
        label: '包含 (in)',
        value: IN
    },
    {
        label: '不包含 (not in)',
        value: NOT_IN
    }]



export const VALUE_TYPES = ['INT', 'SHORT', 'DOUBLE', 'FLOAT', 'LONG']




export const GUIDE_FORM_VALUES_KEY = 'guide_form_values'

export const GUIDE_QUERY_EDIT_CODE_KEY = 'guide_query_edit_code'
