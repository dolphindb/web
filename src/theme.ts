import { theme, type ThemeConfig } from 'antd'


export const light_primary_color = '#6774bd' as const

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
        colorTextDisabled: '#000000a0',
        colorTextPlaceholder: '#00000070'
    },
    components: {
        Table: {
            headerBg: '#f9f9fb',
            rowSelectedBg: '#ebf0fa',
            headerColor: '#666e7d',
            colorText: '#000000',
            cellPaddingBlock: 10,
            
            bodySortBg: 'unset',
            headerSortActiveBg: '#f9f9fb',
        },
        Segmented: {
            // itemSelectedBg: light_primary_color,
            itemSelectedColor: light_primary_color,
            // trackBg: '#f9f9fb',
            trackPadding: 4
        }
    }
}


export const dark_primary_color = '#1668dc'


export const dark: ThemeConfig = {
    ...common_config,
    token: {
        ...common_tokens,
        colorPrimary: dark_primary_color,
        colorBgContainer: '#282828',
        colorBgElevated: '#555555',
        colorInfoActive: '#4093d3',
        colorBgLayout: '#313131',
        colorTextDisabled: '#ffffff60',
        colorTextPlaceholder: '#00000070'
    },
    algorithm: theme.darkAlgorithm,
    components: {
        Table: {
            headerBg: '#313131',
            headerColor: '#ffffff',
            colorText: '#ffffff',
            cellPaddingBlock: 10
        },
        Segmented: {
            itemSelectedColor: dark_primary_color,
            itemSelectedBg: '#282828',
            trackPadding: 4
        }
    }
}
