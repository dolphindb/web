export enum GuideType { 
    SIMPLE = 'simple',
    ADVANCED = 'advanced'
}


export interface RecommendInfo { 
    otherSortKeys: {
        show: boolean
        max?: number
    }
    // 高阶特有，分区列
    partitionCols?: {
        num: number
        cols: string[]
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

export enum CommonQueryDuration {
    HOUR = 'hour',
    DAILY = 'daily',
    MONTH = 'month'
}

export enum KeepDuplicates {
    ALL,
    FIRST,
    LAST
}
export interface SecondStepInfo { 
    // 分区列
    partitionColumn: string[]
    actomic: 0 | 1
    KeepDuplicates
    // 常用筛选列
    otherSortKeys: Array<{
        // 列名
        colName: string
        // 降维桶数，可能有
        hashMapNum: number
    }>
    // 常用查询时间跨度
    commQueryDuration: CommonQueryDuration
    keepDuplicates: KeepDuplicates
}


export interface SimpleSecondStepInfo { 
    partitionColumn: string[]
}


export interface SimpleInfos { 
    first?: BasicInfoFormValues
    second?: SimpleSecondStepInfo
}

export interface AdvancedInfos { 
    first?: BasicInfoFormValues
    second?: SecondStepInfo
}
