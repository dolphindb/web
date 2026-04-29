# DolphinDB Agent Runtime API Reference

![](https://dolphindb1.atlassian.net/wiki/aa-avatar/712020:3118b1f8-1171-4d34-ab7d-02d9ffc4b74b)

作者：qiwei zhu

27

添加反应

注意：所有接口尚处于试用、联调过程中，可能随着用户的反馈会有变动

这是Agent 框架对外提供的全部接口的说明文档。​**注意，Agent框架不是一个Agent，它只提供了构建一个Agent所必须的组件服务**​。

Base URL: `/agent-bus/v1/`

传输协议: HTTP (JSON / SSE) 、WebSocket。**注意：如果你要自己开发一个demo，访问dolphinX的各种API接口前，需要认证。具体做法是：先用dolphindb的用户名和密码登录，然后拿到token，随后每次访问API接口都要先带上token（详见demo）**

## Quick Start

1. 先启动一个带有 Agent框架功能的 DolphinDB Server作为后端。Agent框架功能在release300.agentRuntime分支，可以自己编译一个（​**版本越新越好，因为随时有修复、更新**​）。
2. 下载并运行一个demo作为应用端。需要配置：dolphindb ip、端口、用户名密码等，相关逻辑都在demo代码里（还有大模型配置等等，代码里都有）。
3. 也可以把本文档API丢给AI，让其基于本文档写一个demo。

### demo1

本demo用到了最常用的一些API接口，实现了一个聊天agent。

本demo重点演示了如何利用Agent框架提供的的http、websocket接口，框架里各种配置服务如何使用。详见代码和ReadMe文件。

demo.zip

10 4 2026, 04:50 下午

### demo2

本demo实现了一个可以用自然语言查询dolphindb数据库、分析数据、有长期记忆功能的agent。

本demo的重点是展示如何利用Agent框架提供的 skill、记忆、会话服务，结合react模式实现更多自由度的agent。（关于记忆的加载，当前demo只使用了文本检索。如需语义检索，则需要在注册agent的时候配置一下embedding服务）

demo2.zip

10 4 2026, 04:50 下午

## 目录

* [Quick Start](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#Quick-Start)
  * [demo1](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#demo1)
  * [demo2](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#demo2)
* [目录](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E7%9B%AE%E5%BD%95)
* [通用约定](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#1.-%E9%80%9A%E7%94%A8%E7%BA%A6%E5%AE%9A)
  * [请求格式](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E8%AF%B7%E6%B1%82%E6%A0%BC%E5%BC%8F)
  * [响应格式](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E5%93%8D%E5%BA%94%E6%A0%BC%E5%BC%8F)
  * [分页参数](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E5%88%86%E9%A1%B5%E5%8F%82%E6%95%B0)
  * [流式响应 (SSE)](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E6%B5%81%E5%BC%8F%E5%93%8D%E5%BA%94-(SSE))
* [Agent 管理](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#2.-Agent-%E7%AE%A1%E7%90%86)
  * [2.1 注册 Agent](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#2.1-%E6%B3%A8%E5%86%8C-Agent)
  * [2.2 获取 Agent](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#2.2-%E8%8E%B7%E5%8F%96-Agent)
  * [2.3 更新 Agent](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#2.3-%E6%9B%B4%E6%96%B0-Agent)
  * [2.4 激活 Agent](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#2.4-%E6%BF%80%E6%B4%BB-Agent)
  * [2.5 挂起 Agent](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#2.5-%E6%8C%82%E8%B5%B7-Agent)
  * [2.6 删除 Agent](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#2.6-%E5%88%A0%E9%99%A4-Agent)
  * [2.7 列出 Agent](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#2.7-%E5%88%97%E5%87%BA-Agent)
  * [2.8 列出当前用户可访问的 Agent](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#2.8-%E5%88%97%E5%87%BA%E5%BD%93%E5%89%8D%E7%94%A8%E6%88%B7%E5%8F%AF%E8%AE%BF%E9%97%AE%E7%9A%84-Agent)
  * [2.9 授予 Agent 权限](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#2.9-%E6%8E%88%E4%BA%88-Agent-%E6%9D%83%E9%99%90)
  * [2.10 撤销 Agent 权限](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#2.10-%E6%92%A4%E9%94%80-Agent-%E6%9D%83%E9%99%90)
  * [2.11 列出 Agent 授权](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#2.11-%E5%88%97%E5%87%BA-Agent-%E6%8E%88%E6%9D%83)
* [全局访问控制](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#3.-%E5%85%A8%E5%B1%80%E8%AE%BF%E9%97%AE%E6%8E%A7%E5%88%B6)
  * [3.1 授予全局 AGENT\_ADMIN](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#3.1-%E6%8E%88%E4%BA%88%E5%85%A8%E5%B1%80-AGENT_ADMIN)
  * [3.2 撤销全局 AGENT\_ADMIN](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#3.2-%E6%92%A4%E9%94%80%E5%85%A8%E5%B1%80-AGENT_ADMIN)
  * [3.3 列出全局 AGENT\_ADMIN](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#3.3-%E5%88%97%E5%87%BA%E5%85%A8%E5%B1%80-AGENT_ADMIN)
* [用户 LLM 访问控制](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#4.-%E7%94%A8%E6%88%B7-LLM-%E8%AE%BF%E9%97%AE%E6%8E%A7%E5%88%B6)
  * [4.1 授予用户全局 LLM 访问权限](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#4.1-%E6%8E%88%E4%BA%88%E7%94%A8%E6%88%B7%E5%85%A8%E5%B1%80-LLM-%E8%AE%BF%E9%97%AE%E6%9D%83%E9%99%90)
  * [4.2 撤销用户全局 LLM 访问权限](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#4.2-%E6%92%A4%E9%94%80%E7%94%A8%E6%88%B7%E5%85%A8%E5%B1%80-LLM-%E8%AE%BF%E9%97%AE%E6%9D%83%E9%99%90)
  * [4.3 列出用户全局 LLM 访问权限](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#4.3-%E5%88%97%E5%87%BA%E7%94%A8%E6%88%B7%E5%85%A8%E5%B1%80-LLM-%E8%AE%BF%E9%97%AE%E6%9D%83%E9%99%90)
* [LLM Provider 与配置管理](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#5.-LLM-Provider-%E4%B8%8E%E9%85%8D%E7%BD%AE%E7%AE%A1%E7%90%86)
  * [5.1 注册 LLM Provider](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#5.1-%E6%B3%A8%E5%86%8C-LLM-Provider)
  * [5.2 获取 LLM Provider](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#5.2-%E8%8E%B7%E5%8F%96-LLM-Provider)
  * [5.3 列出 LLM Provider](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#5.3-%E5%88%97%E5%87%BA-LLM-Provider)
  * [5.4 更新 LLM Provider](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#5.4-%E6%9B%B4%E6%96%B0-LLM-Provider)
  * [5.5 禁用 LLM Provider](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#5.5-%E7%A6%81%E7%94%A8-LLM-Provider)
  * [5.6 删除 LLM Provider](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#5.6-%E5%88%A0%E9%99%A4-LLM-Provider)
  * [5.7 注册 LLM 配置](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#5.7-%E6%B3%A8%E5%86%8C-LLM-%E9%85%8D%E7%BD%AE)
  * [5.8 获取 LLM 配置](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#5.8-%E8%8E%B7%E5%8F%96-LLM-%E9%85%8D%E7%BD%AE)
  * [5.9 列出 LLM 配置](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#5.9-%E5%88%97%E5%87%BA-LLM-%E9%85%8D%E7%BD%AE)
  * [5.10 更新 LLM 配置](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#5.10-%E6%9B%B4%E6%96%B0-LLM-%E9%85%8D%E7%BD%AE)
  * [5.11 禁用 LLM 配置](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#5.11-%E7%A6%81%E7%94%A8-LLM-%E9%85%8D%E7%BD%AE)
  * [5.12 删除 LLM 配置](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#5.12-%E5%88%A0%E9%99%A4-LLM-%E9%85%8D%E7%BD%AE)
* [Agent-LLM 绑定](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#6.-Agent-LLM-%E7%BB%91%E5%AE%9A)
  * [6.1 绑定 LLM 到 Agent](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#6.1-%E7%BB%91%E5%AE%9A-LLM-%E5%88%B0-Agent)
  * [6.2 解绑 LLM](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#6.2-%E8%A7%A3%E7%BB%91-LLM)
  * [6.3 列出 Agent 的 LLM 配置](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#6.3-%E5%88%97%E5%87%BA-Agent-%E7%9A%84-LLM-%E9%85%8D%E7%BD%AE)
  * [6.4 列出当前用户在指定 Agent 下可显式选择的 LLM](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#6.4-%E5%88%97%E5%87%BA%E5%BD%93%E5%89%8D%E7%94%A8%E6%88%B7%E5%9C%A8%E6%8C%87%E5%AE%9A-Agent-%E4%B8%8B%E5%8F%AF%E6%98%BE%E5%BC%8F%E9%80%89%E6%8B%A9%E7%9A%84-LLM)
* [会话 (Session) 管理](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#7.-%E4%BC%9A%E8%AF%9D-(Session)-%E7%AE%A1%E7%90%86)
  * [7.1 创建会话](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#7.1-%E5%88%9B%E5%BB%BA%E4%BC%9A%E8%AF%9D)
  * [7.2 获取会话](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#7.2-%E8%8E%B7%E5%8F%96%E4%BC%9A%E8%AF%9D)
  * [7.3 更新会话](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#7.3-%E6%9B%B4%E6%96%B0%E4%BC%9A%E8%AF%9D)
  * [7.4 归档会话](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#7.4-%E5%BD%92%E6%A1%A3%E4%BC%9A%E8%AF%9D)
  * [7.5 删除会话](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#7.5-%E5%88%A0%E9%99%A4%E4%BC%9A%E8%AF%9D)
  * [7.6 列出会话](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#7.6-%E5%88%97%E5%87%BA%E4%BC%9A%E8%AF%9D)
* [消息 (Message) 管理](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#8.-%E6%B6%88%E6%81%AF-(Message)-%E7%AE%A1%E7%90%86)
  * [8.1 追加消息](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#8.1-%E8%BF%BD%E5%8A%A0%E6%B6%88%E6%81%AF)
  * [8.2 获取消息列表](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#8.2-%E8%8E%B7%E5%8F%96%E6%B6%88%E6%81%AF%E5%88%97%E8%A1%A8)
* [会话摘要 (Session Summary)](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#9.-%E4%BC%9A%E8%AF%9D%E6%91%98%E8%A6%81-(Session-Summary))
  * [9.1 生成摘要](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#9.1-%E7%94%9F%E6%88%90%E6%91%98%E8%A6%81)
* [记忆 (Memory) 管理](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#10.-%E8%AE%B0%E5%BF%86-(Memory)-%E7%AE%A1%E7%90%86)
  * [10.0 运行时并发调度](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#10.0-%E8%BF%90%E8%A1%8C%E6%97%B6%E5%B9%B6%E5%8F%91%E8%B0%83%E5%BA%A6)
  * [10.1 存储记忆](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#10.1-%E5%AD%98%E5%82%A8%E8%AE%B0%E5%BF%86)
  * [10.2 获取记忆](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#10.2-%E8%8E%B7%E5%8F%96%E8%AE%B0%E5%BF%86)
  * [10.3 更新记忆](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#10.3-%E6%9B%B4%E6%96%B0%E8%AE%B0%E5%BF%86)
  * [10.4 删除记忆](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#10.4-%E5%88%A0%E9%99%A4%E8%AE%B0%E5%BF%86)
  * [10.5 搜索记忆](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#10.5-%E6%90%9C%E7%B4%A2%E8%AE%B0%E5%BF%86)
  * [10.6 按分类列出记忆](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#10.6-%E6%8C%89%E5%88%86%E7%B1%BB%E5%88%97%E5%87%BA%E8%AE%B0%E5%BF%86)
  * [10.7 记忆统计](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#10.7-%E8%AE%B0%E5%BF%86%E7%BB%9F%E8%AE%A1)
* [技能 (Skill) 管理](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#11.-%E6%8A%80%E8%83%BD-(Skill)-%E7%AE%A1%E7%90%86)
  * [11.1 注册技能](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#11.1-%E6%B3%A8%E5%86%8C%E6%8A%80%E8%83%BD)
  * [11.2 获取技能](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#11.2-%E8%8E%B7%E5%8F%96%E6%8A%80%E8%83%BD)
  * [11.3 按名称获取技能](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#11.3-%E6%8C%89%E5%90%8D%E7%A7%B0%E8%8E%B7%E5%8F%96%E6%8A%80%E8%83%BD)
  * [11.4 更新技能](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#11.4-%E6%9B%B4%E6%96%B0%E6%8A%80%E8%83%BD)
  * [11.5 禁用技能](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#11.5-%E7%A6%81%E7%94%A8%E6%8A%80%E8%83%BD)
  * [11.6 弃用技能](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#11.6-%E5%BC%83%E7%94%A8%E6%8A%80%E8%83%BD)
  * [11.7 激活技能](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#11.7-%E6%BF%80%E6%B4%BB%E6%8A%80%E8%83%BD)
  * [11.8 列出技能](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#11.8-%E5%88%97%E5%87%BA%E6%8A%80%E8%83%BD)
  * [11.9 获取技能指令](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#11.9-%E8%8E%B7%E5%8F%96%E6%8A%80%E8%83%BD%E6%8C%87%E4%BB%A4)
  * [11.10 列出技能包文件](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#11.10-%E5%88%97%E5%87%BA%E6%8A%80%E8%83%BD%E5%8C%85%E6%96%87%E4%BB%B6)
  * [11.11 获取技能包单个文件](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#11.11-%E8%8E%B7%E5%8F%96%E6%8A%80%E8%83%BD%E5%8C%85%E5%8D%95%E4%B8%AA%E6%96%87%E4%BB%B6)
  * [11.12 批量获取技能包文件](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#11.12-%E6%89%B9%E9%87%8F%E8%8E%B7%E5%8F%96%E6%8A%80%E8%83%BD%E5%8C%85%E6%96%87%E4%BB%B6)
* [技能绑定与访问控制](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#12.-%E6%8A%80%E8%83%BD%E7%BB%91%E5%AE%9A%E4%B8%8E%E8%AE%BF%E9%97%AE%E6%8E%A7%E5%88%B6)
  * [12.1 绑定技能到 Agent](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#12.1-%E7%BB%91%E5%AE%9A%E6%8A%80%E8%83%BD%E5%88%B0-Agent)
  * [12.2 解绑技能](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#12.2-%E8%A7%A3%E7%BB%91%E6%8A%80%E8%83%BD)
  * [12.3 启用/禁用绑定](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#12.3-%E5%90%AF%E7%94%A8%2F%E7%A6%81%E7%94%A8%E7%BB%91%E5%AE%9A)
  * [12.4 列出 Agent 的技能绑定](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#12.4-%E5%88%97%E5%87%BA-Agent-%E7%9A%84%E6%8A%80%E8%83%BD%E7%BB%91%E5%AE%9A)
  * [12.5 获取 Agent 的技能目录 (Tier-1)](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#12.5-%E8%8E%B7%E5%8F%96-Agent-%E7%9A%84%E6%8A%80%E8%83%BD%E7%9B%AE%E5%BD%95-(Tier-1))
  * [12.6 组装技能上下文（只读原语）](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#12.6-%E7%BB%84%E8%A3%85%E6%8A%80%E8%83%BD%E4%B8%8A%E4%B8%8B%E6%96%87%EF%BC%88%E5%8F%AA%E8%AF%BB%E5%8E%9F%E8%AF%AD%EF%BC%89)
  * [12.7 禁止业务用户使用技能](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#12.7-%E7%A6%81%E6%AD%A2%E4%B8%9A%E5%8A%A1%E7%94%A8%E6%88%B7%E4%BD%BF%E7%94%A8%E6%8A%80%E8%83%BD)
  * [12.8 允许业务用户使用技能](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#12.8-%E5%85%81%E8%AE%B8%E4%B8%9A%E5%8A%A1%E7%94%A8%E6%88%B7%E4%BD%BF%E7%94%A8%E6%8A%80%E8%83%BD)
  * [12.9 列出业务用户被禁止的技能](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#12.9-%E5%88%97%E5%87%BA%E4%B8%9A%E5%8A%A1%E7%94%A8%E6%88%B7%E8%A2%AB%E7%A6%81%E6%AD%A2%E7%9A%84%E6%8A%80%E8%83%BD)
* [Chat Completions (对话补全)](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#13.-Chat-Completions-(%E5%AF%B9%E8%AF%9D%E8%A1%A5%E5%85%A8))
  * [自动组装模式 (Auto-Assembly)](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E8%87%AA%E5%8A%A8%E7%BB%84%E8%A3%85%E6%A8%A1%E5%BC%8F-(Auto-Assembly))
  * [手动组装模式 (Manual-Assembly)](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E6%89%8B%E5%8A%A8%E7%BB%84%E8%A3%85%E6%A8%A1%E5%BC%8F-(Manual-Assembly))
  * [非流式响应](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E9%9D%9E%E6%B5%81%E5%BC%8F%E5%93%8D%E5%BA%94)
  * [流式响应 (SSE)](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E6%B5%81%E5%BC%8F%E5%93%8D%E5%BA%94-(SSE).1)
* [LLM Complete (直接调用 LLM)](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#14.-LLM-Complete-(%E7%9B%B4%E6%8E%A5%E8%B0%83%E7%94%A8-LLM))
* [Context Preview (上下文预览)](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#15.-Context-Preview-(%E4%B8%8A%E4%B8%8B%E6%96%87%E9%A2%84%E8%A7%88))
* [WebSocket 协议](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#16.-WebSocket-%E5%8D%8F%E8%AE%AE)
  * [连接](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E8%BF%9E%E6%8E%A5)
  * [消息格式](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E6%B6%88%E6%81%AF%E6%A0%BC%E5%BC%8F)
  * [HTTP → WebSocket 参数映射规则](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#HTTP-%E2%86%92-WebSocket-%E5%8F%82%E6%95%B0%E6%98%A0%E5%B0%84%E8%A7%84%E5%88%99)
  * [支持的 Action](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E6%94%AF%E6%8C%81%E7%9A%84-Action)
* [数据结构参考](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#17.-%E6%95%B0%E6%8D%AE%E7%BB%93%E6%9E%84%E5%8F%82%E8%80%83)
  * [AgentInfo](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#AgentInfo)
  * [contextConfig](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#contextConfig)
  * [memoryConfig](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#memoryConfig)
  * [summaryConfig](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#summaryConfig)
  * [defaultParams](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#defaultParams)
  * [retryConfig](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#retryConfig)
  * [AuthInfo](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#AuthInfo)
  * [GlobalAccessInfo](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#GlobalAccessInfo)
  * [UserLlmAccessInfo](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#UserLlmAccessInfo)
  * [LlmProviderInfo](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#LlmProviderInfo)
  * [LlmConfigInfo](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#LlmConfigInfo)
  * [AgentLlmBindingInfo](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#AgentLlmBindingInfo)
  * [SelectableLlmInfo](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#SelectableLlmInfo)
  * [SessionInfo](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#SessionInfo)
  * [MessageInfo](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#MessageInfo)
  * [MemoryEntry](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#MemoryEntry)
  * [SkillInfo](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#SkillInfo)
  * [SkillAccessInfo](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#SkillAccessInfo)
  * [LLMResponse](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#LLMResponse)
  * [ToolCall](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#ToolCall)
  * [SummaryResult](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#SummaryResult)
  * [LLM Usage Stats](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#LLM-Usage-Stats)
* [错误码](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#18.-%E9%94%99%E8%AF%AF%E7%A0%81)
* [附录：技能包规范](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E9%99%84%E5%BD%95%EF%BC%9A%E6%8A%80%E8%83%BD%E5%8C%85%E8%A7%84%E8%8C%83)
  * [技能包结构](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E6%8A%80%E8%83%BD%E5%8C%85%E7%BB%93%E6%9E%84)
  * [SKILL.md 格式](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#SKILL.md-%E6%A0%BC%E5%BC%8F)
  * [frontmatter 字段说明](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#frontmatter-%E5%AD%97%E6%AE%B5%E8%AF%B4%E6%98%8E)
  * [渐进式加载模型（Progressive Disclosure）](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E6%B8%90%E8%BF%9B%E5%BC%8F%E5%8A%A0%E8%BD%BD%E6%A8%A1%E5%9E%8B%EF%BC%88Progressive-Disclosure%EF%BC%89)
  * [调用控制矩阵](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E8%B0%83%E7%94%A8%E6%8E%A7%E5%88%B6%E7%9F%A9%E9%98%B5)
  * [注册时的解析流程](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E6%B3%A8%E5%86%8C%E6%97%B6%E7%9A%84%E8%A7%A3%E6%9E%90%E6%B5%81%E7%A8%8B)

## 1. 通用约定

### 请求格式

* Content-Type: `application/json`（技能包上传支持 `multipart` 和 `application/octet-stream`）
* 公共请求头:
  * `x-agent-id`: 指定 agentId（可选，与 body/query 中的 agentId 等效，不可冲突；`agent.register` 不接受该请求头）
  * `x-session-id`: 指定 sessionId（可选）

### 响应格式

所有非流式响应返回 JSON envelope。各接口章节中的 **响应示例默认只展示 ​**`data`​**​ 内部结构**​；实际 HTTP / WebSocket 返回会包在下面的外层 envelope 中：

`{ "type": "RESPONSE", "msgId": "...", "correlationId": "<requestId>", "action": "<action>", "agentId": "<agentId>", "sessionId": "<sessionId>", "data": { ... }, "headers": { "...": "..." } } `

说明：

* `headers` 仅在服务端 envelope headers 非空时返回。
* 如果请求没有显式提供 `x-request-id` 或 WebSocket `requestId`，`correlationId` 会使用服务端生成的请求 `msgId`。

常规 DataBus 错误响应：

`{ "type": "ERROR", "msgId": "...", "correlationId": "<requestId>", "action": "<action>", "agentId": "<agentId>", "sessionId": "<sessionId>", "error": { "code": "<BusErrorCode>", "message": "<错误描述>" }, "headers": { "busErrorCode": "<BusErrorCode>", "httpStatus": "<HTTP 状态码>" } } `

协议适配器在请求尚未进入 DataBus 前发现的解析错误，可能只返回最小错误体 `{"type":"ERROR","error":{...}}`。

### 分页参数

列表类接口统一支持：

| 参数

```
| 类型
```

| 默认值

| 说明

```
|
```

| -------------- | ------ | -------- | -------------- |
| `offset` | int  | 0      | 跳过前 N 条  |
| `limit`  | int  | 100    | 返回条数上限 |

分页参数支持 query string 或 request body 传入。

### 流式响应 (SSE)

当 `stream=true` 时，HTTP 响应使用 Server-Sent Events 格式：

`Content-Type: text/event-stream; charset=UTF-8 event: stream_start data: {"type":"STREAM_START","msgId":"...","correlationId":"...","action":"chat.completions","agentId":"agent_xxx","sessionId":"sess_001","data":{...}} event: chunk data: {"type":"STREAM_CHUNK","msgId":"...","correlationId":"...","action":"chat.completions","agentId":"agent_xxx","sessionId":"sess_001","data":{"content":"..."}} event: chunk data: {"type":"STREAM_CHUNK","msgId":"...","correlationId":"...","action":"chat.completions","agentId":"agent_xxx","sessionId":"sess_001","data":{"content":"..."}} event: stream_end data: {"type":"STREAM_END","msgId":"...","correlationId":"...","action":"chat.completions","agentId":"agent_xxx","sessionId":"sess_001","data":{...}} `

SSE 响应体统一使用 UTF-8 编码。客户端应按字节读取并显式按 UTF-8 解码后，再做事件分帧和 JSON 解析。

---

## 2. Agent 管理

### 2.1 注册 Agent

`POST /agent-bus/v1/agent/register `

**请求体:**

| 字段

```
| 类型
```

| 必填

| 说明

```
|
```

| --------------------- | -------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `agentName`     | string | 是   | Agent 名称                                                                                                                                                                                                                                                                                                                                                                                    |
| `agentType`     | string | 是   | Agent 类型（无枚举值限制，agent框架也无特殊处理，业务端可自由填写， 如chat类型, task类型等）                                                                                                                                                                                                                                                                                                  |
| `ownerUserId`   | string | 否   | 所属用户（默认为当前登录用户）                                                                                                                                                                                                                                                                                                                                                                |
| `description`   | string | 否   | 描述                                                                                                                                                                                                                                                                                                                                                                                          |
| `systemPrompt`  | string | 否   | 系统提示词                                                                                                                                                                                                                                                                                                                                                                                    |
| `llmConfigId`   | string | 否   | 默认 LLM 配置 ID，必须是已通过`/llm/config/register`注册的配置 ID。注册时会自动创建 agent 与该 LLM 配置的绑定关系（`isDefault=true`,`priority=0`）                                                                                                                                                                                                                                |
| `contextConfig` | object | 否   | 上下文组装配置，详见[contextConfig 结构](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#contextconfig "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#contextconfig") |
| `memoryConfig`  | object | 否   | 记忆管理配置，详见[memoryConfig 结构](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#memoryconfig "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#memoryconfig")      |
| `config`        | object | 否   | 自定义扩展配置，框架原样存储，不做解析                                                                                                                                                                                                                                                                                                                                                        |

**响应:** [AgentInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#agentinfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#agentinfo")

说明：

* `memoryConfig.embeddingEnabled` 在 `agent.register` 时完成一次性决策并落库
* 注册请求未显式传入 `memoryConfig.embeddingEnabled` 时，系统会按默认值 `false` 补齐并持久化
* 当 `memoryConfig.embeddingEnabled=true` 时，注册时要求系统当前存在且只存在一条 active memory embedding 配置

---

### 2.2 获取 Agent

`GET /agent-bus/v1/agent/{agentId} `

**响应:** [AgentInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#agentinfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#agentinfo")

---

### 2.3 更新 Agent

`PUT /agent-bus/v1/agent/{agentId} `

**请求体:** 需要更新的字段（支持 `description`, `systemPrompt`, `llmConfigId`, `contextConfig`, `memoryConfig`, `config` 等）

说明：

* `memoryConfig.embeddingEnabled` 在注册后不可变；更新时如果显式传入且与当前值不同，请求会被拒绝
* 更新 `memoryConfig` 但省略 `embeddingEnabled` 时，框架会保留原值

**响应:** [AgentInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#agentinfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#agentinfo")

---

### 2.4 激活 Agent

`POST /agent-bus/v1/agent/{agentId}/activate `

**响应:** [AgentInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#agentinfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#agentinfo")

---

### 2.5 挂起 Agent

`POST /agent-bus/v1/agent/{agentId}/suspend `

**响应:** [AgentInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#agentinfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#agentinfo")

---

### 2.6 删除 Agent

`POST /agent-bus/v1/agent/{agentId}/delete `

**响应:** [AgentInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#agentinfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#agentinfo")（状态变为 DELETED）

---

### 2.7 列出 Agent

`GET /agent-bus/v1/agent/list `

**查询参数:**

| 参数

```
| 类型
```

| 默认值

```
| 说明


       |
```

| ------------------- | -------- | ------------ | ---------------- |
| `ownerUserId` | string | 当前用户   | 按所属用户过滤 |
| `status`      | int    | -1（全部） | 按状态过滤     |
| `offset`      | int    | 0          |                |
| `limit`       | int    | 100        |                |

**响应:**

`{ "items": [ AgentInfo, ... ], "offset": 0, "limit": 100, "size": 5 } `

---

### 2.8 列出当前用户可访问的 Agent

`GET /agent-bus/v1/agent/accessible `

**查询参数:**

| 参数

```
| 类型
```

| 默认值

```
| 说明


                                            |
```

| --------------------- | -------- | -------------------- | ----------------------------------------------------- |
| `minPermission` | string | `AGENT_INVOKE` | 最低权限过滤：`AGENT_INVOKE`/`AGENT_MANAGE` |
| `status`        | int    | -1（全部）         | 按状态过滤                                          |
| `offset`        | int    | 0                  |                                                     |
| `limit`         | int    | 100                |                                                     |

**响应:**

`{ "items": [ { "...": "AgentInfo", "myPermission": "AGENT_MANAGE", "isOwner": true } ], "offset": 0, "limit": 100, "size": 5 } `

---

### 2.9 授予 Agent 权限

`POST /agent-bus/v1/agent/{agentId}/auth `

**请求体:**

| 字段

```
| 类型
```

| 必填

| 说明

```
|
```

| ------------------ | -------- | ------ | ------------------------------------------------- |
| `userId`     | string | 是   | DolphinDB 用户 ID                               |
| `permission` | string | 是   | 权限级别：`AGENT_MANAGE`/`AGENT_INVOKE` |
| `grantedBy`  | string | 否   | 执行授权的用户 ID（默认为当前登录用户）         |

**响应:** 当前 agent 的授权列表 `{ items: [AuthInfo, ...], size: N }`

---

### 2.10 撤销 Agent 权限

`DELETE /agent-bus/v1/agent/{agentId}/auth?userId=xxx `

**参数:** `userId`（必填）

**响应:** 当前 agent 的授权列表

---

### 2.11 列出 Agent 授权

`GET /agent-bus/v1/agent/{agentId}/auth/list `

**响应:** `{ items: [AuthInfo, ...], size: N }`

---

## 3. 全局访问控制

### 3.1 授予全局 `AGENT_ADMIN`

`POST /agent-bus/v1/admin/access `

**请求体:**

| 字段

```
| 类型
```

| 必填

| 说明

```
|
```

| ------------------ | -------- | ------ | ----------------------------------------- |
| `userId`     | string | 是   | DolphinDB 用户 ID                       |
| `permission` | string | 否   | 当前固定为`AGENT_ADMIN`             |
| `grantedBy`  | string | 否   | 执行授权的用户 ID（默认为当前登录用户） |

**响应:** `{ items: [GlobalAccessInfo, ...], size: N }`

---

### 3.2 撤销全局 `AGENT_ADMIN`

`DELETE /agent-bus/v1/admin/access?userId=xxx&permission=AGENT_ADMIN `

**响应:** `{ items: [GlobalAccessInfo, ...], size: N }`

---

### 3.3 列出全局 `AGENT_ADMIN`

`GET /agent-bus/v1/admin/access `

**响应:** `{ items: [GlobalAccessInfo, ...], size: N }`

## 4. 用户 LLM 访问控制

### 4.1 授予用户全局 LLM 访问权限

`POST /agent-bus/v1/user/{userId}/llm/access `

| 字段

```
| 类型
```

| 必填

| 说明

```
|
```

| ------------------- | -------- | ------ | ----------------------------------------- |
| `llmConfigId` | string | 是   | LLM 配置 ID                             |
| `grantedBy`   | string | 否   | 执行授权的用户 ID（默认为当前登录用户） |

**响应:** `{ items: [UserLlmAccessInfo, ...], size: N }`

---

### 4.2 撤销用户全局 LLM 访问权限

`DELETE /agent-bus/v1/user/{userId}/llm/access?llmConfigId=xxx `

**响应:** `{ items: [UserLlmAccessInfo, ...], size: N }`

---

### 4.3 列出用户全局 LLM 访问权限

`GET /agent-bus/v1/user/{userId}/llm/access `

**响应:** `{ items: [UserLlmAccessInfo, ...], size: N }`

---

## 5. LLM Provider 与配置管理

### 5.1 注册 LLM Provider

`POST /agent-bus/v1/llm/provider/register `

**请求体:**

| 字段

```
| 类型
```

| 必填

| 说明

```
|
```

| ------------------- | -------- | ------ | ------------------------------------------------------------------------------------------------------------------------- |
| `name`        | string | 是   | Provider 名称，用于标识和展示                                                                                           |
| `adapterType` | string | 是   | 运行时 provider 适配器类型：`openai`/`openai-compatible`/`anthropic`/`deepseek`/`azure`/`local` |
| `baseUrl`     | string | 是   | Provider 级基础 URL，必须是完整`http(s)`URL，如`https://api.openai.com`                                         |
| `apiKey`      | string | 否   | Provider 级 API Key                                                                                                     |
| `extra`       | string | 否   | 预留扩展字段                                                                                                            |

**响应:** [LlmProviderInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmproviderinfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmproviderinfo")

说明：

* `baseUrl` 由框架规范化保存：末尾 `/` 会被移除
* Provider 负责承载共享连接信息；模型级配置不再直接保存 `baseUrl` 或 `apiKey`

---

### 5.2 获取 LLM Provider

`GET /agent-bus/v1/llm/provider/{providerId} `

**响应:** [LlmProviderInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmproviderinfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmproviderinfo")

说明：

* 软删除后的 provider 仍可通过该接口查询，此时 `status=2`、`statusName="DELETED"`

---

### 5.3 列出 LLM Provider

`GET /agent-bus/v1/llm/provider/list `

**查询参数:**

| 参数

```
| 类型
```

| 默认值

| 说明

```
|
```

| -------------- | ------ | -------- | ---------------------------------------------------------------------------- |
| `status` | int  | -1     | 状态过滤：`-1`=全部，`0`=ACTIVE，`1`=DISABLED，`2`=DELETED |
| `offset` | int  | 0      | 分页起始偏移                                                               |
| `limit`  | int  | 100    | 返回条数上限                                                               |

**响应:** `{ items: [LlmProviderInfo, ...], offset, limit, size }`

---

### 5.4 更新 LLM Provider

`PUT /agent-bus/v1/llm/provider/{providerId} `

**请求体:** 需要更新的字段

可更新字段：`name`、`adapterType`、`baseUrl`、`apiKey`、`extra`

**响应:** [LlmProviderInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmproviderinfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmproviderinfo")

说明：

* 已 `DELETED` 的 provider 不能再更新

---

### 5.5 禁用 LLM Provider

`POST /agent-bus/v1/llm/provider/{providerId}/disable `

**响应:** [LlmProviderInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmproviderinfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmproviderinfo")

说明：

* 已 `DELETED` 的 provider 不能再执行 disable
* 若 provider 已是 `DISABLED`，再次 disable 按幂等处理，直接返回当前 provider
* 禁用前要求不存在任何非 `DELETED` 的 llmConfig 继续引用该 provider
* `DISABLED` provider 不会再被 ACTIVE 的 llmConfig 引用为可运行配置

---

### 5.6 删除 LLM Provider

`DELETE /agent-bus/v1/llm/provider/{providerId} `

**响应:** [LlmProviderInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmproviderinfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmproviderinfo")（状态变为 `DELETED`）

说明：

* 仅允许删除已 `DISABLED` 的 provider
* 删除为软删除：成功后 provider 仍可被 `GET /llm/provider/{providerId}` 查询到，但 `status=2`、`statusName="DELETED"`
* 若 provider 已是 `DELETED`，再次删除按幂等处理，直接返回当前 provider
* 删除前要求不存在任何非 `DELETED` 的 llmConfig 继续引用该 provider

---

### 5.7 注册 LLM 配置

`POST /agent-bus/v1/llm/config/register `

**请求体:**

| 字段

```
| 类型
```

| 必填

```
| 说明


                                                                                                                                                                                                                                                                                                                                                                                    |
```

| -------------------------- | -------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`               | string | 是       | 配置名称，用于标识和展示                                                                                                                                                                                                                                                                                                                                                                    |
| `providerId`         | string | 是       | 关联的 provider ID，必须存在且状态为`ACTIVE`                                                                                                                                                                                                                                                                                                                                            |
| `model`              | string | 是       | 模型名称（如`gpt-4.1`、`claude-sonnet-4-20250514`），传递给 LLM API                                                                                                                                                                                                                                                                                                                 |
| `capability`         | string | 否       | 配置能力类型，默认`chat`：`chat`/`embedding`                                                                                                                                                                                                                                                                                                                                    |
| `embeddingDimension` | int    | 条件必填 | `capability=embedding`时必填，表示向量维度                                                                                                                                                                                                                                                                                                                                              |
| `embeddingMetric`    | string | 否       | `capability=embedding`时使用的相似度规则：`euclidean`/`cosine`。省略时默认`euclidean`                                                                                                                                                                                                                                                                                       |
| `embeddingNormalize` | bool   | 否       | `capability=embedding`时是否对向量做归一化。`embeddingMetric=cosine`时必须为`true`                                                                                                                                                                                                                                                                                              |
| `requestPath`        | string | 是       | 相对`provider.baseUrl`的请求路径，必须以`/`开头，可包含查询串，例如`/v1/chat/completions`或`/openai/deployments/x/chat/completions?api-version=2024-10-21`                                                                                                                                                                                                                  |
| `defaultParams`      | object | 否       | 默认请求参数，详见[defaultParams 说明](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#defaultparams "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#defaultparams") |
| `contextWindow`      | int    | 否       | 模型上下文窗口大小（token 数），用于上下文组装时的预算计算                                                                                                                                                                                                                                                                                                                                  |
| `maxConcurrency`     | int    | 否       | 最大并发请求数，保留配置，当前未实现                                                                                                                                                                                                                                                                                                                                                        |
| `rateLimitRPM`       | int    | 否       | 速率限制（每分钟最大请求数）保留配置，当前未实现                                                                                                                                                                                                                                                                                                                                            |
| `timeoutMs`          | int    | 否       | 单次请求超时时间（毫秒），保留配置，当前未实现                                                                                                                                                                                                                                                                                                                                              |
| `retryConfig`        | object | 否       | 重试配置，详见[retryConfig 说明](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#retryconfig "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#retryconfig")           |
| `extra`              | string | 否       | 预留扩展字段                                                                                                                                                                                                                                                                                                                                                                                |

**响应:** [LlmConfigInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmconfiginfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmconfiginfo")

说明：

* 运行时最终请求地址按 `provider.baseUrl + requestPath` 拼接
* `capability=embedding` 的配置供 memory 模块生成 document/query embedding 使用
* 系统全局只允许一条 `capability='embedding' and status='ACTIVE'` 的配置；注册或启用第二条会被拒绝

---

### 5.8 获取 LLM 配置

`GET /agent-bus/v1/llm/config/{llmConfigId} `

**响应:** [LlmConfigInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmconfiginfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmconfiginfo")

说明：

* 软删除后的配置仍可通过该接口查询，此时 `status=2`、`statusName="DELETED"`

---

### 5.9 列出 LLM 配置

`GET /agent-bus/v1/llm/config/list `

**查询参数:**

| 参数

```
| 类型
```

| 默认值

| 说明

```
|
```

| -------------- | ------ | -------- | ---------------------------------------------------------------------------- |
| `status` | int  | -1     | 状态过滤：`-1`=全部，`0`=ACTIVE，`1`=DISABLED，`2`=DELETED |
| `offset` | int  | 0      | 分页起始偏移                                                               |
| `limit`  | int  | 100    | 返回条数上限                                                               |

**响应:** `{ items: [LlmConfigInfo, ...], offset, limit, size }`

说明：

* `status=-1` 时会返回包括 `DELETED` 在内的全部配置

---

### 5.10 更新 LLM 配置

`PUT /agent-bus/v1/llm/config/{llmConfigId} `

**请求体:** 需要更新的字段

可更新字段：`name`、`providerId`、`model`、`capability`、`embeddingDimension`、`embeddingMetric`、`embeddingNormalize`、`requestPath`、`defaultParams`、`contextWindow`、`maxConcurrency`、`rateLimitRPM`、`timeoutMs`、`retryConfig`、`extra`

**响应:** [LlmConfigInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmconfiginfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmconfiginfo")

说明：

* 已 `DELETED` 的配置不能再更新
* `ACTIVE` 配置只能引用 `ACTIVE` provider

---

### 5.11 禁用 LLM 配置

`POST /agent-bus/v1/llm/config/{llmConfigId}/disable `

**响应:** [LlmConfigInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmconfiginfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmconfiginfo")

说明：

* 已 `DELETED` 的配置不能再执行 disable

---

### 5.12 删除 LLM 配置

`DELETE /agent-bus/v1/llm/config/{llmConfigId} `

**响应:** [LlmConfigInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmconfiginfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmconfiginfo")（状态变为 `DELETED`）

说明：

* 仅允许删除已 `DISABLED` 的配置
* 删除为软删除：成功后配置仍可被 `GET /llm/config/{llmConfigId}` 查询到，但 `status=2`、`statusName="DELETED"`
* 若配置已是 `DELETED`，再次删除按幂等处理，直接返回当前配置
* 删除前要求该配置不再被任何用户授权（`user_llm_access`）、任何 agent 绑定（`agent_llm_access`）、任何非 `DELETED` agent 的默认模型字段、任何非 `DELETED` agent 的 `contextConfig.summaryConfig.summaryLlmConfigId`，以及任何非 `DELETED` session 引用
* `DELETED` 配置不会参与运行时 LLM 选择，也不能再被更新或禁用

---

## 6. Agent-LLM 绑定

### 6.1 绑定 LLM 到 Agent

`POST /agent-bus/v1/agent/{agentId}/llm/access `

**请求体:**

| 字段

```
| 类型
```

| 必填

| 说明

```
|
```

| ------------------- | -------- | ------ | ----------------------------------------------------------------------------------------------------------------- |
| `llmConfigId` | string | 是   | 要绑定的 LLM 配置 ID，必须已注册且状态为 ACTIVE，且其引用的 provider 也必须为 ACTIVE                            |
| `isDefault`   | bool   | 否   | 是否设为默认 LLM（默认 false）。每个 agent 仅允许一个默认配置，设为 true 时 priority 强制为 0                   |
| `priority`    | int    | 否   | 优先级（默认 0），数值越小优先级越高。运行时按 priority 升序形成 fallback 链，当前 LLM 调用失败时自动尝试下一个 |

**响应:** Agent 关联的 LLM 配置列表 `{ items: [AgentLlmBindingInfo, ...], size }`

---

### 6.2 解绑 LLM

`DELETE /agent-bus/v1/agent/{agentId}/llm/access?llmConfigId=xxx `

**响应:** Agent 关联的 LLM 配置列表

---

### 6.3 列出 Agent 的 LLM 配置

`GET /agent-bus/v1/agent/{agentId}/llm/list `

**响应:** `{ items: [AgentLlmBindingInfo, ...], size }`

---

### 6.4 列出当前用户在指定 Agent 下可显式选择的 LLM

`GET /agent-bus/v1/agent/{agentId}/llm/selectable `

说明：

* 该接口面向当前登录用户，不接受 `userId` 或 `targetUserId`
* 返回当前用户在该 agent 下的有效可选集合：`AgentAllowed ∪ UserGranted`
* 未指定模型时，运行时仍优先使用 agent 默认模型；fallback 只走 agent 绑定链

**响应:**

`{ "defaultLlmConfigId": "llm_primary", "items": [ { "...": "LlmConfigInfo", "source": "agent", "isAgentDefault": true, "participatesInFallback": true, "fallbackPriority": 0 }, { "...": "LlmConfigInfo", "source": "user", "isAgentDefault": false, "participatesInFallback": false, "fallbackPriority": null } ], "size": 2 } `

`source` 取值：

* `agent`：仅来自 `agent_llm_access`
* `user`：仅来自 `user_llm_access`
* `both`：同时来自两者

---

## 7. 会话 (Session) 管理

### 7.1 创建会话

`POST /agent-bus/v1/session/create `

**请求体:**

| 字段

```
| 类型
```

| 必填

| 说明

```
|
```

| ------------------- | -------- | ------ | ----------------------------------------------------------------- |
| `agentId`     | string | 是   | Agent ID，必须处于 ACTIVE 状态                                  |
| `title`       | string | 否   | 会话标题                                                        |
| `llmConfigId` | string | 否   | 会话级 LLM 配置 ID。必须属于当前用户在该 agent 下的有效可选集合 |
| `metadata`    | object | 否   | 自定义元数据，JSON 格式，原样存储                               |

**响应:** [SessionInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#sessioninfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#sessioninfo")

---

### 7.2 获取会话

`GET /agent-bus/v1/session/{sessionId} `

**响应:** [SessionInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#sessioninfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#sessioninfo")

---

### 7.3 更新会话

`PUT /agent-bus/v1/session/{sessionId} `

**请求体:** 需要更新的字段（如 `title`, `metadata`, `llmConfigId`）

**响应:** [SessionInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#sessioninfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#sessioninfo")

---

### 7.4 归档会话

`POST /agent-bus/v1/session/{sessionId}/archive `

归档后的会话不可追加消息。

**响应:** [SessionInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#sessioninfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#sessioninfo")

---

### 7.5 删除会话

`POST /agent-bus/v1/session/{sessionId}/delete `

**响应:** [SessionInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#sessioninfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#sessioninfo")（状态变为 DELETED）

---

### 7.6 列出会话

`GET /agent-bus/v1/session/list `

**查询参数:**

| 参数

```
| 类型
```

| 默认值

```
| 说明


                                                               |
```

| -------------------- | -------- | -------------- | ------------------------------------------------------------------------ |
| `agentId`      | string | x-agent-id   | 按 Agent 过滤                                                          |
| `targetUserId` | string | 当前登录用户 | 只读过滤目标用户。仅`AGENT_MANAGE`/`AGENT_ADMIN`可查看他人数据 |
| `status`       | int    | -1（全部）   | 0=ACTIVE, 1=ARCHIVED, 2=DELETED                                        |
| `offset`       | int    | 0            |                                                                        |
| `limit`        | int    | 100          |                                                                        |

**响应:** `{ items: [SessionInfo, ...], offset, limit, size }`

---

## 8. 消息 (Message) 管理

### 8.1 追加消息

`POST /agent-bus/v1/session/{sessionId}/message `

**注意:**

本接口是比较低层级的接口，一般agent业务无需调用该接口（框架会自动做消息的持久化）。

**请求体:**

| 字段

```
| 类型
```

| 必填

| 说明

```
|
```

| ------------------------ | -------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `role`             | string | 是   | 消息角色：`system`（系统指令）/`user`（用户输入）/`assistant`（LLM 回复）/`tool`（工具执行结果）                                                                                                                                                                                                                                                                     |
| `contentType`      | string | 否   | 内容类型（默认`text`）。`text`：纯文本。`tool_call`：工具调用，content 为 JSON 格式的 toolCalls 数组。`tool_result`：工具结果，需同时提供 toolCallId。`multimodal`：多模态，content 为 JSON 数组（含 type/text/imageUrl）。`summary`：会话摘要（通常由框架内部写入；其`metadata`中记录`summaryUpToSeqNum`、`trigger`、`summaryLlmConfigId`） |
| `content`          | string | 否   | 消息内容，格式取决于 contentType                                                                                                                                                                                                                                                                                                                                                     |
| `toolCallId`       | string | 否   | 工具调用关联 ID。contentType 为`tool_result`时必填，需与 assistant 返回的 tool\_call 中的 id 一致，LLM 据此将工具结果关联到对应的调用                                                                                                                                                                                                                                            |
| `llmModel`         | string | 否   | 产生该消息的 LLM 模型名称（通常仅 assistant 消息需要填写）                                                                                                                                                                                                                                                                                                                           |
| `promptTokens`     | int    | 否   | 输入 token 数（LLM 返回的 usage 统计），用于 token 消耗计量                                                                                                                                                                                                                                                                                                                          |
| `completionTokens` | int    | 否   | 输出 token 数（LLM 返回的 usage 统计），用于 token 消耗计量                                                                                                                                                                                                                                                                                                                          |
| `totalTokens`      | int    | 否   | 总 token 数（默认 prompt + completion），同时用于滑动窗口的 token 预算计算                                                                                                                                                                                                                                                                                                           |
| `metadata`         | object | 否   | 自定义元数据，JSON 格式                                                                                                                                                                                                                                                                                                                                                              |

**响应:** [MessageInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#messageinfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#messageinfo")

---

### 8.2 获取消息列表

`GET /agent-bus/v1/session/{sessionId}/messages `

**查询参数:**

| 参数

```
| 类型
```

| 默认值

| 说明

```
|
```

| ---------------- | ------ | -------- | ------------ |
| `startSeq` | long | 1      | 起始序列号 |
| `endSeq`   | long | MAX    | 结束序列号 |

**响应:**

`{ "sessionId": "sess_001", "items": [ MessageInfo, ... ], "size": 10 } `

---

## 9. 会话摘要 (Session Summary)

### 9.1 生成摘要

`POST /agent-bus/v1/session/{sessionId}/summary `

**请求体:**

| 字段

```
| 类型
```

| 必填

| 说明

```
|
```

| -------------------- | -------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `instructions` | string | 否   | 额外的摘要指令，追加到摘要 prompt 中（如要求关注特定主题或保留特定信息）                                                                                     |
| `llmConfigId`  | string | 否   | 本次摘要优先使用的 LLM 配置 ID。为空时优先使用`summaryConfig.summaryLlmConfigId`；若仍为空，则按当前 session owner 在该 agent 下的默认可用 chat 模型解析 |
| `force`        | bool   | 否   | 是否强制生成（默认 false）。为 true 时按全量 rolling summary 语义执行，不保留 raw tail                                                                       |
| `metadata`     | object | 否   | 自定义元数据，JSON 格式。框架只负责透传，可以写入一些自定义的数据，比如触发原因、关联的业务事件等                                                            |

**响应:** [SummaryResult](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#summaryresult "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#summaryresult")

`{ "sessionId": "sess_001", "generated": true, "reason": "", "trigger": "manual", "summaryUpToSeqNum": 50, "messageId": "msg_xxx", "sequenceNum": 51, "role": "system", "contentType": "summary", "content": "摘要内容...", "metadata": { "summaryUpToSeqNum": 50, "trigger": "manual", "summaryLlmConfigId": "llm_summary_xxx" } } `

---

## 10. 记忆 (Memory) 管理

### 10.0 运行时并发调度

Memory API 的 HTTP 路由、请求体和响应体不包含 lane 配置；lane 策略由服务端启动配置控制：

| 配置项

```
| 类型
```

| 默认值

```
| 说明


                                                                                                                                                                                                                                                                                                                                  |
```

| ---------------------------------------- | -------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `agentFramework.memory.lanePolicy` | string | `user` | memory 写请求的串行化粒度：`legacy`使用旧的`AGENT_WRITE`agentId 粒度；`agent`按`memory:agent:{agentId}`串行；`user`将 user-scope memory 按`memory:user:{agentId}:{userId}`串行、agent-scope memory 按`memory:agent:{agentId}`串行；`memoryId`将`memory.update/delete`按`memory:id:{memoryId}`串行 |

说明：

* `memory.store/update/delete` 属于写请求，会按上述 lane 策略串行化。
* `memory.get/search/list/stats` 对外仍是只读接口，不需要客户端提供 lane 信息。
* `agentFramework.memory.lanePolicy` 是全局运行时配置，不属于 `memoryConfig`，也不会随 agent 注册请求落库。

### 10.1 存储记忆

`POST /agent-bus/v1/memory/store `

**请求体:**

| 字段

```
| 类型
```

| 必填

| 说明

```
|
```

| ------------------ | -------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `agentId`    | string | 是   | 所属 Agent ID                                                                                                                                       |
| `scope`      | string | 否   | 作用域（默认`agent`）：`agent`（agent 级别，所有用户可读，仅`AGENT_MANAGE / AGENT_ADMIN`可写）/`user`（用户级别，写入当前登录用户） |
| `category`   | string | 是   | 分类标签（如`"fact"`、`"preference"`、`"instruction"`），用于按分类检索和统计                                                           |
| `content`    | string | 是   | 记忆文本内容                                                                                                                                        |
| `importance` | double | 是   | 重要度，取值范围 [0, 1]。参与混合排序                                                                                                               |
| `metadata`   | object | 否   | 自定义元数据，JSON 格式                                                                                                                             |
| `source`     | string | 否   | 来源标识（默认`manual`）：`manual`（手动创建）/`auto_extract`（自动提取）/`api`（API 写入）                                         |
| `sourceRef`  | string | 否   | 来源引用信息（如来源的 sessionId 或 messageId），便于溯源                                                                                           |
| `expireTime` | long   | 否   | 过期时间（毫秒时间戳），为空表示永不过期                                                                                                            |

**响应:** [MemoryEntry](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#memoryentry "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#memoryentry")

说明：

* 当 `agent.memoryConfig.embeddingEnabled=true` 时，`memory.store` 由框架根据 active memory embedding 配置生成 document embedding，并同步写入记忆主表和 embedding 表
* 当 `agent.memoryConfig.embeddingEnabled=false` 时，`memory.store` 只写入记忆主表，不生成 embedding
* 请求体不接受 `embedding`、`embeddingModel`

---

### 10.2 获取记忆

`GET /agent-bus/v1/memory/{memoryId} `

**响应:** [MemoryEntry](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#memoryentry "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#memoryentry")

---

### 10.3 更新记忆

`PUT /agent-bus/v1/memory/{memoryId} `

**请求体:** 需要更新的字段（如 `content`, `importance`, `category`, `metadata`）

说明：

* 当 `agent.memoryConfig.embeddingEnabled=true` 且更新 `content` 时，框架会先生成新的 document embedding，再同步更新记忆主表和 embedding 表
* 当 `agent.memoryConfig.embeddingEnabled=false` 时，更新仅作用于记忆主表，不生成或更新 embedding
* 请求体不接受 `embedding`、`embeddingModel`

**响应:** [MemoryEntry](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#memoryentry "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#memoryentry")

---

### 10.4 删除记忆

`DELETE /agent-bus/v1/memory/{memoryId} `

**响应:**

`{ "memoryId": "mem_xxx", "deleted": true } `

---

### 10.5 搜索记忆

`POST /agent-bus/v1/memory/search `

**请求体:**

| 字段

```
| 类型
```

| 必填

| 说明

```
|
```

| --------------------- | -------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `agentId`       | string | 是   | 搜索范围限定的 Agent ID                                                                                                                                                                                                                |
| `targetUserId`  | string | 否   | 只读过滤目标用户。未指定时搜索当前登录用户可见的范围；仅`AGENT_MANAGE / AGENT_ADMIN`可查看他人数据                                                                                                                                 |
| `scope`         | string | 否   | 按作用域过滤：`agent`（仅 agent 级别）/`user`（仅用户级别）。不指定时搜索 agent 级别 + 目标用户的 user 级记忆                                                                                                                  |
| `category`      | string | 否   | 按分类标签精确过滤                                                                                                                                                                                                                     |
| `textQuery`     | string | 否   | 全文搜索查询；`RELEVANCE/HYBRID`下同时作为语义查询文本                                                                                                                                                                             |
| `textMatchMode` | string | 否   | 全文搜索匹配模式（默认`any`）：`any`（匹配任一词）/`all`（匹配所有词）                                                                                                                                                     |
| `topK`          | int    | 否   | 最多返回条数（默认 10）                                                                                                                                                                                                                |
| `minImportance` | double | 否   | 最小重要度过滤阈值（默认 0，不过滤）                                                                                                                                                                                                   |
| `sortBy`        | string | 否   | 排序策略（默认`HYBRID`）：`RECENCY`（按创建时间降序）/`IMPORTANCE`（按重要度降序）/`RELEVANCE`（vector-first recall，要求`textQuery`）/`TEXT_SEARCH`（按全文搜索得分降序）/`HYBRID`（多路召回 + 综合重排） |

**响应:**

`{ "items": [ MemoryEntry, ... ], "size": 5 } `

每条 MemoryEntry 额外包含评分字段：`textScore`, `relevanceScore`, `hybridScore`。

说明：

* 当 `agent.memoryConfig.embeddingEnabled=true` 时，`memory.search` 由框架内部生成 query embedding，不接受 `embedding`、`embeddingModel`
* 当 `agent.memoryConfig.embeddingEnabled=false` 时，`RELEVANCE` 直接失败，`HYBRID` 退化为文本/importance/recency 检索
* 当 `agent.memoryConfig.embeddingEnabled=true` 但 active embedding 配置不可用时，`RELEVANCE` 直接失败，`HYBRID` 退化为文本/importance/recency 检索
* 当 `scope='agent'` 时，不允许同时传 `targetUserId`

---

### 10.6 按分类列出记忆

`GET /agent-bus/v1/memory/list `

**查询参数:**

| 参数

```
| 类型
```

| 必填

| 说明

```
|
```

| ---------------- | -------- | ------ | ---------- |
| `agentId`  | string | 是   | Agent ID |
| `category` | string | 是   | 分类     |
| `offset`   | int    | 否   | 默认 0   |
| `limit`    | int    | 否   | 默认 100 |

**响应:** `{ items: [MemoryEntry, ...], offset, limit, size }`

---

### 10.7 记忆统计

`GET /agent-bus/v1/memory/stats `

**查询参数:**

| 参数

```
| 类型
```

| 必填

| 说明

```
|
```

| --------------- | -------- | ------ | ---------- |
| `agentId` | string | 是   | Agent ID |

**响应:**

`{ "totalCount": 120, "agentScopeCount": 80, "userScopeCount": 40, "avgImportance": 0.65, "categoryDistribution": { "fact": 50, "preference": 30, "instruction": 40 } } `

---

## 11. 技能 (Skill) 管理

### 11.1 注册技能

`POST /agent-bus/v1/skill/register `

**请求方式（三选一）：**

1. ​**JSON + Base64**​：`Content-Type: application/json`，body 中 `packageBase64` 字段传 Base64 编码的 ZIP 包
2. ​**JSON + raw**​：body 中 `packageData` 字段传原始数据，`packageEncoding` 设为 `raw` 或 `base64`
3. ​**二进制上传​**​：`Content-Type: application/octet-stream`，request body 为 ZIP 包原始字节

**请求体（JSON 模式）：**

| 字段

```
| 类型
```

| 必填

| 说明

```
|
```

| ----------------------- | -------- | -------- | ----------------------------------------------- |
| `packageBase64`   | string | 二选一 | Base64 编码的技能包（ZIP）                    |
| `packageData`     | string | 二选一 | 技能包数据                                    |
| `packageEncoding` | string | 否     | `raw`/`binary`/`base64`/`b64` |
| `overrides`       | object | 否     | 覆盖 SKILL.md 中的元数据字段                  |

overrides 可覆盖字段：`name`, `description`, `version`, `category`, `displayName`, `ownerUserId`, `argumentHint`, `license`, `compatibility` 等。

**响应:** [SkillInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#skillinfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#skillinfo")

---

### 11.2 获取技能

`GET /agent-bus/v1/skill/{skillId} `

**响应:** [SkillInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#skillinfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#skillinfo")

---

### 11.3 按名称获取技能

`GET /agent-bus/v1/skill/byName/{skillName} `

**响应:** [SkillInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#skillinfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#skillinfo")

---

### 11.4 更新技能

`PUT /agent-bus/v1/skill/{skillId} `

可更新技能包和/或元数据覆盖。至少提供 `packageData` 或 `overrides` 之一。

**响应:** [SkillInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#skillinfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#skillinfo")

---

### 11.5 禁用技能

`POST /agent-bus/v1/skill/{skillId}/disable `

**响应:** [SkillInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#skillinfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#skillinfo")

---

### 11.6 弃用技能

`POST /agent-bus/v1/skill/{skillId}/deprecate `

**响应:** [SkillInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#skillinfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#skillinfo")

---

### 11.7 激活技能

`POST /agent-bus/v1/skill/{skillId}/activate `

**响应:** [SkillInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#skillinfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#skillinfo")

---

### 11.8 列出技能

`GET /agent-bus/v1/skill/list `

**查询参数:**

| 参数

```
| 类型
```

| 默认值

```
| 说明


                           |
```

| ---------------- | -------- | ------------ | ------------------------------------ |
| `category` | string | -          | 按分类过滤                         |
| `status`   | int    | 0 (ACTIVE) | 0=ACTIVE, 1=DISABLED, 2=DEPRECATED |
| `offset`   | int    | 0          |                                    |
| `limit`    | int    | 50         |                                    |

**响应:** `{ items: [SkillInfo, ...], offset, limit, size }`

---

### 11.9 获取技能指令

`GET /agent-bus/v1/skill/{skillId}/instruction `

**响应:**

`{ "skillId": "skill_xxx", "name": "search-database", "description": "Search distributed tables", "instruction": "## Usage Guide\n\nYou can use this skill to..." } `

说明：

* 该接口是 Tier-2 指令体的只读原语。
* 是否读取、何时注入、如何在 tool loop 中续传，由应用层决定。

---

### 11.10 列出技能包文件

`GET /agent-bus/v1/skill/{skillId}/files/list `

**响应:**

`{ "skillId": "skill_xxx", "items": ["SKILL.md", "data/schema.json"], "size": 2 } `

说明：路径以 skill 包目录作为根目录，末尾为文件名。

### 11.11 获取技能包单个文件

`GET /agent-bus/v1/skill/{skillId}/files/get?filePath=data/schema.json `

**查询参数:** `filePath`（必填，相对 skill 包根目录的文件路径）

**响应:**

`{ "skillId": "skill_xxx", "filePath": "data/schema.json", "encoding": "base64", "content": "<base64 内容>", "size": 1024 } `

### 11.12 批量获取技能包文件

`POST /agent-bus/v1/skill/{skillId}/files/batchGet `

**请求体:**

`{ "filePaths": ["SKILL.md", "data/schema.json"] } `

**响应:**

`{ "skillId": "skill_xxx", "items": [ { "skillId": "skill_xxx", "filePath": "SKILL.md", "encoding": "base64", "content": "<base64 内容>", "size": 2048 } ], "size": 1 } `

说明：

* 文件内容以 base64 字符串存储并返回，`size` 为原始文件字节数。
* 文件的解释、执行、二次注入和本地落地方式由应用层负责。

---

## 12. 技能绑定与访问控制

### 12.1 绑定技能到 Agent

`POST /agent-bus/v1/skill/bind `

**请求体:**

| 字段

```
| 类型
```

| 必填

| 说明

```
|
```

| ---------------------- | -------- | ------ | ------------------------------------------------------------------------------------------- |
| `agentId`        | string | 是   | Agent ID                                                                                  |
| `skillId`        | string | 是   | 要绑定的技能 ID，必须状态为 ACTIVE                                                        |
| `descOverride`   | string | 否   | 描述覆盖，非空时在该 agent 的 Tier-1 目录中替代技能原始 description                       |
| `configOverride` | object | 否   | 配置覆盖，当前支持`disableModelInvocation`（bool），可在 agent 级别覆盖技能的默认设置 |

**响应:** Agent 当前绑定列表 `{ items: [SkillAccessInfo, ...], size }`

---

### 12.2 解绑技能

`POST /agent-bus/v1/skill/unbind `

**请求体:**

| 字段

```
| 类型
```

| 必填

| 说明

```
|
```

| --------------- | -------- | ------ | ---------- |
| `agentId` | string | 是   | Agent ID |
| `skillId` | string | 是   | 技能 ID  |

**响应:** Agent 当前绑定列表

---

### 12.3 启用/禁用绑定

`POST /agent-bus/v1/skill/binding/enable `

**请求体:**

| 字段

```
| 类型
```

| 必填

| 说明

```
|
```

| --------------- | -------- | ------ | ---------- |
| `agentId` | string | 是   | Agent ID |
| `skillId` | string | 是   | 技能 ID  |
| `enabled` | bool   | 是   | 是否启用 |

**响应:** Agent 当前绑定列表

---

### 12.4 列出 Agent 的技能绑定

`GET /agent-bus/v1/skill/{agentId}/bindings `

**响应:** `{ items: [SkillAccessInfo, ...], size }`

---

### 12.5 获取 Agent 的技能目录 (Tier-1)

`GET /agent-bus/v1/skill/{agentId}/catalog `

返回该 agent 绑定的技能中，当前调用用户可见的部分（已剔除被 deny 及不可由 LLM 自动调用的技能）。用于向 LLM 注入 Tier-1 技能概要。

**响应:**

`{ "agentId": "agent_xxx", "userId": "alice", "catalog": [ { "name": "search-database", "description": "Search distributed tables", "argumentHint": "SELECT fields FROM table WHERE condition" }, ... ], "size": 3 } `

---

### 12.6 组装技能上下文（只读原语）

`POST /agent-bus/v1/skill/{agentId}/context `

**请求体:**

| 字段

```
| 类型


 | 必填
```

| 说明

```
|
```

| ------------------------ | ---------- | ------ | --------------------------------------------------------------------- |
| `activeSkillNames` | string[] | 否   | 调用方显式要求附加的技能名称列表（加载 Tier-2）；框架不维护激活状态 |

**响应:**

`{ "catalog": [ SkillCatalogEntry, ... ], "activeInstructions": [ SkillInstruction, ... ], "catalogTokens": 150, "instructionTokens": 800 } `

说明：

* `catalog` 对应 Tier-1，`activeInstructions` 对应调用方显式请求的 Tier-2。
* 该接口用于应用层显式获取 skill 上下文，不代表框架自动维护 skill 激活闭环。

---

### 12.7 禁止业务用户使用技能

`POST /agent-bus/v1/skill/user/deny `

**请求体:** `agentId`, `skillId`, `userId`

**响应:** `{ agentId, userId, skillIds: [...], size }`

---

### 12.8 允许业务用户使用技能

`POST /agent-bus/v1/skill/user/allow `

**请求体:** `agentId`, `skillId`, `userId`

**响应:** `{ agentId, userId, skillIds: [...], size }`

---

### 12.9 列出业务用户被禁止的技能

`GET /agent-bus/v1/skill/{agentId}/user/{userId}/denied `

**响应:** `{ agentId, userId, skillIds: [...], size }`

---

## 13. Chat Completions (对话补全)

这是 Agent 应用的核心接口，集成了上下文组装、LLM 调用、消息持久化的完整流程。

`POST /agent-bus/v1/chat/completions `

自动组装与手动组装共用同一个 endpoint，通过请求体中是否包含 `assemblyConfig` 字段切换：不带 `assemblyConfig` 走自动组装，带则走手动组装。

### 自动组装模式 (Auto-Assembly)

**请求体:**

| 字段

```
| 类型


         | 必填


 | 说明


                                                                                                                                 |
```

| ------------------------ | ------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `sessionId`        | string           | 是       | 会话 ID，必须为 ACTIVE 状态                                                                                                              |
| `message`          | string           | 条件必填 | 用户消息文本，会被自动追加到会话历史中。`message`和`toolResults`至少提供一个                                                     |
| `toolResults`      | ToolResult[]     | 条件必填 | 工具执行结果列表，与`message`至少提供一个。框架自动追加为`role=tool`消息后调用 LLM 续传                                          |
| `stream`           | bool             | 否       | 是否流式返回（默认 true）。true 时返回 SSE 流，false 时返回完整 JSON                                                                     |
| `tools`            | ToolDefinition[] | 否       | 应用层工具定义列表（OpenAI function calling 格式），注入到 LLM 请求中                                                                    |
| `activeSkillNames` | string[]         | 否       | 调用方显式要求本次附加的技能名称列表；若提供，框架会加载这些技能的 Tier-2 指令注入本次上下文，但不维护激活状态                           |
| `llmConfigId`      | string           | 否       | 指定本次请求使用的 LLM 配置 ID，临时覆盖 session/agent 默认配置(会进行权限校验，因此要确保填写的llmConfigId是当前agent/user有权限使用的) |

ToolResult 结构:

| 字段

```
| 类型
```

| 必填

| 说明

```
|
```

| ------------------ | -------- | ------ | ------------------------------------------------------------------ |
| `toolCallId` | string | 是   | 工具调用 ID，需与上一轮 assistant 返回的`toolCalls[].id`一致 |
| `content`    | string | 否   | 工具执行结果的文本内容                                           |

框架自动执行：

1. 解析当前轮输入（`toolResults` / `message`）
2. 解析当前 session 可用的 LLM 配置
3. 加载 Agent 配置 + 系统提示词
4. 组装技能目录 (Tier-1)，并在调用方显式传入 `activeSkillNames` 时附加 Tier-2 指令
5. 检索相关记忆
6. 按当前 agent 的历史模式组装候选上下文： `summary-first` 时使用 `latest summary + raw tail + current turn` `token-window-only` 时使用纯 token 滑窗历史
7. 若处于 `summary-first` 且候选 prompt 预计达到 `triggerRatio` 阈值，则先同步执行自动摘要并重新组装上下文
8. 通过硬性上下文窗口检查后，再将当前轮输入追加到会话
9. 调用 LLM
10. 追加助手回复到会话（含 token 统计）

说明：

* `toolResults` 只传工具结果、不传 `message` 是合法用法，适用于 tool calling 的续传轮次
* 当 `message` 和 `toolResults` 同时存在时，框架会按 `toolResults -> message` 的顺序作为当前轮输入参与装配，并在窗口检查通过后按同顺序落库
* 自动装配中的记忆检索仅使用当前 `message` 作为查询文本；如果本轮只有 `toolResults`，则不会新增一次记忆查询
* `activeSkillNames` 仅表示本次请求显式附加的 Tier-2；是否在 agent loop 中续传或变更由应用层决定
* 框架不会基于 Tier-1 catalog 自动推断、激活或恢复 Skill
* 自动摘要始终排除当前这次 pending turn；当前输入不会同时出现在新 summary 和 current turn 中

**典型 Tool Calling 流程：**

`1. POST /chat/completions { "message": "计算 1+1", "tools": [...] } → 返回 { "toolCalls": [{"id": "call_1", "function": {"name": "calc", "arguments": "..."}}] } 2. POST /chat/completions { "toolResults": [{"toolCallId": "call_1", "content": "2"}], "tools": [...] } → 框架自动追加 tool_result 到会话，组装上下文，调用 LLM → 返回 { "content": "1+1 的结果是 2" } `

### 手动组装模式 (Manual-Assembly)

**请求体:**

| 字段

```
| 类型


     | 必填


 | 说明


                                      |
```

| ---------------------- | -------------- | ---------- | ----------------------------------------------- |
| `sessionId`      | string       | 是       | 会话 ID，必须为 ACTIVE 状态                   |
| `message`        | string       | 条件必填 | 用户消息文本，与`toolResults`至少提供一个 |
| `toolResults`    | ToolResult[] | 条件必填 | 工具执行结果列表，与`message`至少提供一个 |
| `stream`         | bool         | 否       | 是否流式返回（默认 true）                     |
| `llmConfigId`    | string       | 否       | 指定本次请求使用的 LLM 配置 ID                |
| `assemblyConfig` | object       | 是       | 手动组装配置，由应用层控制上下文构成          |

`assemblyConfig` 结构:

| 字段

```
| 类型


         | 说明


                                                                               |
```

| ------------------------- | ------------------ | ---------------------------------------------------------------------------------------- |
| `systemPrompt`      | string           | 自定义系统提示词，覆盖 agent 默认的 systemPrompt                                       |
| `contextBlocks`     | ContextBlock[]   | 自定义上下文块列表，按`position`插入组装管线（见下方 ContextBlock 结构与消息顺序） |
| `tools`             | ToolDefinition[] | 工具定义列表（OpenAI function calling 格式）                                           |
| `activeSkillNames`  | string[]         | 调用方显式要求附加的 Tier-2 技能名称列表                                               |
| `excludeSkillNames` | string[]         | 排除的技能名称列表（从 catalog 和 instruction 中移除）                                 |
| `noSkillCatalog`    | bool             | 是否跳过 Tier-1 技能目录注入（默认 false）                                             |

`ContextBlock` 结构:

| 字段

```
| 类型
```

| 必填

| 说明

```
|
```

| ---------------- | -------- | ------ | ----------------------------------------------------------------------------------------------------------- |
| `name`     | string | 是   | 块标识符，仅用于校验和调试，不注入 prompt                                                                 |
| `content`  | string | 是   | 注入的文本内容                                                                                            |
| `position` | string | 否   | 插入位置，可选`after_system`/`before_history`/`before_current_turn`，默认`before_history` |

每个 block 都会作为一条 `role=system` 消息注入；同一位置的多个 block 按数组顺序追加。

**手动组装消息顺序：**

1. system prompt（`assemblyConfig.systemPrompt` 或 agent 默认）
2. `after_system` 位置的 contextBlocks
3. 技能目录 Tier-1（若未通过 `noSkillCatalog` 关闭）
4. 技能指令 Tier-2（来自 `activeSkillNames`）
5. 记忆检索结果
6. `before_history` 位置的 contextBlocks
7. 历史部分（`summary-first` 时为 `latest summary + raw tail`，否则为纯 token 滑窗历史）
8. `before_current_turn` 位置的 contextBlocks
9. 本轮输入（`message` / `toolResults`）

说明：

* contextBlocks 的 token 在预算分配早期被预扣，不会被裁剪；过长会挤压历史和记忆预算
* `after_system` 用于全局规则，`before_history` 用于本轮参考资料，`before_current_turn` 用于必须被 LLM 立即看到的单轮约束或动态快照

### 非流式响应

当 `stream=false` 时，`data` 内部结构为：

`{ "requestId": "req_xxx", "sessionId": "sess_001", "model": "gpt-4", "llmConfigId": "llm_xxx", "content": "这是 LLM 的回复...", "toolCalls": [ { "id": "call_xxx", "type": "function", "function": { "name": "search_database", "arguments": "{\"query\":\"SELECT ...\"}" } } ], "finishReason": "stop", "usage": { "promptTokens": 1200, "completionTokens": 300, "totalTokens": 1500 }, "latencyMs": 2500, "metadata": {} } `

### 流式响应 (SSE)

当 `stream=true`（默认）时，返回 SSE 流：

`event: stream_start data: {"type":"STREAM_START","msgId":"...","correlationId":"req_xxx","action":"chat.completions","agentId":"agent_xxx","sessionId":"sess_001","data":{"requestId":"req_xxx","model":"<resolved-model>","llmConfigId":"llm_xxx"}} event: chunk data: {"type":"STREAM_CHUNK","msgId":"...","correlationId":"req_xxx","action":"chat.completions","agentId":"agent_xxx","sessionId":"sess_001","data":{"content":"这是"}} event: chunk data: {"type":"STREAM_CHUNK","msgId":"...","correlationId":"req_xxx","action":"chat.completions","agentId":"agent_xxx","sessionId":"sess_001","data":{"content":"LLM"}} event: chunk data: {"type":"STREAM_CHUNK","msgId":"...","correlationId":"req_xxx","action":"chat.completions","agentId":"agent_xxx","sessionId":"sess_001","data":{"content":"的回复"}} event: stream_end data: {"type":"STREAM_END","msgId":"...","correlationId":"req_xxx","action":"chat.completions","agentId":"agent_xxx","sessionId":"sess_001","data":{...}} `

---

## 14. LLM Complete (直接调用 LLM)

绕过上下文组装，直接发送消息给 LLM。适用于应用自行构建消息列表的场景。

`POST /agent-bus/v1/llm/complete `

**请求体:**

| 字段

```
| 类型


         | 必填
```

| 说明

```
|
```

| ------------------- | ------------------ | ------ | --------------------------------------------------------------------------------------- |
| `agentId`     | string           | 是   | Agent ID，用于解析 LLM 配置（从 agent 绑定的 LLM 列表中选择）                         |
| `sessionId`   | string           | 否   | 会话 ID。指定时使用 session 归属用户和 session 级 LLM 配置                            |
| `messages`    | LLMMessage[]     | 是   | 完整的消息列表（由应用层自行构建），直接发送给 LLM，框架不做上下文组装                |
| `tools`       | ToolDefinition[] | 否   | 工具定义列表（OpenAI function calling 格式）                                          |
| `model`       | string           | 否   | 指定模型名称，覆盖 LLM 配置中的 model                                                 |
| `stream`      | bool             | 否   | 是否流式返回（默认 true）                                                             |
| `llmConfigId` | string           | 否   | 指定使用的 LLM 配置 ID。必须属于当前用户在该 agent 下的有效可选集合（后台会校验权限） |
| `requestId`   | string           | 否   | 请求追踪 ID，不指定时自动生成                                                         |

LLMMessage 结构:

`{ "role": "user", "content": "你好" } `

ToolDefinition 结构:

`{ "type": "function", "function": { "name": "search_database", "description": "搜索数据库表", "parameters": { "type": "object", "properties": { "query": { "type": "string", "description": "SQL 查询" } }, "required": ["query"] } } } `

**响应:** 同 [Chat Completions 响应](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#%E9%9D%9E%E6%B5%81%E5%BC%8F%E5%93%8D%E5%BA%94 "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#%E9%9D%9E%E6%B5%81%E5%BC%8F%E5%93%8D%E5%BA%94")

---

## 15. Context Preview (上下文预览)

调试接口，预览上下文组装结果但不调用 LLM。可用于验证 contextConfig 配置效果、检查 token 预算分配、确认技能和记忆是否正确注入。

`POST /agent-bus/v1/context/preview `

**请求体:** 同 Chat Completions（`sessionId`, `message`, `toolResults`, `tools`, `activeSkillNames`, `assemblyConfig` 等）。`message` 和 `toolResults` 至少提供一个。

说明：

* `context/preview` 会按与 `/chat/completions` 相同的规则组装当前轮输入
* 预览中的 `message` / `toolResults` 仅作为 pending turn 参与组装，不会写入 session
* `activeSkillNames` 仍表示调用方显式附加的 Tier-2，不代表框架自动维护激活状态

**响应:**

`{ "agentId": "agent_001", "sessionId": "sess_001", "userId": "admin", "assemblyMode": "auto", "messages": [ { "role": "system", "content": "你是一个..." }, { "role": "system", "content": "对话摘要：用户之前询问了..." }, { "role": "user", "content": "历史消息..." }, { "role": "assistant", "content": "历史回复..." }, { "role": "tool", "toolCallId": "call_1", "content": "工具执行结果" }, { "role": "user", "content": "当前问题" } ], "tools": [ ... ], "estimatedTokens": 4200, "detail": { "assemblyMode": "auto", "memoriesIncluded": 3, "messagesIncluded": 8, "skillsInCatalog": 5, "activeInstructions": 1, "toolsIncluded": 2, "historyMode": "summary-first", "summaryConfigured": true, "summaryIncluded": true, "summaryUpToSeqNum": 40, "historyFromSeq": 41, "historyToSeq": 48 }, "tokenBreakdown": { "systemPrompt": 200, "skillCatalog": 150, "skillInstructions": 800, "memoryContext": 300, "summaryMessage": 120, "historyMessages": 2200, "externalContext": 180, "toolDefinitions": 400, "userMessage": 50 } } `

**detail 字段说明：**

| 字段

```
| 类型
```

| 说明

```
|
```

| -------------------------- | -------- | ------------------------------------------------------------ |
| `assemblyMode`       | string | `auto`或`manual`                                   |
| `memoriesIncluded`   | int    | 实际注入到上下文中的记忆条数                               |
| `messagesIncluded`   | int    | 实际包含的历史消息条数                                     |
| `skillsInCatalog`    | int    | Tier-1 技能目录中包含的技能数                              |
| `activeInstructions` | int    | 已加载的 Tier-2 技能指令数                                 |
| `toolsIncluded`      | int    | 工具定义数量                                               |
| `historyMode`        | string | 历史组装模式：`summary-first`或`token-window-only` |
| `summaryConfigured`  | bool   | 当前 agent 是否配置了摘要模型                              |
| `summaryIncluded`    | bool   | 本次是否注入了 latest summary                              |
| `summaryUpToSeqNum`  | long   | 本次使用的 latest summary 覆盖边界；未使用 summary 时为 0  |
| `historyFromSeq`     | long   | 历史窗口起始序列号                                         |
| `historyToSeq`       | long   | 历史窗口结束序列号                                         |

**tokenBreakdown 字段说明：**

| 字段

```
| 类型
```

| 说明

```
|
```

| ------------------------- | ------ | ---------------------------------------------------------------- |
| `systemPrompt`      | int  | system prompt 估算 token 数                                    |
| `skillCatalog`      | int  | Tier-1 技能目录估算 token 数                                   |
| `skillInstructions` | int  | Tier-2 技能指令估算 token 数                                   |
| `memoryContext`     | int  | 记忆内容估算 token 数                                          |
| `summaryMessage`    | int  | latest summary 估算 token 数                                   |
| `historyMessages`   | int  | 历史消息估算 token 数                                          |
| `externalContext`   | int  | contextBlocks 等外部上下文估算 token 数                        |
| `userMessage`       | int  | 当前用户消息估算 token 数；若本轮仅提供`toolResults`则为 0 |
| `toolDefinitions`   | int  | 工具定义估算 token 数                                          |

---

## 16. WebSocket 协议

### 连接

WebSocket 端点路径与 HTTP 相同（通过协议升级）。

### 消息格式

所有 WebSocket 帧为 JSON：

**请求帧:**

请求帧只识别下列顶层字段，其它字段一律忽略：

| 字段

```
| 必填


       | 说明


                                                                                         |
```

| ----------------- | ---------------- | -------------------------------------------------------------------------------------------------- |
| `type`      | 是             | 固定`"REQUEST"`                                                                              |
| `action`    | 是             | 内部 action 名，见下方对照表                                                                     |
| `requestId` | 建议           | 客户端生成的请求 ID，服务端会原样回填到响应帧的`correlationId`                               |
| `agentId`   | 视 action 而定 | 当对应 HTTP 路由含`{agentId}`或接口语义需要时填写                                            |
| `sessionId` | 视 action 而定 | 当对应 HTTP 路由含`{sessionId}`或接口语义需要时填写                                          |
| `payload`   | 视 action 而定 | JSON 对象，承载 HTTP 请求体 + HTTP 查询串 + HTTP 路径参数（除`agentId`/`sessionId`以外） |

`{ "type": "REQUEST", "requestId": "req_001", "action": "chat.completions", "agentId": "agent_xxx", "sessionId": "sess_001", "payload": { "message": "你好", "stream": true } } `

**响应帧:**

`{ "type": "RESPONSE", "msgId": "...", "correlationId": "req_001", "action": "chat.completions", "agentId": "agent_xxx", "sessionId": "sess_001", "data": { ... } } `

**流式帧:**

`{"type": "STREAM_START", "msgId": "...", "correlationId": "req_001", "action": "chat.completions", "agentId": "agent_xxx", "sessionId": "sess_001", "data": {"requestId": "req_001", "model": "<resolved-model>", "llmConfigId": "llm_xxx"}} {"type": "STREAM_CHUNK", "msgId": "...", "correlationId": "req_001", "action": "chat.completions", "agentId": "agent_xxx", "sessionId": "sess_001", "data": {"content": "..."}} {"type": "STREAM_END", "msgId": "...", "correlationId": "req_001", "action": "chat.completions", "agentId": "agent_xxx", "sessionId": "sess_001", "data": {...}} `

**错误帧:**

`{ "type": "ERROR", "msgId": "...", "correlationId": "req_001", "action": "chat.completions", "agentId": "agent_xxx", "sessionId": "sess_001", "error": { "code": "BUS_HANDLER_ERROR", "message": "session not found" }, "headers": { "busErrorCode": "BUS_HANDLER_ERROR", "httpStatus": "500" } } `

### HTTP → WebSocket 参数映射规则

WebSocket 没有 URL 路径和 HTTP 方法，所以 HTTP 接口里的"路径参数 / 查询串 / 请求体"必须统一折叠进 WebSocket 帧。规则只有两条：

1. `agentId`**​ 和 ​**`sessionId`​**​ 放到帧的顶层字段**​（因为它们是信封级字段，服务端有专门的解析路径）。
2. **其它所有参数都放进 ​**`payload`，键名与 HTTP 文档里描述的字段名一致：
   * HTTP 路径里的 `{userId}` / `{memoryId}` / `{llmConfigId}` / `{skillId}` / `{skillName}` / `{id}` → 在 `payload` 里用对应字段（`userId` / `memoryId` / `llmConfigId` / `skillId` / `skillName`，而 `{id}` 按接口语义转成 `agentId` / `sessionId` / `skillId` / `memoryId` / `llmConfigId` 之一）
   * HTTP 查询串里的 `?status=0&limit=100&offset=20` → 在 `payload` 里写 `"status": 0, "limit": 100, "offset": 20`
   * HTTP JSON 请求体字段 → 原样放进 `payload`

同一个字段不能在"顶层 + payload"里同时出现且取值不同，否则服务端会以 `agentId in payload conflicts with ...` 之类的错误拒绝。

**示例 1：多个路径参数**

HTTP：

`GET /agent-bus/v1/skill/{agentId}/user/{userId}/denied `

WebSocket：

`{ "type": "REQUEST", "requestId": "req_42", "action": "skill.user.denied", "agentId": "agent_xxx", "payload": { "userId": "business_user_001" } } `

**示例 2：路径参数 + 查询串**

HTTP：

`GET /agent-bus/v1/session/list?agentId=agent_xxx&status=0&limit=50&offset=0 `

WebSocket：

`{ "type": "REQUEST", "requestId": "req_43", "action": "session.list", "agentId": "agent_xxx", "payload": { "status": 0, "limit": 50, "offset": 0 } } `

**示例 3：路径参数 + 请求体**

HTTP：

`PUT /agent-bus/v1/memory/{memoryId} Body: { "importance": 0.8, "category": "note" } `

WebSocket：

`{ "type": "REQUEST", "requestId": "req_44", "action": "memory.update", "payload": { "memoryId": "mem_abc", "importance": 0.8, "category": "note" } } `

### 支持的 Action

WebSocket 支持所有与 HTTP 相同的 action（无需 HTTP 方法区分），action 名称见各接口说明中的内部名称：

| Action

```
| 对应 HTTP 接口


                        |
```

| ------------------------------- | ------------------------------------------- |
| `agent.register`          | POST /agent/register                      |
| `agent.get`               | GET /agent/{id}                           |
| `agent.update`            | PUT /agent/{id}                           |
| `agent.activate`          | POST /agent/{id}/activate                 |
| `agent.suspend`           | POST /agent/{id}/suspend                  |
| `agent.delete`            | POST /agent/{id}/delete                   |
| `agent.list`              | GET /agent/list                           |
| `agent.auth.grant`        | POST /agent/{id}/auth                     |
| `agent.auth.revoke`       | DELETE /agent/{id}/auth                   |
| `agent.auth.list`         | GET /agent/{id}/auth/list                 |
| `agent.accessible`        | GET /agent/accessible                     |
| `agent.llm.grant`         | POST /agent/{id}/llm/access               |
| `agent.llm.revoke`        | DELETE /agent/{id}/llm/access             |
| `agent.llm.list`          | GET /agent/{id}/llm/list                  |
| `agent.llm.selectable`    | GET /agent/{id}/llm/selectable            |
| `admin.access.grant`      | POST /admin/access                        |
| `admin.access.revoke`     | DELETE /admin/access                      |
| `admin.access.list`       | GET /admin/access                         |
| `user.llm.access.grant`   | POST /user/{id}/llm/access                |
| `user.llm.access.revoke`  | DELETE /user/{id}/llm/access              |
| `user.llm.access.list`    | GET /user/{id}/llm/access                 |
| `llm.config.register`     | POST /llm/config/register                 |
| `llm.config.get`          | GET /llm/config/{id}                      |
| `llm.config.list`         | GET /llm/config/list                      |
| `llm.config.update`       | PUT /llm/config/{id}                      |
| `llm.config.disable`      | POST /llm/config/{id}/disable             |
| `llm.config.delete`       | DELETE /llm/config/{id}                   |
| `llm.complete`            | POST /llm/complete                        |
| `llm.usage`               | GET /llm/usage                            |
| `chat.completions`        | POST /chat/completions                    |
| `context.preview`         | POST /context/preview                     |
| `session.create`          | POST /session/create                      |
| `session.get`             | GET /session/{id}                         |
| `session.update`          | PUT /session/{id}                         |
| `session.archive`         | POST /session/{id}/archive                |
| `session.delete`          | POST /session/{id}/delete                 |
| `session.list`            | GET /session/list                         |
| `session.appendMessage`   | POST /session/{id}/message                |
| `session.getMessages`     | GET /session/{id}/messages                |
| `session.generateSummary` | POST /session/{id}/summary                |
| `memory.store`            | POST /memory/store                        |
| `memory.get`              | GET /memory/{id}                          |
| `memory.update`           | PUT /memory/{id}                          |
| `memory.delete`           | DELETE /memory/{id}                       |
| `memory.search`           | POST /memory/search                       |
| `memory.list`             | GET /memory/list                          |
| `memory.stats`            | GET /memory/stats                         |
| `skill.register`          | POST /skill/register                      |
| `skill.get`               | GET /skill/{id}                           |
| `skill.getByName`         | GET /skill/byName/{name}                  |
| `skill.update`            | PUT /skill/{id}                           |
| `skill.disable`           | POST /skill/{id}/disable                  |
| `skill.deprecate`         | POST /skill/{id}/deprecate                |
| `skill.activate`          | POST /skill/{id}/activate                 |
| `skill.list`              | GET /skill/list                           |
| `skill.getInstruction`    | GET /skill/{id}/instruction               |
| `skill.files.list`        | GET /skill/{id}/files/list                |
| `skill.files.get`         | GET /skill/{id}/files/get                 |
| `skill.files.batchGet`    | POST /skill/{id}/files/batchGet           |
| `skill.bind`              | POST /skill/bind                          |
| `skill.unbind`            | POST /skill/unbind                        |
| `skill.binding.enable`    | POST /skill/binding/enable                |
| `skill.bindings`          | GET /skill/{agentId}/bindings             |
| `skill.catalog`           | GET /skill/{agentId}/catalog              |
| `skill.context`           | POST /skill/{agentId}/context             |
| `skill.user.deny`         | POST /skill/user/deny                     |
| `skill.user.allow`        | POST /skill/user/allow                    |
| `skill.user.denied`       | GET /skill/{agentId}/user/{userId}/denied |

---

## 17. 数据结构参考

### AgentInfo

| 字段

```
| 类型


  | 说明


                                                                                                                                                                                                                                                                                                                                                                                                                                        |
```

| --------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `agentId`       | string    | 全局唯一 ID，由框架在注册时自动生成                                                                                                                                                                                                                                                                                                                                                                                                             |
| `agentName`     | string    | Agent 可读名称，必填                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `agentType`     | string    | 类型标签，自由填写的字符串（如`"chat"`、`"task"`、`"pipeline"`），框架不做枚举限制也不据此分支，仅用于分类展示                                                                                                                                                                                                                                                                                                                      |
| `ownerUserId`   | string    | 所属 DolphinDB 用户，隐式拥有该 agent 的`AGENT_MANAGE`                                                                                                                                                                                                                                                                                                                                                                                      |
| `description`   | string    | Agent 描述信息                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `status`        | int       | 状态值：0=REGISTERED, 1=ACTIVE, 2=SUSPENDED, 3=DELETED                                                                                                                                                                                                                                                                                                                                                                                          |
| `statusName`    | string    | 状态可读名称：`REGISTERED`（已注册，不可创建会话）/`ACTIVE`（已激活，可正常使用）/`SUSPENDED`（已挂起）/`DELETED`（已删除）                                                                                                                                                                                                                                                                                                     |
| `systemPrompt`  | string    | 系统提示词，自动装配时作为 context 的首条 system message 注入                                                                                                                                                                                                                                                                                                                                                                                   |
| `llmConfigId`   | string    | 默认 LLM 配置 ID。注册时如果指定，会自动创建 agent 与该 LLM 的绑定关系（`isDefault=true`,`priority=0`）                                                                                                                                                                                                                                                                                                                                 |
| `contextConfig` | object    | 上下文组装配置，控制历史窗口、记忆检索、技能注入、摘要触发等行为，详见[contextConfig 结构](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#contextconfig "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#contextconfig") |
| `memoryConfig`  | object    | 记忆管理配置，当前包含`embeddingEnabled`等字段，详见[memoryConfig 结构](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#memoryconfig "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#memoryconfig")                  |
| `config`        | object    | 自定义扩展配置，框架原样存储不做解析，可用于业务层自定义用途                                                                                                                                                                                                                                                                                                                                                                                    |
| `version`       | int       | 配置版本号，注册时为 1，可用于客户端缓存失效判断                                                                                                                                                                                                                                                                                                                                                                                                |
| `schemaVersion` | int       | 行 Schema 版本号                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `extra`         | string    | 预留扩展字段                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `createTime`    | timestamp | 创建时间                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `updateTime`    | timestamp | 最后更新时间                                                                                                                                                                                                                                                                                                                                                                                                                                    |

---

### contextConfig

上下文组装配置，控制 `ContextAssembler` 在组装 LLM 请求上下文时的行为。所有字段均为可选，未提供时使用默认值。字段类型不匹配时静默回退到默认值。

| 字段

```
| 类型
```

| 默认值

| 说明

```
|
```

| ------------------------------ | -------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `maxContextTokens`       | int    | 128000 | 上下文总 token 上限（通常对齐模型的上下文窗口大小）                                                                                                                                                                                                                                                                                                                                         |
| `maxHistoryTokens`       | int    | 0      | 历史消息 token 上限，0 表示自动填满剩余预算，滑动窗口                                                                                                                                                                                                                                                                                                                                       |
| `includeMemory`          | bool   | true   | 是否在上下文中包含记忆检索结果                                                                                                                                                                                                                                                                                                                                                              |
| `memoryTopK`             | int    | 5      | 记忆检索返回的最大条数（最小值 1）                                                                                                                                                                                                                                                                                                                                                          |
| `memoryTokenBudget`      | int    | 2000   | 记忆部分的 token 预算上限                                                                                                                                                                                                                                                                                                                                                                   |
| `includeSkills`          | bool   | true   | 是否包含已激活的 Skill 指令                                                                                                                                                                                                                                                                                                                                                                 |
| `includeSkillCatalog`    | bool   | true   | 是否注入 Skill 目录（Tier-1 概要）                                                                                                                                                                                                                                                                                                                                                          |
| `instructionTokenBudget` | int    | 5000   | 已激活 Skill 指令的 token 预算上限                                                                                                                                                                                                                                                                                                                                                          |
| `summaryConfig`          | object | —     | 会话摘要配置，详见[summaryConfig 结构](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#summaryconfig "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#summaryconfig") |

### memoryConfig

Agent 级记忆配置。`memoryConfig.embeddingEnabled` 用于决定该 agent 是否启用 memory embedding 能力。

| 字段

```
| 类型
```

| 默认值

```
| 说明


                                                                                                |
```

| ------------------------ | ------ | ------------- | --------------------------------------------------------------------------------------------------------- |
| `embeddingEnabled` | bool | `false` | 是否为该 agent 启用 memory embedding。注册时未显式传入会按默认值`false`落库；注册成功后该字段不可变 |

注意：memory 写请求的 lane 并发策略由全局服务端配置 `agentFramework.memory.lanePolicy` 控制，不属于 agent 级 `memoryConfig`。

​**预算分配顺序**​（优先级从高到低）：

`总预算 = maxContextTokens

1. System Prompt        固定分配
2. User Message         固定分配（当前消息）
3. Skill Catalog        固定分配（~100 tokens/skill）
4. Tool Definitions     固定分配（应用层透传，框架计入预算）
5. Active Instructions  配额分配（instructionTokenBudget）
6. Memory Context       配额分配（memoryTokenBudget）
7. History Window       填满剩余预算
   `

说明：

* 框架内部仍会为 chat 输出预留运行时空间，用于阈值判断和硬性窗口检查
* 该预留不是 `contextConfig` 的对外字段

**示例：**

`{ "maxContextTokens": 128000, "maxHistoryTokens": 8000, "includeMemory": true, "memoryTopK": 5, "includeSkills": true, "summaryConfig": { "summaryLlmConfigId": "llm_summary_xxx", "triggerRatio": 0.8, "tailKeepTokens": 0, "onOverflow": "error" } } `

---

### summaryConfig

会话摘要配置，嵌套在 `contextConfig.summaryConfig` 中，控制历史管理是走 `summary-first` 还是 `token-window-only`。所有字段均为可选。

| 字段

```
| 类型
```

| 默认值

```
| 说明


                                                                                              |
```

| -------------------------- | -------- | --------------- | ------------------------------------------------------------------------------------------------------- |
| `summaryLlmConfigId` | string | `""`      | 摘要模型配置 ID。为空时不启用摘要模式，历史退化到`token-window-only`                              |
| `triggerRatio`       | double | `0.8`     | 自动摘要阈值。候选 prompt 预计消耗达到`contextWindow * triggerRatio`时，chat 主链路先执行前置摘要 |
| `tailKeepTokens`     | int    | `0`       | 自动/手动摘要后保留多少最新 raw 历史 token 不压缩。`0`表示不保留 raw tail                         |
| `onOverflow`         | string | `"error"` | summary 也无法压缩到窗口内时的处理策略。当前固定为`error`                                         |
| `promptTemplate`     | string | `""`      | 自定义摘要 system prompt。为空时使用内置模板                                                          |

**运行时语义：**

1. `summaryLlmConfigId` 非空时，历史管理进入 `summary-first`
2. `summaryLlmConfigId` 为空时，历史管理进入 `token-window-only`
3. 自动摘要由 `/chat/completions` 主链路同步前置触发
4. 自动摘要覆盖范围明确排除当前 pending turn
5. 运行时只读取最新一条 summary，边界由 `summaryUpToSeqNum` 确定

**示例：**

`{ "summaryLlmConfigId": "llm_summary_xxx", "triggerRatio": 0.8, "tailKeepTokens": 0, "onOverflow": "error", "promptTemplate": "" } `

---

### defaultParams

LLM 配置的默认请求参数，在每次 LLM 调用时自动应用。参数分为两类：

​**标准参数**​（框架显式解析并映射到 LLM 请求字段）：

| 参数

```
| 类型


 | 说明


                                                     |
```

| ---------------------------------- | ---------- | -------------------------------------------------------------- |
| `temperature`                | double   | 采样温度，控制输出随机性。值越高输出越随机，值越低越确定     |
| `maxTokens`/`max_tokens` | int      | 最大输出 token 数（两种命名均支持，优先读取`maxTokens`） |
| `topP`/`top_p`           | double   | 核采样概率阈值（两种命名均支持，优先读取`topP`）         |
| `stop`                       | string[] | 停止序列列表，LLM 生成到这些字符串时自动停止                 |

​**扩展参数**​（透传到 LLM provider）：

`defaultParams` 中除标准参数和保留字段（`model`、`stream`、`tools`、`messages` 等）之外的所有其他 key，都会被原样透传到 LLM provider 的请求 payload 中。可用于传递 provider 特有的参数（如 OpenAI 的 `frequency_penalty`、`presence_penalty`、`seed`，Anthropic 的 `thinking` 等）。

`capability`、`embeddingDimension`、`embeddingMetric`、`embeddingNormalize` 属于结构化配置字段，不放入 `defaultParams`。

​**三层覆盖机制**​：

`1. defaultParams（LLM 配置级默认值） ↓ 被覆盖 2. requestOverrides（请求级参数，通过 chat/completions 或 llm/complete 的请求体传入） ↓ 合并为 3. 最终 LLM 请求参数 `

请求级参数只覆盖显式指定的字段，未指定的字段保持 defaultParams 的值。

**示例：**

`{ "temperature": 0.7, "maxTokens": 4096, "topP": 0.9, "stop": ["\n\n"], "frequency_penalty": 0.5, "seed": 42 } `

---

### retryConfig

LLM 调用失败时的重试配置。所有字段均为可选，未提供时使用默认值。

| 参数

```
| 类型
```

| 默认值

```
| 说明


                                                                          |
```

| ---------------------------- | -------- | ---------------------- | ----------------------------------------------------------------------------------- |
| `maxRetries`           | int    | 3                    | 最大重试次数。设为 0 表示不重试                                                   |
| `initialDelayMs`       | int    | 1000                 | 首次重试前的等待时间（毫秒）                                                      |
| `backoffMultiplier`    | double | 2.0                  | 退避乘数，每次重试的等待时间为`initialDelayMs × backoffMultiplier ^ attempt` |
| `maxDelayMs`           | int    | 30000                | 单次重试等待时间的上限（毫秒），防止退避时间无限增长                              |
| `retryableStatusCodes` | int[]  | [429, 500, 502, 503] | 可重试的 HTTP 状态码集合。仅当 LLM 返回这些状态码时才触发重试                     |

**重试行为：**

* 网络错误（连接失败、超时等）始终触发重试，不受 `retryableStatusCodes` 限制
* LLM 返回错误时，仅当状态码在 `retryableStatusCodes` 集合中且异常标记为 retryable 时才重试
* 如果 LLM 响应头包含 `Retry-After`，优先使用该值作为等待时间，否则按退避公式计算
* 所有重试耗尽后仍失败，则尝试 fallback 到 agent 绑定的下一个 LLM 配置（按 priority 顺序）

**示例：**

`{ "maxRetries": 3, "initialDelayMs": 1000, "backoffMultiplier": 2.0, "maxDelayMs": 30000, "retryableStatusCodes": [429, 500, 502, 503] } `

---

### AuthInfo

| 字段

```
| 类型


  | 说明


                                        |
```

| --------------------- | ----------- | ------------------------------------------------- |
| `id`            | string    | 授权记录 ID                                     |
| `userId`        | string    | DolphinDB 用户 ID                               |
| `agentId`       | string    | 被授权访问的 Agent ID                           |
| `permission`    | string    | 权限级别：`AGENT_MANAGE`/`AGENT_INVOKE` |
| `grantedBy`     | string    | 执行授权操作的用户 ID                           |
| `schemaVersion` | int       | 行 Schema 版本号                                |
| `extra`         | string    | 预留扩展字段                                    |
| `createTime`    | timestamp | 授权时间                                        |
| `expireTime`    | timestamp | 授权过期时间（为空表示永不过期）                |

---

### GlobalAccessInfo

| 字段

```
| 类型


  | 说明


                         |
```

| --------------------- | ----------- | ---------------------------------- |
| `id`            | string    | 授权记录 ID                      |
| `userId`        | string    | DolphinDB 用户 ID                |
| `permission`    | string    | 当前固定为`AGENT_ADMIN`      |
| `grantedBy`     | string    | 执行授权操作的用户 ID            |
| `schemaVersion` | int       | 行 Schema 版本号                 |
| `extra`         | string    | 预留扩展字段                     |
| `createTime`    | timestamp | 授权时间                         |
| `expireTime`    | timestamp | 授权过期时间（为空表示永不过期） |

---

### UserLlmAccessInfo

| 字段

```
| 类型


  | 说明


                         |
```

| --------------------- | ----------- | ---------------------------------- |
| `id`            | string    | 授权记录 ID                      |
| `userId`        | string    | DolphinDB 用户 ID                |
| `llmConfigId`   | string    | 被授予的全局 LLM 配置 ID         |
| `grantedBy`     | string    | 执行授权操作的用户 ID            |
| `schemaVersion` | int       | 行 Schema 版本号                 |
| `extra`         | string    | 预留扩展字段                     |
| `createTime`    | timestamp | 授权时间                         |
| `expireTime`    | timestamp | 授权过期时间（为空表示永不过期） |

---

### LlmProviderInfo

| 字段

```
| 类型


  | 说明


                                                                                                                |
```

| --------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------- |
| `providerId`    | string    | 全局唯一 ID，注册时自动生成                                                                                             |
| `name`          | string    | Provider 名称，用于标识和展示                                                                                           |
| `adapterType`   | string    | 运行时 provider 适配器类型：`openai`/`openai-compatible`/`anthropic`/`deepseek`/`azure`/`local` |
| `baseUrl`       | string    | Provider 级基础 URL，如`https://api.openai.com`                                                                     |
| `apiKey`        | string    | Provider API Key。对外返回时始终脱敏为`***`；未配置时返回空字符串                                                   |
| `status`        | int       | 状态值：0=ACTIVE, 1=DISABLED, 2=DELETED                                                                                 |
| `statusName`    | string    | 状态名称：`ACTIVE`/`DISABLED`/`DELETED`                                                                     |
| `schemaVersion` | int       | 行 Schema 版本号                                                                                                        |
| `extra`         | string    | 预留扩展字段                                                                                                            |
| `createTime`    | timestamp | 创建时间                                                                                                                |
| `updateTime`    | timestamp | 最后更新时间                                                                                                            |

---

### LlmConfigInfo

| 字段

```
| 类型


                                                                                                                                                                                                                                                                                                                                                                   | 说明


                                                                                                                                                                                              |
```

| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `llmConfigId`        | string                                                                                                                                                                                                                                                                                                                                                                     | 全局唯一 ID，注册时自动生成                                                                                                                                                                           |
| `name`               | string                                                                                                                                                                                                                                                                                                                                                                     | 配置名称，用于标识和展示                                                                                                                                                                              |
| `providerId`         | string                                                                                                                                                                                                                                                                                                                                                                     | 关联的 provider ID                                                                                                                                                                                    |
| `provider`           | [LlmProviderInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmproviderinfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmproviderinfo") | 关联 provider 的完整信息；其中`apiKey`始终脱敏返回                                                                                                                                                |
| `model`              | string                                                                                                                                                                                                                                                                                                                                                                     | 模型名称（如`gpt-4`、`claude-sonnet-4-20250514`），传递给 LLM API                                                                                                                             |
| `capability`         | string                                                                                                                                                                                                                                                                                                                                                                     | 配置能力类型：`chat`/`embedding`                                                                                                                                                              |
| `embeddingDimension` | int                                                                                                                                                                                                                                                                                                                                                                        | 向量维度；`capability=chat`时为 0                                                                                                                                                                 |
| `embeddingMetric`    | string                                                                                                                                                                                                                                                                                                                                                                     | embedding 相似度规则；`capability=chat`时为空                                                                                                                                                     |
| `embeddingNormalize` | bool                                                                                                                                                                                                                                                                                                                                                                       | embedding 是否归一化；`capability=chat`时为`false`                                                                                                                                            |
| `requestPath`        | string                                                                                                                                                                                                                                                                                                                                                                     | 相对`provider.baseUrl`的请求路径，必须以`/`开头，可包含查询串                                                                                                                                 |
| `defaultParams`      | object                                                                                                                                                                                                                                                                                                                                                                     | 默认请求参数，支持`temperature`（double）、`maxTokens`/`max_tokens`（int）、`topP`/`top_p`（double）、`stop`（string[]）等。请求级参数可覆盖此处的默认值                      |
| `contextWindow`      | int                                                                                                                                                                                                                                                                                                                                                                        | 模型上下文窗口大小（token 数），用于上下文组装时的预算计算。为 0 时使用`contextConfig.maxContextTokens`                                                                                           |
| `maxConcurrency`     | int                                                                                                                                                                                                                                                                                                                                                                        | 该 LLM 配置的最大并发请求数                                                                                                                                                                           |
| `rateLimitRPM`       | int                                                                                                                                                                                                                                                                                                                                                                        | 速率限制（每分钟最大请求数）                                                                                                                                                                          |
| `timeoutMs`          | int                                                                                                                                                                                                                                                                                                                                                                        | 单次 LLM 请求超时时间（毫秒）                                                                                                                                                                         |
| `retryConfig`        | object                                                                                                                                                                                                                                                                                                                                                                     | 重试配置：`maxRetries`（默认 3）、`initialDelayMs`（默认 1000）、`backoffMultiplier`（默认 2.0）、`maxDelayMs`（默认 30000）、`retryableStatusCodes`（默认 [429, 500, 502, 503]） |
| `status`             | int                                                                                                                                                                                                                                                                                                                                                                        | 状态值：0=ACTIVE, 1=DISABLED, 2=DELETED                                                                                                                                                               |
| `statusName`         | string                                                                                                                                                                                                                                                                                                                                                                     | 状态名称：`ACTIVE`（可用）/`DISABLED`（已禁用，绑定到 agent 的此配置不会参与 LLM 选择）/`DELETED`（已软删除，仅保留查询与审计用途）                                                       |
| `schemaVersion`      | int                                                                                                                                                                                                                                                                                                                                                                        | 行 Schema 版本号                                                                                                                                                                                      |
| `extra`              | string                                                                                                                                                                                                                                                                                                                                                                     | 预留扩展字段                                                                                                                                                                                          |
| `createTime`         | timestamp                                                                                                                                                                                                                                                                                                                                                                  | 创建时间                                                                                                                                                                                              |
| `updateTime`         | timestamp                                                                                                                                                                                                                                                                                                                                                                  | 最后更新时间                                                                                                                                                                                          |

---

### AgentLlmBindingInfo

继承 LlmConfigInfo 的所有字段，额外包含：

| 字段

```
| 类型
```

| 说明

```
|
```

| ------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `isDefault`   | bool   | 是否为默认 LLM。每个 agent 仅允许一个默认配置，设为`true`时`priority`强制为 0                                                                                           |
| `priority`    | int    | LLM 选择优先级，数值越小优先级越高。运行时按 priority 升序排列形成 fallback 链：优先使用 priority 最小的，调用失败时自动尝试下一个。请求级`llmConfigId`可临时覆盖优先级排序 |
| `accessExtra` | string | 绑定级别的扩展字段                                                                                                                                                              |

---

### SelectableLlmInfo

继承 LlmConfigInfo 的所有字段，额外包含：

| 字段

```
| 类型


   | 说明


                                                 |
```

| ------------------------------ | ------------ | ---------------------------------------------------------- |
| `source`                 | string     | 来源：`agent`/`user`/`both`                  |
| `isAgentDefault`         | bool       | 是否为该 agent 当前默认模型                              |
| `participatesInFallback` | bool       | 是否参与 agent fallback 链                               |
| `fallbackPriority`       | int / null | fallback 顺序；仅`participatesInFallback=true`时有值 |

---

### SessionInfo

| 字段

```
| 类型


  | 说明


                                                                                                              |
```

| --------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------- |
| `sessionId`     | string    | 全局唯一 ID，创建时自动生成                                                                                           |
| `agentId`       | string    | 所属 Agent ID，创建时指定，不可变更                                                                                   |
| `userId`        | string    | 所属 DolphinDB 用户 ID，创建时由当前登录用户确定，不可变更                                                            |
| `llmConfigId`   | string    | 会话级 LLM 配置 ID。为空时继承 agent 默认模型；非空时必须属于当前用户在该 agent 下的有效可选集合                      |
| `affinityNode`  | string    | 亲和节点（框架内部分配，不可由用户指定）。该会话的所有写请求会被路由到此节点                                          |
| `title`         | string    | 会话标题，可通过 updateSession 修改                                                                                   |
| `status`        | int       | 状态值：0=ACTIVE, 1=ARCHIVED, 2=DELETED                                                                               |
| `statusName`    | string    | 状态名称：`ACTIVE`（活跃，可追加消息和调用 LLM）/`ARCHIVED`（归档，只读不可追加消息）/`DELETED`（已删除） |
| `lastSeqNum`    | long      | 最后一条消息的序列号，每次追加消息后自动更新                                                                          |
| `messageCount`  | int       | 消息总数（等于 lastSeqNum，每次追加消息后同步更新）                                                                   |
| `metadata`      | object    | 自定义元数据，可通过 updateSession 修改，JSON 格式存储                                                                |
| `schemaVersion` | int       | 行 Schema 版本号                                                                                                      |
| `extra`         | string    | 预留扩展字段                                                                                                          |
| `createTime`    | timestamp | 创建时间                                                                                                              |
| `updateTime`    | timestamp | 最后更新时间（追加消息、更新元数据等操作均会刷新）                                                                    |

---

### MessageInfo

| 字段

```
| 类型


  | 说明


                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
```

| ------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `messageId`        | string    | 消息唯一 ID，追加时自动生成                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `sessionId`        | string    | 所属会话 ID                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `agentId`          | string    | 所属 Agent ID                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `sequenceNum`      | long      | 会话内单调递增序列号，从 1 开始，用于消息排序和范围查询                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `role`             | string    | 消息角色：`system`（系统指令）/`user`（用户输入）/`assistant`（LLM 回复）/`tool`（工具执行结果）                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `contentType`      | string    | 内容类型，决定上下文组装时的解析方式：`text`（纯文本，直接作为 message.content）/`tool_call`（工具调用，content 为 JSON 格式的 toolCalls 数组，组装时解析为 OpenAI tool\_calls 结构）/`tool_result`（工具结果，组装时 role 强制改为`tool`并附带 toolCallId）/`multimodal`（多模态，content 为 JSON 数组，每项含 type/text/imageUrl）/`summary`（会话摘要，由框架内部写入，在`summary-first`模式下作为 latest summary 注入；其`metadata`中记录`summaryUpToSeqNum`、`trigger`、`summaryLlmConfigId`） |
| `content`          | string    | 消息内容。格式取决于 contentType：text 和 tool\_result 为纯文本，tool\_call 为 JSON（`{"toolCalls":[...]}`或`[{...}]`），multimodal 为 JSON 数组（`[{"type":"text","text":"..."},{"type":"image_url","imageUrl":"..."}]`）                                                                                                                                                                                                                                                                                                          |
| `toolCallId`       | string    | 工具调用关联 ID。contentType 为`tool_result`时必填，用于将工具执行结果关联到 assistant 发起的对应 tool\_call（同一个 toolCallId）                                                                                                                                                                                                                                                                                                                                                                                                           |
| `llmModel`         | string    | 产生该消息的 LLM 模型名称（如`gpt-4`），通常仅 assistant 消息和 summary 消息有此值                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `promptTokens`     | int       | 产生该消息时的输入 token 数（LLM 返回的 usage 统计），用于计量                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `completionTokens` | int       | 产生该消息时的输出 token 数（LLM 返回的 usage 统计），用于计量                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `totalTokens`      | int       | 总 token 数（通常等于 promptTokens + completionTokens），用于滑动窗口的 token 预算计算                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `metadata`         | object    | 自定义元数据，JSON 格式                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `schemaVersion`    | int       | 行 Schema 版本号                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `extra`            | string    | 预留扩展字段                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `createTime`       | timestamp | 消息创建时间                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

---

### MemoryEntry

| 字段

```
| 类型


  | 说明


                                                                                                                                                                 |
```

| ---------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `memoryId`       | string    | 记忆唯一 ID，存储时自动生成                                                                                                                                              |
| `agentId`        | string    | 所属 Agent ID                                                                                                                                                            |
| `userId`         | string    | scope 为`user`时标识所属用户；scope 为`agent`时为空                                                                                                              |
| `scope`          | string    | 作用域：`agent`（agent 级别，所有用户可读）/`user`（用户级别，仅该 userId 可读写）                                                                               |
| `category`       | string    | 分类标签（如`"fact"`、`"preference"`、`"instruction"`），用于按分类检索和统计                                                                                |
| `content`        | string    | 记忆文本内容                                                                                                                                                             |
| `importance`     | double    | 重要度，取值范围 [0, 1]。参与混合排序                                                                                                                                    |
| `accessCount`    | int       | 访问次数，每次通过 get 或 search 命中时自动 +1。参与混合排序                                                                                                             |
| `lastAccessTime` | timestamp | 最后访问时间，每次通过 get 或 search 命中时自动更新                                                                                                                      |
| `expireTime`     | timestamp | 过期时间（毫秒时间戳），为空表示永不过期                                                                                                                                 |
| `source`         | string    | 记忆来源：`manual`（手动创建）/`auto_extract`（自动提取）/`api`（API 写入）                                                                                  |
| `sourceRef`      | string    | 来源引用信息（如来源的 sessionId 或 messageId）                                                                                                                          |
| `metadata`       | object    | 自定义元数据，JSON 格式                                                                                                                                                  |
| `schemaVersion`  | int       | 行 Schema 版本号                                                                                                                                                         |
| `createTime`     | timestamp | 创建时间。参与混合排序中的时间衰减得分                                                                                                                                   |
| `updateTime`     | timestamp | 最后更新时间                                                                                                                                                             |
| `textScore`      | double    | 全文搜索得分（仅搜索结果中返回），由 textdb 全文索引计算                                                                                                                 |
| `relevanceScore` | double    | 语义检索得分（仅搜索结果中返回）。仅当所属 agent 启用了 memory embedding 时有意义，由 active memory embedding 配置中的`embeddingMetric`/`embeddingNormalize`定义 |
| `hybridScore`    | double    | 混合排序得分（仅搜索结果中返回），综合 importance、recency、semantic、access、text 等信号；当所属 agent 未启用 embedding 或语义分支不可用时，基于剩余信号计算            |

---

### SkillInfo

| 字段

```
| 类型


  | 说明


                                                                                                                                                    |
```

| ------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `skillId`                | string    | 技能唯一 ID，注册时自动生成                                                                                                                                 |
| `name`                   | string    | 技能名称，ACTIVE 状态下全局唯一。用于应用层`activeSkillNames`引用和目录展示                                                                             |
| `description`            | string    | 技能描述，在 Tier-1 技能目录中展示，帮助 LLM 判断是否需要该技能                                                                                             |
| `license`                | string    | 许可证信息                                                                                                                                                  |
| `compatibility`          | string    | 兼容性说明（如最低框架版本要求）                                                                                                                            |
| `argumentHint`           | string    | 参数提示信息，在 Tier-1 目录中展示，提示 LLM 如何调用该技能                                                                                                 |
| `disableModelInvocation` | bool      | 是否禁止 LLM 自动调用。为`true`时该技能不会出现在 LLM 的工具目录（Tier-1）中，但仍可通过用户显式调用。可被 agent 级别的 binding`configOverride`覆盖 |
| `userInvocable`          | bool      | 是否允许用户直接调用该技能                                                                                                                                  |
| `hasInstruction`         | bool      | 技能包中是否包含 Tier-2 指令（SKILL.md frontmatter 之后的正文内容）                                                                                         |
| `displayName`            | string    | 技能显示名称                                                                                                                                                |
| `category`               | string    | 技能分类标签，用于按分类筛选                                                                                                                                |
| `version`                | string    | 语义版本号（如`1.0.0`）                                                                                                                                 |
| `status`                 | int       | 状态值：0=ACTIVE, 1=DISABLED, 2=DEPRECATED                                                                                                                  |
| `statusName`             | string    | 状态名称：`ACTIVE`（可用）/`DISABLED`（已禁用，不参与目录和指令组装）/`DEPRECATED`（已弃用）                                                    |
| `ownerUserId`            | string    | 技能所属用户                                                                                                                                                |
| `metadata`               | object    | 自定义元数据                                                                                                                                                |
| `schemaVersion`          | int       | 行 Schema 版本号                                                                                                                                            |
| `extra`                  | string    | 预留扩展字段                                                                                                                                                |
| `createTime`             | timestamp | 创建时间                                                                                                                                                    |
| `updateTime`             | timestamp | 最后更新时间                                                                                                                                                |

---

### SkillAccessInfo

| 字段

```
| 类型


  | 说明


                                                                                      |
```

| ---------------------- | ----------- | ----------------------------------------------------------------------------------------------- |
| `id`             | string    | 绑定记录 ID                                                                                   |
| `agentId`        | string    | 绑定到的 Agent ID                                                                             |
| `skillId`        | string    | 被绑定的技能 ID                                                                               |
| `subjectType`    | string    | 绑定主体类型：`AGENT`（agent 级别绑定）/`DB_USER`（用户级限制）                       |
| `subjectId`      | string    | 绑定主体 ID（agentId 或 DolphinDB userId）                                                    |
| `enabled`        | bool      | 绑定是否启用。为`false`时该技能对此 agent 不可见（不出现在目录中，指令也不会被加载）      |
| `descOverride`   | string    | 描述覆盖。非空时在 Tier-1 目录中替代技能原始 description 展示                                 |
| `configOverride` | object    | 配置覆盖。当前支持覆盖`disableModelInvocation`（bool），可在 agent 级别覆盖技能的默认设置 |
| `schemaVersion`  | int       | 行 Schema 版本号                                                                              |
| `extra`          | string    | 预留扩展字段                                                                                  |
| `createTime`     | timestamp | 绑定时间                                                                                      |
| `updateTime`     | timestamp | 最后更新时间                                                                                  |
| `skill`          | SkillInfo | 关联的技能完整信息（列表接口中可选返回）                                                      |

---

### LLMResponse

| 字段

```
| 类型


   | 说明


                                                                                                                                                                                                                                                   |
```

| ------------------------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `requestId`              | string     | 请求唯一 ID，用于追踪和日志关联                                                                                                                                                                                                                            |
| `sessionId`              | string     | 所属会话 ID（如果有）                                                                                                                                                                                                                                      |
| `model`                  | string     | 实际使用的 LLM 模型名称（由 LLM 提供商返回）                                                                                                                                                                                                               |
| `llmConfigId`            | string     | 实际使用的 LLM 配置 ID                                                                                                                                                                                                                                     |
| `content`                | string     | LLM 回复的文本内容                                                                                                                                                                                                                                         |
| `toolCalls`              | ToolCall[] | LLM 发起的工具调用列表。非空时`finishReason`通常为`tool_calls`/`tool_use`，应用层应执行工具并将结果追加为`tool_result`消息                                                                                                                 |
| `finishReason`           | string     | 结束原因，值取决于 LLM 提供商。OpenAI 系：`stop`（正常结束）/`tool_calls`（需要调用工具）/`length`（达到 max\_tokens 限制）/`content_filter`（内容过滤）。Anthropic 系：`end_turn`/`tool_use`/`max_tokens`/`stop_sequence` |
| `usage`                  | object     | 本次请求的 token 用量统计                                                                                                                                                                                                                                  |
| `usage.promptTokens`     | int        | 输入 token 数（发送给 LLM 的完整上下文消耗的 token）                                                                                                                                                                                                       |
| `usage.completionTokens` | int        | 输出 token 数（LLM 生成的回复消耗的 token）                                                                                                                                                                                                                |
| `usage.totalTokens`      | int        | 总 token 数                                                                                                                                                                                                                                                |
| `latencyMs`              | long       | 本次 LLM 请求的端到端延迟（毫秒）                                                                                                                                                                                                                          |
| `metadata`               | object     | 额外元数据                                                                                                                                                                                                                                                 |

---

### ToolCall

| 字段

```
| 类型
```

| 说明

```
|
```

| -------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                 | string | 工具调用唯一 ID（如`call_abc123`），应用层执行工具后需将结果以相同`toolCallId`追加为`tool_result`消息，LLM 据此关联调用与结果 |
| `type`               | string | 固定为`function`                                                                                                                      |
| `function.name`      | string | 要调用的函数/工具名称                                                                                                                     |
| `function.arguments` | string | 调用参数，JSON 格式字符串                                                                                                                 |
| `index`              | int    | 流式响应中的调用索引（可选），用于将分块的 tool\_call delta 拼接为完整调用                                                                |

---

### SummaryResult

| 字段

```
| 类型
```

| 说明

```
|
```

| ------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sessionId`         | string | 所属会话 ID                                                                                                                                     |
| `generated`         | bool   | 是否实际生成了摘要。为`false`时表示本次没有可压缩的 raw 历史或无需生成，此时看`reason`了解原因                                          |
| `reason`            | string | 未生成摘要的原因说明（`generated=true`时为空）                                                                                              |
| `trigger`           | string | 触发方式：`manual`（用户手动调用摘要 API）/`auto`（`/chat/completions`主链路前置自动摘要）                                          |
| `summaryUpToSeqNum` | long   | 本次生成的 latest summary 覆盖边界。表示该 summary 已覆盖所有`sequenceNum <= summaryUpToSeqNum`的历史消息                                   |
| 其余 MessageInfo 字段   | -      | 生成的摘要消息本身的详情（`messageId`、`sequenceNum`、`role="system"`、`contentType="summary"`、`content="摘要内容..."`等） |

---

### LLM Usage Stats

`GET /agent-bus/v1/llm/usage `

**查询参数:**

| 参数

```
| 类型
```

| 必填

| 说明

```
|
```

| -------------------- | -------- | ------ | -------------------------------------------------------------------------------------------------------- |
| `agentId`      | string | 是   | Agent ID                                                                                               |
| `targetUserId` | string | 否   | 只读过滤目标用户。未指定时返回当前登录用户自己的统计；仅`AGENT_MANAGE / AGENT_ADMIN`可查看他人数据 |
| `startTime`    | long   | 否   | 开始时间（毫秒时间戳）                                                                                 |
| `endTime`      | long   | 否   | 结束时间（毫秒时间戳）                                                                                 |

**响应:**

`{ "agentId": "agent_xxx", "userId": "alice", "startTime": 1711699200000, "endTime": 1711785600000, "totalPromptTokens": 50000, "totalCompletionTokens": 15000, "totalTokens": 65000, "requestCount": 100 } `

---

## 18. 错误码

| 错误码

```
| HTTP 状态码
```

| 说明

```
|
```

| ------------------------------ | ------------- | -------------------------------------------------------------------------------- |
| `BUS_AUTH_FAILED`        | 403         | 鉴权失败，当前用户无权执行此操作                                               |
| `BUS_UNKNOWN_ACTION`     | 404         | 未知的 action，请求的接口/action 名称不存在                                    |
| `BUS_AGENT_NOT_FOUND`    | 404         | 指定的 Agent 不存在或已被删除                                                  |
| `BUS_SESSION_NOT_FOUND`  | 404         | 指定的会话不存在                                                               |
| `BUS_QUEUE_FULL`         | 429         | DataBus 请求队列已满，服务端过载，请稍后重试                                   |
| `BUS_TIMEOUT`            | 504         | 请求处理超时（包括 LLM 调用超时）                                              |
| `BUS_NODE_UNREACHABLE`   | 503         | 集群模式下目标亲和节点不可达，请求无法路由                                     |
| `BUS_HANDLER_ERROR`      | 500         | 处理器内部错误（如参数校验失败、状态冲突、LLM 调用失败等），详见 error.message |
| `BUS_STREAM_INTERRUPTED` | 499         | 流式传输中断（SSE 连接断开或 LLM 流式响应异常终止）                            |
| `BUS_INVALID_ARGUMENT`   | 400         | 请求参数不合法（缺少必填字段、类型错误、值超出范围等）                         |
| `BUS_NOT_STARTED`        | 500         | DataBus 尚未完成初始化，服务暂不可用                                           |

---

## 附录：技能包规范

技能定义格式遵循 [Agent Skills 开放标准](https://agentskills.io/ "https://agentskills.io/")。Skill 是纯指令型资产——一份由 LLM 阅读并遵循的 Markdown 指引。Tool（function calling）的定义、注册与执行由应用层负责，对框架透明。

### 技能包结构

技能包为 ZIP 文件（最大 10 MB），必须包含 `SKILL.md` 入口文件（位于根目录或唯一子目录下）：

`my-skill/ SKILL.md             # 必须：YAML frontmatter + Markdown 指令体 template.md          # 可选：模板文件 reference.md         # 可选：参考文档 scripts/             # 可选：脚本 helper.py assets/              # 可选：资源文件 `

### SKILL.md 格式

由 YAML frontmatter（`---` 分隔）和 Markdown body 两部分组成：

``---
name: search-database
version: 1.0.0
description: Search distributed tables
argument-hint: "SELECT fields FROM table WHERE condition"
category: database
displayName: Database Search
license: MIT
compatibility: ">=3.0.0"
disable-model-invocation: false
user-invocable: true
--------------------

## Usage Guide

You can use this skill to query DolphinDB distributed tables.

### Parameters

- `$ARGUMENTS`: The SQL query to execute

### Context Variables

- `${SESSION_ID}`: Current session ID
- `${AGENT_ID}`: Current agent ID
- `${USER_ID}`: Current DolphinDB user ID
  ``

### frontmatter 字段说明

​**标准字段**​（Agent Skills 开放标准定义）：

| 字段

```
| 类型
```

| 必填

| 说明

```
|
```

| --------------------- | -------- | ------ | ---------------------------------------------------------------------------------------- |
| `name`          | string | 是   | 技能标识符，全局唯一。格式：`^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`，≤64 字符           |
| `description`   | string | 是   | 技能描述，说明做什么、何时用（≤1024 字符）。注入 Tier-1 目录供 LLM 判断是否需要该技能 |
| `version`       | string | 否   | 语义化版本号（如`1.0.0`）                                                          |
| `license`       | string | 否   | 许可证信息                                                                             |
| `compatibility` | string | 否   | 环境要求（≤500 字符）                                                                 |
| `metadata`      | map    | 否   | 自定义键值对                                                                           |

​**框架扩展字段**​（从 frontmatter 解析，存为独立列）：

| 字段

```
| 类型
```

| 默认值

| 说明

```
|
```

| -------------------------------- | -------- | -------- | -------------------------------------------------------------------------------------- |
| `argument-hint`            | string | —     | 参数提示（如`[query] [limit]`），在 Tier-1 目录中展示                            |
| `disable-model-invocation` | bool   | false  | 为`true`时 LLM 不可自动发现该技能（不进入 Tier-1 目录），但用户/应用仍可显式触发 |
| `user-invocable`           | bool   | true   | 为`true`时用户可通过命令直接调用该技能                                           |
| `category`                 | string | —     | 技能分类标签                                                                         |
| `displayName`              | string | —     | 可读名称（用于 UI 展示）                                                             |

​**其余 frontmatter 字段**​（如 `model`、`effort`、`allowed-tools` 等）统一收入 `metadata` JSON，框架不为其建独立列。

### 渐进式加载模型（Progressive Disclosure）

| 层级

| 加载时机

```
| 内容


                                         | Token 开销


   |
```

| -------- | -------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------ |
| Tier 1 | 始终在上下文中                                                                 | `name`+`description`+`argument-hint` | \~50-100 / skill |
| Tier 2 | 应用层显式激活时（例如通过`activeSkillNames`或自定义 tool / 逻辑）         | SKILL.md 的完整 Markdown body                    | 建议 < 5000      |
| Tier 3 | 应用层按需提取时（通过`skill.files.get`/`skill.files.batchGet`等原语） | 包内的脚本、模板、参考文档等                     | 不限             |

### 调用控制矩阵

| `disable-model-invocation`

| `user-invocable`

| LLM 可自动发现

| 用户可调用

| 描述注入 Tier-1 目录

|
| -------------------------------- | ---------------------- | ---------------- | ------------ | ---------------------- |

| `disable-model-invocation`

| `user-invocable`

| LLM 可自动发现

| 用户可调用

| 描述注入 Tier-1 目录

|
| -------------------------------- | ---------------------- | ---------------- | ------------ | ---------------------- |
| false                          | true                 | 是             | 是         | 是                   |
| false                          | false                | 是             | 否         | 是                   |
| true                           | true                 | 否             | 是         | 否                   |
| true                           | false                | 否             | 否         | 否                   |

注：以上设置可被 agent 级别的 binding `configOverride` 覆盖（如在绑定时设置 `{"disableModelInvocation": true}`）。

### 注册时的解析流程

1. 校验 ZIP 格式合法性
2. 在 ZIP 中定位 `SKILL.md`（根目录或唯一子目录）
3. 分离 YAML frontmatter 和 Markdown body
4. frontmatter → 对应表列（已建列字段直接映射，未建列字段收入 `metadata`）
5. 包内每个具体文件 → `agent_skill_file.contentBase64`
6. 校验 `name` 格式和唯一性（ACTIVE 状态下不可重名）
7. 合并 API 传入的 `overrides`（覆盖 frontmatter 同名字段）
8. 写入存储，返回 [SkillInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#skillinfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#skillinfo")
