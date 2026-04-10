# DolphinDB Agent Runtime API Reference

![](https://dolphindb1.atlassian.net/wiki/aa-avatar/712020:3118b1f8-1171-4d34-ab7d-02d9ffc4b74b)

作者：qiwei zhu

24

添加反应

注意：所有接口尚处于试用、联调过程中，可能随着用户的反馈会有变动（一般是微调）

这是Agent 框架对外提供的全部接口的说明文档。​**注意，Agent框架不是一个Agent，它只提供了构建一个Agent所必须的组件服务**​。

Base URL: `/agent-bus/v1/`

传输协议: HTTP (JSON / SSE) 、WebSocket。**注意：如果你要自己开发一个demo，访问dolphinX的各种API接口前，需要先用dolphindb的用户名和密码登录，然后拿到token，随后每次访问API接口都要先带上token（详见demo）**

## Quick Start

1. 先启动一个带有 Agent框架功能的 DolphinDB Server作为后端。Agent框架功能在release300.agentRuntime分支，可以自己编译一个（​**版本越新越好，因为随时有修复、更新**​）。
2. 下载并运行一个demo作为应用端。需要配置：dolphindb ip、端口、用户名密码等，相关逻辑都在demo代码里（还有大模型配置等等，代码里都有）。
3. 也可以把本文档API丢给AI，让其基于本文档写一个demo。

### demo1

本demo用到了最常用的一些API接口，实现了一个聊天agent。

本demo重点演示了如何利用Agent框架提供的的http、websocket接口，框架里各种配置服务如何使用。详见代码和ReadMe文件。

demo.zip

02 4 2026, 01:22 下午

### demo2

本demo实现了一个可以用自然语言查询dolphindb数据库、分析数据、有长期记忆功能的agent。

本demo的重点是展示如何利用Agent框架提供的 skill、记忆、会话服务，结合react模式实现更多自由度的agent。（关于记忆的加载，当前demo只使用了文本检索。如需语义检索，则需要在注册agent的时候配置一下embedding服务）

demo2.zip

02 4 2026, 04:54 下午

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
* [2. Agent 管理](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#2.-Agent-%E7%AE%A1%E7%90%86)
  * [2.1 注册 Agent](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#2.1-%E6%B3%A8%E5%86%8C-Agent)
  * [2.2 获取 Agent](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#2.2-%E8%8E%B7%E5%8F%96-Agent)
  * [2.3 更新 Agent](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#2.3-%E6%9B%B4%E6%96%B0-Agent)
  * [2.4 激活 Agent](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#2.4-%E6%BF%80%E6%B4%BB-Agent)
  * [2.5 挂起 Agent](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#2.5-%E6%8C%82%E8%B5%B7-Agent)
  * [2.6 删除 Agent](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#2.6-%E5%88%A0%E9%99%A4-Agent)
  * [2.7 列出 Agent](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#2.7-%E5%88%97%E5%87%BA-Agent)
  * [2.8 授予 DB 用户权限](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#2.8-%E6%8E%88%E4%BA%88-DB-%E7%94%A8%E6%88%B7%E6%9D%83%E9%99%90)
  * [2.9 撤销 DB 用户权限](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#2.9-%E6%92%A4%E9%94%80-DB-%E7%94%A8%E6%88%B7%E6%9D%83%E9%99%90)
  * [2.10 列出授权](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#2.10-%E5%88%97%E5%87%BA%E6%8E%88%E6%9D%83)
* [业务用户 (BizUser) 管理](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#3.-%E4%B8%9A%E5%8A%A1%E7%94%A8%E6%88%B7-(BizUser)-%E7%AE%A1%E7%90%86)
  * [3.1 注册业务用户](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#3.1-%E6%B3%A8%E5%86%8C%E4%B8%9A%E5%8A%A1%E7%94%A8%E6%88%B7)
  * [3.2 获取业务用户](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#3.2-%E8%8E%B7%E5%8F%96%E4%B8%9A%E5%8A%A1%E7%94%A8%E6%88%B7)
  * [3.3 更新业务用户](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#3.3-%E6%9B%B4%E6%96%B0%E4%B8%9A%E5%8A%A1%E7%94%A8%E6%88%B7)
  * [3.4 列出业务用户的 Agent](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#3.4-%E5%88%97%E5%87%BA%E4%B8%9A%E5%8A%A1%E7%94%A8%E6%88%B7%E7%9A%84-Agent)
* [Agent-BizUser 访问控制](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#4.-Agent-BizUser-%E8%AE%BF%E9%97%AE%E6%8E%A7%E5%88%B6)
  * [4.1 授予业务用户访问权限](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#4.1-%E6%8E%88%E4%BA%88%E4%B8%9A%E5%8A%A1%E7%94%A8%E6%88%B7%E8%AE%BF%E9%97%AE%E6%9D%83%E9%99%90)
  * [4.2 撤销业务用户访问权限](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#4.2-%E6%92%A4%E9%94%80%E4%B8%9A%E5%8A%A1%E7%94%A8%E6%88%B7%E8%AE%BF%E9%97%AE%E6%9D%83%E9%99%90)
  * [4.3 拒绝业务用户访问](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#4.3-%E6%8B%92%E7%BB%9D%E4%B8%9A%E5%8A%A1%E7%94%A8%E6%88%B7%E8%AE%BF%E9%97%AE)
  * [4.4 列出 Agent 的业务用户](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#4.4-%E5%88%97%E5%87%BA-Agent-%E7%9A%84%E4%B8%9A%E5%8A%A1%E7%94%A8%E6%88%B7)
* [LLM 配置管理](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#5.-LLM-%E9%85%8D%E7%BD%AE%E7%AE%A1%E7%90%86)
  * [5.1 注册 LLM 配置](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#5.1-%E6%B3%A8%E5%86%8C-LLM-%E9%85%8D%E7%BD%AE)
  * [5.2 获取 LLM 配置](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#5.2-%E8%8E%B7%E5%8F%96-LLM-%E9%85%8D%E7%BD%AE)
  * [5.3 更新 LLM 配置](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#5.3-%E6%9B%B4%E6%96%B0-LLM-%E9%85%8D%E7%BD%AE)
  * [5.4 禁用 LLM 配置](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#5.4-%E7%A6%81%E7%94%A8-LLM-%E9%85%8D%E7%BD%AE)
* [Agent-LLM 绑定](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#6.-Agent-LLM-%E7%BB%91%E5%AE%9A)
  * [6.1 绑定 LLM 到 Agent](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#6.1-%E7%BB%91%E5%AE%9A-LLM-%E5%88%B0-Agent)
  * [6.2 解绑 LLM](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#6.2-%E8%A7%A3%E7%BB%91-LLM)
  * [6.3 列出 Agent 的 LLM 配置](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#6.3-%E5%88%97%E5%87%BA-Agent-%E7%9A%84-LLM-%E9%85%8D%E7%BD%AE)
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
  * [11.10 提取技能包文件](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#11.10-%E6%8F%90%E5%8F%96%E6%8A%80%E8%83%BD%E5%8C%85%E6%96%87%E4%BB%B6)
* [技能绑定与访问控制](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#12.-%E6%8A%80%E8%83%BD%E7%BB%91%E5%AE%9A%E4%B8%8E%E8%AE%BF%E9%97%AE%E6%8E%A7%E5%88%B6)
  * [12.1 绑定技能到 Agent](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#12.1-%E7%BB%91%E5%AE%9A%E6%8A%80%E8%83%BD%E5%88%B0-Agent)
  * [12.2 解绑技能](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#12.2-%E8%A7%A3%E7%BB%91%E6%8A%80%E8%83%BD)
  * [12.3 启用/禁用绑定](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#12.3-%E5%90%AF%E7%94%A8%2F%E7%A6%81%E7%94%A8%E7%BB%91%E5%AE%9A)
  * [12.4 列出 Agent 的技能绑定](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#12.4-%E5%88%97%E5%87%BA-Agent-%E7%9A%84%E6%8A%80%E8%83%BD%E7%BB%91%E5%AE%9A)
  * [12.5 获取 Agent 的技能目录 (Tier-1)](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#12.5-%E8%8E%B7%E5%8F%96-Agent-%E7%9A%84%E6%8A%80%E8%83%BD%E7%9B%AE%E5%BD%95-(Tier-1))
  * [12.6 组装技能上下文](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#12.6-%E7%BB%84%E8%A3%85%E6%8A%80%E8%83%BD%E4%B8%8A%E4%B8%8B%E6%96%87)
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
  * [支持的 Action](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E6%94%AF%E6%8C%81%E7%9A%84-Action)
* [数据结构参考](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#17.-%E6%95%B0%E6%8D%AE%E7%BB%93%E6%9E%84%E5%8F%82%E8%80%83)
  * [AgentInfo](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#AgentInfo)
  * [contextConfig](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#contextConfig)
  * [memoryConfig](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#memoryConfig)
  * [summaryConfig](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#summaryConfig)
  * [defaultParams](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#defaultParams)
  * [retryConfig](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#retryConfig)
  * [BizUserInfo](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#BizUserInfo)
  * [AuthInfo](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#AuthInfo)
  * [LlmConfigInfo](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#LlmConfigInfo)
  * [AgentLlmBindingInfo](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#AgentLlmBindingInfo)
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

---

## 1. 通用约定

### 请求格式

* Content-Type: `application/json`（技能包上传支持 `multipart` 和 `application/octet-stream`）
* 公共请求头:
  * `x-agent-id`: 指定 agentId（可选，与 body/query 中的 agentId 等效，不可冲突）
  * `x-session-id`: 指定 sessionId（可选）

### 响应格式

所有非流式响应返回 JSON：

`{ "type": "RESPONSE", "correlationId": "<requestId>", "payload": { ... } } `

错误响应：

`{ "type": "ERROR", "error": { "code": "<BusErrorCode>", "message": "<错误描述>" } } `

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

`Content-Type: text/event-stream; charset=UTF-8 event: stream_start data: {"type":"STREAM_START","correlationId":"...","data":{...}} event: chunk data: {"type":"STREAM_CHUNK","correlationId":"...","data":{"content":"..."}}  event: chunk data: {"type":"STREAM_CHUNK","correlationId":"...","data":{"content":"..."}}  event: stream_end data: {"type":"STREAM_END","correlationId":"...","data":{...}} `

SSE 响应体统一使用 UTF-8 编码。客户端应按字节读取并显式按 UTF-8 解码后，再做事件分帧和 JSON 解析。

---

## 2.<mark>​ Agent 管理</mark>

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

### 2.8 授予 DB 用户权限

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

| ------------------ | -------- | ------ | -------------------------------------------------------------------------------------- |
| `userId`     | string | 是   | DolphinDB 用户 ID                                                                    |
| `permission` | string | 是   | 权限级别：`ADMIN`（完全控制）/`MANAGE`（管理配置）/`INVOKE`（只读+调用） |
| `grantedBy`  | string | 否   | 执行授权的用户 ID（默认为当前登录用户）                                              |

**响应:** 当前 agent 的授权列表 `{ items: [AuthInfo, ...], size: N }`

---

### 2.9 撤销 DB 用户权限

`DELETE /agent-bus/v1/agent/{agentId}/auth?userId=xxx `

**参数:** `userId`（必填）

**响应:** 当前 agent 的授权列表

---

### 2.10 列出授权

`GET /agent-bus/v1/agent/{agentId}/auth/list `

**响应:** `{ items: [AuthInfo, ...], size: N }`

---

## 3. 业务用户 (BizUser) 管理

### 3.1 注册业务用户

`POST /agent-bus/v1/bizuser/register `

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

| ------------------- | -------- | ------ | ---------- |
| `displayName` | string | 是   | 显示名称 |

**响应:** [BizUserInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#bizuserinfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#bizuserinfo")

---

### 3.2 获取业务用户

`GET /agent-bus/v1/bizuser/{bizUserId} `

**响应:** [BizUserInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#bizuserinfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#bizuserinfo")

---

### 3.3 更新业务用户

`PUT /agent-bus/v1/bizuser/{bizUserId} `

**请求体:** 需要更新的字段（如 `displayName`）

**响应:** [BizUserInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#bizuserinfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#bizuserinfo")

---

### 3.4 列出业务用户的 Agent

`GET /agent-bus/v1/bizuser/{bizUserId}/agents `

**查询参数:** `offset`, `limit`

**响应:** `{ items: [AgentInfo, ...], offset, limit, size }`

---

## 4. Agent-BizUser 访问控制

### 4.1 授予业务用户访问权限

`POST /agent-bus/v1/agent/{agentId}/bizuser/access `

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

| -------------------- | -------- | ------ | ------------------------- |
| `bizUserId`    | string | 是   | 业务用户 ID             |
| `grantedBy`    | string | 否   | 授权人                  |
| `agentProfile` | object | 否   | 用户在该 Agent 下的配置 |

**响应:** 当前 agent 的业务用户列表

---

### 4.2 撤销业务用户访问权限

`DELETE /agent-bus/v1/agent/{agentId}/bizuser/access?bizUserId=xxx `

**响应:** 当前 agent 的业务用户列表

---

### 4.3 拒绝业务用户访问

`POST /agent-bus/v1/agent/{agentId}/bizuser/deny `

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

| ----------------- | -------- | ------ | ------------- |
| `bizUserId` | string | 是   | 业务用户 ID |
| `grantedBy` | string | 否   | 操作人      |

**响应:** 当前 agent 的业务用户列表

---

### 4.4 列出 Agent 的业务用户

`GET /agent-bus/v1/agent/{agentId}/bizuser/list `

**查询参数:** `offset`, `limit`

**响应:** `{ items: [BizUserInfo, ...], offset, limit, size }`

---

## 5. LLM 配置管理

### 5.1 注册 LLM 配置

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
| `provider`           | string | 是       | LLM 提供商类型：`openai`/`openai-compatible`/`anthropic`/`deepseek`/`azure`/`local`                                                                                                                                                                                                                                                                                 |
| `model`              | string | 是       | 模型名称（如`gpt-4`、`claude-sonnet-4-20250514`），传递给 LLM API                                                                                                                                                                                                                                                                                                                   |
| `capability`         | string | 否       | 配置能力类型，默认`chat`：`chat`/`embedding`                                                                                                                                                                                                                                                                                                                                    |
| `embeddingDimension` | int    | 条件必填 | `capability=embedding`时必填，表示向量维度                                                                                                                                                                                                                                                                                                                                              |
| `embeddingMetric`    | string | 否       | `capability=embedding`时使用的相似度规则：`euclidean`/`cosine`。省略时默认`euclidean`                                                                                                                                                                                                                                                                                       |
| `embeddingNormalize` | bool   | 否       | `capability=embedding`时是否对向量做归一化。`embeddingMetric=cosine`时必须为`true`                                                                                                                                                                                                                                                                                              |
| `endpoint`           | string | 否       | LLM API 地址（如`https://api.openai.com/v1`），为空时使用 provider 默认地址                                                                                                                                                                                                                                                                                                             |
| `apiKey`             | string | 否       | LLM API Key                                                                                                                                                                                                                                                                                                                                                                                 |
| `defaultParams`      | object | 否       | 默认请求参数，详见[defaultParams 说明](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#defaultparams "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#defaultparams") |
| `contextWindow`      | int    | 否       | 模型上下文窗口大小（token 数），用于上下文组装时的预算计算                                                                                                                                                                                                                                                                                                                                  |
| `maxConcurrency`     | int    | 否       | 最大并发请求数，保留配置，当前未实现                                                                                                                                                                                                                                                                                                                                                        |
| `rateLimitRPM`       | int    | 否       | 速率限制（每分钟最大请求数）保留配置，当前未实现                                                                                                                                                                                                                                                                                                                                            |
| `timeoutMs`          | int    | 否       | 单次请求超时时间（毫秒），保留配置，当前未实现                                                                                                                                                                                                                                                                                                                                              |
| `retryConfig`        | object | 否       | 重试配置，详见[retryConfig 说明](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#retryconfig "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#retryconfig")           |

**响应:** [LlmConfigInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmconfiginfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmconfiginfo")

说明：

* `capability=embedding` 的配置供 memory 模块生成 document/query embedding 使用
* 系统全局只允许一条 `capability='embedding' and status='ACTIVE'` 的配置；注册或启用第二条会被拒绝

---

### 5.2 获取 LLM 配置

`GET /agent-bus/v1/llm/config/{llmConfigId} `

**响应:** [LlmConfigInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmconfiginfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmconfiginfo")

---

### 5.3 更新 LLM 配置

`PUT /agent-bus/v1/llm/config/{llmConfigId} `

**请求体:** 需要更新的字段

**响应:** [LlmConfigInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmconfiginfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmconfiginfo")

---

### 5.4 禁用 LLM 配置

`POST /agent-bus/v1/llm/config/{llmConfigId}/disable `

**响应:** [LlmConfigInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmconfiginfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmconfiginfo")

---

## 6. <mark>Agent-LLM 绑定</mark>

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
| `llmConfigId` | string | 是   | 要绑定的 LLM 配置 ID，必须已注册且状态为 ACTIVE                                                                 |
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

| ------------------- | -------- | ------ | --------------------------------------------------------------------------------------------- |
| `agentId`     | string | 是   | Agent ID，必须处于 ACTIVE 状态                                                              |
| `bizUserId`   | string | 是   | 业务用户 ID，必须已授权访问该 agent（通过 bizuser/access）                                  |
| `title`       | string | 否   | 会话标题                                                                                    |
| `llmConfigId` | string | 否   | 会话级 LLM 配置 ID，覆盖 agent 默认配置。必须是已绑定到该 agent 且状态为 ACTIVE 的 LLM 配置 |
| `metadata`    | object | 否   | 自定义元数据，JSON 格式，原样存储                                                           |

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

| ----------------- | -------- | ------------ | --------------------------------- |
| `agentId`   | string | x-agent-id | 按 Agent 过滤                   |
| `bizUserId` | string | -          | 按业务用户过滤                  |
| `status`    | int    | -1（全部） | 0=ACTIVE, 1=ARCHIVED, 2=DELETED |
| `offset`    | int    | 0          |                                 |
| `limit`     | int    | 100        |                                 |

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

| ------------------------ | -------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `role`             | string | 是   | 消息角色：`system`（系统指令）/`user`（用户输入）/`assistant`（LLM 回复）/`tool`（工具执行结果）                                                                                                                                                                             |
| `contentType`      | string | 否   | 内容类型（默认`text`）。`text`：纯文本。`tool_call`：工具调用，content 为 JSON 格式的 toolCalls 数组。`tool_result`：工具结果，需同时提供 toolCallId。`multimodal`：多模态，content 为 JSON 数组（含 type/text/imageUrl）。`summary`：会话摘要（通常由框架内部写入） |
| `content`          | string | 否   | 消息内容，格式取决于 contentType                                                                                                                                                                                                                                                             |
| `toolCallId`       | string | 否   | 工具调用关联 ID。contentType 为`tool_result`时必填，需与 assistant 返回的 tool\_call 中的 id 一致，LLM 据此将工具结果关联到对应的调用                                                                                                                                                    |
| `llmModel`         | string | 否   | 产生该消息的 LLM 模型名称（通常仅 assistant 消息需要填写）                                                                                                                                                                                                                                   |
| `promptTokens`     | int    | 否   | 输入 token 数（LLM 返回的 usage 统计），用于 token 消耗计量                                                                                                                                                                                                                                  |
| `completionTokens` | int    | 否   | 输出 token 数（LLM 返回的 usage 统计），用于 token 消耗计量                                                                                                                                                                                                                                  |
| `totalTokens`      | int    | 否   | 总 token 数（默认 prompt + completion），同时用于滑动窗口的 token 预算计算                                                                                                                                                                                                                   |
| `metadata`         | object | 否   | 自定义元数据，JSON 格式                                                                                                                                                                                                                                                                      |

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

| ---------------------- | -------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `instructions`   | string | 否   | 额外的摘要指令，追加到摘要 prompt 中（如要求关注特定主题或保留特定信息）                                                          |
| `llmConfigId`    | string | 否   | 摘要生成使用的 LLM 配置 ID。为空时按优先级选择：`summaryConfig.llmConfigId`>`session.llmConfigId`>`agent.llmConfigId` |
| `maxMessages`    | int    | 否   | 单次最多处理的消息条数，覆盖`summaryConfig.maxMessagesPerRun`                                                                 |
| `maxInputTokens` | int    | 否   | 单次摘要请求的最大输入 token 数，覆盖`summaryConfig.maxInputTokens`                                                           |
| `force`          | bool   | 否   | 是否强制生成（默认 false）。为 true 时忽略`minMessagesSinceLastSummary`阈值限制                                               |
| `metadata`       | object | 否   | 自定义元数据，JSON 格式。框架只负责透传，可以写入一些自定义的数据，比如触发原因、关联的业务事件等                                 |

**响应:** [SummaryResult](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#summaryresult "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#summaryresult")

`{ "sessionId": "sess_001", "generated": true, "reason": "", "trigger": "manual", "summaryRange": { "fromSeqNum": 1, "toSeqNum": 50, "basedOnSummarySeqNum": 0, "incremental": false }, "basedOnSummarySeqNum": 0, "messageId": "msg_xxx", "sequenceNum": 51, "role": "system", "contentType": "summary", "content": "摘要内容...", ... } `

---

## 10. 记忆 (Memory) 管理

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

| ------------------ | -------- | ------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `agentId`    | string | 是   | 所属 Agent ID                                                                                                                |
| `bizUserId`  | string | 否   | 业务用户 ID。scope 为`user`时必填，标识该记忆归属的用户                                                                  |
| `scope`      | string | 否   | 作用域（默认`agent`）：`agent`（agent 级别，所有用户搜索均可命中）/`user`（用户级别，仅该 bizUserId 搜索可命中） |
| `category`   | string | 是   | 分类标签（如`"fact"`、`"preference"`、`"instruction"`），用于按分类检索和统计                                    |
| `content`    | string | 是   | 记忆文本内容                                                                                                                 |
| `importance` | double | 是   | 重要度，取值范围 [0, 1]。参与混合排序                                                                                        |
| `metadata`   | object | 否   | 自定义元数据，JSON 格式                                                                                                      |
| `source`     | string | 否   | 来源标识（默认`manual`）：`manual`（手动创建）/`auto_extract`（自动提取）/`api`（API 写入）                  |
| `sourceRef`  | string | 否   | 来源引用信息（如来源的 sessionId 或 messageId），便于溯源                                                                    |
| `expireTime` | long   | 否   | 过期时间（毫秒时间戳），为空表示永不过期                                                                                     |

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
| `bizUserId`     | string | 否   | 按业务用户过滤。指定时同时搜索 agent 级别和该用户级别的记忆；不指定时只搜索 agent 级别                                                                                                                                                 |
| `scope`         | string | 否   | 按作用域过滤：`agent`（仅 agent 级别）/`user`（仅用户级别，需同时指定 bizUserId）。不指定时搜索所有可见范围                                                                                                                    |
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

---

### 11.10 提取技能包文件

`GET /agent-bus/v1/skill/{skillId}/file?filePath=data/schema.json `

**查询参数:** `filePath`（必填，ZIP 内的文件路径）

**响应:**

`{ "skillId": "skill_xxx", "filePath": "data/schema.json", "encoding": "base64", "content": "<base64 内容>", "size": 1024 } `

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

`GET /agent-bus/v1/skill/{agentId}/catalog?bizUserId=xxx `

**查询参数:** `bizUserId`（可选，用于用户级过滤）

**响应:**

`{ "agentId": "agent_xxx", "bizUserId": "biz_xxx", "catalog": [ { "name": "search-database", "description": "Search distributed tables", "argumentHint": "SELECT fields FROM table WHERE condition" }, ... ], "size": 3 } `

---

### 12.6 组装技能上下文

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

| ------------------------ | ---------- | ------ | ------------------------------------- |
| `bizUserId`        | string   | 否   | 业务用户 ID                         |
| `activeSkillNames` | string[] | 否   | 需激活的技能名称列表（加载 Tier-2） |

**响应:**

`{ "catalog": [ SkillCatalogEntry, ... ], "activeInstructions": [ SkillInstruction, ... ], "catalogTokens": 150, "instructionTokens": 800 } `

---

### 12.7 禁止业务用户使用技能

`POST /agent-bus/v1/skill/user/deny `

**请求体:** `agentId`, `skillId`, `bizUserId`

**响应:** `{ agentId, bizUserId, skillIds: [...], size }`

---

### 12.8 允许业务用户使用技能

`POST /agent-bus/v1/skill/user/allow `

**请求体:** `agentId`, `skillId`, `bizUserId`

**响应:** `{ agentId, bizUserId, skillIds: [...], size }`

---

### 12.9 列出业务用户被禁止的技能

`GET /agent-bus/v1/skill/{agentId}/user/{bizUserId}/denied `

**响应:** `{ agentId, bizUserId, skillIds: [...], size }`

---

## 13. Chat Completions (对话补全)

这是 Agent 应用的核心接口，集成了上下文组装、LLM 调用、消息持久化的完整流程。

`POST /agent-bus/v1/chat/completions `

### 自动组装模式 (Auto-Assembly)

**请求体:**

| 字段

```
| 类型


         | 必填


 | 说明


                                                                                        |
```

| ------------------------ | ------------------ | ---------- | ------------------------------------------------------------------------------------------------- |
| `sessionId`        | string           | 是       | 会话 ID，必须为 ACTIVE 状态                                                                     |
| `message`          | string           | 条件必填 | 用户消息文本，会被自动追加到会话历史中。`message`和`toolResults`至少提供一个            |
| `toolResults`      | ToolResult[]     | 条件必填 | 工具执行结果列表，与`message`至少提供一个。框架自动追加为`role=tool`消息后调用 LLM 续传 |
| `stream`           | bool             | 否       | 是否流式返回（默认 true）。true 时返回 SSE 流，false 时返回完整 JSON                            |
| `tools`            | ToolDefinition[] | 否       | 应用层工具定义列表（OpenAI function calling 格式），注入到 LLM 请求中                           |
| `activeSkillNames` | string[]         | 否       | 需激活的技能名称列表，框架会加载这些技能的 Tier-2 指令注入到上下文中                            |
| `llmConfigId`      | string           | 否       | 指定本次请求使用的 LLM 配置 ID，临时覆盖 session/agent 默认配置                                 |

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

1. 如有 `toolResults`：追加 tool\_result 消息到会话
2. 如有 `message`：追加用户消息到会话
3. 加载 Agent 配置 + 系统提示词
4. 组装技能目录 (Tier-1) + 激活技能指令 (Tier-2)
5. 检索相关记忆
6. 获取历史消息窗口
7. 按 token 预算分配组装完整上下文
8. 调用 LLM
9. 追加助手回复到会话（含 token 统计）
10. 如有需要，异步触发摘要生成

说明：

* `toolResults` 只传工具结果、不传 `message` 是合法用法，适用于 tool calling 的续传轮次
* 当 `message` 和 `toolResults` 同时存在时，框架会按 `toolResults -> message` 的顺序追加到会话，再发起本轮 LLM 调用
* 自动装配中的记忆检索仅使用当前 `message` 作为查询文本；如果本轮只有 `toolResults`，则不会新增一次记忆查询

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

| ------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `systemPrompt`      | string           | 自定义系统提示词，覆盖 agent 默认的 systemPrompt                                                                                                                          |
| `contextBlocks`     | ContextBlock[]   | 自定义上下文块。每个块包含`name`（标识符）、`content`（注入内容）、`position`（插入位置：`after_system`或`before_history`，默认`before_history`） |
| `tools`             | ToolDefinition[] | 工具定义列表（OpenAI function calling 格式）                                                                                                                              |
| `activeSkillNames`  | string[]         | 需加载 Tier-2 指令的技能名称列表                                                                                                                                          |
| `excludeSkillNames` | string[]         | 排除的技能名称列表（从 catalog 和 instruction 中移除）                                                                                                                    |
| `noSkillCatalog`    | bool             | 是否跳过 Tier-1 技能目录注入（默认 false）                                                                                                                                |
| `compressHistory`   | bool             | 是否在历史截断时注入已有的 session summary（默认 false）                                                                                                                  |

### 非流式响应

当 `stream=false` 时：

`{ "requestId": "req_xxx", "sessionId": "sess_001", "model": "gpt-4", "content": "这是 LLM 的回复...", "toolCalls": [ { "id": "call_xxx", "type": "function", "function": { "name": "search_database", "arguments": "{\"query\":\"SELECT ...\"}" } } ], "finishReason": "stop", "usage": { "promptTokens": 1200, "completionTokens": 300, "totalTokens": 1500 }, "latencyMs": 2500, "metadata": {} } `

### 流式响应 (SSE)

当 `stream=true`（默认）时，返回 SSE 流：

`event: stream_start data: {"type":"STREAM_START","correlationId":"req_xxx","data":{"requestId":"req_xxx","model":"<resolved-model>","llmConfigId":"llm_xxx"}} event: chunk data: {"type":"STREAM_CHUNK","correlationId":"req_xxx","data":{"content":"这是"}} event: chunk data: {"type":"STREAM_CHUNK","correlationId":"req_xxx","data":{"content":"LLM"}} event: chunk data: {"type":"STREAM_CHUNK","correlationId":"req_xxx","data":{"content":"的回复"}} event: stream_end data: {"type":"STREAM_END","correlationId":"req_xxx","data":{...}} `

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

| ------------------- | ------------------ | ------ | --------------------------------------------------------------------------- |
| `agentId`     | string           | 是   | Agent ID，用于解析 LLM 配置（从 agent 绑定的 LLM 列表中选择）             |
| `sessionId`   | string           | 否   | 会话 ID。指定时可继承 session 级 LLM 配置，且 bizUserId 从 session 中获取 |
| `bizUserId`   | string           | 否   | 业务用户 ID（未指定 sessionId 时使用）                                    |
| `messages`    | LLMMessage[]     | 是   | 完整的消息列表（由应用层自行构建），直接发送给 LLM，框架不做上下文组装    |
| `tools`       | ToolDefinition[] | 否   | 工具定义列表（OpenAI function calling 格式）                              |
| `model`       | string           | 否   | 指定模型名称，覆盖 LLM 配置中的 model                                     |
| `stream`      | bool             | 否   | 是否流式返回（默认 true）                                                 |
| `llmConfigId` | string           | 否   | 指定使用的 LLM 配置 ID，临时覆盖 priority 排序                            |
| `requestId`   | string           | 否   | 请求追踪 ID，不指定时自动生成                                             |

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
* 预览中的 `message` / `toolResults` 仅作为虚拟输入附加到 messages 尾部，不会写入 session

**响应:**

`{ "messages": [ { "role": "system", "content": "你是一个..." }, { "role": "user", "content": "历史消息..." }, { "role": "assistant", "content": "历史回复..." }, { "role": "tool", "toolCallId": "call_1", "content": "工具执行结果" }, { "role": "user", "content": "当前问题" } ], "tools": [ ... ], "detail": { "memoriesIncluded": 3, "messagesIncluded": 20, "skillsInCatalog": 5, "activeInstructions": 1, "toolsIncluded": 2, "historyTruncated": true, "summaryIncluded": true, "summaryTriggerSuggested": false }, "tokenBreakdown": { "systemPrompt": 200, "skillCatalog": 150, "skillInstructions": 800, "memoryContext": 300, "historyMessages": 3000, "userMessage": 50, "toolDefinitions": 400 } } `

**detail 字段说明：**

| 字段

```
| 类型
```

| 说明

```
|
```

| ------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------- |
| `memoriesIncluded`        | int    | 实际注入到上下文中的记忆条数                                                                                             |
| `messagesIncluded`        | int    | 实际包含的历史消息条数                                                                                                   |
| `skillsInCatalog`         | int    | Tier-1 技能目录中包含的技能数                                                                                            |
| `activeInstructions`      | int    | 已加载的 Tier-2 技能指令数                                                                                               |
| `toolsIncluded`           | int    | 工具定义数量                                                                                                             |
| `historyTruncated`        | bool   | 历史消息是否被截断（消息数或 token 超出限制时为 true）                                                                   |
| `summaryIncluded`         | bool   | 是否注入了已有的 session summary（截断 + includeSummary=true + 存在 summary 时）                                         |
| `summaryTriggerSuggested` | bool   | 是否建议触发摘要生成（截断 + autoTriggerOnTruncate=true + 满足消息数阈值时）                                             |
| `summaryTriggerReason`    | string | 摘要触发原因：`history_truncated_no_summary`（截断且无摘要）/`history_truncated_summary_stale`（截断且摘要过时） |
| `historyFromSeq`          | long   | 历史窗口起始序列号                                                                                                       |
| `historyToSeq`            | long   | 历史窗口结束序列号                                                                                                       |

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
| `historyMessages`   | int  | 历史消息估算 token 数                                          |
| `userMessage`       | int  | 当前用户消息估算 token 数；若本轮仅提供`toolResults`则为 0 |
| `toolDefinitions`   | int  | 工具定义估算 token 数                                          |

---

## 16. WebSocket 协议

### 连接

WebSocket 端点路径与 HTTP 相同（通过协议升级）。

### 消息格式

所有 WebSocket 帧为 JSON：

**请求帧:**

`{ "type": "REQUEST", "msgId": "req_001", "action": "chat.completions", "agentId": "agent_xxx", "sessionId": "sess_001", "payload": { "message": "你好", "stream": true } } `

**响应帧:**

`{ "type": "RESPONSE", "correlationId": "req_001", "action": "chat.completions", "data": { ... } } `

**流式帧:**

`{"type": "STREAM_START", "correlationId": "req_001"} {"type": "STREAM_CHUNK", "correlationId": "req_001", "data": {"content": "..."}} {"type": "STREAM_END", "correlationId": "req_001", "data": {...}} `

**错误帧:**

`{ "type": "ERROR", "correlationId": "req_001", "error": { "code": "HANDLER_ERROR", "message": "session not found" } } `

### 支持的 Action

WebSocket 支持所有与 HTTP 相同的 action（无需 HTTP 方法区分），action 名称见各接口说明中的内部名称：

| Action

```
| 对应 HTTP 接口


                           |
```

| ------------------------------- | ---------------------------------------------- |
| `agent.register`          | POST /agent/register                         |
| `agent.get`               | GET /agent/{id}                              |
| `agent.update`            | PUT /agent/{id}                              |
| `agent.activate`          | POST /agent/{id}/activate                    |
| `agent.suspend`           | POST /agent/{id}/suspend                     |
| `agent.delete`            | POST /agent/{id}/delete                      |
| `agent.list`              | GET /agent/list                              |
| `agent.auth.grant`        | POST /agent/{id}/auth                        |
| `agent.auth.revoke`       | DELETE /agent/{id}/auth                      |
| `agent.auth.list`         | GET /agent/{id}/auth/list                    |
| `agent.bizuser.grant`     | POST /agent/{id}/bizuser/access              |
| `agent.bizuser.revoke`    | DELETE /agent/{id}/bizuser/access            |
| `agent.bizuser.deny`      | POST /agent/{id}/bizuser/deny                |
| `agent.bizuser.list`      | GET /agent/{id}/bizuser/list                 |
| `agent.llm.grant`         | POST /agent/{id}/llm/access                  |
| `agent.llm.revoke`        | DELETE /agent/{id}/llm/access                |
| `agent.llm.list`          | GET /agent/{id}/llm/list                     |
| `bizuser.register`        | POST /bizuser/register                       |
| `bizuser.get`             | GET /bizuser/{id}                            |
| `bizuser.update`          | PUT /bizuser/{id}                            |
| `bizuser.agents`          | GET /bizuser/{id}/agents                     |
| `llm.config.register`     | POST /llm/config/register                    |
| `llm.config.get`          | GET /llm/config/{id}                         |
| `llm.config.update`       | PUT /llm/config/{id}                         |
| `llm.config.disable`      | POST /llm/config/{id}/disable                |
| `llm.complete`            | POST /llm/complete                           |
| `llm.usage`               | GET /llm/usage                               |
| `chat.completions`        | POST /chat/completions                       |
| `context.preview`         | POST /context/preview                        |
| `session.create`          | POST /session/create                         |
| `session.get`             | GET /session/{id}                            |
| `session.update`          | PUT /session/{id}                            |
| `session.archive`         | POST /session/{id}/archive                   |
| `session.delete`          | POST /session/{id}/delete                    |
| `session.list`            | GET /session/list                            |
| `session.appendMessage`   | POST /session/{id}/message                   |
| `session.getMessages`     | GET /session/{id}/messages                   |
| `session.generateSummary` | POST /session/{id}/summary                   |
| `memory.store`            | POST /memory/store                           |
| `memory.get`              | GET /memory/{id}                             |
| `memory.update`           | PUT /memory/{id}                             |
| `memory.delete`           | DELETE /memory/{id}                          |
| `memory.search`           | POST /memory/search                          |
| `memory.list`             | GET /memory/list                             |
| `memory.stats`            | GET /memory/stats                            |
| `skill.register`          | POST /skill/register                         |
| `skill.get`               | GET /skill/{id}                              |
| `skill.getByName`         | GET /skill/byName/{name}                     |
| `skill.update`            | PUT /skill/{id}                              |
| `skill.disable`           | POST /skill/{id}/disable                     |
| `skill.deprecate`         | POST /skill/{id}/deprecate                   |
| `skill.activate`          | POST /skill/{id}/activate                    |
| `skill.list`              | GET /skill/list                              |
| `skill.getInstruction`    | GET /skill/{id}/instruction                  |
| `skill.extractFile`       | GET /skill/{id}/file                         |
| `skill.bind`              | POST /skill/bind                             |
| `skill.unbind`            | POST /skill/unbind                           |
| `skill.binding.enable`    | POST /skill/binding/enable                   |
| `skill.bindings`          | GET /skill/{agentId}/bindings                |
| `skill.catalog`           | GET /skill/{agentId}/catalog                 |
| `skill.context`           | POST /skill/{agentId}/context                |
| `skill.user.deny`         | POST /skill/user/deny                        |
| `skill.user.allow`        | POST /skill/user/allow                       |
| `skill.user.denied`       | GET /skill/{agentId}/user/{bizUserId}/denied |

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
| `agentId`       | string    | 全局唯一 ID，注册时自动生成，也可通过请求体指定                                                                                                                                                                                                                                                                                                                                                                                                 |
| `agentName`     | string    | Agent 可读名称，必填                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `agentType`     | string    | 类型标签，自由填写的字符串（如`"chat"`、`"task"`、`"pipeline"`），框架不做枚举限制也不据此分支，仅用于分类展示                                                                                                                                                                                                                                                                                                                      |
| `ownerUserId`   | string    | 所属 DolphinDB 用户，自动拥有 ADMIN 权限                                                                                                                                                                                                                                                                                                                                                                                                        |
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
| `reservedForOutput`      | int    | 4096   | 为模型输出预留的 token 数                                                                                                                                                                                                                                                                                                                                                                   |
| `maxHistoryMessages`     | int    | 50     | 历史消息最大条数（最小值 1），使用滑动窗口策略                                                                                                                                                                                                                                                                                                                                              |
| `maxHistoryTokens`       | int    | 0      | 历史消息 token 上限，0 表示自动填满剩余预算，滑动窗口                                                                                                                                                                                                                                                                                                                                       |
| `includeMemory`          | bool   | true   | 是否在上下文中包含记忆检索结果                                                                                                                                                                                                                                                                                                                                                              |
| `memoryTopK`             | int    | 5      | 记忆检索返回的最大条数（最小值 1）                                                                                                                                                                                                                                                                                                                                                          |
| `memoryTokenBudget`      | int    | 2000   | 记忆部分的 token 预算上限                                                                                                                                                                                                                                                                                                                                                                   |
| `includeSkills`          | bool   | true   | 是否包含已激活的 Skill 指令                                                                                                                                                                                                                                                                                                                                                                 |
| `includeSkillCatalog`    | bool   | true   | 是否注入 Skill 目录（Tier-1 概要）                                                                                                                                                                                                                                                                                                                                                          |
| `instructionTokenBudget` | int    | 5000   | 已激活 Skill 指令的 token 预算上限                                                                                                                                                                                                                                                                                                                                                          |
| `includeSummary`         | bool   | true   | 历史截断时是否包含已有的 session summary                                                                                                                                                                                                                                                                                                                                                    |
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

​**预算分配顺序**​（优先级从高到低）：

`总预算 = maxContextTokens - reservedForOutput

1. System Prompt        固定分配
2. User Message         固定分配（当前消息）
3. Skill Catalog        固定分配（~100 tokens/skill）
4. Tool Definitions     固定分配（应用层透传，框架计入预算）
5. Active Instructions  配额分配（instructionTokenBudget）
6. Memory Context       配额分配（memoryTokenBudget）
7. History Window       填满剩余预算
   `

**示例：**

`{ "maxContextTokens": 128000, "maxHistoryMessages": 50, "maxHistoryTokens": 8000, "includeMemory": true, "memoryTopK": 5, "includeSkills": true, "summaryConfig": { "enabled": true, "autoTriggerOnTruncate": true, "llmConfigId": "llm_summary_xxx" } } `

---

### summaryConfig

会话摘要配置，嵌套在 `contextConfig.summaryConfig` 中，控制 `SessionSummaryService` 的摘要生成行为。所有字段均为可选。

| 字段

```
| 类型
```

| 默认值

| 说明

```
|
```

| ----------------------------------- | -------- | -------- | ------------------------------------------------------------------------------------------ |
| `enabled`                     | bool   | true   | 是否启用摘要生成。设为 false 时调用摘要接口会抛异常                                      |
| `autoTriggerOnTruncate`       | bool   | false  | 自动装配检测到历史截断时，是否自动触发摘要生成                                           |
| `llmConfigId`                 | string | —     | 摘要生成使用的 LLM 配置 ID。为空时按以下优先级选择：请求参数 > session 级别 > agent 默认 |
| `temperature`                 | double | 0.1    | 摘要 LLM 的 temperature                                                                  |
| `maxOutputTokens`             | int    | 512    | 摘要最大输出 token 数                                                                    |
| `maxInputTokens`              | int    | 12000  | 单次摘要请求的最大输入 token 数                                                          |
| `maxMessagesPerRun`           | int    | 80     | 单次摘要处理的最大消息条数                                                               |
| `minMessagesSinceLastSummary` | int    | 20     | 距离上次摘要后至少新增多少条消息才触发新摘要                                             |
| `promptTemplate`              | string | —     | 自定义摘要 system prompt。为空时使用内置默认模板                                         |

​**自动触发条件**​（需同时满足）：

1. 自动装配时历史窗口被截断（`contextWindow.truncated = true`）
2. `autoTriggerOnTruncate = true`
3. 不存在可用 summary，或距离上次摘要新增消息数 ≥ `minMessagesSinceLastSummary`

**示例：**

`{ "enabled": true, "autoTriggerOnTruncate": true, "llmConfigId": "llm_summary_xxx", "temperature": 0.1, "maxOutputTokens": 512, "maxInputTokens": 12000, "maxMessagesPerRun": 80, "minMessagesSinceLastSummary": 20 } `

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

### BizUserInfo

| 字段

```
| 类型


  | 说明


                    |
```

| --------------------- | ----------- | ----------------------------- |
| `bizUserId`     | string    | 全局唯一 ID，注册时自动生成 |
| `displayName`   | string    | 业务用户的显示名称          |
| `schemaVersion` | int       | 行 Schema 版本号            |
| `extra`         | string    | 预留扩展字段                |
| `createTime`    | timestamp | 创建时间                    |
| `updateTime`    | timestamp | 最后更新时间                |

---

### AuthInfo

| 字段

```
| 类型


  | 说明


                                                                                                                                                                                       |
```

| --------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`            | string    | 授权记录 ID                                                                                                                                                                                    |
| `userType`      | string    | 用户类型：`DB_USER`（DolphinDB 用户）/`BIZ_USER`（业务用户）                                                                                                                           |
| `userId`        | string    | 用户 ID（DB 用户 ID 或 bizUserId）                                                                                                                                                             |
| `agentId`       | string    | 被授权访问的 Agent ID                                                                                                                                                                          |
| `permission`    | string    | 权限级别。DB 用户支持`ADMIN`（最高权限，完全控制）/`MANAGE`（管理权限，可更新配置）/`INVOKE`（调用权限，只读+调用）。业务用户支持`INVOKE`（允许访问）/`DENIED`（显式拒绝） |
| `agentProfile`  | object    | 用户在该 Agent 下的个性化配置（业务用户专用）                                                                                                                                                  |
| `grantedBy`     | string    | 执行授权操作的用户 ID                                                                                                                                                                          |
| `schemaVersion` | int       | 行 Schema 版本号                                                                                                                                                                               |
| `extra`         | string    | 预留扩展字段                                                                                                                                                                                   |
| `createTime`    | timestamp | 授权时间                                                                                                                                                                                       |
| `expireTime`    | timestamp | 授权过期时间（为空表示永不过期）                                                                                                                                                               |

---

### LlmConfigInfo

| 字段

```
| 类型


  | 说明


                                                                                                                                                                                              |
```

| -------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `llmConfigId`        | string    | 全局唯一 ID，注册时自动生成                                                                                                                                                                           |
| `name`               | string    | 配置名称，用于标识和展示                                                                                                                                                                              |
| `provider`           | string    | LLM 提供商类型：`openai`/`openai-compatible`/`anthropic`/`deepseek`/`azure`/`local`                                                                                           |
| `model`              | string    | 模型名称（如`gpt-4`、`claude-sonnet-4-20250514`），传递给 LLM API                                                                                                                             |
| `capability`         | string    | 配置能力类型：`chat`/`embedding`                                                                                                                                                              |
| `embeddingDimension` | int       | 向量维度；`capability=chat`时为 0                                                                                                                                                                 |
| `embeddingMetric`    | string    | embedding 相似度规则；`capability=chat`时为空                                                                                                                                                     |
| `embeddingNormalize` | bool      | embedding 是否归一化；`capability=chat`时为`false`                                                                                                                                            |
| `endpoint`           | string    | LLM API 地址（如`https://api.openai.com/v1`），为空时使用 provider 默认地址                                                                                                                       |
| `apiKey`             | string    | LLM API Key                                                                                                                                                                                           |
| `defaultParams`      | object    | 默认请求参数，支持`temperature`（double）、`maxTokens`/`max_tokens`（int）、`topP`/`top_p`（double）、`stop`（string[]）等。请求级参数可覆盖此处的默认值                      |
| `contextWindow`      | int       | 模型上下文窗口大小（token 数），用于上下文组装时的预算计算。为 0 时使用`contextConfig.maxContextTokens`                                                                                           |
| `maxConcurrency`     | int       | 该 LLM 配置的最大并发请求数                                                                                                                                                                           |
| `rateLimitRPM`       | int       | 速率限制（每分钟最大请求数）                                                                                                                                                                          |
| `timeoutMs`          | int       | 单次 LLM 请求超时时间（毫秒）                                                                                                                                                                         |
| `retryConfig`        | object    | 重试配置：`maxRetries`（默认 3）、`initialDelayMs`（默认 1000）、`backoffMultiplier`（默认 2.0）、`maxDelayMs`（默认 30000）、`retryableStatusCodes`（默认 [429, 500, 502, 503]） |
| `status`             | int       | 状态值：0=ACTIVE, 1=DISABLED                                                                                                                                                                          |
| `statusName`         | string    | 状态名称：`ACTIVE`（可用）/`DISABLED`（已禁用，绑定到 agent 的此配置不会参与 LLM 选择）                                                                                                       |
| `schemaVersion`      | int       | 行 Schema 版本号                                                                                                                                                                                      |
| `extra`              | string    | 预留扩展字段                                                                                                                                                                                          |
| `createTime`         | timestamp | 创建时间                                                                                                                                                                                              |
| `updateTime`         | timestamp | 最后更新时间                                                                                                                                                                                          |

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
| `bizUserId`     | string    | 所属业务用户 ID，创建时指定，不可变更                                                                                 |
| `llmConfigId`   | string    | 会话级 LLM 配置 ID，覆盖 agent 默认配置。为空时继承 agent 的默认 LLM。必须是已绑定到 agent 且状态为 ACTIVE 的配置     |
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

| ------------------------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `messageId`        | string    | 消息唯一 ID，追加时自动生成                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `sessionId`        | string    | 所属会话 ID                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `agentId`          | string    | 所属 Agent ID                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `sequenceNum`      | long      | 会话内单调递增序列号，从 1 开始，用于消息排序和范围查询                                                                                                                                                                                                                                                                                                                                                                                            |
| `role`             | string    | 消息角色：`system`（系统指令）/`user`（用户输入）/`assistant`（LLM 回复）/`tool`（工具执行结果）                                                                                                                                                                                                                                                                                                                                   |
| `contentType`      | string    | 内容类型，决定上下文组装时的解析方式：`text`（纯文本，直接作为 message.content）/`tool_call`（工具调用，content 为 JSON 格式的 toolCalls 数组，组装时解析为 OpenAI tool\_calls 结构）/`tool_result`（工具结果，组装时 role 强制改为`tool`并附带 toolCallId）/`multimodal`（多模态，content 为 JSON 数组，每项含 type/text/imageUrl）/`summary`（会话摘要，由框架内部写入，用于上下文截断时注入历史概要，不计入普通消息流） |
| `content`          | string    | 消息内容。格式取决于 contentType：text 和 tool\_result 为纯文本，tool\_call 为 JSON（`{"toolCalls":[...]}`或`[{...}]`），multimodal 为 JSON 数组（`[{"type":"text","text":"..."},{"type":"image_url","imageUrl":"..."}]`）                                                                                                                                                                                                             |
| `toolCallId`       | string    | 工具调用关联 ID。contentType 为`tool_result`时必填，用于将工具执行结果关联到 assistant 发起的对应 tool\_call（同一个 toolCallId）                                                                                                                                                                                                                                                                                                              |
| `llmModel`         | string    | 产生该消息的 LLM 模型名称（如`gpt-4`），通常仅 assistant 消息和 summary 消息有此值                                                                                                                                                                                                                                                                                                                                                             |
| `promptTokens`     | int       | 产生该消息时的输入 token 数（LLM 返回的 usage 统计），用于计量                                                                                                                                                                                                                                                                                                                                                                                     |
| `completionTokens` | int       | 产生该消息时的输出 token 数（LLM 返回的 usage 统计），用于计量                                                                                                                                                                                                                                                                                                                                                                                     |
| `totalTokens`      | int       | 总 token 数（通常等于 promptTokens + completionTokens），用于滑动窗口的 token 预算计算                                                                                                                                                                                                                                                                                                                                                             |
| `metadata`         | object    | 自定义元数据，JSON 格式                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `schemaVersion`    | int       | 行 Schema 版本号                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `extra`            | string    | 预留扩展字段                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `createTime`       | timestamp | 消息创建时间                                                                                                                                                                                                                                                                                                                                                                                                                                       |

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
| `bizUserId`      | string    | 所属业务用户 ID。scope 为`agent`时为空（全局可见），scope 为`user`时标识该记忆仅对该用户可见                                                                     |
| `scope`          | string    | 作用域：`agent`（agent 级别，所有用户的搜索都能命中）/`user`（用户级别，仅该 bizUserId 的搜索可命中）                                                            |
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
| `name`                   | string    | 技能名称，ACTIVE 状态下全局唯一。用于`activeSkillNames`引用和目录展示                                                                                   |
| `description`            | string    | 技能描述，在 Tier-1 技能目录中展示，帮助 LLM 判断是否需要该技能                                                                                             |
| `license`                | string    | 许可证信息                                                                                                                                                  |
| `compatibility`          | string    | 兼容性说明（如最低框架版本要求）                                                                                                                            |
| `argumentHint`           | string    | 参数提示信息，在 Tier-1 目录中展示，提示 LLM 如何调用该技能                                                                                                 |
| `disableModelInvocation` | bool      | 是否禁止 LLM 自动调用。为`true`时该技能不会出现在 LLM 的工具目录（Tier-1）中，但仍可通过用户显式调用。可被 agent 级别的 binding`configOverride`覆盖 |
| `userInvocable`          | bool      | 是否允许用户直接调用该技能                                                                                                                                  |
| `packageHash`            | string    | 技能包（ZIP）的哈希值，用于完整性校验和去重                                                                                                                 |
| `packageSize`            | long      | 技能包大小（字节）                                                                                                                                          |
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
| `subjectType`    | string    | 绑定主体类型：`AGENT`（agent 级别绑定）/`BIZ_USER`（用户级别绑定）                    |
| `subjectId`      | string    | 绑定主体 ID（agentId 或 bizUserId）                                                           |
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

| ----------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sessionId`                         | string | 所属会话 ID                                                                                                                                     |
| `generated`                         | bool   | 是否实际生成了摘要。为`false`时表示跳过生成（如新消息数未达到`minMessagesSinceLastSummary`阈值），此时看`reason`了解原因            |
| `reason`                            | string | 未生成摘要的原因说明（`generated=true`时为空）                                                                                              |
| `trigger`                           | string | 触发方式：`manual`（用户手动调用摘要 API）/`auto`（autoAssemble 检测到历史截断后自动触发）                                              |
| `summaryRange`                      | object | 本次摘要覆盖的消息范围                                                                                                                          |
| `summaryRange.fromSeqNum`           | long   | 摘要覆盖的起始消息序列号                                                                                                                        |
| `summaryRange.toSeqNum`             | long   | 摘要覆盖的结束消息序列号                                                                                                                        |
| `summaryRange.basedOnSummarySeqNum` | long   | 基于哪条已有摘要做增量更新。为 0 表示首次从头生成                                                                                               |
| `summaryRange.incremental`          | bool   | 是否为增量摘要。`true`表示在已有摘要基础上追加新消息进行压缩，`false`表示全部重新生成                                                   |
| 其余 MessageInfo 字段                   | -      | 生成的摘要消息本身的详情（`messageId`、`sequenceNum`、`role="system"`、`contentType="summary"`、`content="摘要内容..."`等） |

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

| ----------------- | -------- | ------ | ------------------------ |
| `agentId`   | string | 是   | Agent ID               |
| `bizUserId` | string | 否   | 按用户过滤             |
| `startTime` | long   | 否   | 开始时间（毫秒时间戳） |
| `endTime`   | long   | 否   | 结束时间（毫秒时间戳） |

**响应:**

`{ "agentId": "agent_xxx", "bizUserId": "", "startTime": 1711699200000, "endTime": 1711785600000, "totalPromptTokens": 50000, "totalCompletionTokens": 15000, "totalTokens": 65000, "requestCount": 100 } `

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

| -------------------------- | ------------- | -------------------------------------------------------------------------------- |
| `AUTH_FAILED`        | 403         | 鉴权失败，当前用户无权执行此操作（DB 用户权限不足或业务用户未授权）            |
| `UNKNOWN_ACTION`     | 404         | 未知的 action，请求的接口/action 名称不存在                                    |
| `AGENT_NOT_FOUND`    | 404         | 指定的 Agent 不存在或已被删除                                                  |
| `SESSION_NOT_FOUND`  | 404         | 指定的会话不存在                                                               |
| `QUEUE_FULL`         | 503         | DataBus 请求队列已满，服务端过载，请稍后重试                                   |
| `TIMEOUT`            | 504         | 请求处理超时（包括 LLM 调用超时）                                              |
| `NODE_UNREACHABLE`   | 502         | 集群模式下目标亲和节点不可达，请求无法路由                                     |
| `HANDLER_ERROR`      | 500         | 处理器内部错误（如参数校验失败、状态冲突、LLM 调用失败等），详见 error.message |
| `STREAM_INTERRUPTED` | 500         | 流式传输中断（SSE 连接断开或 LLM 流式响应异常终止）                            |
| `INVALID_ARGUMENT`   | 400         | 请求参数不合法（缺少必填字段、类型错误、值超出范围等）                         |
| `BUS_NOT_STARTED`    | 503         | DataBus 尚未完成初始化，服务暂不可用                                           |

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
- `${BIZ_USER_ID}`: Current business user ID
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

| -------- | ------------------------------------------------ | -------------------------------------------------- | ------------------ |
| Tier 1 | 始终在上下文中                                 | `name`+`description`+`argument-hint` | \~50-100 / skill |
| Tier 2 | 技能被激活时（通过`activeSkillNames`指定） | SKILL.md 的完整 Markdown body                    | 建议 < 5000      |
| Tier 3 | 按需提取（通过`skill.extractFile`接口）    | 包内的脚本、模板、参考文档等                     | 不限             |

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
5. Markdown body → `instruction`（Tier-2 指令内容）
6. 校验 `name` 格式和唯一性（ACTIVE 状态下不可重名）
7. 合并 API 传入的 `overrides`（覆盖 frontmatter 同名字段）
8. 计算 `packageHash` = SHA-256
9. 写入存储，返回 [SkillInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#skillinfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#skillinfo")
