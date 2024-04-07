export interface Module {
    label: string
    description: string
    activate_prompt: string
    deactivate_prompt: string
    activate_function: Function
    deactivate_function: Function
}

export const module_infos = new Map<string, Module>([
    ['finance-tools', {
        label: '金融建库建表工具',
        description: '金融建库建表工具描述',
        activate_prompt: '金融建库建表工具加载提示',
        deactivate_prompt: '金融建库建表工具卸载提示',
        activate_function: () => { console.log('金融建库建表工具加载成功') },
        deactivate_function: () => { console.log('金融建库建表工具卸载成功') }
    }],
    ['iot-tools', {
        label: '物联网建库建表工具',
        description: '金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述',
        activate_prompt: '物联网建库建表工具安装提示',
        deactivate_prompt: '物联网建库建表工具卸载提示',
        activate_function: () => { console.log('物联网建库建表工具加载成功') },
        deactivate_function: () => { console.log('物联网建库建表工具卸载成功') }
    }],
    ['test', {
        label: '测试模块',
        description: '测试模块描述测试模块描述测试模块描述测试模块描述测试模块描述测试模块描述测试模块描述测试模块描述测试模块描述测试模块描述测试模块描述',
        activate_prompt: '测试模块安装提示',
        deactivate_prompt: '测试模块卸载提示',
        activate_function: async () => { 
            await new Promise((resolve, reject) => {
                console.log('异步加载函数测试')
                resolve(1)
            })
            console.log('测试模块加载成功') 
        },
        deactivate_function: () => { console.log('测试模块卸载成功') }
    }],
])
