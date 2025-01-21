import { theme, type ThemeConfig } from 'antd'

export const ANT_DARK_CONFIG = {
    hashed: false,
    token: {
        borderRadius: 0,
        motion: false,
        colorBgContainer: 'rgb(40, 40, 40)',
        colorBgElevated: '#555555',
        colorInfoActive: 'rgb(64, 147, 211)',
        colorBgLayout: '#313131',
    },
    algorithm: theme.darkAlgorithm,
    components: {
        Table: {
            headerBg: '#313131',
            rowSelectedBg: undefined,
            headerColor: '#fff',
            colorText: '#fff',
            cellPaddingBlock: 10
        }
    }
} as ThemeConfig


const LIGHT_PRIMARY_COLOR = '#6774BD'


export const ANT_LIGHT_CONFIG = {
    hashed: false,
    cssVar: true,
    token: {
        motion: false,
        borderRadius: 2,
        controlOutlineWidth: 0,
        colorPrimary: LIGHT_PRIMARY_COLOR,
        colorError: '#FF4D4F',
        colorLink: LIGHT_PRIMARY_COLOR,
        colorInfo: LIGHT_PRIMARY_COLOR,
        colorBgLayout: '#F9F9FB',
    },
    components: {
        Table: {
            headerBg: '#F9F9FB',
            rowSelectedBg: '#EBF0FA',
            headerColor: '#666E7D',
            colorText: 'rgba(0,0,0,0.85)',
            cellPaddingBlock: 10
        },
    }
} as ThemeConfig
