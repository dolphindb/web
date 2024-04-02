export interface Module {
    label: string
    description: string
    load_prompt: string
    unload_prompt: string
    load_function: () => void
    unload_function: () => void
}

export const module_infos = new Map<string, Module>([
    ['finance-tools', {
        label: '金融建库建表工具',
        description: '金融建库建表工具描述',
        load_prompt: '金融建库建表工具加载提示',
        unload_prompt: '金融建库建表工具卸载提示',
        load_function: () => { console.log('金融建库建表工具加载成功') },
        unload_function: () => { console.log('金融建库建表工具卸载成功') }
    }],
    ['iot-tools', {
        label: '物联网建库建表工具',
        description: '金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述',
        load_prompt: '物联网建库建表工具安装提示',
        unload_prompt: '物联网建库建表工具卸载提示',
        load_function: () => { console.log('物联网建库建表工具加载成功') },
        unload_function: () => { console.log('物联网建库建表工具卸载成功') }
    }],
])
