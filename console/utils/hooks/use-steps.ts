import { useState } from 'react'

export function useSteps <StepsEnum extends string> (
    initial_step: StepsEnum,
    steps: StepsEnum[]
) {
    const [current, set_current] = useState<StepsEnum>(initial_step)

    const [context_map, set_context_map] = useState<
        Partial<Record<StepsEnum, any>>
    >({ })

    const prev = () => {
        const current_index = steps.indexOf(current)
        if (current_index <= 0)
            return

        const step = steps[current_index - 1]
        set_context_map({
            ...context_map,
            // delete current step context value
            [current]: undefined,
        })
        set_current(step)
    }

    const next = (context_value: any) => {
        const currentIndex = steps.indexOf(current)
        if (currentIndex >= steps.length - 1)
            return

        set_context_map({
            ...context_map,
            [current]: context_value,
        })
        set_current(steps[currentIndex + 1])
    }

    const reset = () => {
        set_current(initial_step)
        set_context_map({ })
    }

    return {
        current,
        context_map,
        prev,
        next,
        reset,
    }
}
