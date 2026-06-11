import { type DdbObj, type DdbValue, DdbForm } from 'dolphindb/browser.js'

import { shell } from '@/shell/model.ts'


const DISPLAYABLE_FORMS: Set<number> = new Set([
    DdbForm.chart, DdbForm.dict, DdbForm.matrix,
    DdbForm.set, DdbForm.table, DdbForm.vector, DdbForm.tensor,
])


/** 将 AI 对话中的 DdbObj 结果输出到 shell 的 DataView */
export function route_ddb_obj_to_dataview (obj: DdbObj<DdbValue>) {
    if (!DISPLAYABLE_FORMS.has(obj.form))
        return
    shell.set({
        result: { type: 'object', data: obj },
    })
}
