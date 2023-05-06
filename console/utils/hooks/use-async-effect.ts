import { isFunction } from 'lodash'
import { useEffect, type DependencyList } from 'react'

function isAsyncGenerator (
    val: AsyncGenerator<void, void, void> | Promise<void>
): val is AsyncGenerator<void, void, void> {
    return isFunction(val[Symbol.asyncIterator])
}

/**
 * 支持异步函数的 `useEffect`，文档参考：
 * https://ahooks.gitee.io/zh-CN/hooks/use-async-effect
 * @param effect 
 * @param deps 
 */
export function useAsyncEffect (
    effect: () => AsyncGenerator<void, void, void> | Promise<void>,
    deps?: DependencyList
) {
    useEffect(() => {
        const e = effect()
        let cancelled = false
        async function execute () {
            if (isAsyncGenerator(e))
                while (true) {
                    const result = await e.next()
                    if (result.done || cancelled)
                        break
                }
            else
                await e
        }
        execute()
        return () => {
            cancelled = true
        }
    }, deps)
}
