# AGENTS.md

## 构建与开发命令

```bash
# 开发服务器 (端口 8432)
node ./commands.ts dev

# 生产构建 (可选 --version=xxx 参数)
node ./commands.ts build --version=1.0.0

# 类型检查
npm run typecheck

# ESLint 检查与自动修复
npm run lint
npm run fix

# i18n 翻译扫描
npm run scan
```

开发服务器快捷键:
- `r`: 重新编译
- `i`: 打印地址信息
- `x`: 退出开发服务器

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

- **DolphinDB 连接**: 通过 `dolphindb/browser.js` 中的 `DDB` 类与后端通信

- **路由**: 使用 `react-router` 的 `createBrowserRouter`

## 代码风格

- **命名**: 变量、函数、方法、成员优先使用下划线命名法 (`snake_case`)
- **字符串**: 优先使用单引号
- **if/else**: 单条语句时不要大括号，但要换行缩进
- **函数声明**: 名称后要有空格，如 `function foo ()`
- **空对象/数组**: 使用 `{ }` 和 `[ ]` (带空格)
- **导入**: 类型导入使用 `import type`

## ESLint 配置

项目使用自定义 ESLint 配置 `xshell/xlint.js`:
```javascript
// eslint.config.js
import { xlint_config } from 'xshell/xlint.js'
export default [xlint_config]
```

## 国际化 (i18n)

- 翻译字典位于 [`i18n/dict.json`](i18n/dict.json)
- 使用 `t('key')` 函数获取翻译
- 运行 `npm run scan` 扫描新翻译 key

## 测试

测试入口 [`test/index.ts`](test/index.ts):
- 在开发模式下点击 Header 的 "自动化测试" 按钮执行
- 通过 `await (await import('@test/index.ts')).test()` 动态导入执行

## 关键依赖

- `react-object-model`: 状态管理
- `dolphindb`: DolphinDB JavaScript API
- `xshell`: 内部工具库 (构建、服务器、工具函数等)
- `antd`: UI 组件库
- `@monaco-editor/react`: 代码编辑器
- `gridstack`: Dashboard 布局