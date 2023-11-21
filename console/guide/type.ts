export enum GuideType { 
    SIMPLE = 'simple',
    ADVANCED = 'advanced'
}


export interface RecommendInfo { 
    hasAdvancedInfo: boolean
    // 筛选列文案
    otherSortKeysTip?: string
    // 分区列文案
    partitionColsTip?: string
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
}

export interface AdvancedInfos { 
    first?: BasicInfoFormValues
    second?: SecondStepInfo
}


export enum ExecuteResult { 
    FAILED,
    SUCCESS
}


export interface IAdvancedCreateDBResp { 
    // 常用筛选列是否通过校验
    isValid: 0 | 1
    // 常用筛选列
    recommendOtherSortKey?: Array<{
        // 列名
        colName: string
        // 唯一值数量
        uniqueValueNum: number
        // 降维桶数
        hashMapNum: number
    }>
    code: string
}
