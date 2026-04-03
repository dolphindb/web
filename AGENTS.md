# AGENTS.md

## 路径别名 (tsconfig.json)

```typescript
import { t, language } from '@i18n'           // ./i18n/index.ts
import { model } from '@model'                // ./src/model.ts
import { strip_quotes } from '@utils'         // ./src/utils.ts
import { light } from '@theme'                // ./src/theme.ts
import { Editor } from '@components/Editor'   // ./src/components/Editor
import { shell } from '@/shell/model'        // ./src/shell/model.ts
```

## 核心架构

- **全局状态管理**: 使用 `react-object-model` 库的 `Model` 类
  - [`src/model.ts`](src/model.ts) - 核心模型 `DdbModel`，管理登录状态、DolphinDB 连接、用户配置等
  - 各模块有自己的 model (如 `src/shell/model.ts`, `src/dashboard/model.ts`)

- **状态订阅**: 组件通过 `model.use([...])` 订阅状态变化
  ```typescript
  const { logined, username } = model.use(['logined', 'username'])
  ```

- **DolphinDB 连接**: 通过 `dolphindb/browser.js` 中的 `DDB` 类与后端通信，用 model.ddb 可以拿到连接实例，用 .invoke 可以调用 server 侧函数

- **路由**: 使用 `react-router` 的 `createBrowserRouter`

## 代码风格规范、惯用写法

命名: 变量、函数、方法、成员优先使用下划线命名法 (`snake_case`)
字符串: 优先使用单引号
if/else: 单条语句时不要大括号，但要换行缩进
函数声明: 名称后要有空格，如 `function foo ()`
空对象/数组: 使用 `{ }` 和 `[ ]` (带空格)
导入: 类型导入使用 `import type`

Modal visible 状态用 react-object-model/hooks.js 中的 use_modal 方法，let modal = use_modal()，然后下面再 `<Modal open={modal.visible}> ...`

onClick, onOk 等回调，直接在后面用 onClick={async () => { ... }} 这样 inline 的函数，不要单独声明 handle_click 函数

ddb.invoke 的返回值，通常需要 map_keys<{ 返回类型 }>(返回值) 将 keys 转为 snake_case 后使用


## 国际化 (i18n)
- 使用 `t('中文完整文本')` 标记词条，如有需要，使用 {{}} 包裹变量

## 关键依赖

- `dolphindb`: DolphinDB JavaScript API
- `xshell`: 内部工具库 (构建、服务器、工具函数等)
