interface Metric {
    name: string
    group: number
    desc: string
    version: string
    createTime: string
    updateTime: string
    nodes: string
}

interface MetricsWithNodes {
    name: string
    checked: boolean
    nodes: string[]
}
