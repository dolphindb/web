import { ProConfigProvider, EditableProTable } from '@ant-design/pro-components'
import * as ReactRouter from 'react-router'
import * as xyflow from '@xyflow/react'
import { WebglAddon } from '@xterm/addon-webgl'

globalThis.AntdPro = { ProConfigProvider, EditableProTable }
globalThis.ReactRouter = ReactRouter
globalThis.xyflow = xyflow
globalThis.XtermWebgl = { WebglAddon }
