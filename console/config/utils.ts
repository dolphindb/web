export type Config = {
    id: string
    name: string
    value: string
}


export const strs_2_configs  = (strs: string[]): Config[] =>
    strs.map(str => {
        const [name, value] = str.split('=')
        return {
            id: str,
            name,
            value
        }
    })



export const configs_2_strs  = (configs: Config[]): string[] =>
    configs.map(cfg => cfg.id)
