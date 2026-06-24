# DolphinDB Agent Runtime API Reference

![](https://dolphindb1.atlassian.net/wiki/aa-avatar/712020:3118b1f8-1171-4d34-ab7d-02d9ffc4b74b)

作者：qiwei zhu

收听

66

添加反应

注意：所有接口尚处于试用、联调过程中，可能随着用户的反馈会有变动。

最好定期下载新版本(代码分支是release300.codeRefactor)，下载方式是ftp：

* [<u>ftpuser@192.168.1.204</u>](mailto:ftpuser@192.168.1.204 "mailto:ftpuser@192.168.1.204"):/hdd/ftp/origin/release300.codeRefactor/Release/ALL/release2/cmake\_release\_all/    密码DolphinDB123

这是Agent 框架对外提供的全部接口的说明文档。​**注意，Agent框架不是一个Agent，它只提供了构建一个Agent所必须的组件服务**​。

Base URL: `/agent-bus/v1/`

传输协议: HTTP (JSON / SSE) 、WebSocket。**注意：如果你要自己开发一个demo，访问dolphinX的各种API接口前，需要认证。具体做法是：先用dolphindb的用户名和密码登录，然后拿到token，随后每次访问API接口都要先带上token（详见demo）**

## Quick Start

1. 先启动一个带有 Agent框架功能的 DolphinDB Server作为后端（​**版本越新越好，因为随时有修复、更新**​）。
2. 下载并运行一个demo作为应用端。需要配置：dolphindb ip、端口、用户名密码等，相关逻辑都在demo代码里（还有大模型配置等等，代码里都有）。
3. 也可以把本文档API丢给AI，让其基于本文档写一个demo。

### demo1

本demo用到了最常用的一些API接口，实现了一个聊天agent。

本demo重点演示了如何利用Agent框架提供的的http、websocket接口，框架里各种配置服务如何使用。详见代码和ReadMe文件。

demo.zip

29 4 2026, 04:53 下午

### demo2

本demo实现了一个可以用自然语言查询dolphindb数据库、分析数据、有长期记忆功能的agent。

本demo的重点是展示如何利用Agent框架提供的 skill、记忆、会话服务，结合react模式实现更多自由度的agent。（关于记忆的加载，当前demo只使用了文本检索。如需语义检索，则需要在注册agent的时候配置一下embedding服务）

demo2.zip

29 4 2026, 04:53 下午

## 目录

* [Quick Start](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#Quick-Start)
  * [demo1](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#demo1)
  * [demo2](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#demo2)
* [目录](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E7%9B%AE%E5%BD%95)
* [通用约定](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#1.-%E9%80%9A%E7%94%A8%E7%BA%A6%E5%AE%9A)
  * [请求格式](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E8%AF%B7%E6%B1%82%E6%A0%BC%E5%BC%8F)
  * [响应格式](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E5%93%8D%E5%BA%94%E6%A0%BC%E5%BC%8F)
  * [分页参数](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E5%88%86%E9%A1%B5%E5%8F%82%E6%95%B0)
  * [流式响应（HTTP SSE / WebSocket）](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E6%B5%81%E5%BC%8F%E5%93%8D%E5%BA%94%EF%BC%88HTTP-SSE-%2F-WebSocket%EF%BC%89)
    * [HTTP SSE](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#HTTP-SSE)
    * [WebSocket](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#WebSocket)
    * [错误语义](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E9%94%99%E8%AF%AF%E8%AF%AD%E4%B9%89)
    * [客户端处理建议](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E5%AE%A2%E6%88%B7%E7%AB%AF%E5%A4%84%E7%90%86%E5%BB%BA%E8%AE%AE)
* [面向 Agent 开发者的 API](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#2.-%E9%9D%A2%E5%90%91-Agent-%E5%BC%80%E5%8F%91%E8%80%85%E7%9A%84-API)
  * [2.1 Agent 发现与可用配置](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#2.1-Agent-%E5%8F%91%E7%8E%B0%E4%B8%8E%E5%8F%AF%E7%94%A8%E9%85%8D%E7%BD%AE)
    * [列出当前用户可访问的 Agent](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E5%88%97%E5%87%BA%E5%BD%93%E5%89%8D%E7%94%A8%E6%88%B7%E5%8F%AF%E8%AE%BF%E9%97%AE%E7%9A%84-Agent)
    * [获取 Agent](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E8%8E%B7%E5%8F%96-Agent)
    * [列出当前用户在指定 Agent 下可显式选择的 LLM](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E5%88%97%E5%87%BA%E5%BD%93%E5%89%8D%E7%94%A8%E6%88%B7%E5%9C%A8%E6%8C%87%E5%AE%9A-Agent-%E4%B8%8B%E5%8F%AF%E6%98%BE%E5%BC%8F%E9%80%89%E6%8B%A9%E7%9A%84-LLM)
  * [2.2 会话管理](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#2.2-%E4%BC%9A%E8%AF%9D%E7%AE%A1%E7%90%86)
    * [创建会话](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E5%88%9B%E5%BB%BA%E4%BC%9A%E8%AF%9D)
    * [获取会话](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E8%8E%B7%E5%8F%96%E4%BC%9A%E8%AF%9D)
    * [更新会话](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E6%9B%B4%E6%96%B0%E4%BC%9A%E8%AF%9D)
    * [删除会话](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E5%88%A0%E9%99%A4%E4%BC%9A%E8%AF%9D)
    * [列出会话](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E5%88%97%E5%87%BA%E4%BC%9A%E8%AF%9D)
  * [2.3 Chat Completions](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#2.3-Chat-Completions)
    * [自动组装模式 (Auto-Assembly)](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E8%87%AA%E5%8A%A8%E7%BB%84%E8%A3%85%E6%A8%A1%E5%BC%8F-(Auto-Assembly))
    * [手动组装模式 (Manual-Assembly)](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E6%89%8B%E5%8A%A8%E7%BB%84%E8%A3%85%E6%A8%A1%E5%BC%8F-(Manual-Assembly))
    * [响应 data 结构](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E5%93%8D%E5%BA%94-data-%E7%BB%93%E6%9E%84)
  * [2.4 技能运行时能力](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#2.4-%E6%8A%80%E8%83%BD%E8%BF%90%E8%A1%8C%E6%97%B6%E8%83%BD%E5%8A%9B)
    * [获取 Agent 的技能目录](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E8%8E%B7%E5%8F%96-Agent-%E7%9A%84%E6%8A%80%E8%83%BD%E7%9B%AE%E5%BD%95)
    * [列出技能包文件](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E5%88%97%E5%87%BA%E6%8A%80%E8%83%BD%E5%8C%85%E6%96%87%E4%BB%B6)
    * [获取技能包单个文件](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E8%8E%B7%E5%8F%96%E6%8A%80%E8%83%BD%E5%8C%85%E5%8D%95%E4%B8%AA%E6%96%87%E4%BB%B6)
    * [检索技能包文本文件](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E6%A3%80%E7%B4%A2%E6%8A%80%E8%83%BD%E5%8C%85%E6%96%87%E6%9C%AC%E6%96%87%E4%BB%B6)
    * [批量获取技能包文件](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E6%89%B9%E9%87%8F%E8%8E%B7%E5%8F%96%E6%8A%80%E8%83%BD%E5%8C%85%E6%96%87%E4%BB%B6)
  * [2.5 Workspace 运行时能力](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#2.5-Workspace-%E8%BF%90%E8%A1%8C%E6%97%B6%E8%83%BD%E5%8A%9B)
    * [Workspace 文件 hash](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#Workspace-%E6%96%87%E4%BB%B6-hash)
    * [列出 Workspace 文件](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E5%88%97%E5%87%BA-Workspace-%E6%96%87%E4%BB%B6)
    * [读取 Workspace 文件](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E8%AF%BB%E5%8F%96-Workspace-%E6%96%87%E4%BB%B6)
    * [写入 Workspace 文件](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E5%86%99%E5%85%A5-Workspace-%E6%96%87%E4%BB%B6)
    * [删除 Workspace 文件](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E5%88%A0%E9%99%A4-Workspace-%E6%96%87%E4%BB%B6)
    * [搜索 Workspace 文件](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E6%90%9C%E7%B4%A2-Workspace-%E6%96%87%E4%BB%B6)
    * [局部修改 Workspace 文件](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E5%B1%80%E9%83%A8%E4%BF%AE%E6%94%B9-Workspace-%E6%96%87%E4%BB%B6)
  * [2.6 记忆运行时能力](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#2.6-%E8%AE%B0%E5%BF%86%E8%BF%90%E8%A1%8C%E6%97%B6%E8%83%BD%E5%8A%9B)
  * [2.7 网络访问能力](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#2.7-%E7%BD%91%E7%BB%9C%E8%AE%BF%E9%97%AE%E8%83%BD%E5%8A%9B)
    * [发起外部网络请求](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E5%8F%91%E8%B5%B7%E5%A4%96%E9%83%A8%E7%BD%91%E7%BB%9C%E8%AF%B7%E6%B1%82)
  * [2.8 会话摘要](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#2.8-%E4%BC%9A%E8%AF%9D%E6%91%98%E8%A6%81)
    * [生成摘要](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E7%94%9F%E6%88%90%E6%91%98%E8%A6%81)
  * [2.9 调试接口](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#2.9-%E8%B0%83%E8%AF%95%E6%8E%A5%E5%8F%A3)
    * [Context Preview (上下文预览)](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#Context-Preview-(%E4%B8%8A%E4%B8%8B%E6%96%87%E9%A2%84%E8%A7%88))
  * [2.10 底层接口](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#2.10-%E5%BA%95%E5%B1%82%E6%8E%A5%E5%8F%A3)
    * [AIScript（受限 DolphinDB 脚本执行）](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#AIScript%EF%BC%88%E5%8F%97%E9%99%90-DolphinDB-%E8%84%9A%E6%9C%AC%E6%89%A7%E8%A1%8C%EF%BC%89)
    * [LLM Complete (直接调用 LLM)](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#LLM-Complete-(%E7%9B%B4%E6%8E%A5%E8%B0%83%E7%94%A8-LLM))
    * [获取消息列表](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E8%8E%B7%E5%8F%96%E6%B6%88%E6%81%AF%E5%88%97%E8%A1%A8)
* [面向 Web 管控的 API](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#3.-%E9%9D%A2%E5%90%91-Web-%E7%AE%A1%E6%8E%A7%E7%9A%84-API)
  * [3.1 Agent 生命周期管理](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#3.1-Agent-%E7%94%9F%E5%91%BD%E5%91%A8%E6%9C%9F%E7%AE%A1%E7%90%86)
    * [注册 Agent](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E6%B3%A8%E5%86%8C-Agent)
    * [获取 Agent](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E8%8E%B7%E5%8F%96-Agent.1)
    * [更新 Agent](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E6%9B%B4%E6%96%B0-Agent)
    * [激活 Agent](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E6%BF%80%E6%B4%BB-Agent)
    * [挂起 Agent](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E6%8C%82%E8%B5%B7-Agent)
    * [删除 Agent](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E5%88%A0%E9%99%A4-Agent)
    * [列出 Agent](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E5%88%97%E5%87%BA-Agent)
  * [3.2 Agent 授权管理](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#3.2-Agent-%E6%8E%88%E6%9D%83%E7%AE%A1%E7%90%86)
    * [授予 Agent 权限](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E6%8E%88%E4%BA%88-Agent-%E6%9D%83%E9%99%90)
    * [撤销 Agent 权限](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E6%92%A4%E9%94%80-Agent-%E6%9D%83%E9%99%90)
    * [列出 Agent 授权](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E5%88%97%E5%87%BA-Agent-%E6%8E%88%E6%9D%83)
  * [3.3 全局访问控制](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#3.3-%E5%85%A8%E5%B1%80%E8%AE%BF%E9%97%AE%E6%8E%A7%E5%88%B6)
    * [授予全局 AGENT\_ADMIN](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E6%8E%88%E4%BA%88%E5%85%A8%E5%B1%80-AGENT_ADMIN)
    * [撤销全局 AGENT\_ADMIN](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E6%92%A4%E9%94%80%E5%85%A8%E5%B1%80-AGENT_ADMIN)
    * [列出全局 AGENT\_ADMIN](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E5%88%97%E5%87%BA%E5%85%A8%E5%B1%80-AGENT_ADMIN)
  * [3.4 LLM Provider 与配置管理](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#3.4-LLM-Provider-%E4%B8%8E%E9%85%8D%E7%BD%AE%E7%AE%A1%E7%90%86)
    * [注册 LLM Provider](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E6%B3%A8%E5%86%8C-LLM-Provider)
    * [获取 LLM Provider](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E8%8E%B7%E5%8F%96-LLM-Provider)
    * [列出 LLM Provider](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E5%88%97%E5%87%BA-LLM-Provider)
    * [更新 LLM Provider](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E6%9B%B4%E6%96%B0-LLM-Provider)
    * [删除 LLM Provider](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E5%88%A0%E9%99%A4-LLM-Provider)
    * [注册 LLM 配置](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E6%B3%A8%E5%86%8C-LLM-%E9%85%8D%E7%BD%AE)
    * [获取 LLM 配置](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E8%8E%B7%E5%8F%96-LLM-%E9%85%8D%E7%BD%AE)
    * [列出 LLM 配置](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E5%88%97%E5%87%BA-LLM-%E9%85%8D%E7%BD%AE)
    * [更新 LLM 配置](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E6%9B%B4%E6%96%B0-LLM-%E9%85%8D%E7%BD%AE)
    * [删除 LLM 配置](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E5%88%A0%E9%99%A4-LLM-%E9%85%8D%E7%BD%AE)
  * [3.5 用户 LLM 访问控制](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#3.5-%E7%94%A8%E6%88%B7-LLM-%E8%AE%BF%E9%97%AE%E6%8E%A7%E5%88%B6)
    * [授予用户全局 LLM 访问权限](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E6%8E%88%E4%BA%88%E7%94%A8%E6%88%B7%E5%85%A8%E5%B1%80-LLM-%E8%AE%BF%E9%97%AE%E6%9D%83%E9%99%90)
    * [撤销用户全局 LLM 访问权限](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E6%92%A4%E9%94%80%E7%94%A8%E6%88%B7%E5%85%A8%E5%B1%80-LLM-%E8%AE%BF%E9%97%AE%E6%9D%83%E9%99%90)
    * [列出用户全局 LLM 访问权限](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E5%88%97%E5%87%BA%E7%94%A8%E6%88%B7%E5%85%A8%E5%B1%80-LLM-%E8%AE%BF%E9%97%AE%E6%9D%83%E9%99%90)
  * [3.6 Agent-LLM 绑定](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#3.6-Agent-LLM-%E7%BB%91%E5%AE%9A)
    * [绑定 LLM 到 Agent](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E7%BB%91%E5%AE%9A-LLM-%E5%88%B0-Agent)
    * [解绑 LLM](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E8%A7%A3%E7%BB%91-LLM)
    * [列出 Agent 的 LLM 配置](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E5%88%97%E5%87%BA-Agent-%E7%9A%84-LLM-%E9%85%8D%E7%BD%AE)
  * [3.7 Skill 管理](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#3.7-Skill-%E7%AE%A1%E7%90%86)
    * [注册技能](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E6%B3%A8%E5%86%8C%E6%8A%80%E8%83%BD)
    * [获取技能](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E8%8E%B7%E5%8F%96%E6%8A%80%E8%83%BD)
    * [获取技能指令](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E8%8E%B7%E5%8F%96%E6%8A%80%E8%83%BD%E6%8C%87%E4%BB%A4)
    * [按名称获取技能](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E6%8C%89%E5%90%8D%E7%A7%B0%E8%8E%B7%E5%8F%96%E6%8A%80%E8%83%BD)
    * [更新技能](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E6%9B%B4%E6%96%B0%E6%8A%80%E8%83%BD)
    * [删除技能](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E5%88%A0%E9%99%A4%E6%8A%80%E8%83%BD)
    * [列出技能](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E5%88%97%E5%87%BA%E6%8A%80%E8%83%BD)
  * [3.8 Skill 绑定与访问控制](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#3.8-Skill-%E7%BB%91%E5%AE%9A%E4%B8%8E%E8%AE%BF%E9%97%AE%E6%8E%A7%E5%88%B6)
    * [绑定技能到 Agent](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E7%BB%91%E5%AE%9A%E6%8A%80%E8%83%BD%E5%88%B0-Agent)
    * [解绑技能](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E8%A7%A3%E7%BB%91%E6%8A%80%E8%83%BD)
    * [列出 Agent 的技能绑定](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E5%88%97%E5%87%BA-Agent-%E7%9A%84%E6%8A%80%E8%83%BD%E7%BB%91%E5%AE%9A)
    * [禁止业务用户使用技能](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E7%A6%81%E6%AD%A2%E4%B8%9A%E5%8A%A1%E7%94%A8%E6%88%B7%E4%BD%BF%E7%94%A8%E6%8A%80%E8%83%BD)
    * [允许业务用户使用技能](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E5%85%81%E8%AE%B8%E4%B8%9A%E5%8A%A1%E7%94%A8%E6%88%B7%E4%BD%BF%E7%94%A8%E6%8A%80%E8%83%BD)
    * [列出业务用户被禁止的技能](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E5%88%97%E5%87%BA%E4%B8%9A%E5%8A%A1%E7%94%A8%E6%88%B7%E8%A2%AB%E7%A6%81%E6%AD%A2%E7%9A%84%E6%8A%80%E8%83%BD)
  * [3.9 Memory 管控](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#3.9-Memory-%E7%AE%A1%E6%8E%A7)
    * [个人记忆设置](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E4%B8%AA%E4%BA%BA%E8%AE%B0%E5%BF%86%E8%AE%BE%E7%BD%AE)
    * [创建个人记忆](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E5%88%9B%E5%BB%BA%E4%B8%AA%E4%BA%BA%E8%AE%B0%E5%BF%86)
    * [获取个人记忆](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E8%8E%B7%E5%8F%96%E4%B8%AA%E4%BA%BA%E8%AE%B0%E5%BF%86)
    * [更新个人记忆](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E6%9B%B4%E6%96%B0%E4%B8%AA%E4%BA%BA%E8%AE%B0%E5%BF%86)
    * [删除个人记忆](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E5%88%A0%E9%99%A4%E4%B8%AA%E4%BA%BA%E8%AE%B0%E5%BF%86)
    * 查询个人记忆
    * [忘记会话个人记忆](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E5%BF%98%E8%AE%B0%E4%BC%9A%E8%AF%9D%E4%B8%AA%E4%BA%BA%E8%AE%B0%E5%BF%86)
    * 触发当前用户会话记忆流水线
    * 查看公共记忆
    * 更新公共记忆
    * 清空公共记忆
    * [记忆统计](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E8%AE%B0%E5%BF%86%E7%BB%9F%E8%AE%A1)
    * [读取记忆配置](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E8%AF%BB%E5%8F%96%E8%AE%B0%E5%BF%86%E9%85%8D%E7%BD%AE)
    * [更新记忆配置](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E6%9B%B4%E6%96%B0%E8%AE%B0%E5%BF%86%E9%85%8D%E7%BD%AE)
    * [列出记忆任务](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E5%88%97%E5%87%BA%E8%AE%B0%E5%BF%86%E4%BB%BB%E5%8A%A1)
    * [获取记忆任务](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E8%8E%B7%E5%8F%96%E8%AE%B0%E5%BF%86%E4%BB%BB%E5%8A%A1)
    * [重试记忆任务](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E9%87%8D%E8%AF%95%E8%AE%B0%E5%BF%86%E4%BB%BB%E5%8A%A1)
    * [触发记忆流水线](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E8%A7%A6%E5%8F%91%E8%AE%B0%E5%BF%86%E6%B5%81%E6%B0%B4%E7%BA%BF)
    * [重置用户个人记忆](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E9%87%8D%E7%BD%AE%E7%94%A8%E6%88%B7%E4%B8%AA%E4%BA%BA%E8%AE%B0%E5%BF%86)
  * [3.10 LLM 使用统计](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#3.10-LLM-%E4%BD%BF%E7%94%A8%E7%BB%9F%E8%AE%A1)
    * [查询 LLM 使用统计](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E6%9F%A5%E8%AF%A2-LLM-%E4%BD%BF%E7%94%A8%E7%BB%9F%E8%AE%A1)
  * [3.11 内置 Agent/Skill 初始化](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#3.11-%E5%86%85%E7%BD%AE-Agent%2FSkill-%E5%88%9D%E5%A7%8B%E5%8C%96)
    * [执行初始化](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E6%89%A7%E8%A1%8C%E5%88%9D%E5%A7%8B%E5%8C%96)
    * [查询初始化状态](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E6%9F%A5%E8%AF%A2%E5%88%9D%E5%A7%8B%E5%8C%96%E7%8A%B6%E6%80%81)
    * [状态与资源动作](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E7%8A%B6%E6%80%81%E4%B8%8E%E8%B5%84%E6%BA%90%E5%8A%A8%E4%BD%9C)
    * [升级语义](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E5%8D%87%E7%BA%A7%E8%AF%AD%E4%B9%89)
* [数据结构参考](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#4.-%E6%95%B0%E6%8D%AE%E7%BB%93%E6%9E%84%E5%8F%82%E8%80%83)
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
  * [MemoryJob](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#MemoryJob)
  * [SkillInfo](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#SkillInfo)
  * [SkillAccessInfo](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#SkillAccessInfo)
  * [BuiltinInitResult](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#BuiltinInitResult)
  * [BuiltinInitSummary](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#BuiltinInitSummary)
  * [BuiltinInitItem](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#BuiltinInitItem)
  * [BuiltinStateRecord](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#BuiltinStateRecord)
  * [NetworkFetchResponse](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#NetworkFetchResponse)
  * [LLMResponse](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#LLMResponse)
  * [ToolCall](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#ToolCall)
  * [SummaryResult](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#SummaryResult)
* [错误码](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#5.-%E9%94%99%E8%AF%AF%E7%A0%81)
* [WebSocket 协议](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#6.-WebSocket-%E5%8D%8F%E8%AE%AE)
  * [连接](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E8%BF%9E%E6%8E%A5)
  * [消息格式](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E6%B6%88%E6%81%AF%E6%A0%BC%E5%BC%8F)
  * [HTTP → WebSocket 参数映射规则](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#HTTP-%E2%86%92-WebSocket-%E5%8F%82%E6%95%B0%E6%98%A0%E5%B0%84%E8%A7%84%E5%88%99)
  * [支持的 Action](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E6%94%AF%E6%8C%81%E7%9A%84-Action)
* [附录：内置 Agent/Skill 发布包规范](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#7.-%E9%99%84%E5%BD%95%EF%BC%9A%E5%86%85%E7%BD%AE-Agent%2FSkill-%E5%8F%91%E5%B8%83%E5%8C%85%E8%A7%84%E8%8C%83)
  * [目录结构](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E7%9B%AE%E5%BD%95%E7%BB%93%E6%9E%84)
  * [manifest.json 格式](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#manifest.json-%E6%A0%BC%E5%BC%8F)
  * [manifest.json 示例](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#manifest.json-%E7%A4%BA%E4%BE%8B)
* [附录：技能包规范](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#8.-%E9%99%84%E5%BD%95%EF%BC%9A%E6%8A%80%E8%83%BD%E5%8C%85%E8%A7%84%E8%8C%83)
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
  * `x-agent-id`: 指定 agentId（可选，与 body/query 中的 agentId 等效，不可冲突）
  * `x-session-id`: 指定 sessionId（可选）

### 响应格式

非流式响应只返回一条 JSON envelope，`type` 为 `RESPONSE`。各接口章节中的 **响应示例默认只展示 ​**`data`​**​ 内部结构**​；实际 HTTP / WebSocket 返回会包在下面的外层 envelope 中：

`{ "type": "RESPONSE", "msgId": "...", "correlationId": "<requestId>", "action": "<action>", "agentId": "<agentId>", "sessionId": "<sessionId>", "data": { ... }, "headers": { "...": "..." } } `

说明：

* 下面所有章节中的“响应”字段都位于data中。
* `headers` 是 envelope 内的业务元信息字段，不是 HTTP response headers；仅在服务端 envelope headers 非空时返回。
* `correlationId` 用于关联请求和响应。若请求没有显式提供 `x-request-id` 或 WebSocket `requestId`，服务端会使用本次请求的 `msgId` 作为 `correlationId`。

常规 DataBus 错误响应：

`{ "type": "ERROR", "msgId": "...", "correlationId": "<requestId>", "action": "<action>", "agentId": "<agentId>", "sessionId": "<sessionId>", "error": { "code": "<BusErrorCode>", "message": "<错误描述>", "reason": "<业务原因，可选>", "providerStatus": "<LLM provider HTTP 状态码，可选>", "providerCode": "<LLM provider 错误码，可选>", "retryable": "<true|false，可选>" }, "headers": { "busErrorCode": "<BusErrorCode>", "httpStatus": "<HTTP 状态码>", "llmProviderStatus": "<LLM provider HTTP 状态码，可选>", "providerCode": "<LLM provider 错误码，可选>", "retryable": "<true|false，可选>" } } `

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

| -------------- | ------ | -------- | ------------------------------------------------- |
| `offset` | int  | 0      | 跳过前 N 条，必须为非负整数                     |
| `limit`  | int  | 100    | 返回条数上限，必须为非负整数；`0`返回空列表 |

分页参数支持 URL 查询参数传递 或 JSON request body 传入。

### 流式响应（HTTP SSE / WebSocket）

支持流式的接口通过请求字段 `stream` 控制返回方式；省略时默认为 `true`。HTTP 请求体中 `stream=true` 时返回 Server-Sent Events，`stream=false` 时返回普通 JSON envelope；WebSocket 调用时该字段位于请求帧的 `payload.stream`。

HTTP SSE 和 WebSocket 使用同一套 envelope 类型，只是传输 framing 不同。典型事件序列如下：

`[可选的 EVENT ...] -> STREAM_START -> [STREAM_CHUNK / STREAM_REASONING / EVENT ...] -> STREAM_END 或 STREAM_ERROR `

#### HTTP SSE

SSE 响应头：

`Content-Type: text/event-stream; charset=UTF-8 Cache-Control: no-cache Connection: keep-alive X-Agent-Bus-Streaming: true `

每个 SSE 事件的 `data:` 都是一条完整的 JSON envelope，由 `type` 表示当前阶段。客户端应先按 SSE 事件分帧，再解析 `data` 中的 JSON；不要把多个 chunk 拼成一个 JSON 解析。

对 HTTP SSE 客户端来说，`chunk` / `reasoning_delta` 只用于实时展示；传输快结束时`stream_end` 中的 `STREAM_END.data` 会包含完整响应结果，业务处理应使用这份数据，不要自行拼接 `chunk`。

| SSE event

```
| envelope.type


      | 说明


                         |
```

| ----------------------- | ------------------------ | ---------------------------------- |
| `event`           | `EVENT`            | 业务过程事件，如上下文压缩进度   |
| `stream_start`    | `STREAM_START`     | 流式请求已开始                   |
| `chunk`           | `STREAM_CHUNK`     | 正文或结构化增量                 |
| `reasoning_delta` | `STREAM_REASONING` | 可展示 reasoning 增量            |
| `stream_end`      | `STREAM_END`       | 流式请求成功结束                 |
| `stream_error`    | `STREAM_ERROR`     | 流式请求中途失败，发送后关闭响应 |

示例：

`event: stream_start data: {"type":"STREAM_START","msgId":"...","correlationId":"req_001","action":"chat.completions","agentId":"agent_xxx","sessionId":"sess_001","data":{"requestId":"req_001","model":"<resolved-model>"}} event: chunk data: {"type":"STREAM_CHUNK","msgId":"...","correlationId":"req_001","action":"chat.completions","agentId":"agent_xxx","sessionId":"sess_001","data":{"content":"你好"}} event: stream_end data: {"type":"STREAM_END","msgId":"...","correlationId":"req_001","action":"chat.completions","agentId":"agent_xxx","sessionId":"sess_001","data":{"requestId":"req_001","content":"你好","finishReason":"stop","usage":{"totalTokens":20}}} `

#### WebSocket

WebSocket 流式返回时不会包装成 SSE 文本格式，也没有 `event:` / `data:` 这些行。服务端会把每个流式事件作为一条独立的 JSON envelope 消息发回同一个 WebSocket 连接。客户端用响应里的 `correlationId` 匹配请求时传入的 `requestId`。

对 WebSocket 客户端来说，`STREAM_CHUNK` / `STREAM_REASONING` 只用于实时展示；在传输快结束时， `STREAM_END.data` 会包含完整响应结果，业务方应使用`STREAM_END.data`。

请求示例：

`{ "type": "REQUEST", "requestId": "req_001", "action": "chat.completions", "agentId": "agent_xxx", "sessionId": "sess_001", "payload": { "message": "你好", "stream": true } } `

流式响应帧示例：

`{"type":"STREAM_START","msgId":"...","correlationId":"req_001","action":"chat.completions","agentId":"agent_xxx","sessionId":"sess_001","data":{"requestId":"req_001","model":"<resolved-model>"}} {"type":"STREAM_CHUNK","msgId":"...","correlationId":"req_001","action":"chat.completions","agentId":"agent_xxx","sessionId":"sess_001","data":{"content":"你好"}} {"type":"STREAM_END","msgId":"...","correlationId":"req_001","action":"chat.completions","agentId":"agent_xxx","sessionId":"sess_001","data":{"requestId":"req_001","content":"你好","finishReason":"stop","usage":{"totalTokens":20}}} `

#### 错误语义

* 若 HTTP SSE 开始前失败，服务端返回普通 `ERROR` JSON envelope，并使用对应 HTTP status。
* 若 HTTP SSE 开始后失败，HTTP status 已经发送，服务端会返回 `event: stream_error`，`data.type` 为 `STREAM_ERROR`，随后关闭响应。
* WebSocket 失败时返回 `ERROR` 或 `STREAM_ERROR` JSON 帧；`correlationId` 仍对应请求帧中的 `requestId`。
* 收到 `STREAM_END` 或 `STREAM_ERROR` 后，本次流式请求结束，不会再有后续事件。

#### 客户端处理建议

* 流式 envelope 的顶层 `headers` 与非流式含义一致，仅在服务端 envelope headers 非空时返回。
* SSE 响应体统一使用 UTF-8 编码。客户端应按字节读取并显式按 UTF-8 解码后，再做事件分帧和 JSON 解析。
* 客户端应忽略未知的 `EVENT.action`，避免服务端新增过程事件时造成兼容性问题。

---

## 2. 面向 Agent 开发者的 API

本章面向调用 Agent 的应用开发者，覆盖 Agent 发现、会话、对话补全、运行时 Skill/Workspace/Memory/网络访问能力，以及调试和底层调用接口。低频和底层接口放在本章靠后位置。

---

### 2.1 Agent 发现与可用配置

#### 列出当前用户可访问的 Agent

`GET /agent-bus/v1/agent/accessible `

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

| -------------- | ------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `status` | int  | -1     | 状态过滤。该接口只返回当前用户可调用的 ACTIVE Agent；通常不需要传。传`1`或不传返回 ACTIVE Agent；传`0`、`2`、`3`返回空列表 |
| `offset` | int  | 0      | 跳过前 N 条                                                                                                                                |
| `limit`  | int  | 100    | 返回条数上限                                                                                                                               |

Agent 状态值：`0=REGISTERED`，`1=ACTIVE`，`2=SUSPENDED`，`3=DELETED`。本接口只返回 `ACTIVE`。

**响应:**

`{ "items": [ { "...": "AgentInfo", "myPermission": "AGENT_INVOKE" } ], "offset": 0, "limit": 100, "size": 5 } `

说明：

* `items[]` 中每个对象为 [AgentInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#agentinfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#agentinfo")，并额外包含 `myPermission`。
* `myPermission` 表示当前用户对该 Agent 的有效权限，取值为 `AGENT_INVOKE` 或 `AGENT_ADMIN`。
* `offset` 和 `limit` 为本次请求使用的分页参数。
* `size` 为本次返回的 `items` 数量。

---

#### 获取 Agent

`GET /agent-bus/v1/agent/{agentId} `

**响应:** [AgentInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#agentinfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#agentinfo")

---

#### 列出当前用户在指定 Agent 下可显式选择的 LLM

`GET /agent-bus/v1/agent/{agentId}/llm/selectable `

**响应:**

`{ "defaultLlmConfigId": "llm_primary", "items": [ { "...": "LlmConfigInfo", "source": "agent", "isAgentDefault": true, "participatesInFallback": true, "fallbackPriority": 0 }, { "...": "LlmConfigInfo", "source": "user", "isAgentDefault": false, "participatesInFallback": false, "fallbackPriority": null } ], "size": 2 } `

说明：

* `defaultLlmConfigId`：未显式指定 `llmConfigId` 时默认使用的 LLM 配置 ID，来自 Agent 绑定配置。
* `items[]`：可选 LLM 配置列表。每个对象为 [LlmConfigInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmconfiginfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmconfiginfo")，并额外包含：
  * `source`：该配置的可选来源。`agent` 表示来自 Agent 绑定，`user` 表示来自用户级授权，`both` 表示两者都有。
  * `isAgentDefault`：是否为 Agent 默认 LLM。
  * `participatesInFallback`：是否参与 Agent 的备用 LLM 配置切换链。只有 Agent 绑定配置会参与；仅用户级授权的配置可被显式选择，但不会作为失败后的备用配置。
  * `fallbackPriority`：备用切换优先级。`participatesInFallback=true` 时为整数，数值越小优先级越高；否则为 `null`。
* `size`：本次返回的 `items` 数量。

---

### 2.2 会话管理

#### 创建会话

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
| `metadata`    | object | 否   | 自定义元数据，JSON 格式，原样存储，框架不做处理                 |

**响应:** [SessionInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#sessioninfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#sessioninfo")

---

#### 获取会话

`GET /agent-bus/v1/session/{sessionId} `

**响应:** [SessionInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#sessioninfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#sessioninfo")

---

#### 更新会话

`PUT /agent-bus/v1/session/{sessionId} `

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

| ------------------- | -------- | ---------------- | ---------------------------------------------------------------------------------------------------------- |
| `sessionId`   | string | 路径已提供时否 | 会话 ID；若同时出现在路径和 body 中，必须一致                                                            |
| `title`       | string | 否             | 会话标题                                                                                                 |
| `llmConfigId` | string | 否             | 会话级 LLM 配置 ID。非空时必须属于该 session 用户在该 agent 下的有效可选集合；空字符串表示清除会话级配置 |
| `metadata`    | object | 否             | 自定义元数据，整体替换；必须是 JSON object                                                               |
| `extra`       | string | 否             | 预留扩展字段                                                                                             |

说明：

* 只有 session owner 可更新。

**响应:** [SessionInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#sessioninfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#sessioninfo")

---

#### 删除会话

`DELETE /agent-bus/v1/session/{sessionId} `

删除会话会物理删除会话消息和对应的workspace。

**响应:**

`{ "sessionId": "sess_001", "deleted": true } `

说明：

* 只有 session owner 可删除存在的会话。
* 对不存在的 `sessionId` 返回 `deleted=true`。
* 删除开始后，该 session 的新消息追加请求返回失败。
* 删除后 `GET /session/{sessionId}` 和 `GET /session/{sessionId}/messages` 返回 `BUS_SESSION_NOT_FOUND`。

---

#### 列出会话

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

| -------------------- | -------- | ------------------ | -------------------------------------------------------------------------------------------------------- |
| `agentId`      | string | `x-agent-id` | Agent ID。未通过`x-agent-id`指定时必须在参数中提供                                                 |
| `targetUserId` | string | 当前登录用户     | 要查询的会话所属用户。不传时只返回当前登录用户自己的会话；如果要查询其他用户，调用者必须拥有管理员权限 |
| `offset`       | int    | 0                | 跳过前 N 条                                                                                            |
| `limit`        | int    | 100              | 返回条数上限                                                                                           |

**响应:** `{ items: [SessionInfo, ...], offset, limit, size }`

说明：

* `items[]` 中每个对象为 [SessionInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#sessioninfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#sessioninfo")。

---

### 2.3 Chat Completions

WebSocket 调用方式见 [6. WebSocket 协议](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#6-websocket-%E5%8D%8F%E8%AE%AE "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#6-websocket-%E5%8D%8F%E8%AE%AE")。

这是搭建agent应用时最主要的接口。一次调用表示在指定 session 中推进一轮对话：可以提交新的用户消息，也可以提交 tool calls 的执行结果。框架会自动完成权限校验、会话写入、上下文组装、模型选择、LLM 调用、助手回复落库和 token usage 记录。

`POST /agent-bus/v1/chat/completions `

接口支持流式和非流式返回，默认流式返回。自动组装与手动组装共用同一个 endpoint，通过请求体中是否包含 `assemblyConfig` 字段切换：不带 `assemblyConfig` 走自动组装，适合常规对话；带 `assemblyConfig` 走手动组装，适合调用方自行控制上下文块、工具定义或临时指令的场景。

#### 自动组装模式 (Auto-Assembly)

**请求体:**

| 字段

```
| 类型


          | 必填


 | 说明


                                                                                                                                                                                                                                                       |
```

| -------------------------------------------------------------- | ------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sessionId`                                              | string            | 是       | 会话 ID，必须属于当前登录用户                                                                                                                                                                                                                                  |
| `message`                                                | string            | 条件必填 | 用户消息文本，会被自动追加到会话历史中。`message`和`toolResults`必须且只能提供一个                                                                                                                                                                     |
| `toolResults`                                            | ToolResult[]      | 条件必填 | 工具执行结果列表，必须对应上一轮 assistant 返回的`toolCalls`。`message`和`toolResults`必须且只能提供一个                                                                                                                                           |
| `stream`                                                 | bool              | 否       | 是否流式返回（默认 true）                                                                                                                                                                                                                                      |
| `contextEvent`                                           | bool              | 否       | 是否在流式响应中返回上下文处理过程事件，默认`false`。开启后，自动摘要/上下文压缩等过程会以`EVENT`事件返回，便于前端展示“正在压缩上下文”等状态；这些事件不是 LLM 回复内容。仅`stream=true`的 HTTP SSE 和 WebSocket 生效；`stream=false`时忽略 |
| `includeReasoning`                                       | bool              | 否       | 是否返回思考过程（默认否）                                                                                                                                                                                                                                     |
| `tools`                                                  | ToolDefinition[]  | 否       | 应用层工具定义列表（请使用 OpenAI function calling 格式）                                                                                                                                                                                                      |
| `activeSkillNames`                                       | string[]          | 否       | 本次请求主动加载的技能名称列表。该字段只用于显式注入这些技能的详细指令，不表示模型自主选择的技能，也不维护渐进式加载状态；后续是否继续加载由调用方决定                                                                                                         |
| `llmConfigId`                                            | string            | 否       | 指定本次请求使用的 LLM 配置 ID，临时覆盖 session/agent 默认配置。会进行权限校验                                                                                                                                                                                |
| `model`                                                  | string            | 否       | 临时覆盖本次 provider 请求中的模型名称。通常应通过`llmConfigId`选择模型；仅在同一 LLM 配置下需要临时指定兼容模型名时使用。该字段不改变`llmConfigId`、权限校验、上下文窗口或备用 LLM 配置切换策略                                                       |
| `temperature`                                            | double            | 否       | 临时覆盖本次采样温度，范围`[0, 2]`；值越低输出越稳定，值越高输出越发散                                                                                                                                                                                     |
| `maxTokens`/`max_tokens`/`max_completion_tokens` | int               | 否       | 临时覆盖本次输出 token 上限；也会影响上下文组装时预留的输出预算。三个字段等价，建议只传一个                                                                                                                                                                    |
| `topP`/`top_p`                                       | double            | 否       | 临时覆盖本次 nucleus sampling 参数，范围`(0, 1]`；值越小输出越收敛。`topP`与`top_p`等价，建议只传一个                                                                                                                                              |
| `stop`                                                   | string / string[] | 否       | 临时设置本次停止序列；生成内容命中任一序列时停止。可传字符串或字符串数组                                                                                                                                                                                       |
| `extensions`                                             | object            | 否       | 会直接透传到 Provider 的参数                                                                                                                                                                                                                                   |

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

| ------------------------------------- | -------- | ------ | ------------------------------------------------------------------ |
| `toolCallId`/`tool_call_id` | string | 是   | 工具调用 ID，需与上一轮 assistant 返回的`toolCalls[].id`一致 |
| `content`                       | string | 否   | 工具执行结果的文本内容                                           |

**自动组装流程：**

以下步骤由框架在后台完成，调用方只需提交本轮 `message` 或 `toolResults`。

1. 校验会话权限，并解析本次要使用的 LLM 配置。
2. 加载 Agent 配置、系统提示词、技能目录、显式加载的技能详细指令和相关记忆。
3. 按 `summary-first` 策略组装上下文；必要时先执行自动摘要，再重新组装。
4. 通过上下文窗口检查后，将当前轮输入写入会话并调用 LLM。
5. 将 assistant 回复和 token usage 写入会话，并返回本次响应。

#### 手动组装模式 (Manual-Assembly)

**请求体:**

| 字段

```
| 类型


          | 必填


 | 说明


                                                                                                                                                                                                                                                       |
```

| -------------------------------------------------------------- | ------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sessionId`                                              | string            | 是       | 会话 ID，必须属于当前登录用户                                                                                                                                                                                                                                  |
| `message`                                                | string            | 条件必填 | 用户消息文本，会被自动追加到会话历史中。`message`和`toolResults`必须且只能提供一个                                                                                                                                                                     |
| `toolResults`                                            | ToolResult[]      | 条件必填 | 工具执行结果列表，必须对应上一轮 assistant 返回的`toolCalls`。`message`和`toolResults`必须且只能提供一个                                                                                                                                           |
| `stream`                                                 | bool              | 否       | 是否流式返回（默认 true）                                                                                                                                                                                                                                      |
| `contextEvent`                                           | bool              | 否       | 是否在流式响应中返回上下文处理过程事件，默认`false`。开启后，自动摘要/上下文压缩等过程会以`EVENT`事件返回，便于前端展示“正在压缩上下文”等状态；这些事件不是 LLM 回复内容。仅`stream=true`的 HTTP SSE 和 WebSocket 生效；`stream=false`时忽略 |
| `includeReasoning`                                       | bool              | 否       | 是否返回思考过程（默认否）                                                                                                                                                                                                                                     |
| `llmConfigId`                                            | string            | 否       | 指定本次请求使用的 LLM 配置 ID，临时覆盖 session/agent 默认配置。会进行权限校验                                                                                                                                                                                |
| `model`                                                  | string            | 否       | 临时覆盖本次 provider 请求中的模型名称。通常应通过`llmConfigId`选择模型；仅在同一 LLM 配置下需要临时指定兼容模型名时使用。该字段不改变`llmConfigId`、权限校验、上下文窗口或备用 LLM 配置切换策略                                                       |
| `temperature`                                            | double            | 否       | 临时覆盖本次采样温度，范围`[0, 2]`；值越低输出越稳定，值越高输出越发散                                                                                                                                                                                     |
| `maxTokens`/`max_tokens`/`max_completion_tokens` | int               | 否       | 临时覆盖本次输出 token 上限；也会影响上下文组装时预留的输出预算。三个字段等价，建议只传一个                                                                                                                                                                    |
| `topP`/`top_p`                                       | double            | 否       | 临时覆盖本次 nucleus sampling 参数，范围`(0, 1]`；值越小输出越收敛。`topP`与`top_p`等价，建议只传一个                                                                                                                                              |
| `stop`                                                   | string / string[] | 否       | 临时设置本次停止序列；生成内容命中任一序列时停止。可传字符串或字符串数组                                                                                                                                                                                       |
| `extensions`                                             | object            | 否       | 会直接透传到 Provider 的参数                                                                                                                                                                                                                                   |
| `assemblyConfig`                                         | object            | 是       | 手动组装配置，由应用层控制上下文构成                                                                                                                                                                                                                           |

`assemblyConfig` 结构:

| 字段

```
| 类型


         | 说明


                                                                                                                                               |
```

| ------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `systemPrompt`      | string           | 自定义系统提示词，覆盖 agent 默认的 systemPrompt                                                                                                       |
| `contextBlocks`     | ContextBlock[]   | 自定义上下文块列表，按`position`插入组装管线（见下方 ContextBlock 结构与手动组装流程）                                                             |
| `tools`             | ToolDefinition[] | 应用层工具定义列表（请使用 OpenAI function calling 格式）                                                                                              |
| `activeSkillNames`  | string[]         | 本次请求主动加载的技能名称列表。该字段只用于显式注入这些技能的详细指令，不表示模型自主选择的技能，也不维护渐进式加载状态；后续是否继续加载由调用方决定 |
| `excludeSkillNames` | string[]         | 排除的技能名称列表（从技能目录和技能详细指令中移除）                                                                                                   |
| `noSkillCatalog`    | bool             | 是否跳过技能目录自动注入（默认 false）                                                                                                                 |

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

`contextBlocks` 按位置采用语义。`after_system` 的 block 会顺序追加到前一条 system prompt 消息内容末尾；若本次组装没有 system prompt，`after_system` 会退化为首条 `role=system` 消息。`before_history` 会包装成应用参考上下文，插入到 latest summary 之后、raw history 之前。`before_current_turn` 会包装成应用运行时上下文并折叠进当前轮 `message`。

**手动组装流程：**

以下步骤由框架完成，调用方通过 `assemblyConfig` 控制上下文构成。

1. 校验会话权限，并解析本次要使用的 LLM 配置。
2. 应用 `assemblyConfig`：覆盖 system prompt、注入或排除技能、插入 `contextBlocks`。
3. 按固定顺序组装上下文：system/`after_system`、技能、记忆、summary、`before_history`、历史、本轮输入/`before_current_turn`。
4. 通过上下文窗口检查后，将当前轮输入写入会话并调用 LLM。
5. 将 assistant 回复和 token usage 写入会话，并返回本次响应。

**手动组装约束：**

* `after_system` 用于全局规则，`before_history` 用于本轮参考资料，`before_current_turn` 用于需要贴近当前轮的运行时状态或动态快照。

#### 响应 data 结构

自动组装和手动组装的响应 `data` 结构一致。`stream=false` 时该结构作为 HTTP JSON envelope 的 `data` 返回；`stream=true` 时完整结果在 `STREAM_END.data` 返回，实时增量遵循全局流式协议。

`reasoning` 表示 LLM 提供商返回的可展示思考过程，只用于展示，不保证完整或等价于模型内部推理；框架只在 `includeReasoning=true` 时提取并返回，不必持久化存储。

`{ "requestId": "req_xxx", "sessionId": "sess_001", "model": "gpt-4", "llmConfigId": "llm_actual", "content": "这是 LLM 的回复...", "reasoning": "LLM 提供商返回的可展示思考过程；未开启或未返回时为空", "toolCalls": [ { "id": "call_xxx", "type": "function", "function": { "name": "search_database", "arguments": "{\"query\":\"SELECT ...\"}" } } ], "finishReason": "stop", "usage": { "promptTokens": 1200, "completionTokens": 300, "totalTokens": 1500 }, "latencyMs": 2500, "metadata": { "llmConfigId": "llm_actual", "requestedLlmConfigId": "llm_requested", "fallbackApplied": false } } `

说明：

* 流式响应中，`STREAM_CHUNK.data.content` 是正文增量，`toolCallDeltas` 是工具调用增量；增量可能不完整，只用于实时展示。执行工具、入库或业务判断以 `STREAM_END.data.toolCalls` 为准。
* `STREAM_REASONING.data.reasoning` 只在 `includeReasoning=true` 且 LLM 提供商返回可展示思考过程时出现。
* `metadata` 记录本次实际使用的 LLM 配置。`fallbackApplied=true` 表示首选 LLM 配置调用失败后，框架改用了备用 LLM 配置；此时会额外返回 `fallbackFromLlmConfigId`（原配置 ID）、`fallbackReason`（失败原因）和 `fallbackStatusCode`（失败状态码）。
* `context.compaction` 事件只在 `contextEvent=true` 且本次请求实际触发上下文压缩时返回，可能出现在 `STREAM_START` 之前；普通 HTTP JSON 响应会忽略 `contextEvent`。

---

### 2.4 技能运行时能力

#### 获取 Agent 的技能目录

`GET /agent-bus/v1/skill/{agentId}/catalog `

返回该 Agent 下当前调用用户可见、可由 LLM 发现的技能摘要。调用 `/chat/completions` 时，框架默认会将技能目录注入上下文，调用方通常无需手动调用本接口。

本接口主要用于预览、调试或自定义上下文组装。手动组装模式下可通过 `assemblyConfig.noSkillCatalog=true` 关闭自动注入。

**响应:**

`{ "agentId": "agent_xxx", "userId": "alice", "catalog": [ { "name": "search-database", "description": "Search distributed tables", "argumentHint": "SELECT fields FROM table WHERE condition" }, ... ], "size": 3 } `

字段说明：

* `agentId` / `userId`：对应的 Agent 和当前调用用户。
* `catalog`：已按用户权限和技能配置过滤后的技能目录。
  * `name`：技能名称，可用于 `activeSkillNames` 显式加载该技能的详细指令。
  * `description`：技能摘要，用于帮助 LLM 判断是否需要该技能。
  * `argumentHint`：参数提示，可为空，用于帮助 LLM 理解如何使用该技能。
* `size`：`catalog` 条目数。

---

#### 列出技能包文件

`GET /agent-bus/v1/skill/{skillId}/files/list `

返回技能包内文件清单，只包含文件元信息，不返回文件内容。该接口用于展示技能包结构，或为后续文件检索、分段读取和批量读取选择目标文件。

**查询参数:**

| 参数

```
| 类型
```

| 必填

| 说明

|
| --------------- | -------- | ------ | ------ |
| `agentId` | string | 是   | -    |

**响应:**

`{ "skillId": "skill_xxx", "items": [ { "skillId": "skill_xxx", "contentRevision": 1, "filePath": "SKILL.md", "size": 2048, "isText": true, "lineCount": 80 } ], "size": 1 } `

字段说明：

* `filePath` 为相对技能包根目录的路径。
* `isText` 表示服务端是否按文本文件处理；非文本文件读取时会返回完整原始内容的 base64 编码。

#### 获取技能包单个文件

`GET /agent-bus/v1/skill/{skillId}/files/get?filePath=data/schema.json `

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

| ----------------- | -------- | ------ | ----------------------------------------------------------------- |
| `agentId`   | string | 是   | -                                                               |
| `filePath`  | string | 是   | 相对技能包根目录的文件路径                                      |
| `lineStart` | int    | 否   | 文本文件 1-based 起始行；默认`0`表示读取完整文件            |
| `lineLimit` | int    | 否   | 读取行数；默认`120`，最大`300`                          |
| `raw`       | bool   | 否   | 兼容参数；响应中的`content`始终为原始文件内容的 base64 编码 |

**响应:**

`{ "skillId": "skill_xxx", "filePath": "data/schema.json", "isText": true, "lineCount": 42, "raw": false, "lineStart": 1, "lineEnd": 42, "encoding": "base64", "content": "<base64 内容>", "size": 1024 } `

说明：

* `content` 始终为原始文件内容的 base64 编码。
* 文本文件指定 `lineStart` / `lineLimit` 时，只返回对应行范围。
* 非文本文件不支持按行读取，始终返回完整原始内容。
* 大文件建议使用分段读取控制响应大小。

#### 检索技能包文本文件

`POST /agent-bus/v1/skill/{skillId}/files/search `

**请求体:**

| 字段

```
| 类型


 | 必填


 | 说明


                                                                            |
```

| --------------------- | ---------- | ---------- | ------------------------------------------------------------------------------------- |
| `agentId`       | string   | 是       | -                                                                                   |
| `query`         | string   | 条件必填 | 搜索单个字符串，1 到 1024 字节；`query`、`all`、`any`必须且只能提供一个 |
| `all`           | string[] | 条件必填 | 多个字符串全部匹配才命中；最多 5 个，每个 1 到 1024 字节                            |
| `any`           | string[] | 条件必填 | 多个字符串中，任意一个匹配即命中；最多 5 个，每个 1 到 1024 字节                    |
| `scope`         | string   | 否       | 匹配粒度：`file`（整文件）或`line`（单行），默认`file`                  |
| `caseSensitive` | bool     | 否       | 是否大小写敏感，默认`false`                                                     |
| `filePaths`     | string[] | 否       | 限定搜索的 skill 包内相对路径列表                                                   |
| `extensions`    | string[] | 否       | 限定文件后缀，如`[".md", ".json"]`                                              |
| `contextLines`  | int      | 否       | 每个命中行前后的上下文行数，默认`3`，最大`10`                               |
| `maxResults`    | int      | 否       | 命中总数安全阈值，默认`1000`，最大`5000`；超过阈值时报错                    |
| `maxPerFile`    | int      | 否       | 单个文件命中数安全阈值，默认`200`，最大`1000`；超过阈值时报错               |

**响应:**

`{ "skillId": "skill_xxx", "terms": ["RSI"], "mode": "query", "scope": "file", "resultCount": 1, "skippedCount": 0, "matches": [ { "skillId": "skill_xxx", "contentRevision": 1, "filePath": "refs/indicators/rsi.json", "size": 668, "isText": true, "lineCount": 24, "line": 3, "column": 12, "term": "RSI", "text": "\"name\": \"RSI\"", "before": ["{"], "after": ["  \"period\": 14"] } ], "skipped": [] } `

说明：

* 用于在技能包文本文件中按字符串查找内容，适合工具按需读取，避免将全量文件装配进上下文。
* 仅检索文本文件；非文本文件或超过可检索大小上限的文本文件会出现在 `skipped` 中，`reason` 可能为 `non_text` 或 `too_large`。
* 搜索词按字面量子串匹配，不拆词、不支持 regex、不打分；大小写由 `caseSensitive` 控制。
* `scope=file` 按整文件判断是否满足条件，例如 `all=["foo","bar"]` 只要求同一文件内同时出现；响应仍返回实际命中的行。`scope=line` 按单行判断是否满足条件，例如 `all=["foo","bar"]` 要求同一行内同时出现。
* 结果按技能包文件顺序和行号稳定返回，不做相关性排序。
* 命中数量超过 `maxResults` 或 `maxPerFile` 时返回错误，不返回部分结果；调用方应使用更精确的pattern做查找。

#### 批量获取技能包文件

`POST /agent-bus/v1/skill/{skillId}/files/batchGet `

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

| ----------------- | ------------------- | ------ | --------------------------------------------------------------------------------- |
| `agentId`   | string            | 是   | -                                                                               |
| `filePaths` | string / string[] | 是   | 相对 skill 包根目录的文件路径。传单个字符串时按一个文件处理；传空数组返回空列表 |

**响应:**

`{ "skillId": "skill_xxx", "items": [ { "skillId": "skill_xxx", "filePath": "SKILL.md", "encoding": "base64", "content": "<base64 内容>", "size": 2048 } ], "size": 1 } `

说明：

* 文件内容以 base64 字符串存储并返回，`size` 为原始文件字节数。

---

### 2.5 Workspace 运行时能力

Workspace 是面向 coding agent 的会话级临时文本文件区。它用于保存中间代码、脚本和局部修改结果，避免模型在对话中反复全量输出文件内容。

通用约束：

* Workspace 由 `sessionId` 定位，当前用户必须是该会话的创建者。
* 文件在单个 session workspace 内平铺，不支持子目录。`name` 只能是普通文件名，不能包含 `/`、`\`、`..`，不能以 `.` 开头。
* `read/search/write/replace` 只面向 UTF-8 文本文件；二进制文件不作为首版目标。
* 单 workspace 默认限制为 100 个文件、5 MiB 总大小、512 KiB 单文件大小。读取和搜索有服务端配置上限。

#### Workspace 文件 hash

Workspace中的hash值是读workSpace文件时框架侧返回的字段，Agent在进行文件修改操作时需要带着此hash值，用于确保待修改的文件和之前读取时是一样的（防止陈旧读）。

格式：

`xxh64:<16位hex>:<size> `

说明：

* `hash` 是基于完整文件内容计算的哈希值，`<size>` 是完整文件字节数。
* 调用 `workspace.replace` 修改文件时，必须把上次从同一文件的 `workspace.read`、`workspace.search`、`workspace.write` 或 `workspace.replace` 拿到的 `hash` 放入请求体。
* 服务端执行 `workspace.replace` 前会重新读取当前文件并计算 hash；如果请求中的 `hash` 与当前文件 hash 不一致，请求会被拒绝，错误为 `REPLACE_REJECTED`，`error.reason="stale_file"`。客户端应重新 `read` 或 `search` 后再生成替换请求。

可获得和使用 `hash` 的接口：

| 接口

```
| 是否返回 hash


                                | 如何使用


                                                                                       |
```

| ------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `workspace.read`    | 是，响应字段`hash`                           | 表示被读取文件的完整内容摘要，可直接作为后续`workspace.replace.hash`。                         |
| `workspace.search`  | 是，每个`matches[].hash`                     | 表示对应`matches[].name`文件的完整内容摘要，可作为修改该文件时的`workspace.replace.hash`。 |
| `workspace.write`   | 是，响应字段`hash`                           | 表示写入后的完整文件摘要，可作为后续`workspace.replace.hash`。                                 |
| `workspace.replace` | 请求必须携带`hash`；成功响应返回新`hash` | 请求中的`hash`用于陈旧读检测；响应中的新`hash`应用于后续继续修改同一文件。                 |

---

#### 列出 Workspace 文件

`GET /agent-bus/v1/workspace/{sessionId}/files `

用途：列出当前 session workspace 根目录下的普通文件。

**响应:**

`{ "items": [ { "name": "main.dos", "type": "file", "size": 2048, "updateTime": "2026-05-21T10:00:00.000" } ], "size": 1 } `

---

#### 读取 Workspace 文件

`GET /agent-bus/v1/workspace/{sessionId}/file?name=main.dos&startLine=1&endLine=120 `

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

| ----------------- | -------- | ------ | ------------------------------------ |
| `name`      | string | 是   | 文件名，不支持路径                 |
| `startLine` | int    | 否   | 起始行，1-based；缺省从第 1 行开始 |
| `endLine`   | int    | 否   | 结束行，闭区间；缺省读到文件尾     |

**响应:**

`{ "name": "main.dos", "content": "def main(){\n    return 1\n}\n", "size": 1024, "lineCount": 42, "startLine": 1, "endLine": 3, "hash": "xxh64:4f9a2c18b7e301d2:1024" } `

说明：

* `size` 是完整文件字节数，`lineCount` 是完整文件行数。
* 请参考本小节开头关于hash的说明。
* 构造 `workspace.replace.replacements[].old` 时，应从本接口返回的 `content` 中精确复制旧片段；多行替换或换行敏感修改应优先使用 `workspace.read` 获取足够上下文。

---

#### 写入 Workspace 文件

`POST /agent-bus/v1/workspace/{sessionId}/file `

**请求体:**

`{ "name": "main.dos", "content": "def main(){\n    return 1\n}\n" } `

| 字段

```
| 类型
```

| 必填

| 说明

```
|
```

| --------------- | -------- | ------ | -------------------- |
| `name`    | string | 是   | 文件名，不支持路径 |
| `content` | string | 是   | UTF-8 文本内容     |

**响应:**

`{ "name": "main.dos", "created": true, "changed": true, "size": 31, "hash": "xxh64:4f9a2c18b7e301d2:31" } `

说明：

* 该接口用于创建文件或写入文件。小范围修改请优先使用 `workspace.replace`。
* 请参考本小节开头关于hash的说明。

---

#### 删除 Workspace 文件

`DELETE /agent-bus/v1/workspace/{sessionId}/file `

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

| ------------ | -------- | ------ | -------------------- |
| `name` | string | 是   | 文件名，不支持路径 |

**响应:**

`{ "name": "main.dos", "deleted": true, "size": 2048 } `

说明：

* 只允许删除当前 session workspace 内的文件。不支持目录删除、递归删除、批量删除、通配符删除或清空 workspace。

---

#### 搜索 Workspace 文件

`POST /agent-bus/v1/workspace/{sessionId}/search `

**请求体:**

`{ "all": ["submitOrder", "RSI"], "scope": "file", "caseSensitive": false, "extensions": [".dos"], "contextLines": 1, "maxResults": 20, "maxPerFile": 5 } `

| 字段

```
| 类型


 | 必填


 | 说明


                                                                            |
```

| --------------------- | ---------- | ---------- | ------------------------------------------------------------------------------------- |
| `query`         | string   | 条件必填 | 搜索单个字符串，1 到 1024 字节；`query`、`all`、`any`必须且只能提供一个 |
| `all`           | string[] | 条件必填 | 多个字符串全部匹配才命中；最多 5 个，每个 1 到 1024 字节                            |
| `any`           | string[] | 条件必填 | 多个字符串任意一个匹配即命中；最多 5 个，每个 1 到 1024 字节                        |
| `scope`         | string   | 否       | 匹配粒度：`file`（整文件）或`line`（单行），默认`file`                  |
| `caseSensitive` | bool     | 否       | 是否大小写敏感，默认`false`                                                     |
| `names`         | string[] | 否       | 限定搜索的文件名列表                                                                |
| `extensions`    | string[] | 否       | 限定文件后缀，如`[".dos", ".md"]`                                               |
| `contextLines`  | int      | 否       | 每个命中行前后的上下文行数，默认`0`，最大`10`                               |
| `maxResults`    | int      | 否       | 命中总数安全阈值，默认`1000`，最大`5000`；超过阈值时报错                    |
| `maxPerFile`    | int      | 否       | 单个文件命中数安全阈值，默认`200`，最大`1000`；超过阈值时报错               |

**响应:**

`{ "terms": ["submitOrder", "RSI"], "mode": "all", "scope": "file", "resultCount": 1, "skippedCount": 0, "matches": [ { "name": "main.dos", "hash": "xxh64:4f9a2c18b7e301d2:1024", "line": 37, "column": 12, "term": "submitOrder", "text": "submitOrder(account, symbol, qty)", "before": ["if(rsi < 30){"], "after": ["}"] } ], "skipped": [] } `

说明：

* 用于在 workspace 文本文件中按字符串定位内容，适合工具按需读取。
* 仅检索 UTF-8 文本文件；超过单文件大小上限或非 UTF-8 文件会出现在 `skipped` 中，`reason` 可能为 `too_large` 或 `invalid_utf8`。
* 搜索词按字面量子串匹配，不拆词、不支持 regex、不打分；大小写由 `caseSensitive` 控制。
* `scope=file` 按整文件判断是否满足条件，例如 `all=["foo","bar"]` 只要求同一文件内同时出现；响应仍返回实际命中的行。
* `scope=line` 按单行判断是否满足条件，例如 `all=["foo","bar"]` 要求同一行内同时出现。
* 命中数量超过 `maxResults` 或 `maxPerFile` 时返回错误，不返回部分结果；调用方应缩小范围后重试。
* 请参考本小节开头关于hash的说明。
* `workspace.search` 适合定位文件和行号；搜索返回的 `text`、`before`、`after` 是按行组织的上下文。需要构造多行或换行敏感的 `old` 片段时，应再调用 `workspace.read` 读取目标行附近内容。

---

#### 局部修改 Workspace 文件

`POST /agent-bus/v1/workspace/{sessionId}/replace `

**请求体:**

`{ "name": "main.dos", "hash": "xxh64:4f9a2c18b7e301d2:1024", "replacements": [ { "old": "return 1", "new": "return 2" }, { "old": "oldName", "new": "newName", "replaceAll": true } ] } `

| 字段

```
| 类型


 | 必填
```

| 说明

```
|
```

| --------------------------------- | ---------- | ------ | ------------------------------------------------ |
| `name`                      | string   | 是   | 要修改的已有文件名，不支持路径                 |
| `hash`                      | string   | 是   | 请参考本小节开头关于hash的说明。               |
| `replacements`              | object[] | 是   | 有序替换列表，不能为空                         |
| `replacements[].old`        | string   | 是   | 精确旧片段，不能为空                           |
| `replacements[].new`        | string   | 是   | 新片段，可以为空字符串；空字符串表示删除旧片段 |
| `replacements[].replaceAll` | bool     | 否   | 是否替换所有匹配，默认`false`              |

**响应:**

`{ "name": "main.dos", "changed": true, "lineCount": 3, "replacementCount": 2, "occurrenceCount": 5, "hash": "xxh64:7c1d0b2a9910ef43:1048" } `

说明：

* 请参考本小节开头关于hash的说明。
* 多条 replacement 按数组顺序应用。如果有多条replacement，第二条会在第一条替换后的内容里执行。所以如果第一条生成了某些新文本，第二条也可能匹配到这些新文本。
* `replaceAll=false` 时，`old` 必须恰好出现一次；0 次或多次都拒绝。
* `replaceAll=true` 时，`old` 必须至少出现一次，服务端替换所有非重叠匹配。
* 任意一条 replacement 失败时，整个请求失败且原文件保持不变。
* 请参考本小节开头关于hash的说明。

---

### 2.6 记忆运行时能力

记忆的抽取、存储、读取、注入和整理演进由框架自动完成。开发者通常无需调用单独的记忆接口，也无需手动管理记忆生命周期；`chat.completions` 和 `context.preview` 会按 Agent 配置自动使用相关记忆。

如需人工干预，可在 DolphinX 管控界面编辑记忆、开启或关闭记忆能力。对应管理接口见 [3.9 Memory 管控](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#39-memory-%E7%AE%A1%E6%8E%A7 "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#39-memory-%E7%AE%A1%E6%8E%A7")。

---

### 2.7 网络访问能力

#### 发起外部网络请求

WebSocket 调用方式见 [6. WebSocket 协议](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#6-websocket-%E5%8D%8F%E8%AE%AE "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#6-websocket-%E5%8D%8F%E8%AE%AE")。

该接口用于 Agent 应用通过 Agent 框架访问外部 HTTP(S) 资源，典型用途是给应用侧 `websearch` 工具拉取公开文档页面。框架只负责安全校验、限流、发起请求和返回原始 HTTP 响应摘要；页面解析、检索排序、重定向处理等逻辑由应用层负责。

`POST /agent-bus/v1/network/fetch `

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

| -------------------- | -------- | ---------- | ------------------------------------------------------------------------------------------- |
| `agentId`      | string | 条件必填 | -                                                                                         |
| `method`       | string | 是       | 仅支持`GET`/`POST`，大小写不敏感                                                  |
| `url`          | string | 是       | 完整的`http://`或`https://`URL。必须命中服务端内置 allowlist                      |
| `headers`      | object | 否       | 透传到目标站点的请求头，值必须为标量字符串                                                |
| `body`         | string | 否       | POST 请求体。`GET`请求不允许携带 body                                                 |
| `timeoutMs`    | int    | 否       | 请求超时时间，默认`10000`，最大`30000`；超过最大值会按最大值处理                  |
| `maxBodyBytes` | long   | 否       | 响应 body 最大读取字节数，默认`2097152`，最大`33554432`；超过最大值会按最大值处理 |

**响应:** [NetworkFetchResponse](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#networkfetchresponse "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#networkfetchresponse")

`{ "url": "https://docs.dolphindb.cn/zh/tutorials/in_memory_table.html", "method": "GET", "statusCode": 200, "statusText": "OK", "headers": { "content-type": "text/html; charset=utf-8" }, "contentType": "text/html; charset=utf-8", "contentEncoding": "", "body": "<!doctype html>...", "truncated": false, "bodyOmitted": false, "bodyUtf8Sanitized": false, "latencyMs": 321 } `

**访问控制与安全规则:**

* URL 必须是完整 `http://` 或 `https://` 地址；仅允许访问 `dolphindb.cn`、`dolphindb.com` 及其子域名，按域名边界匹配。
* 仅允许默认端口：HTTP 80、HTTPS 443；不跟随 3xx 重定向。
* URL 不允许包含空格、控制字符、fragment、userinfo 或 IP literal host。
* 请求头会做安全过滤；禁止设置 `Host`、`Content-Length`、`Transfer-Encoding`、`Connection`、认证/Cookie/代理相关头、`Accept-Encoding` 以及 hop-by-hop 头。框架固定使用 `Accept-Encoding: identity`。
* 仅文本类、未压缩响应会返回 `body`；二进制、未知类型或非 identity 编码响应会设置 `bodyOmitted=true`。
* 文本 body 按 UTF-8 返回；如需安全修正会设置 `bodyUtf8Sanitized=true`。
* `maxBodyBytes` 是读取上限；body 被截断时 `truncated=true`。PDF 等二进制资源只返回状态码、响应头和 content type，不返回 body。

---

### 2.8 会话摘要

#### 生成摘要

框架会在 `chat.completions` 上下文过长时自动生成并使用会话摘要，开发者通常无需主动处理。该接口仅用于需要手动压缩历史的场景，例如在长会话中提前生成摘要，或按业务指令生成一次新的摘要检查点。

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

| -------------------- | -------- | ------ | ------------------------------------------------------------------------------------------------------ |
| `instructions` | string | 否   | 额外的摘要指令，追加到摘要 prompt 中（如要求关注特定主题或保留特定信息）                             |
| `llmConfigId`  | string | 否   | 本次摘要优先使用的 LLM 配置 ID                                                                       |
| `force`        | bool   | 否   | 是否强制生成（默认 false）。为 true 时最新 summary 之后的全部 raw 历史纳入本次摘要，不保留未压缩尾部 |
| `metadata`     | object | 否   | 自定义元数据，JSON 格式。框架只负责透传，可以写入一些自定义的数据，比如触发原因、关联的业务事件等    |

**响应:** [SummaryResult](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#summaryresult "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#summaryresult")

`{ "sessionId": "sess_001", "generated": true, "reason": "", "trigger": "manual", "summaryUpToSeqNum": 50, "messageId": "msg_xxx", "sequenceNum": 51, "role": "system", "contentType": "summary", "content": "摘要内容...", "metadata": { "summaryUpToSeqNum": 50, "trigger": "manual", "summaryLlmConfigId": "llm_summary_xxx" } } `

---

### 2.9 调试接口

#### Context Preview (上下文预览)

WebSocket 调用方式见 [6. WebSocket 协议](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#6-websocket-%E5%8D%8F%E8%AE%AE "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#6-websocket-%E5%8D%8F%E8%AE%AE")。

调试接口，预览上下文组装结果但不调用 LLM。可用于验证 `contextConfig` 配置效果、检查 token 预算分配、确认技能和记忆是否正确注入。

`POST /agent-bus/v1/context/preview `

**请求体:**

| 字段

```
| 类型


         | 必填


 | 说明


                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
```

| -------------------------------------------------------------- | ------------------ | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sessionId`                                              | string           | 是       | 会话 ID，必须属于当前登录用户可读范围                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `message`                                                | string           | 条件必填 | 用户消息文本。`message`和`toolResults`必须且只能提供一个                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `toolResults`                                            | ToolResult[]     | 条件必填 | 工具执行结果列表，必须对应上一轮 assistant 返回的`toolCalls`。`message`和`toolResults`必须且只能提供一个                                                                                                                                                                                                                                                                                                                                                                                      |
| `tools`                                                  | ToolDefinition[] | 否       | 工具定义列表；存在`assemblyConfig`时请改放到`assemblyConfig.tools`                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `activeSkillNames`                                       | string[]         | 否       | 本次主动加载的技能名称；只用于显式注入这些技能的详细指令。存在`assemblyConfig`时请改放到`assemblyConfig.activeSkillNames`                                                                                                                                                                                                                                                                                                                                                                         |
| `llmConfigId`                                            | string           | 否       | 用于解析上下文窗口和 token 预算的 LLM 配置 ID；不传时按 session/agent 默认配置解析                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `assemblyConfig`                                         | object           | 否       | 手动组装配置，结构同[手动组装模式](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#%E6%89%8B%E5%8A%A8%E7%BB%84%E8%A3%85%E6%A8%A1%E5%BC%8F-manual-assembly "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#%E6%89%8B%E5%8A%A8%E7%BB%84%E8%A3%85%E6%A8%A1%E5%BC%8F-manual-assembly") |
| `maxTokens`/`max_tokens`/`max_completion_tokens` | int              | 否       | 输出 token 预留预算；会影响上下文组装可用 prompt 预算。三个字段等价，建议只传一个                                                                                                                                                                                                                                                                                                                                                                                                                         |

**响应:**

`{ "agentId": "agent_001", "sessionId": "sess_001", "userId": "admin", "assemblyMode": "auto", "messages": [ { "role": "system", "content": "..." }, { "role": "user", "content": "当前问题" } ], "tools": [ ... ], "estimatedTokens": 4200, "detail": { "assemblyMode": "auto", "historyMode": "summary-first", "summaryConfigured": true, "summaryIncluded": true, "summaryUpToSeqNum": 40 }, "tokenBreakdown": { "systemPrompt": 200, "summaryMessage": 120, "historyMessages": 2200, "userMessage": 50 } } `

说明：

* 本接口复用 `chat.completions` 的自动/手动组装规则，只返回候选上下文；不调用 LLM，不写入 session，不主动生成新的 summary。

**detail 字段说明：**

| 字段

```
| 类型
```

| 说明

```
|
```

| -------------------------- | -------- | ----------------------------------------------------------- |
| `assemblyMode`       | string | `auto`或`manual`                                  |
| `memoriesIncluded`   | int    | 实际注入到上下文中的记忆条数                              |
| `messagesIncluded`   | int    | 实际包含的历史消息条数                                    |
| `skillsInCatalog`    | int    | 技能目录中包含的技能数                                    |
| `activeInstructions` | int    | 已加载的技能详细指令数                                    |
| `toolsIncluded`      | int    | 工具定义数量                                              |
| `historyMode`        | string | 历史组装模式，固定为`summary-first`                   |
| `summaryConfigured`  | bool   | 是否启用 summary-first 历史管理，固定为 true              |
| `summaryIncluded`    | bool   | 本次是否注入了 latest summary                             |
| `summaryUpToSeqNum`  | long   | 本次使用的 latest summary 覆盖边界；未使用 summary 时为 0 |
| `historyFromSeq`     | long   | raw tail 起始序列号                                       |
| `historyToSeq`       | long   | raw tail 结束序列号                                       |

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
| `skillCatalog`      | int  | 技能目录估算 token 数                                          |
| `skillInstructions` | int  | 技能详细指令估算 token 数                                      |
| `memoryContext`     | int  | 记忆内容估算 token 数                                          |
| `summaryMessage`    | int  | latest summary 估算 token 数                                   |
| `historyMessages`   | int  | 历史消息估算 token 数                                          |
| `externalContext`   | int  | contextBlocks 等外部上下文估算 token 数                        |
| `userMessage`       | int  | 当前用户消息估算 token 数；若本轮仅提供`toolResults`则为 0 |
| `toolDefinitions`   | int  | 工具定义估算 token 数                                          |

---

### 2.10 底层接口

#### AIScript（受限 DolphinDB 脚本执行）

`AIScript` 用于外部 Agent 执行未经过人工审核的 DolphinDB 脚本。它属于 DolphinDB 原生 API / WebSocket 脚本执行命令，不是 Agent Bus HTTP 路由。

`AIScript` 的调用格式使用 `aiscript` 作为首行命令，其余格式与 `script` 命令一致：

`aiscript <DolphinDB script> `

`aiscript` 支持与 `script` 相同的 `line://`、`file://` 元信息行，执行成功时返回格式也与 `script` 一致。

与 `script` 的区别：

* `aiscript` 在真正执行前会先解析 DolphinDB 脚本，并进行安全检查。
* 当前主要禁止删除、移除、清理、取消定义等操作，以及当前无法完整检查的脚本结构；命中时框架会拒绝执行，错误信息以 `AIScript rejected:` 开头。
* 检查通过后，底层执行逻辑与 `script` 相同。

建议：

* 外部 Agent 生成、且未经人工审核的 DolphinDB 语句，应优先通过 `aiscript` 执行。
* 明确经过人工审核、或确需执行管理/写入类操作的脚本，可继续使用原 `script` 接口。

---

#### LLM Complete (直接调用 LLM)

WebSocket 调用方式见 [6. WebSocket 协议](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#6-websocket-%E5%8D%8F%E8%AE%AE "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#6-websocket-%E5%8D%8F%E8%AE%AE")。

绕过上下文组装，直接发送消息给 LLM。适用于应用自行与LLM交互的场景。

`POST /agent-bus/v1/llm/complete `

**请求体:**

| 字段

```
| 类型


          | 必填


 | 说明


                                                                                                          |
```

| -------------------------------------------------------------- | ------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------- |
| `agentId`                                                | string            | 条件必填 | -                                                                                                                 |
| `sessionId`                                              | string            | 否       | 会话 ID                                                                                                           |
| `messages`                                               | LLMMessage[]      | 是       | 完整的消息列表（由应用层自行构建），直接发送给 LLM，框架不做上下文组装                                            |
| `tools`                                                  | ToolDefinition[]  | 否       | 工具定义列表（OpenAI function calling 格式）                                                                      |
| `model`                                                  | string            | 否       | 临时设置本次 provider 请求的模型名                                                                                |
| `stream`                                                 | bool              | 否       | 是否流式返回（默认 true）                                                                                         |
| `includeReasoning`                                       | bool              | 否       | 是否返回 思考过程（默认 false）                                                                                   |
| `llmConfigId`                                            | string            | 否       | 指定使用的 LLM 配置 ID                                                                                            |
| `requestId`                                              | string            | 否       | 请求追踪 ID，不指定时自动生成                                                                                     |
| `temperature`                                            | double            | 否       | 临时覆盖本次采样温度，范围`[0, 2]`；值越低输出越稳定，值越高输出越发散                                        |
| `maxTokens`/`max_tokens`/`max_completion_tokens` | int               | 否       | 临时覆盖本次输出 token 上限；三个字段等价，建议只传一个                                                           |
| `topP`/`top_p`                                       | double            | 否       | 临时覆盖本次 nucleus sampling 参数，范围`(0, 1]`；值越小输出越收敛。`topP`与`top_p`等价，建议只传一个 |
| `stop`                                                   | string / string[] | 否       | 临时设置本次停止序列；生成内容命中任一序列时停止。可传字符串或字符串数组                                          |
| `persistMessage`                                         | bool              | 否       | 仅在指定`sessionId`时有效；为`true`时把 assistant 回复追加到该 session                                    |
| `extensions`                                             | object            | 否       | 直接透传给 Provider 的参数，框架侧不做处理                                                                        |

**响应:** 同 [Chat Completions 响应](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#%E5%93%8D%E5%BA%94-data-%E7%BB%93%E6%9E%84 "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#%E5%93%8D%E5%BA%94-data-%E7%BB%93%E6%9E%84")

---

#### 获取消息列表

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

说明：

* `items`：按 `sequenceNum` 升序返回的消息列表，元素结构见 [MessageInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#messageinfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#messageinfo")。

---

## 3. 面向 Web 管控的 API

本章面向管控 Web、配置中心和运维后台，覆盖 Agent/LLM/Skill/Memory 的配置、生命周期和授权管理。会话和消息不在本章重复展开；需要时参见开发者 API 中的会话接口。

---

### 3.1 Agent 生命周期管理

#### 注册 Agent

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
| `description`   | string | 否   | 描述                                                                                                                                                                                                                                                                                                                                                                                          |
| `systemPrompt`  | string | 否   | 系统提示词                                                                                                                                                                                                                                                                                                                                                                                    |
| `llmConfigId`   | string | 否   | 默认 LLM 配置 ID。注册时会自动创建 agent 与该 LLM 配置的绑定关系（`isDefault=true`,`priority=0`）                                                                                                                                                                                                                                                                                     |
| `contextConfig` | object | 否   | 上下文组装配置，详见[contextConfig 结构](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#contextconfig "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#contextconfig") |
| `memoryConfig`  | object | 否   | 记忆管理配置，详见[memoryConfig 结构](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#memoryconfig "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#memoryconfig")      |
| `config`        | object | 否   | Agent 扩展配置。框架会读取`allowLlmFallback`（bool，默认 false）控制模型调用失败时是否允许自动切换到备用 LLM 配置；其他字段原样存储                                                                                                                                                                                                                                                       |
| `extra`         | string | 否   | 预留扩展字段                                                                                                                                                                                                                                                                                                                                                                                  |

**响应:** [AgentInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#agentinfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#agentinfo")

说明：

* `memoryConfig` 由记忆策略服务读取，未提供字段按默认策略处理
* `config.allowLlmFallback=false` 时，运行时只调用解析出的目标模型，失败直接报错；设为 `true` 时，目标模型失败且尚未产生流式内容时可按 agent 绑定 priority 自动尝试后续模型。

---

#### 获取 Agent

完整接口说明见 [获取 Agent](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#%E8%8E%B7%E5%8F%96-agent "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#%E8%8E%B7%E5%8F%96-agent")。

---

#### 更新 Agent

`PUT /agent-bus/v1/agent/{agentId} `

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

| --------------------- | -------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `agentId`       | string | 路径已提供时否 | Agent ID                                                                                                               |
| `agentName`     | string | 否             | Agent 名称                                                                                                             |
| `description`   | string | 否             | 描述                                                                                                                   |
| `systemPrompt`  | string | 否             | 系统提示词                                                                                                             |
| `llmConfigId`   | string | 否             | 默认 LLM 配置 ID；非空时必须是可用 chat 配置，空字符串表示清除默认配置                                                 |
| `contextConfig` | object | 否             | 上下文组装配置，整体替换                                                                                               |
| `memoryConfig`  | object | 否             | 记忆管理配置，整体替换                                                                                                 |
| `config`        | object | 否             | Agent 扩展配置，整体替换。`allowLlmFallback`为 bool，默认 false，控制模型调用失败时是否允许自动切换到备用 LLM 配置 |
| `extra`         | string | 否             | 预留扩展字段                                                                                                           |

说明：

* 更新成功会递增 Agent `version`

**响应:** [AgentInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#agentinfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#agentinfo")

---

#### 激活 Agent

`POST /agent-bus/v1/agent/{agentId}/activate `

**响应:** [AgentInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#agentinfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#agentinfo")

---

#### 挂起 Agent

`POST /agent-bus/v1/agent/{agentId}/suspend `

**响应:** [AgentInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#agentinfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#agentinfo")

---

#### 删除 Agent

`POST /agent-bus/v1/agent/{agentId}/delete `

**响应:** [AgentInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#agentinfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#agentinfo")（状态变为 DELETED）

---

#### 列出 Agent

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

| -------------- | ------ | ------------ | ------------ |
| `status` | int  | -1（全部） | 按状态过滤 |
| `offset` | int  | 0          |            |
| `limit`  | int  | 100        |            |

**响应:**

`{ "items": [ AgentInfo, ... ], "offset": 0, "limit": 100, "size": 5 } `

---

### 3.2 Agent 授权管理

#### 授予 Agent 权限

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

| ----------------- | -------- | ------ | ----------------------------------------- |
| `userId`    | string | 是   | DolphinDB 用户 ID                       |
| `grantedBy` | string | 否   | 执行授权的用户 ID（默认为当前登录用户） |

**响应:** 当前 agent 的授权列表 `{ items: [AuthInfo, ...], size: N }`

---

#### 撤销 Agent 权限

`DELETE /agent-bus/v1/agent/{agentId}/auth `

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

| -------------- | -------- | ------ | -------------------------------- |
| `userId` | string | 是   | 要撤销授权的 DolphinDB 用户 ID |

**响应:** 当前 agent 的授权列表

---

#### 列出 Agent 授权

`GET /agent-bus/v1/agent/{agentId}/auth/list `

**响应:** `{ items: [AuthInfo, ...], size: N }`

---

### 3.3 全局访问控制

#### 授予全局 `AGENT_ADMIN`

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

| ----------------- | -------- | ------ | ----------------------------------------- |
| `userId`    | string | 是   | DolphinDB 用户 ID                       |
| `grantedBy` | string | 否   | 执行授权的用户 ID（默认为当前登录用户） |

**响应:** `{ items: [GlobalAccessInfo, ...], size: N }`

---

#### 撤销全局 `AGENT_ADMIN`

`DELETE /agent-bus/v1/admin/access `

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

| -------------- | -------- | ------ | ------------------- |
| `userId` | string | 是   | DolphinDB 用户 ID |

**响应:** `{ items: [GlobalAccessInfo, ...], size: N }`

---

#### 列出全局 `AGENT_ADMIN`

`GET /agent-bus/v1/admin/access `

**响应:** `{ items: [GlobalAccessInfo, ...], size: N }`

### 3.4 LLM Provider 与配置管理

#### 注册 LLM Provider

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

| ------------------- | -------- | ------ | ------------------------------------------------------------------------------------------------- |
| `providerId`  | string | 否   | Provider ID；不传时由框架生成                                                                   |
| `name`        | string | 是   | Provider 名称，用于标识和展示                                                                   |
| `adapterType` | string | 是   | 运行时 provider 适配器类型：`openai`/`openai-compatible`/`anthropic`/`deepseek` |
| `baseUrl`     | string | 是   | Provider 级基础 URL，必须是完整`http(s)`URL，如`https://api.openai.com`                 |
| `apiKey`      | string | 否   | Provider 级 API Key                                                                             |
| `enabled`     | bool   | 否   | 是否启用，默认`true`                                                                        |
| `extra`       | string | 否   | 预留扩展字段                                                                                    |

**响应:** [LlmProviderInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmproviderinfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmproviderinfo")

说明：

* `baseUrl` 由框架规范化保存：末尾 `/` 会被移除
* `name` 在未删除 Provider 范围内唯一；
* Provider 负责承载共享连接信息；模型级配置保存 `requestPath`、`defaultParams` 等模型参数

---

#### 获取 LLM Provider

`GET /agent-bus/v1/llm/provider/{providerId} `

**响应:** [LlmProviderInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmproviderinfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmproviderinfo")

---

#### 列出 LLM Provider

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

| --------------- | ------ | -------- | -------------------------------------------------------------------------------------------- |
| `enabled` | bool | -      | 不传返回全部未删除 provider；`true`只返回启用 provider；`false`只返回禁用 provider |
| `offset`  | int  | 0      | 分页起始偏移                                                                               |
| `limit`   | int  | 100    | 返回条数上限                                                                               |

**响应:** `{ items: [LlmProviderInfo, ...], offset, limit, size }`

---

#### 更新 LLM Provider

`PUT /agent-bus/v1/llm/provider/{providerId} `

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

| ------------------- | -------- | ---------------- | --------------------------------------------------- |
| `providerId`  | string | 路径已提供时否 | Provider ID；若同时出现在路径和 body 中，必须一致 |
| `name`        | string | 否             | Provider 名称；非空字符串                         |
| `adapterType` | string | 否             | 适配器类型，取值同注册接口                        |
| `baseUrl`     | string | 否             | Provider 基础 URL                                 |
| `apiKey`      | string | 否             | Provider API Key                                  |
| `enabled`     | bool   | 否             | 是否启用                                          |
| `extra`       | string | 否             | 预留扩展字段                                      |

**响应:** [LlmProviderInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmproviderinfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmproviderinfo")

说明：

* `name` 在未删除 Provider 范围内唯一

---

#### 删除 LLM Provider

`DELETE /agent-bus/v1/llm/provider/{providerId} `

**响应:** `{ providerId, deleted: true }`

说明：

* 删除前要求不存在任何未删除的 LLM 配置引用该 provider
* 删除成功后不参与 list、get 和 runtime

---

#### 注册 LLM 配置

`POST /agent-bus/v1/llm/config/register `

**请求体:**

| 字段

```
| 类型


 | 必填


 | 说明


                                                                                                                                                                                                                                                                                                                                                                                    |
```

| -------------------------- | ---------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `llmConfigId`        | string   | 否       | LLM 配置 ID；不传时由框架生成                                                                                                                                                                                                                                                                                                                                                               |
| `name`               | string   | 是       | 配置名称，用于标识和展示                                                                                                                                                                                                                                                                                                                                                                    |
| `providerId`         | string   | 是       | 关联的 provider ID，必须存在；`enabled=true`时 provider 必须启用                                                                                                                                                                                                                                                                                                                        |
| `model`              | string   | 是       | 模型名称（如`gpt-4.1`、`claude-sonnet-4-20250514`），传递给 LLM API                                                                                                                                                                                                                                                                                                                 |
| `capability`         | string   | 否       | 配置能力类型，默认`chat`：`chat`/`embedding`                                                                                                                                                                                                                                                                                                                                    |
| `embeddingDimension` | int      | 条件必填 | `capability=embedding`时必填，表示向量维度                                                                                                                                                                                                                                                                                                                                              |
| `embeddingMetric`    | string   | 否       | `capability=embedding`时使用的相似度规则：`euclidean`/`cosine`。省略时默认`euclidean`                                                                                                                                                                                                                                                                                       |
| `embeddingNormalize` | bool     | 否       | `capability=embedding`时是否对向量做归一化。`embeddingMetric=cosine`时必须为`true`                                                                                                                                                                                                                                                                                              |
| `requestPath`        | string   | 是       | 相对`provider.baseUrl`的请求路径，必须以`/`开头，可包含查询串，例如`/v1/chat/completions`或`/openai/deployments/x/chat/completions?api-version=2024-10-21`                                                                                                                                                                                                                  |
| `defaultParams`      | object   | 否       | 默认请求参数，详见[defaultParams 说明](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#defaultparams "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#defaultparams") |
| `contextWindow`      | int/null | 否       | 模型上下文窗口大小（token 数），用于上下文组装时的预算计算；正整数表示显式配置，省略、`null`或`0`表示未设置                                                                                                                                                                                                                                                                         |
| `maxConcurrency`     | int/null | 否       | 最大并发请求数；正整数表示显式配置，省略、`null`或`0`表示未设置                                                                                                                                                                                                                                                                                                                     |
| `rateLimitRPM`       | int/null | 否       | 速率限制（每分钟最大请求数）；正整数表示显式配置，省略、`null`或`0`表示未设置                                                                                                                                                                                                                                                                                                       |
| `timeoutMs`          | int/null | 否       | 单次请求超时时间（毫秒）；正整数表示显式配置，省略、`null`或`0`表示未设置                                                                                                                                                                                                                                                                                                           |
| `retryConfig`        | object   | 否       | 重试配置，详见[retryConfig 说明](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#retryconfig "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#retryconfig")           |
| `enabled`            | bool     | 否       | 是否启用，默认`true`                                                                                                                                                                                                                                                                                                                                                                    |
| `customData`         | string   | 否       | 外部自定义数据，原样写入和返回；框架不解析、不参与运行时逻辑                                                                                                                                                                                                                                                                                                                                |
| `extra`              | string   | 否       | 预留扩展字段                                                                                                                                                                                                                                                                                                                                                                                |

**响应:** [LlmConfigInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmconfiginfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmconfiginfo")

说明：

* 运行时最终请求地址按 `provider.baseUrl + requestPath` 拼接
* `capability=embedding` 的配置用于通用 embedding 调用能力
* `enabled=true` 时，系统全局只允许一条启用的 `capability='embedding'` 配置
* `enabled=false` 的配置可引用存在但未启用的 provider

---

#### 获取 LLM 配置

`GET /agent-bus/v1/llm/config/{llmConfigId} `

**响应:** [LlmConfigInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmconfiginfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmconfiginfo")

---

#### 列出 LLM 配置

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

| --------------- | ------ | -------- | ----------------------------------------------------------------------------- |
| `enabled` | bool | -      | 不传返回全部未删除配置；`true`只返回启用配置；`false`只返回禁用配置 |
| `offset`  | int  | 0      | 分页起始偏移                                                                |
| `limit`   | int  | 100    | 返回条数上限                                                                |

**响应:** `{ items: [LlmConfigInfo, ...], offset, limit, size }`

---

#### 更新 LLM 配置

`PUT /agent-bus/v1/llm/config/{llmConfigId} `

**请求体:**

| 字段

```
| 类型


 | 必填


       | 说明


                                                                            |
```

| -------------------------- | ---------- | ---------------- | ------------------------------------------------------------------------------------- |
| `llmConfigId`        | string   | 路径已提供时否 | LLM 配置 ID；若同时出现在路径和 body 中，必须一致                                   |
| `name`               | string   | 否             | 配置名称                                                                            |
| `providerId`         | string   | 否             | 关联的 provider ID；`enabled=true`时 provider 必须启用                          |
| `model`              | string   | 否             | 模型名称                                                                            |
| `capability`         | string   | 否             | 配置能力类型：`chat`/`embedding`                                            |
| `embeddingDimension` | int      | 条件必填       | 更新为`capability=embedding`时必须为正数                                        |
| `embeddingMetric`    | string   | 否             | `euclidean`/`cosine`；`capability=embedding`且省略时默认`euclidean` |
| `embeddingNormalize` | bool     | 否             | `embeddingMetric=cosine`时必须为`true`                                      |
| `requestPath`        | string   | 否             | 相对`provider.baseUrl`的请求路径，必须以`/`开头                             |
| `defaultParams`      | object   | 否             | 默认请求参数，整体替换                                                              |
| `contextWindow`      | int/null | 否             | 模型上下文窗口大小；正整数表示显式配置，`null`或`0`表示清空；省略表示不更新 |
| `maxConcurrency`     | int/null | 否             | 最大并发请求数；正整数表示显式配置，`null`或`0`表示清空；省略表示不更新     |
| `rateLimitRPM`       | int/null | 否             | 速率限制；正整数表示显式配置，`null`或`0`表示清空；省略表示不更新           |
| `timeoutMs`          | int/null | 否             | 单次请求超时时间；正整数表示显式配置，`null`或`0`表示清空；省略表示不更新   |
| `retryConfig`        | object   | 否             | 重试配置，整体替换                                                                  |
| `enabled`            | bool     | 否             | 是否启用                                                                            |
| `customData`         | string   | 否             | 外部自定义数据，整体替换；空字符串表示清空                                          |
| `extra`              | string   | 否             | 预留扩展字段                                                                        |

**响应:** [LlmConfigInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmconfiginfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmconfiginfo")

说明：

* `enabled=true` 且 `capability=embedding` 时，系统中不能存在其他启用的 embedding 配置
* 已删除的配置返回 404

---

#### 删除 LLM 配置

`DELETE /agent-bus/v1/llm/config/{llmConfigId} `

**响应:** `{ llmConfigId, deleted: true }`

说明：

* 删除前要求不存在任何用户授权（`user_llm_access`）、任何 agent 绑定（`agent_llm_access`）、任何非 `DELETED` agent 的默认模型字段、任何非 `DELETED` agent 的 `contextConfig.summaryConfig.summaryLlmConfigId`，以及任何现存 session 的 `llmConfigId` 引用

---

### 3.5 用户 LLM 访问控制

#### 授予用户全局 LLM 访问权限

`POST /agent-bus/v1/user/{userId}/llm/access `

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

| ------------------- | -------- | ---------------- | --------------------------------------------------- |
| `userId`      | string | 路径已提供时否 | 目标用户 ID；若同时出现在路径和 body 中，必须一致 |
| `llmConfigId` | string | 是             | LLM 配置 ID                                       |
| `grantedBy`   | string | 否             | 执行授权的用户 ID（默认为当前登录用户）           |

**响应:** `{ items: [UserLlmAccessInfo, ...], size: N }`

---

#### 撤销用户全局 LLM 访问权限

`DELETE /agent-bus/v1/user/{userId}/llm/access `

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

| ------------------- | -------- | ------ | ------------- |
| `llmConfigId` | string | 是   | LLM 配置 ID |

**响应:** `{ items: [UserLlmAccessInfo, ...], size: N }`

---

#### 列出用户全局 LLM 访问权限

`GET /agent-bus/v1/user/{userId}/llm/access `

**响应:** `{ items: [UserLlmAccessInfo, ...], size: N }`

---

### 3.6 Agent-LLM 绑定

#### 绑定 LLM 到 Agent

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

| ------------------- | -------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `llmConfigId` | string | 是   | 要绑定的 LLM 配置 ID                                                                                                                                                                                     |
| `isDefault`   | bool   | 否   | 是否设为默认 LLM（默认 false）。每个 agent 仅允许一个默认配置，设为 true 时 priority 强制为 0                                                                                                            |
| `priority`    | int    | 否   | 优先级（默认 0），数值越小优先级越高。用于默认模型解析顺序；仅当`AgentInfo.config.allowLlmFallback=true`时，运行时才会按 priority 升序形成备用 LLM 配置切换链，并在当前 LLM 调用失败时自动尝试下一个 |

**响应:** Agent 关联的 LLM 配置列表 `{ items: [AgentLlmBindingInfo, ...], size }`

---

#### 解绑 LLM

`DELETE /agent-bus/v1/agent/{agentId}/llm/access `

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

| ------------------- | -------- | ------ | ------------- |
| `llmConfigId` | string | 是   | LLM 配置 ID |

**响应:** Agent 关联的 LLM 配置列表

---

#### 列出 Agent 的 LLM 配置

`GET /agent-bus/v1/agent/{agentId}/llm/list `

**响应:** `{ items: [AgentLlmBindingInfo, ...], size }`

---

### 3.7 Skill 管理

Skill 分为普通 Skill 和 common skill。普通 Skill 需要显式绑定到 Agent 后生效；common skill 通过 `isCommon` / `common=true` 标识，启用后默认对所有 Agent 可用，包括后续新建的 Agent。

一个用户在某个 Agent 下是否能使用某个 Skill，由 Skill 自身是否启用、该 Skill 是否对该 Agent 生效、该用户是否被 deny 共同决定。普通 Skill 只有绑定到该 Agent 后才生效；common skill 默认生效，但管理员可以在指定 Agent 下关闭它，也可以重新开启恢复默认可用。用户可用的 Skill 的摘要部分 会自动进入上下文，由框架负责控制。

#### 注册技能

`POST /agent-bus/v1/skill/register `

**请求方式：**

1. ​**JSON + Base64**​：`Content-Type: application/json`，body 中 `packageBase64` 字段传 Base64 编码的 ZIP 包
2. ​**JSON + raw/base64**​：body 中 `packageData` 或 `package` 字段传技能包数据，`packageEncoding` 设为 `raw` / `binary` / `base64` / `b64`
3. ​**multipart/form-data**​：表单字段中传 `package` 文件；`overrides` part 必须是 JSON object，其他 `Content-Type: application/json` 的 part 会按 JSON 解析，否则按字符串处理
4. ​**二进制上传​**​：`Content-Type: application/octet-stream`，request body 为 ZIP 包原始字节

**请求体（JSON 模式）：**

| 字段

```
| 类型
```

| 必填

```
| 说明


                                                                                                         |
```

| --------------------------------- | -------- | ---------- | ------------------------------------------------------------------------------------------------------------------ |
| `packageBase64`             | string | 条件必填 | Base64 编码的技能包（ZIP）                                                                                       |
| `packageData`/`package` | string | 条件必填 | 技能包数据；与`packageBase64`、二进制 body、multipart`package`至少提供一种                               |
| `packageEncoding`           | string | 否       | `raw`/`binary`/`base64`/`b64`                                                                    |
| `overrides`                 | object | 否       | 覆盖`SKILL.md`frontmatter 中的元数据字段；存在该字段时只使用`overrides`中的覆盖字段                      |
| 直接覆盖字段                    | mixed  | 否       | 未提供`overrides`时，body 顶层除包数据字段、`packageEncoding`、`skillId`外的字段都会作为覆盖字段处理 |

覆盖字段：

| 字段

```
| 类型
```

| 说明

```
|
```

| ------------------------------ | -------- | ------------------------------------------------------------------ |
| `name`                   | string | 技能名称，必须匹配`^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`，最长 64 |
| `description`            | string | 技能描述，必填，最长 1024                                        |
| `displayName`            | string | 展示名称                                                         |
| `version`                | string | 技能版本，默认`1.0.0`                                        |
| `category`               | string | 分类                                                             |
| `ownerUserId`            | string | 归属用户；登录用户注册且未提供时默认当前用户                     |
| `argumentHint`           | string | 参数提示                                                         |
| `license`                | string | 许可证                                                           |
| `compatibility`          | string | 兼容性说明，最长 500                                             |
| `disableModelInvocation` | bool   | 是否禁止模型直接调用                                             |
| `userInvocable`          | bool   | 是否允许用户直接调用                                             |
| `isCommon`/`common`  | bool   | 是否为 common skill                                              |
| `enabled`                | bool   | 是否启用；仅覆盖字段生效，未显式设置时默认`true`             |
| `schemaVersion`          | int    | 元数据 schema 版本                                               |
| `metadata`               | object | 自定义元数据；frontmatter 中未识别的 key 也会合入 metadata       |
| `extra`                  | string | 预留扩展字段                                                     |

**响应:** [SkillInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#skillinfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#skillinfo")

说明：

* 技能包必须是 ZIP，解压后根目录或唯一顶层目录下必须包含 `SKILL.md`，未压缩总大小不能超过 `30MB`
* `SKILL.md` 必须以 YAML frontmatter 开头；frontmatter 至少提供合法 `name` 和非空 `description`
* 启用状态下技能名称必须全局唯一

---

#### 获取技能

`GET /agent-bus/v1/skill/{skillId} `

**响应:** [SkillInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#skillinfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#skillinfo")

---

#### 获取技能指令

`GET /agent-bus/v1/skill/{skillId}/instruction `

返回 SKILL.md frontmatter 之后的完整正文。该接口主要用于 Web 管控台查看技能详情，或实现 `skill_read` 这类按需读取技能详情的工具。

**查询参数:**

| 参数

```
| 类型
```

| 必填

| 说明

|
| --------------- | -------- | ------ | ------ |
| `agentId` | string | 是   | -    |

**响应:**

`{ "skillId": "skill_xxx", "name": "search-database", "description": "Search distributed tables", "instruction": "## Usage Guide\n\nYou can use this skill to..." } `

---

#### 按名称获取技能

`GET /agent-bus/v1/skill/byName/{skillName} `

**响应:** [SkillInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#skillinfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#skillinfo")

---

#### 更新技能

`PUT /agent-bus/v1/skill/{skillId} `

可更新技能包和/或元数据覆盖，上传方式与 [注册技能](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#%E6%B3%A8%E5%86%8C%E6%8A%80%E8%83%BD "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#%E6%B3%A8%E5%86%8C%E6%8A%80%E8%83%BD") 相同。

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

| --------------------------------- | -------- | ---------------- | ------------------------------------------------------------------------------------------------------------------ |
| `skillId`                   | string | 路径已提供时否 | 技能 ID；若同时出现在路径和 body 中，必须一致                                                                    |
| `packageBase64`             | string | 否             | Base64 编码的新技能包（ZIP）                                                                                     |
| `packageData`/`package` | string | 否             | 新技能包数据                                                                                                     |
| `packageEncoding`           | string | 否             | `raw`/`binary`/`base64`/`b64`                                                                    |
| `overrides`                 | object | 否             | 覆盖字段，字段集合同注册接口                                                                                     |
| 直接覆盖字段                    | mixed  | 否             | 未提供`overrides`时，body 顶层除包数据字段、`packageEncoding`、`skillId`外的字段都会作为覆盖字段处理 |

说明：

* 提供新技能包时，框架会替换已保存的技能包文件并递增 `contentRevision`；随后再应用覆盖字段。

**响应:** [SkillInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#skillinfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#skillinfo")

---

#### 删除技能

`DELETE /agent-bus/v1/skill/{skillId} `

**响应:** `{ skillId, deleted: true }`

说明：

* 删除前要求不存在 agent 绑定或用户 deny/allow 相关引用

---

#### 列出技能

`GET /agent-bus/v1/skill/list `

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

| ----------------------------- | -------- | -------- | ----------------------------------------------------------------------------- |
| `category`              | string | -      | 按分类过滤                                                                  |
| `enabled`               | bool   | -      | 不传返回全部未删除技能；`true`只返回启用技能；`false`只返回禁用技能 |
| `common`/`isCommon` | bool   | -      | 不传返回全部；`true`只返回 common skill；`false`只返回普通 skill    |
| `offset`                | int    | 0      |                                                                             |
| `limit`                 | int    | 50     |                                                                             |

**响应:** `{ items: [SkillInfo, ...], offset, limit, size }`

---

### 3.8 Skill 绑定与访问控制

#### 绑定技能到 Agent

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

| --------------- | -------- | ------ | ----------------------------- |
| `agentId` | string | 是   | Agent ID                    |
| `skillId` | string | 是   | 要绑定的技能 ID，必须已启用 |

**响应:** Agent 当前绑定列表 `{ items: [SkillAccessInfo, ...], size }`

---

#### 解绑技能

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

#### 列出 Agent 的技能绑定

`GET /agent-bus/v1/skill/{agentId}/bindings `

**响应:** `{ items: [SkillAccessInfo, ...], size }`

---

#### 禁止业务用户使用技能

`POST /agent-bus/v1/skill/user/deny `

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

| --------------- | -------- | ------ | --------------------- |
| `skillId` | string | 是   | 要禁止使用的技能 ID |
| `userId`  | string | 是   | 业务用户 ID         |

**响应:** `{ userId, skillIds: [...], size }`

---

#### 允许业务用户使用技能

`POST /agent-bus/v1/skill/user/allow `

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

| --------------- | -------- | ------ | --------------------- |
| `skillId` | string | 是   | 要恢复使用的技能 ID |
| `userId`  | string | 是   | 业务用户 ID         |

**响应:** `{ userId, skillIds: [...], size }`

---

#### 列出业务用户被禁止的技能

`GET /agent-bus/v1/skill/user/{userId}/denied `

**响应:** `{ userId, skillIds: [...], size }`

---

### 3.9 Memory 管控

Memory 是 Agent 运行时的长期上下文，按 Agent 隔离：

| 类型 | 归属 | 管控方式 | 运行时可见性 |
|------|------|----------|--------------|
| Agent 公共记忆 `publicMemory` | Agent 级全局常驻上下文 | 由具备该 Agent 管理权限的管理员更新或清空；普通用户可查看 | 该 Agent 的会话上下文常驻注入 |
| 用户个人记忆 `user_personal` | 当前用户在指定 Agent 下的个人记忆 | 当前用户可读、创建、修改、删除自己的个人记忆；管理员可做管控、重置和任务运维 | 仅该用户在该 Agent 下的会话可召回 |

对话上下文装配时，Agent 公共记忆从 Agent 运行时信息中读取，并按 `memoryConfig.publicMemoryTokenLimit` 限制注入预算。个人记忆在 `includeMemory=true`、存在检索查询且预算允许时，基于当前 session 的 `agentId/userId` 召回；只有在 Agent 允许个人记忆且当前用户个人记忆开关启用时参与召回。

Memory 有两类来源：用户通过本节接口手动创建、更新、删除个人记忆；框架侧的后台流水线从会话中抽取候选记忆，经整理合并后更新个人记忆。`forgetSession`、`pipeline/trigger`、`jobs`、`reset` 用于管控自动记忆流水线。Agent 公共记忆由管理员通过公共记忆接口维护。

#### 个人记忆设置

```
GET /agent-bus/v1/memory/personal/settings?agentId=xxx
POST /agent-bus/v1/memory/personal/settings
```

GET 使用查询参数 `agentId`。POST 请求体：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `agentId` | string | 是 | Agent ID |
| `enabled` | bool | POST 必填 | 当前登录用户是否启用个人记忆 |

**响应:**

```json
{
  "agentId": "agent_xxx",
  "userId": "alice",
  "personalMemoryEnabled": true
}
```

---

#### 创建个人记忆

```
POST /agent-bus/v1/memory/personal
```

创建当前登录用户的个人记忆。

**请求体:**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `agentId` | string | 是 | Agent ID |
| `memoryKind` | string | 否 | 记忆主分类，默认 `default`；服务端会 trim 并转小写后校验 |
| `title` | string | 否 | 可选显示标题，也参与检索文本 |
| `content` | string | 是 | 记忆文本内容 |
| `importance` | double | 否 | 重要度，取值范围 `[0, 1]`，默认 `0.7` |
| `metadata` | object | 否 | 自定义元数据；不能包含派生字段或旧身份字段 |
| `sourceRefs` | string | 否 | JSON 字符串或业务引用字符串，便于审计来源 |
| `expireTime` | long | 否 | 过期时间，毫秒时间戳；为空表示永不过期 |

**响应:** [MemoryEntry](#memoryentry)

说明：
- 记忆归属固定为当前登录用户。
- `source` 固定为 `manual`。
- `memoryKind` 可选值见 [MemoryEntry](#memoryentry)。

---

#### 获取个人记忆

```
GET /agent-bus/v1/memory/personal/{memoryId}
```

仅允许读取当前登录用户所属的个人记忆。

**响应:** [MemoryEntry](#memoryentry)

---

#### 更新个人记忆

```
PUT /agent-bus/v1/memory/personal/{memoryId}
```

**请求体:**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `memoryId` | string | 路径已提供时否 | 记忆 ID；若同时出现在路径和 body 中，必须一致 |
| `memoryKind` | string | 否 | 记忆主分类；服务端会 trim 并转小写后校验 |
| `title` | string | 否 | 标题 |
| `content` | string | 否 | 记忆文本内容；非空字符串 |
| `importance` | double | 否 | 重要度，取值范围 `[0, 1]` |
| `confidence` | double | 否 | 置信度，会裁剪到 `[0, 1]` |
| `source` | string | 否 | 来源标识 |
| `sourceRefs` | string | 否 | 来源引用信息 |
| `expireTime` | long / null | 否 | 过期时间，毫秒时间戳；传 `null` 清除过期时间 |
| `metadata` | object / null | 否 | 自定义元数据，整体替换；传 `null` 清空为 `{}` |

**响应:** [MemoryEntry](#memoryentry)

说明：
- 至少提供一个可更新字段。
- 未提供 `source` 时，个人记忆更新会写入 `source=user_edited`。

---

#### 删除个人记忆

```
DELETE /agent-bus/v1/memory/personal/{memoryId}
```

**响应:**

```json
{
  "memoryId": "mem_xxx",
  "deleted": true
}
```

---

#### 查询个人记忆

```
POST /agent-bus/v1/memory/personal/query
```

列出和搜索当前登录用户的个人记忆。未提供 `textQuery` 时按列表语义查询；提供 `textQuery` 时按搜索语义查询。

**请求体:**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `agentId` | string | 是 | Agent ID |
| `memoryKind` | string | 否 | 记忆主分类过滤；服务端会 trim 并转小写后校验 |
| `textQuery` | string | 否 | 搜索文本；未提供时返回列表；`TEXT_SEARCH` 排序必填 |
| `textMatchMode` | string | 否 | 文本匹配模式，`any` / `all`，默认 `any` |
| `offset` | int | 否 | 分页偏移，默认 `0`，必须为非负整数 |
| `limit` | int | 否 | 分页大小，默认 `100`，必须为非负整数 |
| `minImportance` | double | 否 | 最小重要度过滤阈值，默认 `0` |
| `sortBy` | string | 否 | 排序策略：`RECENCY` / `IMPORTANCE` / `TEXT_SEARCH` / `RANKED`。未提供时，无 `textQuery` 默认 `RECENCY`，有 `textQuery` 默认 `RANKED` |

**响应:**

```json
{
  "items": [ MemoryEntry, ... ],
  "offset": 0,
  "limit": 100,
  "size": 5
}
```

说明：
- 查询范围固定为当前登录用户的 active 个人记忆。

---

#### 忘记会话个人记忆

```
POST /agent-bus/v1/memory/personal/forgetSession
```

**请求体:**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `agentId` | string | 是 | Agent ID |
| `sessionId` | string | 是 | 要遗忘的会话 ID |

**响应:** `{ agentId, sessionId, forgotten }`

说明：
- 该接口用于让系统忘记从指定会话中自动提取出的个人记忆来源，并重新整理当前登录用户在该 Agent 下的个人记忆。
- 处理完成后，后续对话不再继续使用该会话作为个人记忆来源。
- 手动创建或手动编辑的个人记忆不会被自动删除；如需删除某条具体记忆，请使用“删除个人记忆”接口。
- 接口返回表示忘记请求已受理；相关记忆的重新整理可能由后台任务完成。

---

#### 触发当前用户会话记忆流水线

```
POST /agent-bus/v1/memory/personal/pipeline/trigger
```

按单个会话触发当前登录的普通用户的自动记忆流水线。

**请求体:**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `sessionId` | string | 是 | 要触发记忆流水线的会话 ID |

**响应:**

```json
{
  "agentId": "agent_xxx",
  "sessionId": "sess_xxx",
  "targetUserId": "",
  "scheduled": true
}
```

说明：

- 管理员如需跨用户或按用户 scope 触发，请使用 [触发记忆流水线](#触发记忆流水线) 管理员接口。
- 接口返回表示调度请求已受理，实际抽取和整理由后台任务完成。

---

#### 查看公共记忆

```
GET /agent-bus/v1/memory/public?agentId=xxx
```

读取 Agent 公共记忆。当前用户需要具备该 Agent 的读权限。

**响应:** [PublicMemory](#publicmemory)

---

#### 更新公共记忆

```
PUT /agent-bus/v1/admin/memory/public
```

更新 Agent 公共记忆。当前用户需要具备该 Agent 的管理权限。

**请求体:**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `agentId` | string | 是 | Agent ID |
| `content` | string | 是 | 公共记忆正文。服务端按 `memoryConfig.publicMemoryTokenLimit` 校验长度 |

**响应:** [PublicMemory](#publicmemory)

---

#### 清空公共记忆

```
DELETE /agent-bus/v1/admin/memory/public?agentId=xxx
```

清空 Agent 公共记忆。当前用户需要具备该 Agent 的管理权限。`agentId` 可放在 query string 或请求体中。

**响应:** [PublicMemory](#publicmemory)

---

### PublicMemory

```json
{
  "agentId": "agent_xxx",
  "content": "Agent 范围内常驻公共上下文",
  "estimatedTokens": 20,
  "tokenLimit": 1000,
  "schemaVersion": 1,
  "updateTime": "2026.06.23 11:26:51.933",
  "updateTimeMs": 1782185211933,
  "updatedBy": "admin"
}
```

---

#### 记忆统计

```
GET /agent-bus/v1/admin/memory/stats
```

**查询参数:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `agentId` | string | 是 | Agent ID |

**响应:**

```json
{
  "totalCount": 90,
  "userPersonalCount": 90,
  "activeCount": 80,
  "deletedCount": 10,
  "avgImportance": 0.65,
  "scopeDistribution": { "user_personal": 90 },
  "statusDistribution": { "active": 80, "deleted": 10 },
  "memoryKindDistribution": { "preference": 20, "fact": 10 },
  "sourceDistribution": { "manual": 40, "auto_extract": 70 },
  "jobKindDistribution": { "memory_stage1": 3, "memory_phase2": 5, "memory_derive_fields": 1 },
  "jobStatusDistribution": { "pending": 1, "succeeded": 7 }
}
```

统计接口覆盖个人记忆表和 memory job 分布。Agent 公共记忆由 [查看公共记忆](#查看公共记忆) 返回。

---

#### 读取记忆配置

```
GET /agent-bus/v1/admin/memory/config?agentId=xxx
```

**响应:** `{ agentId, memoryConfig }`

---

#### 更新记忆配置

```
PUT /agent-bus/v1/admin/memory/config
```

**请求体:**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `agentId` | string | 是 | Agent ID |
| `patch` / `memoryConfig` | object | 否 | 要合并到 agent memoryConfig 的配置片段 |

也可以将配置字段直接放在请求体顶层，服务端会排除 `agentId` 后作为配置 patch。

**响应:** `{ agentId, memoryConfig }`

---

#### 列出记忆任务

```
GET /agent-bus/v1/admin/memory/jobs
```

**查询参数:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `agentId` | string | 是 | Agent ID |
| `kind` | string | 否 | 任务类型过滤；可选 `memory_stage1` / `memory_phase2` / `memory_derive_fields` |
| `status` | string | 否 | 任务状态过滤 |
| `targetUserId` | string | 否 | 用户过滤 |
| `offset` | int | 否 | 默认 `0` |
| `limit` | int | 否 | 默认 `100` |

**响应:** `{ items: [MemoryJob, ...], offset, limit, size }`

说明：
- `memory_derive_fields` 是派生 `shortSummary/keywords/tags` 的后台任务。它由创建或编辑记忆事实源自动触发，通常很快完成；失败会短间隔重试，管理员可通过本节 jobs 接口查看和手动重试。

---

#### 获取记忆任务

```
GET /agent-bus/v1/admin/memory/jobs/{kind}/{jobKey}?agentId=xxx
```

**响应:** [MemoryJob](#memoryjob)

---

#### 重试记忆任务

```
POST /agent-bus/v1/admin/memory/jobs/{kind}/{jobKey}/retry
```

**请求体:**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `agentId` | string | 是 | - |

**响应:** [MemoryJob](#memoryjob)

说明：

- 对 `memory_stage1` 任务执行重试时，任务会立即排队，并跳过 `minSessionIdleMinutes` 的自动抽取等待。

---

#### 触发记忆流水线

```
POST /agent-bus/v1/admin/memory/pipeline/trigger
```

管理员接口，支持按单个会话或指定用户 scope 手动触发记忆流水线。按 `sessionId` 触发时，Stage 1 任务会立即排队，并跳过 `minSessionIdleMinutes` 的自动抽取等待。普通用户触发自己拥有的单个会话时，应使用 [触发当前用户会话记忆流水线](#触发当前用户会话记忆流水线)。

**请求体:**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `agentId` | string | 是 | Agent ID |
| `sessionId` | string | 条件必填 | 安排指定会话的自动记忆提取 |
| `targetUserId` / `userId` | string | 条件必填 | 安排指定用户个人记忆重新整理 |

`sessionId` 和 `targetUserId` 至少提供一个。

**响应:** `{ agentId, sessionId, targetUserId, scheduled }`

---

#### 重置用户个人记忆

```
POST /agent-bus/v1/admin/memory/reset
```

**请求体:**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `agentId` | string | 是 | Agent ID |
| `targetUserId` / `userId` | string | 是 | 目标业务用户 |
| `includeMemories` | bool | 否 | 是否移除 active `user_personal` 记忆，默认 `true` |
| `includeStage1` | bool | 否 | 是否同时清除该用户从历史会话自动提取出的中间记忆结果，默认 `true` |

**响应:** `{ agentId, targetUserId, includeMemories, includeStage1, ignoredStage1Count, removedMemoryCount, reset }`

---

### 3.10 LLM 使用统计

#### 查询 LLM 使用统计

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

| -------------------- | -------- | ------ | ----------------------------------------------------------------------------------------- |
| `agentId`      | string | 是   | Agent ID                                                                                |
| `targetUserId` | string | 否   | 只读过滤目标用户。未指定时返回当前登录用户自己的统计；仅`AGENT_ADMIN`可查看他人数据 |
| `startTime`    | long   | 否   | 开始时间（毫秒时间戳）                                                                  |
| `endTime`      | long   | 否   | 结束时间（毫秒时间戳）                                                                  |

**响应:**

`{ "agentId": "agent_xxx", "userId": "alice", "startTime": 1711699200000, "endTime": 1711785600000, "totalPromptTokens": 50000, "totalCompletionTokens": 15000, "totalTokens": 65000, "requestCount": 100, "tokensByModel": { "gpt-4.1": 54000, "claude-sonnet-4": 11000 } } `

说明：

* `tokensByModel` 的 value 为该模型累计 `totalTokens`。
* 统计来源是 `agent_llm_usage` 账本。
* 删除会话和消息不影响已记录的 usage 聚合结果。

---

### 3.11 内置 Agent/Skill 初始化

本章接口用于部署或升级后初始化发布包内预置的 Agent 和 Skill。执行初始化属于管控操作，调用者必须具备 DolphinDB admin 身份或全局 `AGENT_ADMIN` 权限；首次系统表未就绪时只能由 DolphinDB admin 执行。查询基础初始化状态用于客户端启动探测，允许未登录用户和普通用户调用。

初始化流程只读取 DolphinDB 可执行文件同级目录下的 `agentBuiltins/manifest.json`，不允许客户端通过请求参数指定 manifest 路径或 Skill 根目录。

初始化接口在 SINGLE 模式或计算节点上调用。集群模式下，计算节点通过 controller 上的内部租约保证同一时间只有一个初始化流程在执行。

#### 执行初始化

`POST /agent-bus/v1/builtin/init `

**请求体:**

| 字段

```
| 类型
```

| 默认值

```
| 说明


                                                                             |
```

| ---------------------- | ------ | ------------- | -------------------------------------------------------------------------------------- |
| `dryRun`         | bool | `false` | 仅校验 manifest、扫描资源并返回将要执行的动作，不写入 Agent、Skill、绑定或初始化状态 |
| `includeDetails` | bool | `true`  | 是否返回每个资源的处理明细`items`                                                |

**响应:** [BuiltinInitResult](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#builtininitresult "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#builtininitresult")

**响应示例:**

`{ "initialized": true, "state": "READY", "runId": "builtin_init_xxx", "manifestId": "dolphindb-agent-builtins", "manifestVersion": "2026.05.13", "manifestHash": "sha256:...", "dryRun": false, "summary": { "createdAgents": 1, "createdSkills": 2, "updatedSkills": 0, "createdBindings": 1, "skippedExisting": 0, "skippedUnchanged": 0, "skippedUserModified": 0, "failed": 0 }, "items": [ { "resourceType": "SKILL", "resourceKey": "dolphindb-sql-guide", "resourceId": "skill_xxx", "action": "CREATED", "status": "SUCCESS" }, { "resourceType": "AGENT", "resourceKey": "agent_builtin_550e8400-e29b-41d4-a716-446655440000", "resourceId": "agent_builtin_550e8400-e29b-41d4-a716-446655440000", "action": "CREATED", "status": "SUCCESS" } ], "lastFailures": [] } `

说明：

* 初始化按 manifest 顺序逐个处理 Skill zip，不一次性加载、解压或缓存所有 Skill 包。
* 普通公开接口 `agent.register` 仍不允许传 `agentId`；固定 `agent_builtin_<uuid>` 只允许内置初始化内部流程使用。
* 内置 Agent 初始化时不自动授权给任何用户、用户组或 PUBLIC，也不绑定默认 LLM。管理员后续通过现有授权和 LLM 绑定接口配置。
* 内置 Skill 使用 `ownerUserId="__agent_builtin__"`，该字段仅用于标识、展示和审计，不参与鉴权。
* `dryRun=true` 时不会写入初始化状态，因此不会改变后续 `status` 查询结果。

#### 查询初始化状态

`GET /agent-bus/v1/builtin/init/status `

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

| ---------------------- | ------ | ------------- | ------------------------------------------------------------------------------------------------ |
| `includeDetails` | bool | `false` | 是否返回初始化状态表中的明细记录`states`；仅 DolphinDB admin 或全局`AGENT_ADMIN`可使用 |

WebSocket 调用时，`includeDetails` 放在 `payload` 中。

权限与响应裁剪：

* 未登录用户和普通用户只能查询基础状态。响应只包含 `initialized`、`state`、`manifestId`、`manifestVersion`。
* DolphinDB admin 和全局 `AGENT_ADMIN` 用户可查询完整状态；传 `includeDetails=true` 时额外返回初始化状态表明细。
* 非管理员传 `includeDetails=true` 返回权限错误。

**响应:** [BuiltinInitResult](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#builtininitresult "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#builtininitresult")

**基础响应示例:**

`{ "initialized": false, "state": "STALE", "manifestId": "dolphindb-agent-builtins", "manifestVersion": "2026.05.13" } `

**管理员完整响应示例:**

`{ "initialized": false, "state": "STALE", "manifestId": "dolphindb-agent-builtins", "manifestVersion": "2026.05.13", "manifestHash": "sha256:...", "lastRunId": "builtin_init_xxx", "lastRunTime": "2026.05.13 12:30:00.000", "summary": { "createdAgents": 1, "createdSkills": 2, "updatedSkills": 0, "createdBindings": 1, "skippedExisting": 0, "skippedUnchanged": 0, "skippedUserModified": 0, "failed": 0 }, "lastFailures": [] } `

状态查询不创建系统表。系统表尚未初始化时，基础状态查询返回未就绪状态；管理员完整视图包含 `errorCode` 和 `message`。部署或升级流程应调用 `builtin.init` 完成系统表和内置资源初始化。

#### 状态与资源动作

`state` 取值：

| 状态

```
| 说明


                                                        |
```

| --------------- | ----------------------------------------------------------------- |
| `NOT_RUN` | 当前 manifest 从未执行初始化                                    |
| `READY`   | 当前 manifest 下所有资源均已成功处理或明确跳过                  |
| `PARTIAL` | 上次初始化部分成功，存在失败或冲突项，可重试                    |
| `STALE`   | 磁盘上的当前 manifest hash 与上次记录不一致，需要重新执行初始化 |
| `INVALID` | 当前 manifest 缺失、无法解析或校验失败                          |

`items[].resourceType` 取值：`SKILL`、`AGENT`、`BINDING`、`MANIFEST`。

常见 `items[].action`：

| 动作

```
| 说明


                                                  |
```

| ---------------------------------- | ----------------------------------------------------------- |
| `CREATED`                    | 新建 Agent 或 Skill                                       |
| `UPDATED`                    | 托管 Skill 被安全更新                                     |
| `BOUND`                      | 建立 Agent 到 Skill 的显式绑定                            |
| `ACTIVATED`                  | 已有托管 Agent 被补激活                                   |
| `SKIPPED_EXISTING`           | 资源已存在且无需处理                                      |
| `SKIPPED_UNCHANGED`          | 托管 Skill 与当前发布包内容一致                           |
| `SKIPPED_EXISTING_UNMANAGED` | 同名 Skill 已存在但不是内置初始化托管资源，跳过不覆盖     |
| `SKIPPED_UPDATE_CONFLICT`    | 托管 Skill 已被管理员修改，跳过自动更新                   |
| `SKIPPED_USER_UNBOUND`       | 用户或管理员已解绑该内置绑定，初始化不恢复                |
| `SKIPPED_DELETED`            | 曾经托管的 Skill 已被删除，初始化不自动恢复               |
| `ORPHANED_BUILTIN_RESOURCE`  | 历史内置资源未出现在当前 manifest，仅记录状态，不删除资源 |
| `FAILED`                     | 当前资源处理失败                                          |

`dryRun=true` 时会返回对应的 `WOULD_*` 动作。

#### 升级语义

初始化接口可重复调用，升级时继续使用同一个入口：

1. 新建 Agent、Skill 或显式绑定会被补齐。
2. 已存在的托管 Agent 默认不覆盖配置；若 manifest 期望 `ACTIVE` 且 Agent 尚未激活，可补执行激活。
3. 同名内置 Skill 默认采用 managed 策略：当前内容仍等于上次初始化写入内容时，允许用新发布包更新；若已被管理员修改，则跳过并记录冲突。
4. Agent 对 common Skill 的继承不需要初始化写绑定；Agent 已解绑 common Skill 后，初始化不会自动恢复。
5. manifest 不表达删除动作。旧 manifest 中声明过、当前 manifest 未声明的资源只会被标记为 orphaned，不会自动删除或解绑。

---

## 4. 数据结构参考

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
| `description`   | string    | Agent 描述信息                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `status`        | int       | 状态值：0=REGISTERED, 1=ACTIVE, 2=SUSPENDED, 3=DELETED                                                                                                                                                                                                                                                                                                                                                                                          |
| `statusName`    | string    | 状态可读名称：`REGISTERED`（已注册，不可创建会话）/`ACTIVE`（已激活，可正常使用）/`SUSPENDED`（已挂起）/`DELETED`（已删除）                                                                                                                                                                                                                                                                                                     |
| `systemPrompt`  | string    | 系统提示词，自动装配时作为 context 的首条 system message 注入                                                                                                                                                                                                                                                                                                                                                                                   |
| `llmConfigId`   | string    | 默认 LLM 配置 ID。注册时如果指定，会自动创建 agent 与该 LLM 的绑定关系（`isDefault=true`,`priority=0`）                                                                                                                                                                                                                                                                                                                                 |
| `contextConfig` | object    | 上下文组装配置，控制历史摘要、记忆检索、技能注入、摘要触发等行为，详见[contextConfig 结构](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#contextconfig "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#contextconfig") |
| `memoryConfig`  | object    | 记忆管理配置，详见[memoryConfig 结构](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#memoryconfig "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#memoryconfig")                                                        |
| `config`        | object    | Agent 扩展配置。`allowLlmFallback`为 bool，默认 false；为 false 时只调用解析出的目标模型，失败直接报错；为 true 时允许按 agent 绑定 priority 自动切换到备用 LLM 配置。其他字段原样存储，可用于业务层自定义用途                                                                                                                                                                                                                              |
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
| `includeMemory`          | bool   | true   | 是否在上下文中包含记忆检索结果                                                                                                                                                                                                                                                                                                                                                              |
| `memoryTopK`             | int    | 5      | 记忆检索返回的最大条数（最小值 1）                                                                                                                                                                                                                                                                                                                                                          |
| `memoryTokenBudget`      | int    | 2000   | 记忆部分的 token 预算上限                                                                                                                                                                                                                                                                                                                                                                   |
| `includeSkills`          | bool   | true   | 是否包含已激活的技能详细指令                                                                                                                                                                                                                                                                                                                                                                |
| `includeSkillCatalog`    | bool   | true   | 是否注入技能目录                                                                                                                                                                                                                                                                                                                                                                            |
| `instructionTokenBudget` | int    | 5000   | 已激活技能详细指令的 token 预算上限                                                                                                                                                                                                                                                                                                                                                         |
| `summaryConfig`          | object | —     | 会话摘要配置，详见[summaryConfig 结构](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#summaryconfig "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#summaryconfig") |

### memoryConfig

Agent 级记忆配置。所有字段可选，未提供时由 `MemoryPolicyService` 使用默认策略。

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `allowPersonalMemory` | bool | `true` | Agent 是否允许个人记忆。关闭后不读写 `user_personal` 记忆 |
| `memoryLlmConfigId` | string | Agent 默认 `llmConfigId` | 自动记忆提取、整理和派生 `shortSummary/keywords/tags` 使用的 LLM 配置 |
| `memoryEmbeddingConfigId` | string | 空 | 可选 embedding 配置 ID。配置后，memory 召回会使用 embedding sidecar/vectorIndex 参与 `RANKED` 排序；为空时只使用 textIndex 和结构化过滤 |
| `memoryTopK` | int | `5` | 上下文组装时相关记忆检索返回的最大条数（最小值 1） |
| `residentPreferenceTopK` | int | `5` | 常驻 preference 注入上限 |
| `residentPreferenceBudget` | int | `300` | 常驻 preference 上下文预算 |
| `relevantMemoryBudget` | int | `2000` | 相关记忆上下文预算 |
| `publicMemoryTokenLimit` | int | `2000` | Agent 公共记忆 token 上限 |
| `embeddingTopK` | int | `20` | 向量召回候选数 |
| `embeddingWeight` | double | `0.35` | `RANKED` 排序中的向量分权重，上限裁剪为 `0.35` |
| `memoryEmbeddingIndexType` | string | `flat` | embedding sidecar 的 vectorIndex 类型，当前支持 `flat` / `hnsw`；距离计算固定使用 `rowEuclidean` |
| `phase2RelatedVectorTopK` | int | `20` | Phase 2 软匹配相关记忆的向量召回候选数 |
| `phase2RelatedTextTopK` | int | `20` | Phase 2 软匹配相关记忆的文本召回候选数 |
| `phase2RelatedRecentTopK` | int | `10` | Phase 2 同类最近记忆候选数 |
| `phase2RelatedMax` | int | `30` | Phase 2 每批候选传给 LLM 的相关记忆上限 |
| `minSessionIdleMinutes` | int | `360` | 会话结束后等待多久才允许自动后台提取记忆；显式手动触发 session 或管理员重试 Stage 1 时不使用该等待 |
| `maxSessionAgeDays` | int | `10` | 自动记忆提取可处理的最大会话年龄 |
| `phase2CooldownMinutes` | int | `10` | 同一用户记忆自动整理的冷却时间 |
| `maxRawMemoriesForConsolidation` | int | `256` | 单次自动整理处理的候选记忆上限 |
| `maxUnusedDays` | int | `30` | 记忆低频维护使用的未使用天数阈值 |

注意：memory 写请求的 lane 并发策略由全局服务端配置 `agentFramework.memory.lanePolicy` 控制，不属于 agent 级 `memoryConfig`。

**预算分配顺序**（优先级从高到低）：

```
总预算 = maxContextTokens

1. System Prompt        固定分配
2. User Message         固定分配（当前消息）
3. Skill Catalog        固定分配（~100 tokens/skill）
4. Tool Definitions     固定分配（应用层透传，框架计入预算）
5. Active Instructions  配额分配（instructionTokenBudget）
6. Memory Context       配额分配（memoryTokenBudget）
7. History Tail         latest summary + raw tail，超出窗口时先触发 rolling summary
```

说明：
- 框架会边接收 provider 的流式 chunk，边转发为 SSE 事件；不会等 LLM 完全返回后才开始向客户端发送。
- `STREAM_REASONING.data.reasoning` 是思考过程增量，仅在请求 `includeReasoning=true` 且 provider 返回可展示 reasoning 时出现。
- `STREAM_CHUNK.data.content` 是正文增量；`STREAM_CHUNK.data.toolCallDeltas` 是工具调用增量，可能只包含部分 `arguments`，不保证可直接解析或执行。
- `STREAM_END.data` 是本次补全的完整终态响应，会再次包含累计后的 `content`、`reasoning`、合并后的完整 `toolCalls`、`finishReason`、`usage`、`latencyMs` 和 `metadata`。
- 客户端实时展示可消费 `STREAM_REASONING` / `STREAM_CHUNK`；执行工具、入库或业务判断应优先使用 `STREAM_END.data.toolCalls`，无需自行拼接 `toolCallDeltas`。

- 框架内部会按最终输出预算为 chat 预留运行时空间，用于阈值判断和硬性窗口检查
- 该预留不是 `contextConfig` 的对外字段；请求和 LLM 配置未显式指定输出上限时，默认按 `clamp(contextWindow / 8, 8192, 32768)` 计算

**示例：**

```json
{
  "maxContextTokens": 128000,
  "includeMemory": true,
  "includeSkills": true,
  "summaryConfig": {
    "summaryLlmConfigId": "llm_summary_xxx",
    "triggerRatio": 0.8,
    "tailKeepTokens": 0,
    "onOverflow": "error"
  }
}
```

---


### summaryConfig

会话摘要配置，嵌套在 `contextConfig.summaryConfig` 中。历史管理固定为 `summary-first`，所有字段均为可选。

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
| `summaryLlmConfigId` | string | `""`      | 摘要模型配置 ID。为空时使用当前/default LLM 配置                                                      |
| `triggerRatio`       | double | `0.8`     | 自动摘要阈值。候选 prompt 预计消耗达到`contextWindow * triggerRatio`时，chat 主链路先执行前置摘要 |
| `tailKeepTokens`     | int    | `0`       | 自动/手动摘要后保留多少最新 raw 历史 token 不压缩。`0`表示不保留 raw tail                         |
| `onOverflow`         | string | `"error"` | summary 也无法压缩到窗口内时的处理策略。当前固定为`error`                                         |
| `promptTemplate`     | string | `""`      | 自定义摘要 system prompt。为空时使用内置模板                                                          |

**运行时语义：**

1. 历史管理固定为 `summary-first`
2. `summaryLlmConfigId` 为空时，自动摘要使用本轮聊天解析出的 LLM 配置；手动摘要使用请求指定的 `llmConfigId`、session 默认 LLM 配置或 agent 默认 LLM 配置
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

| -------------------------------------------------------------- | ---------- | ---------------------------------------------------------------- |
| `temperature`                                            | double   | 采样温度，控制输出随机性。值越高输出越随机，值越低越确定       |
| `maxTokens`/`max_tokens`/`max_completion_tokens` | int      | 最大输出 token 数；未配置时按`contextWindow`动态计算默认值 |
| `topP`/`top_p`                                       | double   | 核采样概率阈值（两种命名均支持，优先读取`topP`）           |
| `stop`                                                   | string[] | 停止序列列表，LLM 生成到这些字符串时自动停止                   |

​**扩展参数**​（透传到 LLM provider）：

`defaultParams` 中除标准参数和保留字段（`model`、`stream`、`tools`、`messages` 等）之外的所有其他 key，都会被原样透传到 LLM provider 的请求 payload 中。可用于传递 provider 特有的参数（如 OpenAI 的 `frequency_penalty`、`presence_penalty`、`seed`，Anthropic 的 `thinking` 等）。

`capability`、`embeddingDimension`、`embeddingMetric`、`embeddingNormalize` 属于结构化配置字段，不放入 `defaultParams`。

​**输出预算解析顺序**​：

`1. requestOverrides（请求级参数，通过 chat/completions 或 llm/complete 的请求体传入） 2. defaultParams（LLM 配置级默认值） 3. 动态默认值：clamp(contextWindow / 8, 8192, 32768) `

请求级参数只覆盖显式指定的字段，未指定的字段保持 defaultParams 的值；二者都未指定输出上限时，框架动态计算默认输出预算。

**示例：**

`{ "temperature": 0.7, "maxTokens": 16384, "topP": 0.9, "stop": ["\n\n"], "frequency_penalty": 0.5, "seed": 42 } `

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
* 所有重试耗尽后仍失败，且 `AgentInfo.config.allowLlmFallback=true` 时，才尝试切换到 agent 绑定的下一个 LLM 配置（按 priority 顺序）。默认不开启该机制。

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

| --------------------- | ----------- | ------------------------------------------------------------------------------------------------ |
| `id`            | string    | 授权记录 ID                                                                                    |
| `agentId`       | string    | 被授权访问的 Agent ID                                                                          |
| `subjectType`   | string    | 当前支持`USER`；预留`GROUP`/`PUBLIC`                                               |
| `subjectId`     | string    | `USER`subject 对应 DolphinDB 用户 ID；未来`GROUP`对应 groupId，`PUBLIC`对应`*` |
| `grantedBy`     | string    | 执行授权操作的用户 ID                                                                          |
| `schemaVersion` | int       | 行 Schema 版本号                                                                               |
| `extra`         | string    | 预留扩展字段                                                                                   |
| `createTime`    | timestamp | 授权时间                                                                                       |
| `expireTime`    | timestamp | 授权过期时间（为空表示永不过期）                                                               |

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

| --------------------- | ----------- | ------------------------------------------------------------------------------------------------- |
| `providerId`    | string    | 全局唯一 ID，注册时自动生成                                                                     |
| `name`          | string    | Provider 名称，用于标识和展示                                                                   |
| `adapterType`   | string    | 运行时 provider 适配器类型：`openai`/`openai-compatible`/`anthropic`/`deepseek` |
| `baseUrl`       | string    | Provider 级基础 URL，如`https://api.openai.com`                                             |
| `apiKey`        | string    | Provider API Key。对外返回时始终脱敏为`***`；未配置时返回空字符串                           |
| `enabled`       | bool      | 是否启用                                                                                        |
| `schemaVersion` | int       | 行 Schema 版本号                                                                                |
| `extra`         | string    | 预留扩展字段                                                                                    |
| `createTime`    | timestamp | 创建时间                                                                                        |
| `updateTime`    | timestamp | 最后更新时间                                                                                    |

---

### LlmConfigInfo

| 字段

```
| 类型


                                                                                                                                                                                                                                                                                                                                                                   | 说明


                                                                                                                                                                                                     |
```

| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `llmConfigId`        | string                                                                                                                                                                                                                                                                                                                                                                     | 全局唯一 ID，注册时自动生成                                                                                                                                                                                  |
| `name`               | string                                                                                                                                                                                                                                                                                                                                                                     | 配置名称，用于标识和展示                                                                                                                                                                                     |
| `providerId`         | string                                                                                                                                                                                                                                                                                                                                                                     | 关联的 provider ID                                                                                                                                                                                           |
| `provider`           | [LlmProviderInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmproviderinfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmproviderinfo") | 关联 provider 的完整信息；其中`apiKey`始终脱敏返回                                                                                                                                                       |
| `model`              | string                                                                                                                                                                                                                                                                                                                                                                     | 模型名称（如`gpt-4`、`claude-sonnet-4-20250514`），传递给 LLM API                                                                                                                                    |
| `capability`         | string                                                                                                                                                                                                                                                                                                                                                                     | 配置能力类型：`chat`/`embedding`                                                                                                                                                                     |
| `embeddingDimension` | int                                                                                                                                                                                                                                                                                                                                                                        | 向量维度；`capability=chat`时为 0                                                                                                                                                                        |
| `embeddingMetric`    | string                                                                                                                                                                                                                                                                                                                                                                     | embedding 相似度规则；`capability=chat`时为空                                                                                                                                                            |
| `embeddingNormalize` | bool                                                                                                                                                                                                                                                                                                                                                                       | embedding 是否归一化；`capability=chat`时为`false`                                                                                                                                                   |
| `requestPath`        | string                                                                                                                                                                                                                                                                                                                                                                     | 相对`provider.baseUrl`的请求路径，必须以`/`开头，可包含查询串                                                                                                                                        |
| `defaultParams`      | object                                                                                                                                                                                                                                                                                                                                                                     | 默认请求参数，支持`temperature`（double）、`maxTokens`/`max_tokens`/`max_completion_tokens`（int）、`topP`/`top_p`（double）、`stop`（string[]）等。请求级参数可覆盖此处的默认值 |
| `contextWindow`      | int/null                                                                                                                                                                                                                                                                                                                                                                   | 模型上下文窗口大小（token 数），用于上下文组装时的预算计算；未设置时返回`null`，运行时使用`contextConfig.maxContextTokens`                                                                           |
| `maxConcurrency`     | int/null                                                                                                                                                                                                                                                                                                                                                                   | 该 LLM 配置的最大并发请求数；未设置时返回`null`，运行时使用系统默认并发                                                                                                                                  |
| `rateLimitRPM`       | int/null                                                                                                                                                                                                                                                                                                                                                                   | 速率限制（每分钟最大请求数）；未设置时返回`null`，运行时不启用该配置项限速                                                                                                                               |
| `timeoutMs`          | int/null                                                                                                                                                                                                                                                                                                                                                                   | 单次 LLM 请求超时时间（毫秒）；未设置时返回`null`，运行时使用系统默认超时                                                                                                                                |
| `retryConfig`        | object                                                                                                                                                                                                                                                                                                                                                                     | 重试配置：`maxRetries`（默认 3）、`initialDelayMs`（默认 1000）、`backoffMultiplier`（默认 2.0）、`maxDelayMs`（默认 30000）、`retryableStatusCodes`（默认 [429, 500, 502, 503]）        |
| `enabled`            | bool                                                                                                                                                                                                                                                                                                                                                                       | 是否启用                                                                                                                                                                                                     |
| `schemaVersion`      | int                                                                                                                                                                                                                                                                                                                                                                        | 行 Schema 版本号                                                                                                                                                                                             |
| `customData`         | string                                                                                                                                                                                                                                                                                                                                                                     | 外部自定义数据，原样返回；框架不解析、不参与运行时逻辑                                                                                                                                                       |
| `extra`              | string                                                                                                                                                                                                                                                                                                                                                                     | 预留扩展字段                                                                                                                                                                                                 |
| `createTime`         | timestamp                                                                                                                                                                                                                                                                                                                                                                  | 创建时间                                                                                                                                                                                                     |
| `updateTime`         | timestamp                                                                                                                                                                                                                                                                                                                                                                  | 最后更新时间                                                                                                                                                                                                 |

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

| ------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `isDefault`   | bool   | 是否为默认 LLM。每个 agent 仅允许一个默认配置，设为`true`时`priority`强制为 0                                                                                                                |
| `priority`    | int    | LLM 选择优先级，数值越小优先级越高。用于默认模型解析顺序；仅当`AgentInfo.config.allowLlmFallback=true`时才按 priority 升序排列形成备用 LLM 配置切换链。请求级`llmConfigId`可临时覆盖首选模型 |
| `accessExtra` | string | 绑定级别的扩展字段                                                                                                                                                                                   |

---

### SelectableLlmInfo

继承 LlmConfigInfo 的所有字段，额外包含：

| 字段

```
| 类型


   | 说明


                                                                                         |
```

| ------------------------------ | ------------ | -------------------------------------------------------------------------------------------------- |
| `source`                 | string     | 来源：`agent`/`user`/`both`                                                          |
| `isAgentDefault`         | bool       | 是否为该 agent 当前默认模型                                                                      |
| `participatesInFallback` | bool       | 是否来自 agent 绑定，并可在`AgentInfo.config.allowLlmFallback=true`时参与备用 LLM 配置切换链 |
| `fallbackPriority`       | int / null | 备用切换顺序；仅`participatesInFallback=true`时有值                                          |

---

### SessionInfo

| 字段

```
| 类型


  | 说明


                                                                                                     |
```

| --------------------- | ----------- | -------------------------------------------------------------------------------------------------------------- |
| `sessionId`     | string    | 全局唯一 ID，创建时自动生成                                                                                  |
| `agentId`       | string    | 所属 Agent ID，创建时指定，不可变更                                                                          |
| `userId`        | string    | 所属 DolphinDB 用户 ID，创建时由当前登录用户确定，不可变更                                                   |
| `llmConfigId`   | string    | 会话级 LLM 配置 ID。为空时继承 agent 默认模型；非空时必须属于当前用户在该 agent 下的有效可选集合             |
| `title`         | string    | 会话标题，可通过 updateSession 修改                                                                          |
| `metadata`      | object    | 自定义元数据，可通过 updateSession 修改，JSON 格式存储                                                       |
| `schemaVersion` | int       | 行 Schema 版本号                                                                                             |
| `extra`         | string    | 预留扩展字段                                                                                                 |
| `createTime`    | timestamp | 创建时间                                                                                                     |
| `updateTime`    | timestamp | 最近会话消息时间。无消息时等于`createTime`；该字段从消息表和本节点 pending 写缓存派生，不写入 session 表 |

---

### MessageInfo

| 字段

```
| 类型


  | 说明


                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
```

| ------------------------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `messageId`        | string    | 消息唯一 ID，追加时自动生成                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `sessionId`        | string    | 所属会话 ID                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `agentId`          | string    | 所属 Agent ID                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `sequenceNum`      | long      | 会话内单调递增序列号，从 1 开始，用于消息排序和范围查询                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `role`             | string    | 消息角色：`system`（系统指令）/`user`（用户输入）/`assistant`（LLM 回复）/`tool`（工具执行结果）                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `contentType`      | string    | 内容类型，决定上下文组装时的解析方式：`text`（纯文本，直接作为 message.content）/`tool_call`（工具调用，content 为 JSON 格式的 toolCalls 数组，组装时解析为 OpenAI tool\_calls 结构）/`tool_result`（工具结果，组装时使用 role=`tool`并附带 toolCallId）/`multimodal`（多模态，content 为 JSON 数组，每项含 type/text/imageUrl）/`summary`（会话摘要，由框架内部写入，在`summary-first`模式下作为 latest summary 注入；其`metadata`中记录`summaryUpToSeqNum`、`trigger`、`summaryLlmConfigId`） |
| `content`          | string    | 消息内容。格式取决于 contentType：text 和 tool\_result 为纯文本，tool\_call 为 JSON（`{"toolCalls":[...]}`或`[{...}]`），multimodal 为 JSON 数组（`[{"type":"text","text":"..."},{"type":"image_url","imageUrl":"..."}]`）                                                                                                                                                                                                                                                                                                      |
| `toolCallId`       | string    | 工具调用关联 ID。contentType 为`tool_result`时必填，用于将工具执行结果关联到 assistant 发起的对应 tool\_call（同一个 toolCallId）                                                                                                                                                                                                                                                                                                                                                                                                       |
| `llmModel`         | string    | 产生该消息的 LLM 模型名称（如`gpt-4`），通常仅 assistant 消息和 summary 消息有此值                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `promptTokens`     | int       | 产生该消息时的输入 token 数（LLM 返回的 usage 统计）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `completionTokens` | int       | 产生该消息时的输出 token 数（LLM 返回的 usage 统计）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `totalTokens`      | int       | 总 token 数（通常等于 promptTokens + completionTokens），用于摘要、上下文估算和 usage 账本写入                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `metadata`         | object    | 自定义元数据，JSON 格式                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `schemaVersion`    | int       | 行 Schema 版本号                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `extra`            | string    | 预留扩展字段                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `createTime`       | timestamp | 消息创建时间                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

---

### MemoryEntry

| 字段 | 类型 | 说明 |
|------|------|------|
| `memoryId` | string | 记忆唯一 ID，存储时自动生成 |
| `agentId` | string | 所属 Agent ID |
| `userId` | string | 个人记忆所属用户 |
| `scopeType` | string | 作用域：`user_personal` |
| `memoryKind` | string | 记忆主分类：`preference` / `fact` / `procedure` / `failure_shield` / `default` |
| `title` | string | 标题 |
| `content` | string | 记忆事实源文本 |
| `shortSummary` | string | 服务端派生短摘要；创建或编辑事实源后可能短暂为空 |
| `keywords` | string | 服务端派生检索辅助词；创建或编辑事实源后可能短暂为空 |
| `tags` | string | 服务端派生主题标签，空格分隔；创建或编辑事实源后可能短暂为空 |
| `importance` | double | 重要度，取值范围 `[0, 1]` |
| `confidence` | double | 置信度，取值范围 `[0, 1]` |
| `status` | string | 状态，如 `active` / `deleted` |
| `accessCount` | long | recall 聚合访问次数 |
| `lastAccessTime` | timestamp / null | 最近 recall 时间 |
| `usageCount` | long | actual usage 聚合次数 |
| `lastUsageTime` | timestamp / null | 最近 actual usage 时间 |
| `expireTime` | timestamp / null | 过期时间，空表示永不过期 |
| `source` | string | 记忆来源，如 `manual` / `user_edited` / `phase2` / `auto_extract` |
| `sourceRefs` | string | 来源引用信息 |
| `metadata` | object | 自定义元数据，JSON 格式 |
| `schemaVersion` | int | 行 Schema 版本号 |
| `createTime` | timestamp | 创建时间 |
| `updateTime` | timestamp | 最后更新时间 |
| `rankScore` | double | `RANKED` 搜索的应用层排序分 |
| `textScore` | double | textIndex 命中分；列表查询或未命中文本时通常为 `0` |
| `vectorScore` | double | embedding 召回分；未配置 embedding 或未命中向量侧时为 `0` |

---

### MemoryJob

| 字段 | 类型 | 说明 |
|------|------|------|
| `jobShardKey` | string | 任务分片 key |
| `kind` | string | 任务类型：`memory_stage1` / `memory_phase2` / `memory_derive_fields` |
| `jobKey` | string | 任务 key |
| `scopeShardKey` | string | 记忆 scope 分片 key |
| `scopeKey` | string | 业务 scope key |
| `status` | string | 任务状态 |
| `workerId` | string | 当前 worker ID |
| `workerLeaseBootId` | string | worker 启动 ID |
| `workerLeaseEpoch` | long | worker lease epoch |
| `startedTime` | timestamp / null | 开始时间 |
| `finishedTime` | timestamp / null | 完成时间 |
| `retryAt` | timestamp / null | 下次重试时间 |
| `retryRemaining` | int | 剩余重试次数 |
| `lastError` | string | 最近错误 |
| `inputWatermark` | string | 输入水位 |
| `lastSuccessWatermark` | string | 最近成功水位 |
| `schemaVersion` | int | 行 Schema 版本号 |
| `extra` | string | 扩展信息 |

---

### SkillInfo

| 字段

```
| 类型


  | 说明


                                                                                             |
```

| ------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------ |
| `skillId`                | string    | 技能唯一 ID，注册时自动生成                                                                          |
| `name`                   | string    | 技能名称，启用状态下全局唯一。用于应用层`activeSkillNames`引用和目录展示                         |
| `description`            | string    | 技能描述，在技能目录中展示，帮助 LLM 判断是否需要该技能                                              |
| `license`                | string    | 许可证信息                                                                                           |
| `compatibility`          | string    | 兼容性说明（如最低框架版本要求）                                                                     |
| `argumentHint`           | string    | 参数提示信息，在技能目录中展示，提示 LLM 如何调用该技能                                              |
| `disableModelInvocation` | bool      | 是否禁止 LLM 自动调用。为`true`时该技能不会出现在 LLM 可发现的技能目录中，但仍可通过用户显式调用 |
| `userInvocable`          | bool      | 是否允许用户直接调用该技能                                                                           |
| `hasInstruction`         | bool      | 技能包中是否包含详细指令（SKILL.md frontmatter 之后的正文内容）                                      |
| `contentRevision`        | int       | 技能包文件内容版本                                                                                   |
| `contentHash`            | string    | 当前 Skill 规范化内容 hash                                                                           |
| `displayName`            | string    | 技能显示名称                                                                                         |
| `category`               | string    | 技能分类标签，用于按分类筛选                                                                         |
| `version`                | string    | 语义版本号（如`1.0.0`）                                                                          |
| `isCommon`               | bool      | 是否为 common skill；common skill 默认被所有 Agent 继承                                              |
| `enabled`                | bool      | 是否启用；禁用时不参与目录和指令组装                                                                 |
| `ownerUserId`            | string    | 技能所属用户                                                                                         |
| `metadata`               | object    | 自定义元数据                                                                                         |
| `schemaVersion`          | int       | 行 Schema 版本号                                                                                     |
| `extra`                  | string    | 预留扩展字段                                                                                         |
| `createTime`             | timestamp | 创建时间                                                                                             |
| `updateTime`             | timestamp | 最后更新时间                                                                                         |

---

### SkillAccessInfo

| 字段

```
| 类型


  | 说明


                                                                |
```

| --------------------- | ----------- | ------------------------------------------------------------------------- |
| `id`            | string    | 绑定记录 ID                                                             |
| `agentId`       | string    | 绑定到的 Agent ID                                                       |
| `skillId`       | string    | 被绑定的技能 ID                                                         |
| `subjectType`   | string    | 绑定主体类型，固定为`AGENT`（agent 级别绑定）                       |
| `subjectId`     | string    | 绑定主体 ID，等于 agentId                                               |
| `available`     | bool      | 派生可用状态。为`false`时该技能不进入 catalog 和 context            |
| `source`        | string    | 绑定来源：`EXPLICIT`、`COMMON_INHERITED`、`COMMON_DISABLED` |
| `schemaVersion` | int       | 行 Schema 版本号                                                        |
| `extra`         | string    | 预留扩展字段                                                            |
| `createTime`    | timestamp | 绑定时间                                                                |
| `updateTime`    | timestamp | 最后更新时间                                                            |
| `skill`         | SkillInfo | 关联的技能完整信息（列表接口中可选返回）                                |

---

### BuiltinInitResult

`/builtin/init` 与 `/builtin/init/status` 的响应结构。初始化接口返回当前执行结果；管理员状态接口返回最近一次非 dryRun 初始化状态。未登录用户和普通用户查询状态时只返回 `initialized`、`state`、`manifestId`、`manifestVersion` 字段。

| 字段

```
| 类型


                                                                                                                                                                                                                                                                                                                                                                            | 说明


                                                                      |
```

| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `initialized`     | bool                                                                                                                                                                                                                                                                                                                                                                                | `state == "READY"`时为 true                                               |
| `state`           | string                                                                                                                                                                                                                                                                                                                                                                              | 初始化状态：`NOT_RUN`/`READY`/`PARTIAL`/`STALE`/`INVALID` |
| `runId`           | string                                                                                                                                                                                                                                                                                                                                                                              | 本次初始化运行 ID；状态查询中可能为空                                         |
| `manifestId`      | string                                                                                                                                                                                                                                                                                                                                                                              | manifest 中声明的内置资源包标识                                               |
| `manifestVersion` | string                                                                                                                                                                                                                                                                                                                                                                              | manifest 中声明的发布版本，用于展示和状态记录                                 |
| `manifestHash`    | string                                                                                                                                                                                                                                                                                                                                                                              | 当前磁盘 manifest 内容 hash                                                   |
| `lastRunId`       | string                                                                                                                                                                                                                                                                                                                                                                              | 最近一次非 dryRun 初始化运行 ID；状态查询返回                                 |
| `lastRunTime`     | timestamp / string                                                                                                                                                                                                                                                                                                                                                                  | 最近一次非 dryRun 初始化时间；未初始化时为空                                  |
| `dryRun`          | bool                                                                                                                                                                                                                                                                                                                                                                                | 是否为 dryRun 结果；状态查询通常不返回该字段或为 false                        |
| `summary`         | [BuiltinInitSummary](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#builtininitsummary "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#builtininitsummary") | 资源处理汇总                                                                  |
| `items`           | BuiltinInitItem[]                                                                                                                                                                                                                                                                                                                                                                   | 初始化接口的资源处理明细，仅`includeDetails=true`返回                     |
| `lastFailures`    | BuiltinInitItem[]                                                                                                                                                                                                                                                                                                                                                                   | 最近失败或冲突项                                                              |
| `states`          | BuiltinStateRecord[]                                                                                                                                                                                                                                                                                                                                                                | 状态查询明细，仅`/builtin/init/status?includeDetails=true`返回            |
| `errorCode`       | string                                                                                                                                                                                                                                                                                                                                                                              | 全局失败错误码，通常仅`state=INVALID`时返回                               |
| `message`         | string                                                                                                                                                                                                                                                                                                                                                                              | 全局失败说明                                                                  |

---

### BuiltinInitSummary

| 字段

```
| 类型
```

| 说明

```
|
```

| --------------------------- | ------ | --------------------------------------- |
| `createdAgents`       | int  | 本次新建的内置 Agent 数               |
| `createdSkills`       | int  | 本次新建的内置 Skill 数               |
| `updatedSkills`       | int  | 本次安全更新的托管 Skill 数           |
| `createdBindings`     | int  | 本次新建的显式 Skill 绑定数           |
| `skippedExisting`     | int  | 已存在或用户解绑等跳过项数量          |
| `skippedUnchanged`    | int  | 内容未变化的托管 Skill 数             |
| `skippedUserModified` | int  | 因管理员修改而跳过更新的托管 Skill 数 |
| `failed`              | int  | 失败或冲突项数量                      |

---

### BuiltinInitItem

| 字段

```
| 类型
```

| 说明

```
|
```

| -------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `resourceType` | string | 资源类型：`SKILL`/`AGENT`/`BINDING`/`MANIFEST`                                                             |
| `resourceKey`  | string | 资源幂等键。Agent 使用`agentId`，Skill 使用`name`，绑定使用 \`agentId                                              |
| `resourceId`   | string | 实际系统资源 ID。Agent 为`agentId`，Skill/Binding 通常为`skillId`                                                  |
| `action`       | string | 处理动作，如`CREATED`、`UPDATED`、`BOUND`、`SKIPPED_EXISTING`、`SKIPPED_UPDATE_CONFLICT`、`FAILED` |
| `status`       | string | 处理状态：`SUCCESS`/`FAILED`/`CONFLICT`                                                                        |
| `errorCode`    | string | 失败或冲突错误码                                                                                                           |
| `message`      | string | 失败或冲突说明                                                                                                             |

---

### BuiltinStateRecord

初始化状态表明细，仅用于管控侧排查和展示。

| 字段

```
| 类型


  | 说明


                                                                                                                             |
```

| ---------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `manifestId`           | string    | manifest 标识                                                                                                                        |
| `targetType`           | string    | 状态对象类型：`MANIFEST`/`RUN`/`AGENT`/`SKILL`/`BINDING`                                                         |
| `targetKey`            | string    | 状态对象幂等键                                                                                                                       |
| `payloadSchemaVersion` | int       | payload 内部 schema 版本                                                                                                             |
| `payload`              | object    | 状态 payload，包含`manifestVersion`、`manifestHash`、`resourceId`、`status`、`lastAction`、`lastRunId`等字段 |
| `createTime`           | timestamp | 状态记录创建时间                                                                                                                     |
| `updateTime`           | timestamp | 状态记录更新时间                                                                                                                     |

---

### NetworkFetchResponse

| 字段

```
| 类型
```

| 说明

```
|
```

| ------------------------- | -------- | ------------------------------------------------------------------------------------- |
| `url`               | string | 框架规范化后的请求 URL                                                              |
| `method`            | string | 实际发起的 HTTP 方法：`GET`/`POST`                                          |
| `statusCode`        | int    | 目标站点返回的 HTTP 状态码。3xx 重定向不会被框架自动跟随                            |
| `statusText`        | string | 目标站点返回的 HTTP 状态描述                                                        |
| `headers`           | object | 目标站点返回的响应头                                                                |
| `contentType`       | string | 从响应头解析出的`Content-Type`，不存在时为空字符串                              |
| `contentEncoding`   | string | 从响应头解析出的`Content-Encoding`，不存在时为空字符串                          |
| `body`              | string | 文本类响应体。二进制、未知类型或非 identity 编码响应为空字符串                      |
| `truncated`         | bool   | 响应体是否因`maxBodyBytes`上限被截断                                            |
| `bodyOmitted`       | bool   | 是否因为内容类型或编码不适合放入 JSON 响应而省略 body                               |
| `bodyUtf8Sanitized` | bool   | 文本 body 是否经过 UTF-8 安全处理；常见于截断刚好切断多字节字符或上游返回非法 UTF-8 |
| `latencyMs`         | long   | 本次网络请求耗时，单位毫秒                                                          |

---

### LLMResponse

| 字段

```
| 类型


   | 说明


                                                                                                                                                                                                                                                                                                                                                                                 |
```

| ------------------------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `requestId`              | string     | 请求唯一 ID，用于追踪和日志关联                                                                                                                                                                                                                                                                                                                                                          |
| `sessionId`              | string     | 所属会话 ID（如果有）                                                                                                                                                                                                                                                                                                                                                                    |
| `model`                  | string     | 实际使用的 LLM 模型名称（由 LLM 提供商返回）                                                                                                                                                                                                                                                                                                                                             |
| `llmConfigId`            | string     | 实际使用的 LLM 配置 ID                                                                                                                                                                                                                                                                                                                                                                   |
| `content`                | string     | LLM 回复的文本内容                                                                                                                                                                                                                                                                                                                                                                       |
| `toolCalls`              | ToolCall[] | LLM 发起的工具调用列表。非空时`finishReason`通常为`tool_calls`/`tool_use`，应用层应执行工具并将结果追加为`tool_result`消息                                                                                                                                                                                                                                               |
| `finishReason`           | string     | 结束原因，值取决于 LLM 提供商。OpenAI 系：`stop`（正常结束）/`tool_calls`（需要调用工具）/`length`（达到 max\_tokens 限制）/`content_filter`（内容过滤）。Anthropic 系：`end_turn`/`tool_use`/`max_tokens`/`stop_sequence`                                                                                                                               |
| `usage`                  | object     | 本次请求的 token 用量统计                                                                                                                                                                                                                                                                                                                                                                |
| `usage.promptTokens`     | int        | 输入 token 数（发送给 LLM 的完整上下文消耗的 token）                                                                                                                                                                                                                                                                                                                                     |
| `usage.completionTokens` | int        | 输出 token 数（LLM 生成的回复消耗的 token）                                                                                                                                                                                                                                                                                                                                              |
| `usage.totalTokens`      | int        | 总 token 数                                                                                                                                                                                                                                                                                                                                                                              |
| `latencyMs`              | long       | 本次 LLM 请求的端到端延迟（毫秒）                                                                                                                                                                                                                                                                                                                                                        |
| `metadata`               | object     | 额外元数据。chat/complete 响应中会包含模型选择字段：`llmConfigId`（实际使用的 LLM 配置 ID）、`requestedLlmConfigId`（原始目标 LLM 配置 ID）、`fallbackApplied`（是否从首选配置切换到备用配置）；当`fallbackApplied=true`时还包含`fallbackFromLlmConfigId`（原配置 ID）、`fallbackReason`（原配置调用失败原因）、`fallbackStatusCode`（原配置调用失败状态码） |

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

---

## 5. 错误码

| 错误码

```
| HTTP 状态码
```

| 说明

```
|
```

| ----------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BUS_UNAUTHENTICATED`         | 401         | 未认证或登录态失效，客户端应重新登录                                                                                                                   |
| `BUS_PERMISSION_DENIED`       | 403         | 已认证但无权执行此操作，客户端不应清除登录态                                                                                                           |
| `BUS_UNKNOWN_ACTION`          | 404         | 未知的 action，请求的接口/action 名称不存在                                                                                                            |
| `BUS_NOT_FOUND`               | 404         | 通用资源不存在                                                                                                                                         |
| `BUS_AGENT_NOT_FOUND`         | 404         | 指定的 Agent 不存在或已被删除                                                                                                                          |
| `BUS_SESSION_NOT_FOUND`       | 404         | 指定的会话不存在                                                                                                                                       |
| `BUS_CONFLICT`                | 409         | 资源状态冲突，例如重复创建、版本冲突、资源仍被引用、LLM provider/config 删除前仍有引用                                                                 |
| `BUS_QUEUE_FULL`              | 429         | DataBus 请求队列已满，服务端过载，请稍后重试                                                                                                           |
| `BUS_RATE_LIMITED`            | 429         | Agent Runtime 侧限流                                                                                                                                   |
| `BUS_TIMEOUT`                 | 504         | Agent Runtime 请求处理超时                                                                                                                             |
| `BUS_NODE_UNREACHABLE`        | 503         | 集群模式下目标节点不可达，请求无法路由                                                                                                                 |
| `BUS_HANDLER_ERROR`           | 500         | 处理器内部错误，详见 error.message                                                                                                                     |
| `BUS_LLM_PROVIDER_ERROR`      | 502         | 上游 LLM provider 返回 5xx、响应无法解析或没有有效 assistant 输出；provider 原始 HTTP 状态见`error.providerStatus`/`headers.llmProviderStatus` |
| `BUS_LLM_CONFIG_ERROR`        | 502         | LLM 配置、provider、鉴权密钥或模型选择不可用；provider 401/403/404 归入此类                                                                            |
| `BUS_LLM_QUOTA_EXCEEDED`      | 402         | LLM provider 账户余额、额度、账单或 token quota 不足                                                                                                   |
| `BUS_LLM_RATE_LIMITED`        | 429         | LLM provider 限流或返回 too many requests                                                                                                              |
| `BUS_LLM_PROVIDER_TIMEOUT`    | 504         | LLM provider 请求超时或 provider 返回 408/504                                                                                                          |
| `BUS_CONTEXT_LENGTH_EXCEEDED` | 413         | 上下文窗口或 token 限制超出，包含本地上下文预算失败和 provider context length 错误                                                                     |
| `BUS_STREAM_INTERRUPTED`      | 499         | 流式传输中断（SSE 连接断开或 LLM 流式响应异常终止）                                                                                                    |
| `BUS_INVALID_ARGUMENT`        | 400         | 请求参数不合法（缺少必填字段、类型错误、值超出范围等）                                                                                                 |
| `BUS_PAYLOAD_TOO_LARGE`       | 413         | 请求体或 payload 超限                                                                                                                                  |
| `REPLACE_REJECTED`            | 409         | workspace replace 请求被拒绝，详见`error.reason`和`error.message`                                                                              |
| `WORKSPACE_REJECTED`          | 400         | workspace 状态、文件或平台约束导致拒绝，详见`error.reason`和`error.message`                                                                    |
| `BUS_NOT_STARTED`             | 503         | DataBus 尚未完成初始化，服务暂不可用                                                                                                                   |

LLM provider 错误响应会尽量在 `error` 与 `headers` 中携带以下附加字段：

| 字段

```
| 说明


                                                                                                                                |
```

| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `providerStatus`/`llmProviderStatus` | provider 原始 HTTP 状态码                                                                                                               |
| `providerCode`                           | provider 原始错误码，若能从响应中解析出来                                                                                               |
| `retryable`                              | 字符串`"true"`或`"false"`；`BUS_LLM_RATE_LIMITED`、`BUS_LLM_PROVIDER_TIMEOUT`、`BUS_LLM_PROVIDER_ERROR`为可重试类别 |

Workspace 业务错误通过上述 DataBus 错误 envelope 返回，具体原因在 `error.reason` 和 `error.message` 中体现。常见标识如下：

| 标识

```
| 说明


                                       |
```

| ---------------------------- | ------------------------------------------------ |
| `missing_hash`         | replace 请求缺少 hash                          |
| `stale_file`           | replace 请求 hash 与当前文件 hash 不一致       |
| `invalid_replacements` | replacements 缺失、为空或格式非法              |
| `empty_old`            | replacement old 为空                           |
| `old_not_found`        | replacement old 不存在                         |
| `old_not_unique`       | `replaceAll=false`时 old 出现多次          |
| `invalid_text`         | 文件内容或 replacement 文本不是 UTF-8          |
| `file_not_found`       | workspace 文件不存在                           |
| `quota_exceeded`       | workspace 总大小、单文件大小或文件数量超过限制 |
| `target_invalid`       | 目标不是 workspace 内的普通文件                |

---

## 6. WebSocket 协议

### 连接

WebSocket 端点路径与 HTTP 相同（通过协议升级）：

`ws://<host>:<port>/agent-bus/v1 wss://<host>:<port>/agent-bus/v1 `

服务端按 `/agent-bus` 路径接入 Agent Bus WebSocket 协议。客户端推荐在握手时声明 `agent-bus` subprotocol；服务端仅在客户端声明该 subprotocol 时回显：

`Sec-WebSocket-Protocol: agent-bus Authorization: Bearer <token> `

Python `websockets` 示例：

`async with websockets.connect( "ws://localhost:8700/agent-bus/v1", additional_headers={"Authorization": f"Bearer {token}"}, subprotocols=["agent-bus"], ) as ws: await ws.send(json.dumps({ "type": "REQUEST", "requestId": "req_001", "action": "agent.accessible", })) `

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

`{ "type": "REQUEST", "requestId": "req_001", "action": "chat.completions", "agentId": "agent_xxx", "sessionId": "sess_001", "payload": { "message": "你好", "stream": true, "contextEvent": true } } `

**响应帧:**

`{ "type": "RESPONSE", "msgId": "...", "correlationId": "req_001", "action": "chat.completions", "agentId": "agent_xxx", "sessionId": "sess_001", "data": { ... } } `

**流式帧:**

`{"type": "EVENT", "msgId": "...", "correlationId": "req_001", "action": "context.compaction", "agentId": "agent_xxx", "sessionId": "sess_001", "data": {"phase": "start"}} {"type": "EVENT", "msgId": "...", "correlationId": "req_001", "action": "context.compaction", "agentId": "agent_xxx", "sessionId": "sess_001", "data": {"phase": "end", "generated": true}} {"type": "STREAM_START", "msgId": "...", "correlationId": "req_001", "action": "chat.completions", "agentId": "agent_xxx", "sessionId": "sess_001", "data": {"requestId": "req_001", "model": "<resolved-model>", "llmConfigId": "llm_actual", "requestedLlmConfigId": "llm_requested", "fallbackApplied": false}} {"type": "STREAM_REASONING", "msgId": "...", "correlationId": "req_001", "action": "chat.completions", "agentId": "agent_xxx", "sessionId": "sess_001", "data": {"reasoning": "..."}} {"type": "STREAM_CHUNK", "msgId": "...", "correlationId": "req_001", "action": "chat.completions", "agentId": "agent_xxx", "sessionId": "sess_001", "data": {"content": "..."}} {"type": "STREAM_END", "msgId": "...", "correlationId": "req_001", "action": "chat.completions", "agentId": "agent_xxx", "sessionId": "sess_001", "data": {"metadata": {"llmConfigId": "llm_actual", "requestedLlmConfigId": "llm_requested", "fallbackApplied": false}}} `

WebSocket 对话补全也支持 `contextEvent=true`，上下文压缩事件使用同一个 `correlationId` 返回；普通 HTTP JSON 响应会忽略该参数。

**错误帧:**

`{ "type": "ERROR", "msgId": "...", "correlationId": "req_001", "action": "chat.completions", "agentId": "agent_xxx", "sessionId": "sess_001", "error": { "code": "BUS_SESSION_NOT_FOUND", "message": "session not found" }, "headers": { "busErrorCode": "BUS_SESSION_NOT_FOUND", "httpStatus": "404" } } `

### HTTP → WebSocket 参数映射规则

WebSocket 没有 URL 路径和 HTTP 方法，所以 HTTP 接口里的"路径参数 / 查询串 / 请求体"必须统一折叠进 WebSocket 帧。规则只有两条：

1. `agentId`**​ 和 ​**`sessionId`​**​ 放到帧的顶层字段**​（因为它们是信封级字段，服务端有专门的解析路径）。
2. **其它所有参数都放进 ​**`payload`，键名与 HTTP 文档里描述的字段名一致：
   * HTTP 路径里的 `{userId}` / `{memoryId}` / `{llmConfigId}` / `{skillId}` / `{skillName}` / `{id}` → 在 `payload` 里用对应字段（`userId` / `memoryId` / `llmConfigId` / `skillId` / `skillName`，而 `{id}` 按接口语义转成 `agentId` / `sessionId` / `skillId` / `memoryId` / `llmConfigId` 之一）
   * HTTP 查询串里的 `?limit=100&offset=20` → 在 `payload` 里写 `"limit": 100, "offset": 20`
   * HTTP JSON 请求体字段 → 原样放进 `payload`

同一个字段不能在"顶层 + payload"里同时出现且取值不同，否则服务端会以 `agentId in payload conflicts with ...` 之类的错误拒绝。

**示例 1：多个路径参数**

HTTP：

`GET /agent-bus/v1/skill/user/{userId}/denied `

WebSocket：

`{ "type": "REQUEST", "requestId": "req_42", "action": "skill.user.denied", "payload": { "userId": "business_user_001" } } `

**示例 2：路径参数 + 查询串**

HTTP：

`GET /agent-bus/v1/session/list?agentId=agent_xxx&limit=50&offset=0 `

WebSocket：

`{ "type": "REQUEST", "requestId": "req_43", "action": "session.list", "agentId": "agent_xxx", "payload": { "limit": 50, "offset": 0 } } `

**示例 3：路径参数 + 请求体**

HTTP：

`PUT /agent-bus/v1/memory/personal/{memoryId} Body: { "importance": 0.8, "memoryKind": "preference" } `

WebSocket：

`{ "type": "REQUEST", "requestId": "req_44", "action": "memory.personal.update", "payload": { "memoryId": "mem_abc", "importance": 0.8, "memoryKind": "preference" } } `

### 支持的 Action

WebSocket 支持所有与 HTTP 相同的 action（无需 HTTP 方法区分），action 名称见各接口说明中的内部名称：

| Action

```
| 对应 HTTP 接口


                            |
```

| ------------------------------------- | ----------------------------------------------- |
| `agent.register`                | POST /agent/register                          |
| `agent.get`                     | GET /agent/{id}                               |
| `agent.update`                  | PUT /agent/{id}                               |
| `agent.activate`                | POST /agent/{id}/activate                     |
| `agent.suspend`                 | POST /agent/{id}/suspend                      |
| `agent.delete`                  | POST /agent/{id}/delete                       |
| `agent.list`                    | GET /agent/list                               |
| `agent.auth.grant`              | POST /agent/{id}/auth                         |
| `agent.auth.revoke`             | DELETE /agent/{id}/auth                       |
| `agent.auth.list`               | GET /agent/{id}/auth/list                     |
| `agent.accessible`              | GET /agent/accessible                         |
| `agent.llm.grant`               | POST /agent/{id}/llm/access                   |
| `agent.llm.revoke`              | DELETE /agent/{id}/llm/access                 |
| `agent.llm.list`                | GET /agent/{id}/llm/list                      |
| `agent.llm.selectable`          | GET /agent/{id}/llm/selectable                |
| `admin.access.grant`            | POST /admin/access                            |
| `admin.access.revoke`           | DELETE /admin/access                          |
| `admin.access.list`             | GET /admin/access                             |
| `user.llm.access.grant`         | POST /user/{id}/llm/access                    |
| `user.llm.access.revoke`        | DELETE /user/{id}/llm/access                  |
| `user.llm.access.list`          | GET /user/{id}/llm/access                     |
| `llm.provider.register`         | POST /llm/provider/register                   |
| `llm.provider.get`              | GET /llm/provider/{id}                        |
| `llm.provider.list`             | GET /llm/provider/list                        |
| `llm.provider.update`           | PUT /llm/provider/{id}                        |
| `llm.provider.delete`           | DELETE /llm/provider/{id}                     |
| `llm.config.register`           | POST /llm/config/register                     |
| `llm.config.get`                | GET /llm/config/{id}                          |
| `llm.config.list`               | GET /llm/config/list                          |
| `llm.config.update`             | PUT /llm/config/{id}                          |
| `llm.config.delete`             | DELETE /llm/config/{id}                       |
| `llm.complete`                  | POST /llm/complete                            |
| `llm.usage`                     | GET /llm/usage                                |
| `network.fetch`                 | POST /network/fetch                           |
| `builtin.init`                  | POST /builtin/init                            |
| `builtin.init.status`           | GET /builtin/init/status                      |
| `chat.completions`              | POST /chat/completions                        |
| `context.preview`               | POST /context/preview                         |
| `session.create`                | POST /session/create                          |
| `session.get`                   | GET /session/{id}                             |
| `session.update`                | PUT /session/{id}                             |
| `session.delete`                | DELETE /session/{id}                          |
| `session.list`                  | GET /session/list                             |
| `session.getMessages`           | GET /session/{id}/messages                    |
| `session.generateSummary`       | POST /session/{id}/summary                    |
| `workspace.list`                | GET /workspace/{sessionId}/files              |
| `workspace.read`                | GET /workspace/{sessionId}/file               |
| `workspace.write`               | POST /workspace/{sessionId}/file              |
| `workspace.delete`              | DELETE /workspace/{sessionId}/file            |
| `workspace.search`              | POST /workspace/{sessionId}/search            |
| `workspace.replace`             | POST /workspace/{sessionId}/replace           |
| `memory.personal.getSettings`       | GET /memory/personal/settings                 |
| `memory.personal.setEnabled`        | POST /memory/personal/settings                |
| `memory.personal.query`             | POST /memory/personal/query                   |
| `memory.personal.create`            | POST /memory/personal                         |
| `memory.personal.get`               | GET /memory/personal/{id}                     |
| `memory.personal.update`            | PUT /memory/personal/{id}                     |
| `memory.personal.delete`            | DELETE /memory/personal/{id}                  |
| `memory.personal.forgetSession`     | POST /memory/personal/forgetSession           |
| `memory.personal.pipeline.trigger`  | POST /memory/personal/pipeline/trigger        |
| `memory.public.get`                 | GET /memory/public                            |
| `admin.memory.public.update`        | PUT /admin/memory/public                      |
| `admin.memory.public.clear`         | DELETE /admin/memory/public                   |
| `admin.memory.stats`                | GET /admin/memory/stats                       |
| `admin.memory.config.get`       | GET /admin/memory/config                      |
| `admin.memory.config.update`    | PUT /admin/memory/config                      |
| `admin.memory.jobs.list`        | GET /admin/memory/jobs                        |
| `admin.memory.jobs.get`         | GET /admin/memory/jobs/{kind}/{jobKey}        |
| `admin.memory.jobs.retry`       | POST /admin/memory/jobs/{kind}/{jobKey}/retry |
| `admin.memory.pipeline.trigger` | POST /admin/memory/pipeline/trigger           |
| `admin.memory.reset`            | POST /admin/memory/reset                      |
| `skill.register`                | POST /skill/register                          |
| `skill.get`                     | GET /skill/{id}                               |
| `skill.getByName`               | GET /skill/byName/{name}                      |
| `skill.update`                  | PUT /skill/{id}                               |
| `skill.delete`                  | DELETE /skill/{id}                            |
| `skill.list`                    | GET /skill/list                               |
| `skill.getInstruction`          | GET /skill/{id}/instruction                   |
| `skill.files.list`              | GET /skill/{id}/files/list                    |
| `skill.files.get`               | GET /skill/{id}/files/get                     |
| `skill.files.search`            | POST /skill/{id}/files/search                 |
| `skill.files.batchGet`          | POST /skill/{id}/files/batchGet               |
| `skill.bind`                    | POST /skill/bind                              |
| `skill.unbind`                  | POST /skill/unbind                            |
| `skill.bindings`                | GET /skill/{agentId}/bindings                 |
| `skill.catalog`                 | GET /skill/{agentId}/catalog                  |
| `skill.user.deny`               | POST /skill/user/deny                         |
| `skill.user.allow`              | POST /skill/user/allow                        |
| `skill.user.denied`             | GET /skill/user/{userId}/denied               |

---

## 7. 附录：内置 Agent/Skill 发布包规范

### 目录结构

内置初始化只读取 DolphinDB 可执行文件同级目录下的 `agentBuiltins/`。服务端不接受客户端传入的 manifest 路径、Skill 根目录或任意本地路径。

`<dolphindb_exe_dir>/agentBuiltins/ manifest.json prompts/ data-assistant.md coding-assistant.md skills/ dolphindb-sql-guide.zip dolphindb-security-guide.zip data-analysis-playbook.zip coding-playbook.zip `

目录层级只表达文件类型，不表达绑定关系：

| 路径

```
| 说明


                         |
```

| --------------------- | ---------------------------------- |
| `manifest.json` | 内置 Agent、Skill 和绑定关系声明 |
| `prompts/`      | Agent system prompt 文件         |
| `skills/`       | Skill zip 包                     |

安全约束：

* `skills[].package` 和 `agents[].systemPromptFile` 必须是相对 `manifest.json` 所在目录的路径。
* 路径不得是绝对路径，不得包含 `..`，规范化后的真实路径必须仍落在 `agentBuiltins/` 目录内。
* Skill zip 包按 manifest 顺序逐个读取和处理，服务端不会一次性加载所有 zip。

### manifest.json 格式

manifest 使用 JSON。`schemaVersion` 表示 manifest 文件结构版本，用于服务端解析兼容性判断；当前支持 `1`。`manifestVersion` 表示本次发布包的业务版本，用于展示、状态记录和升级判断，本身不驱动数据库 schema 升级。

| 字段

```
| 类型


 | 必填
```

| 说明

```
|
```

| ----------------------- | ---------- | ------ | -------------------------------------------------- |
| `schemaVersion`   | int      | 是   | manifest schema 版本，当前仅支持`1`          |
| `manifestId`      | string   | 是   | 内置资源包稳定标识，同一套内置资源升级时保持不变 |
| `manifestVersion` | string   | 是   | 发布包版本，如`2026.05.13`                   |
| `skills`          | object[] | 是   | 内置 Skill 列表                                  |
| `agents`          | object[] | 是   | 内置 Agent 列表                                  |

`skills[]` 字段：

| 字段

```
| 类型
```

| 必填

| 说明

```
|
```

| --------------- | -------- | ------ | --------------------------------------------------------------------------------------------------- |
| `name`    | string | 是   | Skill 名称，必须与 zip 包内`SKILL.md`frontmatter 的`name`一致                             |
| `package` | string | 是   | Skill zip 相对路径                                                                                |
| `common`  | bool   | 否   | 是否注册为 common skill，默认 false。common skill 默认被所有 Agent 继承，包括后续新建的普通 Agent |

`agents[]` 字段：

| 字段

```
| 类型


 | 必填
```

| 说明

```
|
```

| ------------------------ | ---------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `agentId`          | string   | 是   | 系统真实 Agent ID，必须满足`agent_builtin_<uuid>`格式                                                                                                                                                                                                                                                                                                                                    |
| `agentName`        | string   | 是   | Agent 名称                                                                                                                                                                                                                                                                                                                                                                                   |
| `description`      | string   | 否   | Agent 描述                                                                                                                                                                                                                                                                                                                                                                                   |
| `status`           | string   | 否   | 初始状态：`REGISTERED`/`ACTIVE`，默认`REGISTERED`                                                                                                                                                                                                                                                                                                                                |
| `systemPromptFile` | string   | 是   | system prompt 相对路径                                                                                                                                                                                                                                                                                                                                                                       |
| `skills`           | string[] | 否   | 该 Agent 的显式 Skill 绑定，填写 Skill name；common skill 不需要在这里声明                                                                                                                                                                                                                                                                                                                   |
| `contextConfig`    | object   | 否   | Agent 上下文配置，结构同[contextConfig](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#contextconfig "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#contextconfig") |
| `memoryConfig`     | object   | 否   | Agent 记忆配置，结构同[memoryConfig](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#memoryconfig "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#memoryconfig")      |
| `config`           | object   | 否   | 自定义扩展配置                                                                                                                                                                                                                                                                                                                                                                               |
| `extra`            | string   | 否   | 预留扩展字段                                                                                                                                                                                                                                                                                                                                                                                 |

内置 Agent ID 固定格式：

`agent_builtin_[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12} `

校验规则：

* `manifestId`、`manifestVersion`、`agentName` 必须非空。
* 同一 manifest 内 `skills[].name` 不允许重复，`agents[].agentId` 不允许重复。
* `agents[].skills` 引用的 Skill name 必须存在于 `skills` 列表。
* 内置 Agent 不允许声明 `ownerUserId` 或 `llmConfigId`。
* 数据库中已存在且非内置初始化托管的固定 `agentId` 会被视为冲突。

### manifest.json 示例

`{ "schemaVersion": 1, "manifestId": "dolphindb-agent-builtins", "manifestVersion": "2026.05.13", "skills": [ { "name": "dolphindb-sql-guide", "package": "skills/dolphindb-sql-guide.zip", "common": true }, { "name": "data-analysis-playbook", "package": "skills/data-analysis-playbook.zip", "common": false } ], "agents": [ { "agentId": "agent_builtin_550e8400-e29b-41d4-a716-446655440000", "agentName": "Data Q&A Assistant", "description": "Built-in data analysis assistant", "status": "ACTIVE", "systemPromptFile": "prompts/data-assistant.md", "skills": [ "data-analysis-playbook" ], "contextConfig": { "includeSkillCatalog": true, "includeMemory": false }, "memoryConfig": { "allowPersonalMemory": true }, "config": { "builtin": true, "builtinVersion": "2026.05.13" } } ] } `

---

## 8. 附录：技能包规范

技能定义格式遵循 [Agent Skills 开放标准](https://agentskills.io/ "https://agentskills.io/")。Skill 是纯指令型资产——一份由 LLM 阅读并遵循的 Markdown 指引。Tool（function calling）的定义、注册与执行由应用层负责，对框架透明。

### 技能包结构

技能包为 ZIP 文件（解压后最大 30 MB），必须包含 `SKILL.md` 入口文件（位于根目录或唯一子目录下）：

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

| --------------------- | -------- | ------ | ------------------------------------------------------------------------------------ |
| `name`          | string | 是   | 技能标识符，全局唯一。格式：`^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`，≤64 字符       |
| `description`   | string | 是   | 技能描述，说明做什么、何时用（≤1024 字符）。注入技能目录供 LLM 判断是否需要该技能 |
| `version`       | string | 否   | 语义化版本号（如`1.0.0`）                                                      |
| `license`       | string | 否   | 许可证信息                                                                         |
| `compatibility` | string | 否   | 环境要求（≤500 字符）                                                             |
| `metadata`      | map    | 否   | 自定义键值对                                                                       |

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

| -------------------------------- | -------- | -------- | ---------------------------------------------------------------------------------- |
| `argument-hint`            | string | —     | 参数提示（如`[query] [limit]`），在技能目录中展示                            |
| `disable-model-invocation` | bool   | false  | 为`true`时 LLM 不可自动发现该技能（不进入技能目录），但用户/应用仍可显式触发 |
| `user-invocable`           | bool   | true   | 为`true`时用户可通过命令直接调用该技能                                       |
| `category`                 | string | —     | 技能分类标签                                                                     |
| `displayName`              | string | —     | 可读名称（用于 UI 展示）                                                         |

​**其余 frontmatter 字段**​（如 `model`、`effort`、`allowed-tools` 等）统一收入 `metadata` JSON，框架不为其建独立列。

### 渐进式加载模型（Progressive Disclosure）

| 加载阶段

```
| 加载时机


                                                                   | 内容


                                         | Token 开销


   |
```

| -------------- | -------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------ |
| 技能目录     | 默认注入上下文                                                                 | `name`+`description`+`argument-hint` | \~50-100 / skill |
| 技能详细指令 | 应用层显式加载时（例如通过`activeSkillNames`或自定义 tool / 逻辑）         | SKILL.md 的完整 Markdown body                    | 建议 < 5000      |
| 技能文件     | 应用层按需提取时（通过`skill.files.get`/`skill.files.batchGet`等原语） | 包内的脚本、模板、参考文档等                     | 不限             |

### 调用控制矩阵

| `disable-model-invocation`

| `user-invocable`

| LLM 可自动发现

| 用户可调用

| 描述注入技能目录

|
| -------------------------------- | ---------------------- | ---------------- | ------------ | ------------------ |

| `disable-model-invocation`

| `user-invocable`

| LLM 可自动发现

| 用户可调用

| 描述注入技能目录

|
| -------------------------------- | ---------------------- | ---------------- | ------------ | ------------------ |
| false                          | true                 | 是             | 是         | 是               |
| false                          | false                | 是             | 否         | 是               |
| true                           | true                 | 否             | 是         | 否               |
| true                           | false                | 否             | 否         | 否               |

可以注：以上设置来自 Skill 自身配置；绑定关系不提供 agent 级描述或配置覆盖。

### 注册时的解析流程

1. 校验 ZIP 格式合法性
2. 在 ZIP 中定位 `SKILL.md`（根目录或唯一子目录）
3. 分离 YAML frontmatter 和 Markdown body
4. frontmatter → 对应表列（已建列字段直接映射，未建列字段收入 `metadata`）
5. 包内每个具体文件 → `agent_skill_file.contentBase64`
6. 校验 `name` 格式和唯一性（启用状态下不可重名）
7. 合并 API 传入的 `overrides`（覆盖 frontmatter 同名字段）
8. 写入存储，返回 [SkillInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#skillinfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#skillinfo")
