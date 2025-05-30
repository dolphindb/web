import { theme, type ThemeConfig } from 'antd'


const light_primary_color = '#6774bd' as const

const common_config: ThemeConfig = {
    hashed: false,
    cssVar: true
}

const common_tokens: ThemeConfig['token'] = {
    motion: false,
    borderRadius: 0,
    controlOutlineWidth: 0,
}


export const light: ThemeConfig = {
    ...common_config,
    token: {
        ...common_tokens,
        colorPrimary: light_primary_color,
        colorError: '#ff4d4f',
        colorLink: light_primary_color,
        colorInfo: light_primary_color,
        colorBgLayout: '#f9f9fb',
    },
    components: {
        Table: {
            headerBg: '#f9f9fb',
            rowSelectedBg: '#ebf0fa',
            headerColor: '#666e7d',
            colorText: '#000000',
            cellPaddingBlock: 10
        },
    }
}


export const dark: ThemeConfig = {
    ...common_config,
    token: {
        ...common_tokens,
        colorBgContainer: '#282828',
        colorBgElevated: '#555555',
        colorInfoActive: '#4093d3',
        colorBgLayout: '#313131',
        colorPrimary: '#1668dc'
    },
    algorithm: theme.darkAlgorithm,
    components: {
        Table: {
            headerBg: '#313131',
            headerColor: '#ffffff',
            colorText: '#ffffff',
            cellPaddingBlock: 10
        }
    }
}
