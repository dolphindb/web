import { shell } from '@/shell/model.ts'
import { model } from '@model'

export async function test () {
    console.log('--- 测试开始 ---')
    
    for (const t of
        repl ? 
            [test_repl]
        :
            [
                test_execute
            ]
    )
        await t()
    
    console.log('--- 测试通过 ---')
    
    model.modal.success({ title: '测试通过' })
}


// --- 用于临时调试验证
const repl = false
async function test_repl () {
    
}


async function test_execute () {
    await shell.pterm
    await shell.execute_code('defs()', 0)
}
