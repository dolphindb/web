import { Form, Popconfirm } from 'antd'

/** 此文件可以为 antd 组件设置一些默认 props */
(Form as React.ComponentType<React.ComponentProps<typeof Form>>).defaultProps = {
    labelAlign: 'left',
}
  
Popconfirm.defaultProps = {
    cancelButtonProps: {
        variant: 'filled',
        color: 'default'
    }
}

