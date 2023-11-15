export enum GuideType { 
    SIMPLE = 'simple',
    ADVANCED = 'advanced'
}


export interface SecondStepInfo { 
    otherSortKeys: {
        show: boolean
        max?: number
    }
}


export interface BasicInfoFormValues { 
    dbName: string
    tbName: string
    isFreqIncrease: 0 | 1
    dailyTotalNum?: {
        gap?: number
        custom?: number
    }
    totalNum?: {
        gap?: number
        custom?: number
    }
    
    pointNum?: number
    schema: Array<{
        colName: string
        dataType: string
    }>
}
