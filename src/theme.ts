import { theme, type ThemeConfig } from 'antd'

export const dark: ThemeConfig = {
    hashed: false,
    cssVar: true,
    token: {
        motion: false,
        borderRadius: 0,
        controlOutlineWidth: 0,
        colorBgContainer: 'rgb(40, 40, 40)',
        colorBgElevated: '#555555',
        colorInfoActive: 'rgb(64, 147, 211)',
        colorBgLayout: '#313131',
        colorPrimary: 'rgb(22, 104, 220)'
    },
    algorithm: theme.darkAlgorithm,
    components: {
        Table: {
            headerBg: '#313131',
            headerColor: '#fff',
            colorText: '#fff',
            cellPaddingBlock: 10
        }
    }
}


const light_primary_color = '#6774bd' as const

export const light: ThemeConfig = {
    hashed: false,
    cssVar: true,
    token: {
        motion: false,
        borderRadius: 0,
        controlOutlineWidth: 0,
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
