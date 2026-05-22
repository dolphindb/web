# DolphinDB Agent Runtime API Reference

![](https://dolphindb1.atlassian.net/wiki/aa-avatar/712020:3118b1f8-1171-4d34-ab7d-02d9ffc4b74b)

作者：qiwei zhu

收听

56

添加反应

注意：所有接口尚处于试用、联调过程中，可能随着用户的反馈会有变动。

最好定期下载新版本，下载方式是ftp：

* [<u>ftpuser@192.168.1.204</u>](mailto:ftpuser@192.168.1.204 "mailto:ftpuser@192.168.1.204"):/hdd/ftp/origin/release300.agentRuntime/Release/ALL/release2/cmake\_release\_all/    密码DolphinDB123

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
  * [参数来源与兼容写法](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E5%8F%82%E6%95%B0%E6%9D%A5%E6%BA%90%E4%B8%8E%E5%85%BC%E5%AE%B9%E5%86%99%E6%B3%95)
  * [流式响应 (SSE)](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E6%B5%81%E5%BC%8F%E5%93%8D%E5%BA%94-(SSE))
* [面向 Agent 开发者的 API](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#2.-%E9%9D%A2%E5%90%91-Agent-%E5%BC%80%E5%8F%91%E8%80%85%E7%9A%84-API)
  * [2.1 Agent 发现与可用配置](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#2.1-Agent-%E5%8F%91%E7%8E%B0%E4%B8%8E%E5%8F%AF%E7%94%A8%E9%85%8D%E7%BD%AE)
    * [列出当前用户可访问的 Agent](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E5%88%97%E5%87%BA%E5%BD%93%E5%89%8D%E7%94%A8%E6%88%B7%E5%8F%AF%E8%AE%BF%E9%97%AE%E7%9A%84-Agent)
    * [获取 Agent](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E8%8E%B7%E5%8F%96-Agent)
    * [列出当前用户在指定 Agent 下可显式选择的 LLM](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E5%88%97%E5%87%BA%E5%BD%93%E5%89%8D%E7%94%A8%E6%88%B7%E5%9C%A8%E6%8C%87%E5%AE%9A-Agent-%E4%B8%8B%E5%8F%AF%E6%98%BE%E5%BC%8F%E9%80%89%E6%8B%A9%E7%9A%84-LLM)
  * [2.2 会话管理](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#2.2-%E4%BC%9A%E8%AF%9D%E7%AE%A1%E7%90%86)
    * [创建会话](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E5%88%9B%E5%BB%BA%E4%BC%9A%E8%AF%9D)
    * [获取会话](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E8%8E%B7%E5%8F%96%E4%BC%9A%E8%AF%9D)
    * [更新会话](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E6%9B%B4%E6%96%B0%E4%BC%9A%E8%AF%9D)
    * [归档会话](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E5%BD%92%E6%A1%A3%E4%BC%9A%E8%AF%9D)
    * [删除会话](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E5%88%A0%E9%99%A4%E4%BC%9A%E8%AF%9D)
    * [列出会话](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E5%88%97%E5%87%BA%E4%BC%9A%E8%AF%9D)
  * [2.3 Chat Completions](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#2.3-Chat-Completions)
    * [自动组装模式 (Auto-Assembly)](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E8%87%AA%E5%8A%A8%E7%BB%84%E8%A3%85%E6%A8%A1%E5%BC%8F-(Auto-Assembly))
    * [手动组装模式 (Manual-Assembly)](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E6%89%8B%E5%8A%A8%E7%BB%84%E8%A3%85%E6%A8%A1%E5%BC%8F-(Manual-Assembly))
    * [非流式响应](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E9%9D%9E%E6%B5%81%E5%BC%8F%E5%93%8D%E5%BA%94)
    * [流式响应 (SSE)](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E6%B5%81%E5%BC%8F%E5%93%8D%E5%BA%94-(SSE).1)
  * [2.4 技能运行时能力](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#2.4-%E6%8A%80%E8%83%BD%E8%BF%90%E8%A1%8C%E6%97%B6%E8%83%BD%E5%8A%9B)
    * [获取 Agent 的技能目录 (Tier-1)](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E8%8E%B7%E5%8F%96-Agent-%E7%9A%84%E6%8A%80%E8%83%BD%E7%9B%AE%E5%BD%95-(Tier-1))
    * [组装技能上下文（只读原语）](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E7%BB%84%E8%A3%85%E6%8A%80%E8%83%BD%E4%B8%8A%E4%B8%8B%E6%96%87%EF%BC%88%E5%8F%AA%E8%AF%BB%E5%8E%9F%E8%AF%AD%EF%BC%89)
    * [获取技能指令](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E8%8E%B7%E5%8F%96%E6%8A%80%E8%83%BD%E6%8C%87%E4%BB%A4)
    * [列出技能包文件](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E5%88%97%E5%87%BA%E6%8A%80%E8%83%BD%E5%8C%85%E6%96%87%E4%BB%B6)
    * [获取技能包单个文件](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E8%8E%B7%E5%8F%96%E6%8A%80%E8%83%BD%E5%8C%85%E5%8D%95%E4%B8%AA%E6%96%87%E4%BB%B6)
    * [检索技能包文本文件](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E6%A3%80%E7%B4%A2%E6%8A%80%E8%83%BD%E5%8C%85%E6%96%87%E6%9C%AC%E6%96%87%E4%BB%B6)
    * [批量获取技能包文件](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E6%89%B9%E9%87%8F%E8%8E%B7%E5%8F%96%E6%8A%80%E8%83%BD%E5%8C%85%E6%96%87%E4%BB%B6)
  * [2.5 Workspace 运行时能力](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#2.5-Workspace-%E8%BF%90%E8%A1%8C%E6%97%B6%E8%83%BD%E5%8A%9B)
    * [列出 Workspace 文件](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E5%88%97%E5%87%BA-Workspace-%E6%96%87%E4%BB%B6)
    * [读取 Workspace 文件](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E8%AF%BB%E5%8F%96-Workspace-%E6%96%87%E4%BB%B6)
    * [写入 Workspace 文件](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E5%86%99%E5%85%A5-Workspace-%E6%96%87%E4%BB%B6)
    * [删除 Workspace 文件](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E5%88%A0%E9%99%A4-Workspace-%E6%96%87%E4%BB%B6)
    * [搜索 Workspace 文件](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E6%90%9C%E7%B4%A2-Workspace-%E6%96%87%E4%BB%B6)
    * [局部修改 Workspace 文件](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E5%B1%80%E9%83%A8%E4%BF%AE%E6%94%B9-Workspace-%E6%96%87%E4%BB%B6)
  * [2.6 记忆运行时能力](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#2.6-%E8%AE%B0%E5%BF%86%E8%BF%90%E8%A1%8C%E6%97%B6%E8%83%BD%E5%8A%9B)
    * [运行时并发调度](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E8%BF%90%E8%A1%8C%E6%97%B6%E5%B9%B6%E5%8F%91%E8%B0%83%E5%BA%A6)
    * [存储记忆](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E5%AD%98%E5%82%A8%E8%AE%B0%E5%BF%86)
    * [获取记忆](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E8%8E%B7%E5%8F%96%E8%AE%B0%E5%BF%86)
    * [更新记忆](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E6%9B%B4%E6%96%B0%E8%AE%B0%E5%BF%86)
    * [删除记忆](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E5%88%A0%E9%99%A4%E8%AE%B0%E5%BF%86)
    * [搜索记忆](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E6%90%9C%E7%B4%A2%E8%AE%B0%E5%BF%86)
  * [2.7 网络访问能力](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#2.7-%E7%BD%91%E7%BB%9C%E8%AE%BF%E9%97%AE%E8%83%BD%E5%8A%9B)
    * [发起外部网络请求](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E5%8F%91%E8%B5%B7%E5%A4%96%E9%83%A8%E7%BD%91%E7%BB%9C%E8%AF%B7%E6%B1%82)
  * [2.8 会话摘要](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#2.8-%E4%BC%9A%E8%AF%9D%E6%91%98%E8%A6%81)
    * [生成摘要](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E7%94%9F%E6%88%90%E6%91%98%E8%A6%81)
  * [2.9 调试接口](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#2.9-%E8%B0%83%E8%AF%95%E6%8E%A5%E5%8F%A3)
    * [Context Preview (上下文预览)](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#Context-Preview-(%E4%B8%8A%E4%B8%8B%E6%96%87%E9%A2%84%E8%A7%88))
  * [2.10 底层接口](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#2.10-%E5%BA%95%E5%B1%82%E6%8E%A5%E5%8F%A3)
    * [AIScript（受限 DolphinDB 脚本执行）](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#AIScript%EF%BC%88%E5%8F%97%E9%99%90-DolphinDB-%E8%84%9A%E6%9C%AC%E6%89%A7%E8%A1%8C%EF%BC%89)
    * [LLM Complete (直接调用 LLM)](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#LLM-Complete-(%E7%9B%B4%E6%8E%A5%E8%B0%83%E7%94%A8-LLM))
    * [追加消息](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E8%BF%BD%E5%8A%A0%E6%B6%88%E6%81%AF)
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
    * [按分类列出记忆](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E6%8C%89%E5%88%86%E7%B1%BB%E5%88%97%E5%87%BA%E8%AE%B0%E5%BF%86)
    * [记忆统计](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E8%AE%B0%E5%BF%86%E7%BB%9F%E8%AE%A1)
    * [重建记忆 Embedding](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E9%87%8D%E5%BB%BA%E8%AE%B0%E5%BF%86-Embedding)
    * [查询记忆 Embedding 重建状态](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E6%9F%A5%E8%AF%A2%E8%AE%B0%E5%BF%86-Embedding-%E9%87%8D%E5%BB%BA%E7%8A%B6%E6%80%81)
    * [取消记忆 Embedding 重建](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#%E5%8F%96%E6%B6%88%E8%AE%B0%E5%BF%86-Embedding-%E9%87%8D%E5%BB%BA)
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
  * [MemoryRebuildStatus](https://dolphindb1.atlassian.net/wiki/spaces/~7120203118b1f811714d34ab7d02d9ffc4b74b/pages/2584772659/DolphinDB+Agent+Runtime+API+Reference#MemoryRebuildStatus)
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

### 参数来源与兼容写法

* 文档中按 HTTP 常用写法区分“路径参数 / 查询参数 / 请求体”。框架实现中，部分读接口也允许把查询参数放在 JSON request body 中；当同一 ID 同时出现在 path/header/query/body 中时，取值必须一致，否则请求会被拒绝。
* `agentId` 可通过路径、`x-agent-id` header、query 或 body 提供，具体以各接口说明为准；`sessionId` 可通过路径、`x-session-id` header、query 或 body 提供。
* 布尔参数支持 JSON bool，也兼容 `true/false`、`1/0`、`yes/no` 字符串。
* 面向当前登录用户的只读接口不接受旧的 `userId` 过滤字段；需要跨用户只读过滤时使用 `targetUserId`，且仅 `AGENT_ADMIN` 可查看他人数据。

### 流式响应 (SSE)

当 `stream=true` 时，HTTP 响应使用 Server-Sent Events 格式：

`Content-Type: text/event-stream; charset=UTF-8 event: stream_start data: {"type":"STREAM_START","msgId":"...","correlationId":"...","action":"chat.completions","agentId":"agent_xxx","sessionId":"sess_001","data":{...}} event: chunk data: {"type":"STREAM_CHUNK","msgId":"...","correlationId":"...","action":"chat.completions","agentId":"agent_xxx","sessionId":"sess_001","data":{"content":"..."}} event: chunk data: {"type":"STREAM_CHUNK","msgId":"...","correlationId":"...","action":"chat.completions","agentId":"agent_xxx","sessionId":"sess_001","data":{"content":"..."}} event: stream_end data: {"type":"STREAM_END","msgId":"...","correlationId":"...","action":"chat.completions","agentId":"agent_xxx","sessionId":"sess_001","data":{...}} `

SSE 响应体统一使用 UTF-8 编码。客户端应按字节读取并显式按 UTF-8 解码后，再做事件分帧和 JSON 解析。

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

| -------------- | ------ | -------- | ------------------------------------------------------------------------------------------------- |
| `status` | int  | -1     | 状态过滤。实现只返回可调用的 ACTIVE agent；不传或传`1`返回 ACTIVE，传其他非负状态返回空列表 |
| `offset` | int  | 0      |                                                                                                 |
| `limit`  | int  | 100    |                                                                                                 |

**响应:**

`{ "items": [ { "...": "AgentInfo", "myPermission": "AGENT_INVOKE" } ], "offset": 0, "limit": 100, "size": 5 } `

---

#### 获取 Agent

`GET /agent-bus/v1/agent/{agentId} `

**响应:** [AgentInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#agentinfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#agentinfo")

---

#### 列出当前用户在指定 Agent 下可显式选择的 LLM

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
| `metadata`    | object | 否   | 自定义元数据，JSON 格式，原样存储                               |

**响应:** [SessionInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#sessioninfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#sessioninfo")

说明：请求体不接受 `userId`；会话 owner 固定为当前登录用户。

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

* 至少提供一个可更新字段。
* 只有 session owner 可更新；已删除会话不可更新。

**响应:** [SessionInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#sessioninfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#sessioninfo")

---

#### 归档会话

`POST /agent-bus/v1/session/{sessionId}/archive `

归档后的会话不可追加消息。

**响应:** [SessionInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#sessioninfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#sessioninfo")

---

#### 删除会话

`POST /agent-bus/v1/session/{sessionId}/delete `

**响应:** [SessionInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#sessioninfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#sessioninfo")（状态变为 DELETED）

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

| -------------------- | -------- | -------------- | ----------------------------------------------------- |
| `agentId`      | string | x-agent-id   | 按 Agent 过滤                                       |
| `targetUserId` | string | 当前登录用户 | 只读过滤目标用户。仅`AGENT_ADMIN`可查看他人数据 |
| `status`       | int    | -1（全部）   | 0=ACTIVE, 1=ARCHIVED, 2=DELETED                     |
| `offset`       | int    | 0            |                                                     |
| `limit`        | int    | 100          |                                                     |

**响应:** `{ items: [SessionInfo, ...], offset, limit, size }`

---

### 2.3 Chat Completions

WebSocket 调用方式见 [6. WebSocket 协议](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#6-websocket-%E5%8D%8F%E8%AE%AE "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#6-websocket-%E5%8D%8F%E8%AE%AE")。

这是 Agent 应用的核心接口，集成了上下文组装、LLM 调用、消息持久化的完整流程。

`POST /agent-bus/v1/chat/completions `

自动组装与手动组装共用同一个 endpoint，通过请求体中是否包含 `assemblyConfig` 字段切换：不带 `assemblyConfig` 走自动组装，带则走手动组装。

#### 自动组装模式 (Auto-Assembly)

**请求体:**

| 字段

```
| 类型


          | 必填


 | 说明


                                                                                                                                 |
```

| -------------------------------------------------------------- | ------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `sessionId`                                              | string            | 是       | 会话 ID，必须为 ACTIVE 状态                                                                                                              |
| `message`                                                | string            | 条件必填 | 用户消息文本，会被自动追加到会话历史中。`message`和`toolResults`至少提供一个                                                     |
| `toolResults`                                            | ToolResult[]      | 条件必填 | 工具执行结果列表，与`message`至少提供一个。框架自动追加为`role=tool`消息后调用 LLM 续传                                          |
| `stream`                                                 | bool              | 否       | 是否流式返回（默认 true）。true 时返回 SSE 流，false 时返回完整 JSON                                                                     |
| `contextEvent`                                           | bool              | 否       | 是否在本次对话补全响应中返回上下文处理事件（默认 false）。仅 HTTP SSE 和 WebSocket 支持；普通 HTTP JSON 响应会忽略该参数                 |
| `includeReasoning`                                       | bool              | 否       | 是否返回 provider 给出的可展示思考过程（默认 false）。该内容只用于本次展示，不必持久化存储                                               |
| `tools`                                                  | ToolDefinition[]  | 否       | 应用层工具定义列表（OpenAI function calling 格式），注入到 LLM 请求中                                                                    |
| `activeSkillNames`                                       | string[]          | 否       | 调用方显式要求本次附加的技能名称列表；若提供，框架会加载这些技能的 Tier-2 指令注入本次上下文，但不维护激活状态                           |
| `llmConfigId`                                            | string            | 否       | 指定本次请求使用的 LLM 配置 ID，临时覆盖 session/agent 默认配置(会进行权限校验，因此要确保填写的llmConfigId是当前agent/user有权限使用的) |
| `model`                                                  | string            | 否       | 临时覆盖 LLM 配置中的模型名称                                                                                                            |
| `temperature`                                            | double            | 否       | 临时覆盖采样温度                                                                                                                         |
| `maxTokens`/`max_tokens`/`max_completion_tokens` | int               | 否       | 临时覆盖本次输出 token 上限；这三个字段等价                                                                                              |
| `topP`/`top_p`                                       | double            | 否       | 临时覆盖 nucleus sampling 参数                                                                                                           |
| `stop`                                                   | string / string[] | 否       | 临时覆盖停止序列                                                                                                                         |
| `extensions`                                             | object            | 否       | Provider 透传参数。除保留字段外，其他未知顶层字段也会作为 provider extension 合入请求                                                    |

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

框架自动执行：

1. 解析当前轮输入（`toolResults` / `message`）
2. 解析当前 session 可用的 LLM 配置
3. 加载 Agent 配置 + 系统提示词
4. 组装技能目录 (Tier-1)，并在调用方显式传入 `activeSkillNames` 时附加 Tier-2 指令
5. 检索相关记忆
6. 按 `summary-first` 组装候选上下文：`latest summary + raw tail + current turn`
7. 若候选 prompt 预计达到 `triggerRatio` 阈值或超出上下文窗口，则先同步执行自动摘要并重新组装上下文
8. 通过硬性上下文窗口检查后，再将当前轮输入追加到会话
9. 调用 LLM
10. 追加助手回复到会话（含 token 统计）

说明：

* `toolResults` 只传工具结果、不传 `message` 是合法用法，适用于 tool calling 的续传轮次
* 当 `message` 和 `toolResults` 同时存在时，框架会按 `toolResults -> message` 的顺序作为当前轮输入参与装配，并在窗口检查通过后按同顺序落库
* 自动装配中的记忆检索仅使用当前 `message` 作为查询文本；如果本轮只有 `toolResults`，则不会额外执行记忆查询
* `activeSkillNames` 仅表示本次请求显式附加的 Tier-2；是否在 agent loop 中续传或变更由应用层决定
* 框架不会基于 Tier-1 catalog 自动推断、激活或恢复 Skill
* 自动摘要始终排除当前这次 pending turn；当前输入不会同时出现在新 summary 和 current turn 中

**典型 Tool Calling 流程：**

`1. POST /chat/completions { "message": "计算 1+1", "tools": [...] } → 返回 { "toolCalls": [{"id": "call_1", "function": {"name": "calc", "arguments": "..."}}] } 2. POST /chat/completions { "toolResults": [{"toolCallId": "call_1", "content": "2"}], "tools": [...] } → 框架自动追加 tool_result 到会话，组装上下文，调用 LLM → 返回 { "content": "1+1 的结果是 2" } `

#### 手动组装模式 (Manual-Assembly)

**请求体:**

| 字段

```
| 类型


          | 必填


 | 说明


                                                                                                                 |
```

| -------------------------------------------------------------- | ------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------- |
| `sessionId`                                              | string            | 是       | 会话 ID，必须为 ACTIVE 状态                                                                                              |
| `message`                                                | string            | 条件必填 | 用户消息文本，与`toolResults`至少提供一个                                                                            |
| `toolResults`                                            | ToolResult[]      | 条件必填 | 工具执行结果列表，与`message`至少提供一个                                                                            |
| `stream`                                                 | bool              | 否       | 是否流式返回（默认 true）                                                                                                |
| `contextEvent`                                           | bool              | 否       | 是否在本次对话补全响应中返回上下文处理事件（默认 false）。仅 HTTP SSE 和 WebSocket 支持；普通 HTTP JSON 响应会忽略该参数 |
| `includeReasoning`                                       | bool              | 否       | 是否返回 provider 给出的可展示思考过程（默认 false）。该内容只用于本次展示，不必持久化存储                               |
| `llmConfigId`                                            | string            | 否       | 指定本次请求使用的 LLM 配置 ID                                                                                           |
| `model`                                                  | string            | 否       | 临时覆盖 LLM 配置中的模型名称                                                                                            |
| `temperature`                                            | double            | 否       | 临时覆盖采样温度                                                                                                         |
| `maxTokens`/`max_tokens`/`max_completion_tokens` | int               | 否       | 临时覆盖本次输出 token 上限；这三个字段等价                                                                              |
| `topP`/`top_p`                                       | double            | 否       | 临时覆盖 nucleus sampling 参数                                                                                           |
| `stop`                                                   | string / string[] | 否       | 临时覆盖停止序列                                                                                                         |
| `extensions`                                             | object            | 否       | Provider 透传参数。除保留字段外，其他未知顶层字段也会作为 provider extension 合入请求                                    |
| `assemblyConfig`                                         | object            | 是       | 手动组装配置，由应用层控制上下文构成                                                                                     |

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

`contextBlocks` 均为 system-level 上下文。`before_history` 与 `before_current_turn` 的 block 会各自作为独立 `role=system` 消息注入；`after_system` 的 block 不会生成独立消息，而是按数组顺序追加到前一条 system prompt 消息内容末尾。若本次组装没有 system prompt，`after_system` 会退化为首条 `role=system` 消息。

**手动组装消息顺序：**

1. system prompt（`assemblyConfig.systemPrompt` 或 agent 默认）；`after_system` 位置的 contextBlocks 会合并到这条消息末尾
2. 技能目录 Tier-1（若未通过 `noSkillCatalog` 关闭）
3. 技能指令 Tier-2（来自 `activeSkillNames`）
4. 记忆检索结果
5. `before_history` 位置的 contextBlocks（独立 `role=system` 消息）
6. 历史部分（`latest summary + raw tail`）
7. `before_current_turn` 位置的 contextBlocks（独立 `role=system` 消息）
8. 本轮输入（`message` / `toolResults`）

说明：

* contextBlocks 的 token 在预算分配早期被预扣，不会被裁剪；过长会挤压历史和记忆预算
* `after_system` 用于全局规则，`before_history` 用于本轮参考资料，`before_current_turn` 用于必须被 LLM 立即看到的单轮约束或动态快照

#### 非流式响应

当 `stream=false` 时，`data` 内部结构为：

`reasoning` 表示 provider 返回的可展示思考过程，不保证完整、真实或等价于模型内部 CoT；框架只在 `includeReasoning=true` 时提取并返回，不必持久化存储。

`{ "requestId": "req_xxx", "sessionId": "sess_001", "model": "gpt-4", "llmConfigId": "llm_xxx", "content": "这是 LLM 的回复...", "reasoning": "provider 返回的可展示思考过程；未开启或 provider 未返回时为空", "toolCalls": [ { "id": "call_xxx", "type": "function", "function": { "name": "search_database", "arguments": "{\"query\":\"SELECT ...\"}" } } ], "finishReason": "stop", "usage": { "promptTokens": 1200, "completionTokens": 300, "totalTokens": 1500 }, "latencyMs": 2500, "metadata": {} } `

#### 流式响应 (SSE)

当 `stream=true`（默认）时，返回 SSE 流：

`event: event data: {"type":"EVENT","msgId":"...","correlationId":"req_xxx","action":"context.compaction","agentId":"agent_xxx","sessionId":"sess_001","data":{"phase":"start"}} event: event data: {"type":"EVENT","msgId":"...","correlationId":"req_xxx","action":"context.compaction","agentId":"agent_xxx","sessionId":"sess_001","data":{"phase":"end","generated":true}} event: stream_start data: {"type":"STREAM_START","msgId":"...","correlationId":"req_xxx","action":"chat.completions","agentId":"agent_xxx","sessionId":"sess_001","data":{"requestId":"req_xxx","model":"<resolved-model>","llmConfigId":"llm_xxx"}} event: chunk data: {"type":"STREAM_CHUNK","msgId":"...","correlationId":"req_xxx","action":"chat.completions","agentId":"agent_xxx","sessionId":"sess_001","data":{"content":"这是"}} event: reasoning_delta data: {"type":"STREAM_REASONING","msgId":"...","correlationId":"req_xxx","action":"chat.completions","agentId":"agent_xxx","sessionId":"sess_001","data":{"reasoning":"可展示思考过程增量"}} event: chunk data: {"type":"STREAM_CHUNK","msgId":"...","correlationId":"req_xxx","action":"chat.completions","agentId":"agent_xxx","sessionId":"sess_001","data":{"content":"LLM"}} event: chunk data: {"type":"STREAM_CHUNK","msgId":"...","correlationId":"req_xxx","action":"chat.completions","agentId":"agent_xxx","sessionId":"sess_001","data":{"content":"的回复"}} event: stream_end data: {"type":"STREAM_END","msgId":"...","correlationId":"req_xxx","action":"chat.completions","agentId":"agent_xxx","sessionId":"sess_001","data":{...}} `

说明：

* `context.compaction` 事件只会在请求体中设置 `contextEvent=true` 且本次请求实际触发上下文压缩时返回。
* `data.phase` 可能为 `start` / `end` / `failed`；`end` 阶段会额外返回 `generated` 表示是否实际生成了摘要。
* 该事件可能出现在 `stream_start` 之前；客户端应忽略不认识的 `EVENT.action`。
* 普通 HTTP JSON 响应不支持中途事件，即使设置 `contextEvent=true` 也会被忽略，不会报错。

---

### 2.4 技能运行时能力

#### 获取 Agent 的技能目录 (Tier-1)

`GET /agent-bus/v1/skill/{agentId}/catalog `

返回该 agent 的有效 skill 视图中 `available=true`、当前调用用户可见、可由 LLM 自动调用的技能目录。用于向 LLM 注入 Tier-1 技能概要。

**响应:**

`{ "agentId": "agent_xxx", "userId": "alice", "catalog": [ { "name": "search-database", "description": "Search distributed tables", "argumentHint": "SELECT fields FROM table WHERE condition" }, ... ], "size": 3 } `

---

#### 组装技能上下文（只读原语）

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

#### 获取技能指令

`GET /agent-bus/v1/skill/{skillId}/instruction `

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

| --------------- | -------- | ------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `agentId` | string | 是   | 用于校验当前用户对该 agent 下该 skill 的使用权限。HTTP 也可通过`x-agent-id`header 传递；WebSocket 使用顶层`agentId` |

**响应:**

`{ "skillId": "skill_xxx", "name": "search-database", "description": "Search distributed tables", "instruction": "## Usage Guide\n\nYou can use this skill to..." } `

说明：

* 该接口是 Tier-2 指令体的只读原语。
* 该接口用于应用层渐进式加载 skill，服务端会校验当前用户对 `agentId` 下 `skillId` 的使用权限。
* 是否读取、何时注入、如何在 tool loop 中续传，由应用层决定。

---

#### 列出技能包文件

`GET /agent-bus/v1/skill/{skillId}/files/list `

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

| --------------- | -------- | ------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `agentId` | string | 是   | 用于校验当前用户对该 agent 下该 skill 的使用权限。HTTP 也可通过`x-agent-id`header 传递；WebSocket 使用顶层`agentId` |

**响应:**

`{ "skillId": "skill_xxx", "items": [ { "skillId": "skill_xxx", "contentRevision": 1, "filePath": "SKILL.md", "size": 2048, "isText": true, "lineCount": 80 }, { "skillId": "skill_xxx", "contentRevision": 1, "filePath": "assets/logo.png", "size": 1024, "isText": false, "lineCount": 0 } ], "size": 2 } `

说明：

* 路径以 skill 包目录作为根目录，末尾为文件名。
* 该接口只返回文件元信息，不返回文件内容。
* 该接口用于应用层渐进式加载 skill 文件，服务端会校验当前用户对 `agentId` 下 `skillId` 的使用权限。

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

| ----------------- | -------- | ------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `agentId`   | string | 是   | 用于校验当前用户对该 agent 下该 skill 的使用权限。HTTP 也可通过`x-agent-id`header 传递；WebSocket 使用顶层`agentId` |
| `filePath`  | string | 是   | 相对 skill 包根目录的文件路径                                                                                               |
| `lineStart` | int    | 否   | 文本文件 1-based 起始行；默认`0`表示读取完整文本，小文件可直接返回                                                      |
| `lineLimit` | int    | 否   | 读取行数；默认`120`，最大`300`                                                                                      |
| `raw`       | bool   | 否   | `true`时返回原始 base64 内容；非文本文件需要显式使用该参数                                                              |

**响应:**

`{ "skillId": "skill_xxx", "filePath": "data/schema.json", "isText": true, "lineCount": 42, "raw": false, "contentOmitted": false, "truncated": false, "lineStart": 1, "lineEnd": 42, "encoding": "base64", "content": "<base64 内容>", "size": 1024 } `

说明：

* 文本文件指定 `lineStart`/`lineLimit` 时只返回对应行范围。
* 非文本文件默认不返回 `content`，只返回元信息和 `contentOmitted=true`；需要原始内容时传 `raw=true`。
* 超大文本文件未指定行范围时可能省略 `content`，应用侧应改用分段读取或检索。

#### 检索技能包文本文件

`POST /agent-bus/v1/skill/{skillId}/files/search `

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

| --------------- | -------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `agentId` | string | 是   | 用于校验当前用户对该 agent 下该 skill 的使用权限。HTTP 也可通过`x-agent-id`header 或请求体字段传递；WebSocket 使用顶层`agentId` |

**请求体:**

| 字段

```
| 类型


 | 必填


 | 说明


                                                                                                     |
```

| --------------------- | ---------- | ---------- | -------------------------------------------------------------------------------------------------------------- |
| `query`         | string   | 条件必填 | 单个字面量子串搜索；`query`、`all`、`any`必须且只能提供一个。`query`也可放在 query string 中 |
| `all`           | string[] | 条件必填 | 多个字面量子串全部匹配才命中；最多 5 个，每个 1 到 128 字节                                                  |
| `any`           | string[] | 条件必填 | 多个字面量子串任意一个匹配即命中；最多 5 个，每个 1 到 128 字节                                              |
| `scope`         | string   | 否       | 匹配粒度：`file`（整文件）或`line`（单行），默认`file`                                           |
| `caseSensitive` | bool     | 否       | 是否大小写敏感，默认`false`                                                                              |
| `filePaths`     | string[] | 否       | 限定搜索的 skill 包内相对路径列表                                                                            |
| `extensions`    | string[] | 否       | 限定文件后缀，如`[".md", ".json"]`                                                                       |
| `contextLines`  | int      | 否       | 每个命中行前后的上下文行数，默认`3`，最大`10`                                                        |
| `maxResults`    | int      | 否       | 返回命中总数上限，默认`100`，最大`100`                                                               |
| `maxPerFile`    | int      | 否       | 每个文件返回命中数上限，默认`20`，最大`20`                                                           |

说明：

* 本接口的功能类似于简易版的grep，将本服务包装为工具，可实现按需读取，避免将全量文本文件直接装配至上下文窗口
* 仅检索文本文件；服务端会跳过非文本文件和超过 10 MiB 的文本文件，并通过响应中的 `skipped` 返回跳过原因。
* `query`、`all`、`any` 中的 term 都按字面量子串匹配，不拆词、不支持 regex、不打分；大小写由 `caseSensitive` 控制。
* `scope=file`：先按整文件判断是否满足 `query` / `all` / `any`。例如 `all=["foo","bar"]` 只要求同一文件内同时出现 `foo` 和 `bar`，不要求在同一行。
* `scope=line`：按单行判断是否满足 `query` / `all` / `any`。例如 `all=["foo","bar"]` 要求同一行内同时出现 `foo` 和 `bar`。
* 返回项是实际命中的行；`scope=file` 下即使文件整体满足 `all`，响应中仍按每个命中 term 返回对应行。
* 结果按 skill 包文件顺序和行号稳定返回，不做相关性排序。

**响应:**

`{ "skillId": "skill_xxx", "terms": ["RSI"], "mode": "query", "scope": "file", "resultCount": 1, "skippedCount": 0, "truncated": false, "matches": [ { "skillId": "skill_xxx", "contentRevision": 1, "filePath": "refs/indicators/rsi.json", "size": 668, "isText": true, "lineCount": 24, "line": 3, "column": 12, "term": "RSI", "text": "\"name\": \"RSI\"", "before": ["{"], "after": ["  \"period\": 14"] } ], "skipped": [] } `

说明：

* `skipped[].reason` 当前可能为 `non_text` 或 `too_large`.

#### 批量获取技能包文件

`POST /agent-bus/v1/skill/{skillId}/files/batchGet `

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

| --------------- | -------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `agentId` | string | 是   | 用于校验当前用户对该 agent 下该 skill 的使用权限。HTTP 也可通过`x-agent-id`header 或请求体字段传递；WebSocket 使用顶层`agentId` |

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
| `filePaths` | string / string[] | 是   | 相对 skill 包根目录的文件路径。传单个字符串时按一个文件处理；传空数组返回空列表 |

**响应:**

`{ "skillId": "skill_xxx", "items": [ { "skillId": "skill_xxx", "filePath": "SKILL.md", "encoding": "base64", "content": "<base64 内容>", "size": 2048 } ], "size": 1 } `

说明：

* 文件内容以 base64 字符串存储并返回，`size` 为原始文件字节数。
* 文件的解释、执行、二次注入和本地落地方式由应用层负责。

---

### 2.5 Workspace 运行时能力

Workspace 是面向 coding agent 的会话级临时文本文件区。它用于保存中间代码、脚本和局部修改结果，避免模型在对话中反复全量输出文件内容。

通用约束：

* Workspace 由 `sessionId` 定位，当前用户必须拥有该 session 的读写权限。
* 文件在单个 session workspace 内平铺，不支持子目录。`name` 只能是普通文件名，不能包含 `/`、`\`、`..`，不能以 `.` 开头。
* `read/search/write/applyPatch` 只面向 UTF-8 文本文件；二进制文件不作为首版目标。
* `ACTIVE` session 允许读写；`ARCHIVED` session 只允许 `list/read/search`；`DELETED` session 拒绝访问。
* 单 workspace 默认限制为 500 个文件、50 MiB 总大小、2 MiB 单文件大小。读取、搜索和 patch 也有服务端配置上限。
* 当请求到达非 workspace home node 时，服务端不会内部转发，而是返回 `WORKSPACE_REDIRECT` payload。客户端应使用同样的 method、query、body 和认证信息，向 `workspaceBaseUrl + retryPath` 重试。

`WORKSPACE_REDIRECT` 响应示例：

`{ "code": "WORKSPACE_REDIRECT", "sessionId": "sess_001", "workspaceNodeId": "nodeA", "workspaceBaseUrl": "http://nodeA:8848/agent-bus/v1", "retryPath": "/workspace/sess_001/file?name=main.dos" } `

---

#### 列出 Workspace 文件

`GET /agent-bus/v1/workspace/{sessionId}/files `

内部 action：`workspace.list`

用途：列出当前 session workspace 根目录下的普通文件。

**响应:**

`{ "items": [ { "name": "main.dos", "type": "file", "size": 2048, "updateTime": "2026-05-21T10:00:00.000" } ], "size": 1 } `

---

#### 读取 Workspace 文件

`GET /agent-bus/v1/workspace/{sessionId}/file?name=main.dos&startLine=1&endLine=120 `

内部 action：`workspace.read`

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

`{ "name": "main.dos", "content": "def main(){\n    return 1\n}\n", "size": 1024, "lineCount": 42, "startLine": 1, "endLine": 3, "truncated": false } `

说明：

* `size` 是完整文件字节数，`lineCount` 是完整文件行数。
* `truncated=true` 表示返回内容被 `agentWorkspaceReadMaxBytes` 截断；调用方应缩小行范围后重试。

---

#### 写入 Workspace 文件

`POST /agent-bus/v1/workspace/{sessionId}/file `

内部 action：`workspace.write`

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

`{ "name": "main.dos", "created": true, "changed": true, "size": 31 } `

说明：

* 该接口用于创建文件或原子替换完整文件内容。
* 小范围修改优先使用 `workspace.applyPatch`。
* 写入前会校验单文件大小、workspace 总大小和文件数量配额。

---

#### 删除 Workspace 文件

`DELETE /agent-bus/v1/workspace/{sessionId}/file?name=main.dos `

内部 action：`workspace.delete`

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

| ------------ | -------- | ------ | -------------------- |
| `name` | string | 是   | 文件名，不支持路径 |

**响应:**

`{ "name": "main.dos", "deleted": true, "size": 2048 } `

说明：

* 删除能力严格限制为当前 session workspace 内的单个普通文件。
* 不支持目录删除、递归删除、批量删除、通配符删除或清空 workspace。
* WebSocket 调用时，`name` 放入 `payload`。

---

#### 搜索 Workspace 文件

`POST /agent-bus/v1/workspace/{sessionId}/search `

内部 action：`workspace.search`

**请求体:**

`{ "all": ["submitOrder", "RSI"], "scope": "file", "caseSensitive": false, "extensions": [".dos"], "contextLines": 1, "maxResults": 20, "maxPerFile": 5 } `

| 字段

```
| 类型


 | 必填


 | 说明


                                                                                                              |
```

| --------------------- | ---------- | ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| `query`         | string   | 条件必填 | 单个字面量子串搜索；`query`、`all`、`any`必须且只能提供一个                                               |
| `all`           | string[] | 条件必填 | 多个字面量子串全部匹配才命中；数量不能超过`agentWorkspaceSearchMaxTerms`，默认上限 5；每个 term 1 到 128 字节     |
| `any`           | string[] | 条件必填 | 多个字面量子串任意一个匹配即命中；数量不能超过`agentWorkspaceSearchMaxTerms`，默认上限 5；每个 term 1 到 128 字节 |
| `scope`         | string   | 否       | 匹配粒度：`file`（整文件）或`line`（单行），默认`file`                                                    |
| `caseSensitive` | bool     | 否       | 是否大小写敏感，默认`false`                                                                                       |
| `names`         | string[] | 否       | 限定搜索的文件名列表                                                                                                  |
| `extensions`    | string[] | 否       | 限定文件后缀，如`[".dos", ".md"]`                                                                                 |
| `contextLines`  | int      | 否       | 每个命中行前后的上下文行数，默认`0`；不能超过`agentWorkspaceSearchMaxContextLines`，默认上限 3                |
| `maxResults`    | int      | 否       | 返回命中总数上限；省略或小于等于 0 时使用`agentWorkspaceSearchMaxResults`，默认 100；较大值按服务端配置截断       |
| `maxPerFile`    | int      | 否       | 每个文件返回命中数上限；省略或小于等于 0 时使用`agentWorkspaceSearchMaxPerFile`，默认 20；较大值按服务端配置截断  |

`scope` 说明：

* `file`：先按整文件判断是否满足 `query` / `all` / `any`。例如 `all=["foo","bar"]` 只要求同一文件内同时出现 `foo` 和 `bar`，不要求在同一行。
* `line`：按单行判断是否满足 `query` / `all` / `any`。例如 `all=["foo","bar"]` 要求同一行内同时出现 `foo` 和 `bar`。

**响应:**

`{ "terms": ["submitOrder", "RSI"], "mode": "all", "scope": "file", "resultCount": 1, "skippedCount": 0, "truncated": false, "matches": [ { "name": "main.dos", "line": 37, "column": 12, "term": "submitOrder", "text": "submitOrder(account, symbol, qty)", "before": ["if(rsi < 30){"], "after": ["}"] } ], "skipped": [] } `

说明：

* 搜索会跳过超过 `agentWorkspaceSearchMaxFileBytes` 的文件，默认上限 50 MiB；跳过文件会出现在 `skipped` 中，`skippedCount` 为跳过数量。
* 搜索 term 只按字面量子串匹配，不拆词、不支持 regex、不打分；大小写由 `caseSensitive` 控制。
* 返回项是实际命中的行；`scope=file` 下即使文件整体满足 `all`，响应中仍按每个命中 term 返回对应行。
* `truncated=true` 表示命中超过 `maxResults`、`maxPerFile` 或服务端配置上限；`skipped[].reason` 当前可能为 `too_large` 或 `invalid_utf8`。

---

#### 局部修改 Workspace 文件

`POST /agent-bus/v1/workspace/{sessionId}/patch `

内部 action：`workspace.applyPatch`

**请求体:**

`{ "name": "main.dos", "patch": "--- main.dos\n+++ main.dos\n@@ -1,3 +1,3 @@\n def main(){\n-    return 1\n+    return 2\n }\n" } `

| 字段

```
| 类型
```

| 必填

| 说明

```
|
```

| ------------- | -------- | ------ | -------------------------------- |
| `name`  | string | 是   | 要修改的已有文件名，不支持路径 |
| `patch` | string | 是   | 单文件 unified diff patch      |

**响应:**

`{ "name": "main.dos", "changed": true, "lineCount": 3, "summary": "applied patch" } `

说明：

* `patch` 只能修改 `name` 指定的单个已存在文件。
* 不支持多文件 patch、rename、创建文件或删除文件；创建文件使用 `workspace.write`，删除文件使用 `workspace.delete`。
* 任一 hunk 上下文不匹配时，整个 patch 失败，原文件保持不变。
* 成功后不返回完整文件；调用方需要确认内容时，应继续调用 `workspace.read`。

---

### 2.6 记忆运行时能力

#### 运行时并发调度

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

| ---------------------------------------- | -------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `agentFramework.memory.lanePolicy` | string | `user` | memory 写请求的串行化粒度：`legacy`使用`AGENT_WRITE`agentId 粒度；`agent`按`memory:agent:{agentId}`串行；`user`将 user-scope memory 按`memory:user:{agentId}:{userId}`串行、agent-scope memory 按`memory:agent:{agentId}`串行；`memoryId`将`memory.update/delete`按`memory:id:{memoryId}`串行 |

说明：

* `memory.store/update/delete` 属于写请求，会按上述 lane 策略串行化。
* `memory.get/search/list/stats` 对外仍是只读接口，不需要客户端提供 lane 信息。
* `agentFramework.memory.lanePolicy` 是全局运行时配置，不属于 `memoryConfig`，也不会随 agent 注册请求落库。

#### 存储记忆

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

| ------------------ | -------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `agentId`    | string | 是   | 所属 Agent ID                                                                                                                        |
| `scope`      | string | 否   | 作用域（默认`agent`）：`agent`（agent 级别，所有用户可读，仅`AGENT_ADMIN`可写）/`user`（用户级别，写入当前登录用户） |
| `category`   | string | 是   | 分类标签（如`"fact"`、`"preference"`、`"instruction"`），用于按分类检索和统计                                            |
| `content`    | string | 是   | 记忆文本内容                                                                                                                         |
| `importance` | double | 是   | 重要度，取值范围 [0, 1]。参与混合排序                                                                                                |
| `metadata`   | object | 否   | 自定义元数据，JSON 格式                                                                                                              |
| `source`     | string | 否   | 来源标识（默认`manual`）：`manual`（手动创建）/`auto_extract`（自动提取）/`api`（API 写入）                          |
| `sourceRef`  | string | 否   | 来源引用信息（如来源的 sessionId 或 messageId），便于溯源                                                                            |
| `expireTime` | long   | 否   | 过期时间（毫秒时间戳），为空表示永不过期                                                                                             |

**响应:** [MemoryEntry](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#memoryentry "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#memoryentry")

说明：

* 当 `agent.memoryConfig.embeddingEnabled=true` 时，`memory.store` 由框架根据启用的 embedding 配置生成 document embedding，并同步写入记忆主表和 embedding 表
* 当 `agent.memoryConfig.embeddingEnabled=false` 时，`memory.store` 只写入记忆主表，不生成 embedding
* 请求体不接受 `userId`、`embedding`、`embeddingModel`

---

#### 获取记忆

`GET /agent-bus/v1/memory/{memoryId} `

**响应:** [MemoryEntry](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#memoryentry "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#memoryentry")

---

#### 更新记忆

`PUT /agent-bus/v1/memory/{memoryId} `

**请求体:**

| 字段

```
| 类型


      | 必填


       | 说明


                                           |
```

| ------------------ | --------------- | ---------------- | ---------------------------------------------------- |
| `memoryId`   | string        | 路径已提供时否 | 记忆 ID；若同时出现在路径和 body 中，必须一致      |
| `category`   | string        | 否             | 分类标签；非空字符串                               |
| `content`    | string        | 否             | 记忆文本内容；非空字符串                           |
| `importance` | double        | 否             | 重要度，取值范围`[0, 1]`                       |
| `expireTime` | long / null   | 否             | 过期时间（毫秒时间戳）；传`null`清除过期时间   |
| `source`     | string        | 否             | 来源标识                                           |
| `sourceRef`  | string        | 否             | 来源引用信息                                       |
| `metadata`   | object / null | 否             | 自定义元数据，整体替换；传`null`清空为`{}` |

说明：

* 至少提供一个可更新字段。
* 当 `agent.memoryConfig.embeddingEnabled=true` 且更新 `content` 时，框架会先生成新的 document embedding，再同步更新记忆主表和 embedding 表
* 当 `agent.memoryConfig.embeddingEnabled=false` 时，更新仅作用于记忆主表，不生成或更新 embedding
* 请求体不接受 `scope`、`userId`、`embedding`、`embeddingModel`

**响应:** [MemoryEntry](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#memoryentry "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#memoryentry")

---

#### 删除记忆

`DELETE /agent-bus/v1/memory/{memoryId} `

**响应:**

`{ "memoryId": "mem_xxx", "deleted": true } `

---

#### 搜索记忆

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

| --------------------- | -------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `agentId`       | string | 是   | 搜索范围限定的 Agent ID                                                                                                                                                                                                                                                        |
| `targetUserId`  | string | 否   | 只读过滤目标用户。未指定时搜索当前登录用户可见的范围；仅`AGENT_ADMIN`可查看他人数据                                                                                                                                                                                        |
| `scope`         | string | 否   | 按作用域过滤：`agent`（仅 agent 级别）/`user`（仅用户级别）。不指定时搜索 agent 级别 + 目标用户的 user 级记忆                                                                                                                                                          |
| `category`      | string | 否   | 按分类标签精确过滤                                                                                                                                                                                                                                                             |
| `textQuery`     | string | 否   | 搜索文本。`TEXT_SEARCH`必填；`RELEVANCE`必填并用于生成 query embedding；`HYBRID`非空时同时参与全文召回和语义召回                                                                                                                                                   |
| `textMatchMode` | string | 否   | 全文搜索匹配模式（默认`any`）：`any`调用 textdb`matchAny`，匹配任一分词即可命中；`all`调用`matchAll`，所有分词都匹配才命中。仅全文搜索分支使用                                                                                                             |
| `topK`          | int    | 否   | 最多返回条数（默认 10）                                                                                                                                                                                                                                                        |
| `minImportance` | double | 否   | 最小重要度过滤阈值（默认 0，不过滤）                                                                                                                                                                                                                                           |
| `sortBy`        | string | 否   | 排序策略（默认`HYBRID`）：`RECENCY`（按创建时间降序）/`IMPORTANCE`（按重要度降序）/`RELEVANCE`（用`textQuery`做语义向量召回并按相关度排序）/`TEXT_SEARCH`（按 textdb 全文搜索得分降序）/`HYBRID`（合并语义、全文、最近和重要度候选后按综合分排序） |

**响应:**

`{ "items": [ MemoryEntry, ... ], "size": 5 } `

每条 MemoryEntry 额外包含评分字段：`textScore`, `relevanceScore`, `hybridScore`。

说明：

* `RELEVANCE` 和 `TEXT_SEARCH` 都要求 `textQuery` 非空；`HYBRID` 可以不传 `textQuery`，此时只使用最近和重要度等非文本候选。
* 当 `sortBy=RELEVANCE/HYBRID` 且 `textQuery` 非空、`agent.memoryConfig.embeddingEnabled=true` 时，`memory.search` 由框架内部生成 query embedding，不接受 `embedding`、`embeddingModel`。
* 当 `agent.memoryConfig.embeddingEnabled=false` 时，`RELEVANCE` 直接失败，`HYBRID` 退化为全文/importance/recency 检索。
* 当 `agent.memoryConfig.embeddingEnabled=true` 但启用的 embedding 配置不可用时，`RELEVANCE` 直接失败，`HYBRID` 退化为全文/importance/recency 检索。
* 当 `scope='agent'` 时，不允许同时传 `targetUserId`

---

### 2.7 网络访问能力

#### 发起外部网络请求

WebSocket 调用方式见 [6. WebSocket 协议](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#6-websocket-%E5%8D%8F%E8%AE%AE "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#6-websocket-%E5%8D%8F%E8%AE%AE")。

该接口用于 Agent 应用通过 Agent 框架访问外部 HTTP(S) 资源，典型用途是给应用侧 `websearch` 工具拉取公开文档页面。框架只负责安全校验、限流、发起请求和返回原始 HTTP 响应摘要；页面解析、检索排序、重定向处理等逻辑由应用层负责。

`POST /agent-bus/v1/network/fetch `

内部 action 名：`network.fetch`

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

| -------------------- | -------- | ---------- | ------------------------------------------------------------------------------------------ |
| `agentId`      | string | 条件必填 | Agent ID。也可以通过`x-agent-id`请求头传入；两处同时传入时必须一致                   |
| `method`       | string | 是       | 仅支持`GET`/`POST`，大小写不敏感                                                 |
| `url`          | string | 是       | 完整的`http://`或`https://`URL。必须命中服务端内置 allowlist                     |
| `headers`      | object | 否       | 透传到目标站点的请求头，值必须为标量字符串                                               |
| `body`         | string | 否       | POST 请求体。`GET`请求不允许携带 body                                                |
| `timeoutMs`    | int    | 否       | 请求超时时间，默认`10000`，最大`30000`；超过最大值会按最大值处理                 |
| `maxBodyBytes` | long   | 否       | 响应 body 最大读取字节数，默认`2097152`，最大`2097152`；超过最大值会按最大值处理 |

**响应:** [NetworkFetchResponse](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#networkfetchresponse "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#networkfetchresponse")

`{ "url": "https://docs.dolphindb.cn/zh/tutorials/in_memory_table.html", "method": "GET", "statusCode": 200, "statusText": "OK", "headers": { "content-type": "text/html; charset=utf-8" }, "contentType": "text/html; charset=utf-8", "contentEncoding": "", "body": "<!doctype html>...", "truncated": false, "bodyOmitted": false, "bodyUtf8Sanitized": false, "latencyMs": 321 } `

**访问控制与安全规则:**

* URL 必须是完整 `http://` 或 `https://` URL，不支持相对 URL。
* 当前内置 allowlist 只允许访问 `dolphindb.cn`、`dolphindb.com` 及其子域名；匹配带域名边界，例如允许 `docs.dolphindb.cn`，但不允许 `evil-dolphindb.cn` 或 `dolphindb.cn.example.com`。
* 只允许默认端口：`http` 使用 80，`https` 使用 443；显式指定其它端口会被拒绝。
* URL 不允许包含空格、控制字符、fragment（`#...`）、userinfo（`user:pass@host`）或 IP literal host。
* 框架不跟随 3xx 重定向；如果目标站点返回重定向，接口会如实返回状态码和 `Location` 等响应头。
* 用户侧不允许设置下列请求头：`Host`、`Content-Length`、`Transfer-Encoding`、`Connection`、`Authorization`、`Cookie`、`Proxy-Authorization`、`Proxy-Connection`、`TE`、`Trailer`、`Upgrade`、`Expect`、`Keep-Alive`、`Accept-Encoding`、以及所有 `Proxy-*` 头。
* 框架会强制使用 `Accept-Encoding: identity`，避免把压缩体直接塞进 JSON 响应。
* 响应 body 仅在文本类内容且未压缩时返回；二进制、未知类型或非 identity 编码响应会设置 `bodyOmitted=true`，`body` 为空。
* 文本 body 会按 UTF-8 返回；如果截断或上游内容导致非法 UTF-8，框架会做安全处理并设置 `bodyUtf8Sanitized=true`。
* 服务端按 `agentId + userId` 对网络访问请求做独立并发与速率控制；当前默认并发上限为 8，速率上限为 120 RPM。

说明：

* `maxBodyBytes` 是读取上限，不代表目标站点一定返回完整内容；当 body 被截断时 `truncated=true`。
* 对文档 PDF 等二进制资源，接口可以返回 HTTP 状态码、响应头和 content type，但不会把二进制内容放入 `body`。
* 请求失败、超时、限流或参数校验失败时返回标准 Agent Bus 错误 envelope。

---

### 2.8 会话摘要

#### 生成摘要

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
| `force`        | bool   | 否   | 是否强制生成（默认 false）。为 true 时忽略`tailKeepTokens`，把最新 summary 之后的全部 raw 历史纳入本次摘要，不保留未压缩尾部                             |
| `metadata`     | object | 否   | 自定义元数据，JSON 格式。框架只负责透传，可以写入一些自定义的数据，比如触发原因、关联的业务事件等                                                            |

**响应:** [SummaryResult](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#summaryresult "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#summaryresult")

`{ "sessionId": "sess_001", "generated": true, "reason": "", "trigger": "manual", "summaryUpToSeqNum": 50, "messageId": "msg_xxx", "sequenceNum": 51, "role": "system", "contentType": "summary", "content": "摘要内容...", "metadata": { "summaryUpToSeqNum": 50, "trigger": "manual", "summaryLlmConfigId": "llm_summary_xxx" } } `

---

### 2.9 调试接口

#### Context Preview (上下文预览)

WebSocket 调用方式见 [6. WebSocket 协议](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#6-websocket-%E5%8D%8F%E8%AE%AE "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#6-websocket-%E5%8D%8F%E8%AE%AE")。

调试接口，预览上下文组装结果但不调用 LLM。可用于验证 contextConfig 配置效果、检查 token 预算分配、确认技能和记忆是否正确注入。

`POST /agent-bus/v1/context/preview `

**请求体:**

| 字段

```
| 类型


         | 必填


 | 说明


                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
```

| -------------------------------------------------------------- | ------------------ | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sessionId`                                              | string           | 是       | 会话 ID，必须可读；可通过 path/header/query/body 提供，重复提供时必须一致                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `message`                                                | string           | 条件必填 | 用户消息文本，与`toolResults`至少提供一个                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `toolResults`                                            | ToolResult[]     | 条件必填 | 工具执行结果列表，与`message`至少提供一个                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `tools`                                                  | ToolDefinition[] | 否       | 自动组装模式下的工具定义列表；存在`assemblyConfig`时请改放到`assemblyConfig.tools`                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `activeSkillNames`                                       | string[]         | 否       | 自动组装模式下显式附加的 Tier-2 技能名称；存在`assemblyConfig`时请改放到`assemblyConfig.activeSkillNames`                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `llmConfigId`                                            | string           | 否       | 用于解析上下文窗口和 token 预算的 LLM 配置 ID；不传时按 session/agent 默认配置解析                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `assemblyConfig`                                         | object           | 否       | 手动组装配置，结构同[手动组装模式](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#%E6%89%8B%E5%8A%A8%E7%BB%84%E8%A3%85%E6%A8%A1%E5%BC%8F-manual-assembly "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#%E6%89%8B%E5%8A%A8%E7%BB%84%E8%A3%85%E6%A8%A1%E5%BC%8F-manual-assembly")。存在该字段时进入 manual preview |
| `maxTokens`/`max_tokens`/`max_completion_tokens` | int              | 否       | 输出 token 预留预算；会影响上下文组装可用 prompt 预算                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

说明：

* `context/preview` 会按与 `/chat/completions` 相同的规则组装当前轮输入
* 预览中的 `message` / `toolResults` 仅作为 pending turn 参与组装，不会写入 session
* 该接口不会调用 LLM，也不会追加 assistant 回复
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

| -------------------------- | -------- | ----------------------------------------------------------- |
| `assemblyMode`       | string | `auto`或`manual`                                  |
| `memoriesIncluded`   | int    | 实际注入到上下文中的记忆条数                              |
| `messagesIncluded`   | int    | 实际包含的历史消息条数                                    |
| `skillsInCatalog`    | int    | Tier-1 技能目录中包含的技能数                             |
| `activeInstructions` | int    | 已加载的 Tier-2 技能指令数                                |
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
| `skillCatalog`      | int  | Tier-1 技能目录估算 token 数                                   |
| `skillInstructions` | int  | Tier-2 技能指令估算 token 数                                   |
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
* 安全检查采用黑名单模型，不是白名单模型；未命中禁止规则的脚本会继续走原执行逻辑。
* 当前主要禁止删除、移除、清理、取消定义等操作，以及当前无法完整检查的脚本结构；命中时框架会拒绝执行，错误信息以 `AIScript rejected:` 开头。
* 创建、插入、更新、动态执行、远程调用、加载模块/插件等操作不属于 `aiscript` 当前主动禁止范围，但仍受 DolphinDB 自身权限、语法和运行时规则约束。
* 检查通过后，底层执行逻辑与 `script` 相同。
* `aiscript` 仅面向 DolphinDB 脚本；Python parser 场景不支持。

建议：

* 外部 Agent 生成、且未经人工审核的 DolphinDB 语句，应优先通过 `aiscript` 执行。
* 明确经过人工审核、或确需执行管理/写入类操作的脚本，可继续使用原 `script` 接口。

---

#### LLM Complete (直接调用 LLM)

WebSocket 调用方式见 [6. WebSocket 协议](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#6-websocket-%E5%8D%8F%E8%AE%AE "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#6-websocket-%E5%8D%8F%E8%AE%AE")。

绕过上下文组装，直接发送消息给 LLM。适用于应用自行构建消息列表的场景。

`POST /agent-bus/v1/llm/complete `

**请求体:**

| 字段

```
| 类型


          | 必填


 | 说明


                                                                                                                                      |
```

| -------------------------------------------------------------- | ------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `agentId`                                                | string            | 条件必填 | Agent ID，用于解析 LLM 配置（从 agent 绑定的 LLM 列表中选择）。指定`sessionId`时可省略，框架使用 session 绑定的 agent；若同时提供必须一致 |
| `sessionId`                                              | string            | 否       | 会话 ID。指定时要求当前用户对 session 有写权限，并使用 session 归属用户和 session 级 LLM 配置                                                 |
| `messages`                                               | LLMMessage[]      | 是       | 完整的消息列表（由应用层自行构建），直接发送给 LLM，框架不做上下文组装                                                                        |
| `tools`                                                  | ToolDefinition[]  | 否       | 工具定义列表（OpenAI function calling 格式）                                                                                                  |
| `model`                                                  | string            | 否       | 指定模型名称，覆盖 LLM 配置中的 model                                                                                                         |
| `stream`                                                 | bool              | 否       | 是否流式返回（默认 true）                                                                                                                     |
| `includeReasoning`                                       | bool              | 否       | 是否返回 provider 给出的可展示思考过程（默认 false）。该内容只用于本次展示，不必持久化存储                                                    |
| `llmConfigId`                                            | string            | 否       | 指定使用的 LLM 配置 ID。必须属于当前用户在该 agent 下的有效可选集合（后台会校验权限）                                                         |
| `requestId`                                              | string            | 否       | 请求追踪 ID，不指定时自动生成                                                                                                                 |
| `temperature`                                            | double            | 否       | 临时覆盖采样温度                                                                                                                              |
| `maxTokens`/`max_tokens`/`max_completion_tokens` | int               | 否       | 临时覆盖本次输出 token 上限；这三个字段等价                                                                                                   |
| `topP`/`top_p`                                       | double            | 否       | 临时覆盖 nucleus sampling 参数                                                                                                                |
| `stop`                                                   | string / string[] | 否       | 临时覆盖停止序列                                                                                                                              |
| `persistMessage`                                         | bool              | 否       | 仅在指定`sessionId`时有效；为`true`时把 assistant 回复追加到该 session                                                                |
| `extensions`                                             | object            | 否       | Provider 透传参数。除保留字段外，其他未知顶层字段也会作为 provider extension 合入请求                                                         |

说明：

* 该接口不接受 `userId` 或 `targetUserId`；指定 `sessionId` 时使用 session owner，否则使用当前登录用户。

LLMMessage 结构:

`{ "role": "user", "content": "你好" } `

ToolDefinition 结构:

`{ "type": "function", "function": { "name": "search_database", "description": "搜索数据库表", "parameters": { "type": "object", "properties": { "query": { "type": "string", "description": "SQL 查询" } }, "required": ["query"] } } } `

**响应:** 同 [Chat Completions 响应](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#%E9%9D%9E%E6%B5%81%E5%BC%8F%E5%93%8D%E5%BA%94 "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#%E9%9D%9E%E6%B5%81%E5%BC%8F%E5%93%8D%E5%BA%94")

---

消息接口是底层读写原语，通常只在自定义会话编排、数据迁移或调试场景中直接使用。

#### 追加消息

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
| `totalTokens`      | int    | 否   | 总 token 数（默认 prompt + completion），用于摘要与上下文 token 估算                                                                                                                                                                                                                                                                                                                 |
| `metadata`         | object | 否   | 自定义元数据，JSON 格式                                                                                                                                                                                                                                                                                                                                                              |

**响应:** [MessageInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#messageinfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#messageinfo")

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
| `llmConfigId`   | string | 否   | 默认 LLM 配置 ID，必须是已通过`/llm/config/register`注册的配置 ID。注册时会自动创建 agent 与该 LLM 配置的绑定关系（`isDefault=true`,`priority=0`）                                                                                                                                                                                                                                |
| `contextConfig` | object | 否   | 上下文组装配置，详见[contextConfig 结构](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#contextconfig "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#contextconfig") |
| `memoryConfig`  | object | 否   | 记忆管理配置，详见[memoryConfig 结构](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#memoryconfig "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#memoryconfig")      |
| `config`        | object | 否   | 自定义扩展配置，框架原样存储，不做解析                                                                                                                                                                                                                                                                                                                                                        |
| `extra`         | string | 否   | 预留扩展字段                                                                                                                                                                                                                                                                                                                                                                                  |

**响应:** [AgentInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#agentinfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#agentinfo")

说明：

* `agent.register` 不接受 `agentId` 和 `ownerUserId`；`agentId` 由框架生成
* `memoryConfig.embeddingEnabled` 在 `agent.register` 时完成一次性决策并落库
* 注册请求未显式传入 `memoryConfig.embeddingEnabled` 时，系统会按默认值 `false` 补齐并持久化
* 当 `memoryConfig.embeddingEnabled=true` 时，注册时要求系统当前存在且只存在一条启用的 embedding 配置

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

| --------------------- | -------- | ---------------- | ------------------------------------------------------------------------ |
| `agentId`       | string | 路径已提供时否 | Agent ID；若同时出现在路径和 body 中，必须一致                         |
| `agentName`     | string | 否             | Agent 名称                                                             |
| `description`   | string | 否             | 描述                                                                   |
| `systemPrompt`  | string | 否             | 系统提示词                                                             |
| `llmConfigId`   | string | 否             | 默认 LLM 配置 ID；非空时必须是可用 chat 配置，空字符串表示清除默认配置 |
| `contextConfig` | object | 否             | 上下文组装配置，整体替换                                               |
| `memoryConfig`  | object | 否             | 记忆管理配置，整体替换；`embeddingEnabled`约束见下方说明           |
| `config`        | object | 否             | 自定义扩展配置，整体替换                                               |
| `extra`         | string | 否             | 预留扩展字段                                                           |

说明：

* 至少提供一个可更新字段；已删除 Agent 不可更新
* `memoryConfig.embeddingEnabled` 在注册后不可变；更新时如果显式传入且与当前值不同，请求会被拒绝
* 更新 `memoryConfig` 但省略 `embeddingEnabled` 时，框架会保留原值
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

说明：授权级别固定为 Agent 调用权限，请求体不接受 `permission`。

---

#### 撤销 Agent 权限

`DELETE /agent-bus/v1/agent/{agentId}/auth?userId=xxx `

**参数:**

| 参数

```
| 类型
```

| 必填

```
| 说明


                                                            |
```

| --------------- | -------- | ---------------- | --------------------------------------------------------------------- |
| `agentId` | string | 路径已提供时否 | Agent ID；若同时出现在路径、query 和 body 中，必须一致              |
| `userId`  | string | 是             | 要撤销授权的 DolphinDB 用户 ID；可放在 query string 或 JSON body 中 |

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

说明：授权级别固定为全局 `AGENT_ADMIN`，请求体不接受 `permission`。

---

#### 撤销全局 `AGENT_ADMIN`

`DELETE /agent-bus/v1/admin/access?userId=xxx `

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

| ------------------- | -------- | ------ | ------------------------------------------------------------------------------------------------------------------------- |
| `providerId`  | string | 否   | Provider ID；不传时由框架生成                                                                                           |
| `name`        | string | 是   | Provider 名称，用于标识和展示                                                                                           |
| `adapterType` | string | 是   | 运行时 provider 适配器类型：`openai`/`openai-compatible`/`anthropic`/`deepseek`/`azure`/`local` |
| `baseUrl`     | string | 是   | Provider 级基础 URL，必须是完整`http(s)`URL，如`https://api.openai.com`                                         |
| `apiKey`      | string | 否   | Provider 级 API Key                                                                                                     |
| `enabled`     | bool   | 否   | 是否启用，默认`true`                                                                                                |
| `extra`       | string | 否   | 预留扩展字段                                                                                                            |

**响应:** [LlmProviderInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmproviderinfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmproviderinfo")

说明：

* `baseUrl` 由框架规范化保存：末尾 `/` 会被移除
* Provider 负责承载共享连接信息；模型级配置保存 `requestPath`、`defaultParams` 等模型参数
* `enabled=false` 的 provider 可保存配置，但运行时不会通过该 provider 发起 LLM 调用

---

#### 获取 LLM Provider

`GET /agent-bus/v1/llm/provider/{providerId} `

**响应:** [LlmProviderInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmproviderinfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmproviderinfo")

说明：

* 已删除的 provider 返回 404

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

| ------------------- | -------- | ---------------- | ----------------------------------------------------------- |
| `providerId`  | string | 路径已提供时否 | Provider ID；若同时出现在路径、query 和 body 中，必须一致 |
| `name`        | string | 否             | Provider 名称；非空字符串                                 |
| `adapterType` | string | 否             | 适配器类型，取值同注册接口                                |
| `baseUrl`     | string | 否             | Provider 基础 URL                                         |
| `apiKey`      | string | 否             | Provider API Key                                          |
| `enabled`     | bool   | 否             | 是否启用                                                  |
| `extra`       | string | 否             | 预留扩展字段                                              |

**响应:** [LlmProviderInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmproviderinfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmproviderinfo")

说明：

* 至少提供一个可更新字段
* `enabled=false` 时，引用该 provider 的 LLM 配置保留，运行时不可用
* `enabled=true` 时，引用该 provider 且自身启用的 LLM 配置可参与运行时解析
* 已删除的 provider 返回 404

---

#### 删除 LLM Provider

`DELETE /agent-bus/v1/llm/provider/{providerId} `

**响应:** `{ providerId, deleted: true }`

说明：

* 删除前要求不存在任何未删除的 LLM 配置引用该 provider
* 删除成功后不参与 list、get 和 runtime
* 删除成功后的 GET 返回 404

---

#### 注册 LLM 配置

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
| `llmConfigId`        | string | 否       | LLM 配置 ID；不传时由框架生成                                                                                                                                                                                                                                                                                                                                                               |
| `name`               | string | 是       | 配置名称，用于标识和展示                                                                                                                                                                                                                                                                                                                                                                    |
| `providerId`         | string | 是       | 关联的 provider ID，必须存在；`enabled=true`时 provider 必须启用                                                                                                                                                                                                                                                                                                                        |
| `model`              | string | 是       | 模型名称（如`gpt-4.1`、`claude-sonnet-4-20250514`），传递给 LLM API                                                                                                                                                                                                                                                                                                                 |
| `capability`         | string | 否       | 配置能力类型，默认`chat`：`chat`/`embedding`                                                                                                                                                                                                                                                                                                                                    |
| `embeddingDimension` | int    | 条件必填 | `capability=embedding`时必填，表示向量维度                                                                                                                                                                                                                                                                                                                                              |
| `embeddingMetric`    | string | 否       | `capability=embedding`时使用的相似度规则：`euclidean`/`cosine`。省略时默认`euclidean`                                                                                                                                                                                                                                                                                       |
| `embeddingNormalize` | bool   | 否       | `capability=embedding`时是否对向量做归一化。`embeddingMetric=cosine`时必须为`true`                                                                                                                                                                                                                                                                                              |
| `requestPath`        | string | 是       | 相对`provider.baseUrl`的请求路径，必须以`/`开头，可包含查询串，例如`/v1/chat/completions`或`/openai/deployments/x/chat/completions?api-version=2024-10-21`                                                                                                                                                                                                                  |
| `defaultParams`      | object | 否       | 默认请求参数，详见[defaultParams 说明](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#defaultparams "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#defaultparams") |
| `contextWindow`      | int    | 否       | 模型上下文窗口大小（token 数），用于上下文组装时的预算计算                                                                                                                                                                                                                                                                                                                                  |
| `maxConcurrency`     | int    | 否       | 最大并发请求数                                                                                                                                                                                                                                                                                                                                                                              |
| `rateLimitRPM`       | int    | 否       | 速率限制（每分钟最大请求数）                                                                                                                                                                                                                                                                                                                                                                |
| `timeoutMs`          | int    | 否       | 单次请求超时时间（毫秒）                                                                                                                                                                                                                                                                                                                                                                    |
| `retryConfig`        | object | 否       | 重试配置，详见[retryConfig 说明](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#retryconfig "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#retryconfig")           |
| `enabled`            | bool   | 否       | 是否启用，默认`true`                                                                                                                                                                                                                                                                                                                                                                    |
| `extra`              | string | 否       | 预留扩展字段                                                                                                                                                                                                                                                                                                                                                                                |

**响应:** [LlmConfigInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmconfiginfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmconfiginfo")

说明：

* 运行时最终请求地址按 `provider.baseUrl + requestPath` 拼接
* `capability=embedding` 的配置供 memory 模块生成 document/query embedding 使用
* `enabled=true` 时，系统全局只允许一条启用的 `capability='embedding'` 配置
* `enabled=false` 的配置可引用存在但未启用的 provider

---

#### 获取 LLM 配置

`GET /agent-bus/v1/llm/config/{llmConfigId} `

**响应:** [LlmConfigInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmconfiginfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmconfiginfo")

说明：

* 已删除的配置返回 404

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
```

| 必填

```
| 说明


                                                                            |
```

| -------------------------- | -------- | ---------------- | ------------------------------------------------------------------------------------- |
| `llmConfigId`        | string | 路径已提供时否 | LLM 配置 ID；若同时出现在路径和 body 中，必须一致                                   |
| `name`               | string | 否             | 配置名称                                                                            |
| `providerId`         | string | 否             | 关联的 provider ID；`enabled=true`时 provider 必须启用                          |
| `model`              | string | 否             | 模型名称                                                                            |
| `capability`         | string | 否             | 配置能力类型：`chat`/`embedding`                                            |
| `embeddingDimension` | int    | 条件必填       | 更新为`capability=embedding`时必须为正数                                        |
| `embeddingMetric`    | string | 否             | `euclidean`/`cosine`；`capability=embedding`且省略时默认`euclidean` |
| `embeddingNormalize` | bool   | 否             | `embeddingMetric=cosine`时必须为`true`                                      |
| `requestPath`        | string | 否             | 相对`provider.baseUrl`的请求路径，必须以`/`开头                             |
| `defaultParams`      | object | 否             | 默认请求参数，整体替换                                                              |
| `contextWindow`      | int    | 否             | 模型上下文窗口大小；必须为非负整数                                                  |
| `maxConcurrency`     | int    | 否             | 最大并发请求数；必须为非负整数                                                      |
| `rateLimitRPM`       | int    | 否             | 速率限制；必须为非负整数                                                            |
| `timeoutMs`          | int    | 否             | 单次请求超时时间；必须为非负整数                                                    |
| `retryConfig`        | object | 否             | 重试配置，整体替换                                                                  |
| `enabled`            | bool   | 否             | 是否启用                                                                            |
| `extra`              | string | 否             | 预留扩展字段                                                                        |

**响应:** [LlmConfigInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmconfiginfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#llmconfiginfo")

说明：

* 至少提供一个可更新字段
* `enabled=false` 时，已有用户授权、agent 绑定、agent 默认模型、summary 配置和 session 引用保留，运行时不会选择该配置
* `enabled=true` 时，provider 必须启用
* `enabled=true` 且 `capability=embedding` 时，系统中不能存在其他启用的 embedding 配置
* 已删除的配置返回 404

---

#### 删除 LLM 配置

`DELETE /agent-bus/v1/llm/config/{llmConfigId} `

**响应:** `{ llmConfigId, deleted: true }`

说明：

* 删除前要求不存在任何用户授权（`user_llm_access`）、任何 agent 绑定（`agent_llm_access`）、任何非 `DELETED` agent 的默认模型字段、任何非 `DELETED` agent 的 `contextConfig.summaryConfig.summaryLlmConfigId`，以及任何非 `DELETED` session 引用
* 删除成功后不参与 list、get 和 runtime
* 删除成功后的 GET 返回 404

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

`DELETE /agent-bus/v1/user/{userId}/llm/access?llmConfigId=xxx `

**参数:**

| 参数

```
| 类型
```

| 必填

```
| 说明


                                                  |
```

| ------------------- | -------- | ---------------- | ----------------------------------------------------------- |
| `userId`      | string | 路径已提供时否 | 目标用户 ID；若同时出现在路径、query 和 body 中，必须一致 |
| `llmConfigId` | string | 是             | LLM 配置 ID；可放在 query string 或 JSON body 中          |

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

| ------------------- | -------- | ------ | ----------------------------------------------------------------------------------------------------------------- |
| `llmConfigId` | string | 是   | 要绑定的 LLM 配置 ID，必须已启用，且其引用的 provider 也必须启用                                                |
| `isDefault`   | bool   | 否   | 是否设为默认 LLM（默认 false）。每个 agent 仅允许一个默认配置，设为 true 时 priority 强制为 0                   |
| `priority`    | int    | 否   | 优先级（默认 0），数值越小优先级越高。运行时按 priority 升序形成 fallback 链，当前 LLM 调用失败时自动尝试下一个 |

**响应:** Agent 关联的 LLM 配置列表 `{ items: [AgentLlmBindingInfo, ...], size }`

---

#### 解绑 LLM

`DELETE /agent-bus/v1/agent/{agentId}/llm/access?llmConfigId=xxx `

**响应:** Agent 关联的 LLM 配置列表

---

#### 列出 Agent 的 LLM 配置

`GET /agent-bus/v1/agent/{agentId}/llm/list `

**响应:** `{ items: [AgentLlmBindingInfo, ...], size }`

---

### 3.7 Skill 管理

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

* 未显式设置 `enabled` 时默认启用
* 技能包必须是 ZIP，解压后根目录或唯一顶层目录下必须包含 `SKILL.md`，未压缩总大小不能超过 `30MB`
* `SKILL.md` 必须以 YAML frontmatter 开头；frontmatter 至少提供合法 `name` 和非空 `description`
* 启用状态下技能名称必须全局唯一

---

#### 获取技能

`GET /agent-bus/v1/skill/{skillId} `

**响应:** [SkillInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#skillinfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#skillinfo")

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

* 至少提供技能包数据或一个覆盖字段。
* 提供新技能包时，框架会替换已保存的技能包文件并递增 `contentRevision`；随后再应用覆盖字段。
* `overrides.enabled` 或直接字段 `enabled` 控制技能是否启用。

**响应:** [SkillInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#skillinfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#skillinfo")

---

#### 删除技能

`DELETE /agent-bus/v1/skill/{skillId} `

**响应:** `{ skillId, deleted: true }`

说明：

* 删除前要求不存在 agent 绑定或用户 deny/allow 相关引用
* 删除流程先将 Skill 标记为 deleted 以立即隐藏，再删除包文件行，最后删除 Skill 主表行
* 系统会在 Skill 管理面操作中清理已标记 deleted 但未完成物理删除的残留行
* 删除成功后不参与 list、get、byName、catalog 和 context
* 删除成功后的 GET / byName 返回 404

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

说明：

* 普通 skill：重复绑定为幂等 no-op；若存在内部禁用行则恢复为可用。
* common skill：不写入启用绑定；若存在该 Agent 的 common 禁用覆盖行，则删除覆盖行，恢复继承；否则 no-op。
* 请求体不支持 `enabled`、`descOverride`、`configOverride`。

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

说明：

* 普通 skill：删除 Agent 显式绑定。
* common skill：写入或更新 Agent 级内部禁用覆盖行；该 Agent 后续不会继承该 common skill。

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

| --------------- | -------- | ------ | ------------------------------------------------------------------- |
| `agentId` | string | 是   | Agent ID；也可通过`x-agent-id`header 提供，重复提供时必须一致 |
| `skillId` | string | 是   | 要禁止使用的技能 ID                                               |
| `userId`  | string | 是   | 业务用户 ID                                                       |

说明：重复 deny 会更新或保持该用户在该 Agent 下对该技能的禁用记录。

**响应:** `{ agentId, userId, skillIds: [...], size }`

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

| --------------- | -------- | ------ | ------------------------------------------------------------------- |
| `agentId` | string | 是   | Agent ID；也可通过`x-agent-id`header 提供，重复提供时必须一致 |
| `skillId` | string | 是   | 要恢复使用的技能 ID                                               |
| `userId`  | string | 是   | 业务用户 ID                                                       |

说明：allow 会删除该用户在该 Agent 下对该技能的禁用记录；不存在禁用记录时为幂等 no-op。

**响应:** `{ agentId, userId, skillIds: [...], size }`

---

#### 列出业务用户被禁止的技能

`GET /agent-bus/v1/skill/{agentId}/user/{userId}/denied `

**响应:** `{ agentId, userId, skillIds: [...], size }`

---

### 3.9 Memory 管控

#### 按分类列出记忆

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

说明：

* 需要当前用户拥有该 agent 的 `AGENT_ADMIN` 权限。

---

#### 记忆统计

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

说明：

* 需要当前用户拥有该 agent 的 `AGENT_ADMIN` 权限。

**响应:**

`{ "totalCount": 120, "agentScopeCount": 80, "userScopeCount": 40, "avgImportance": 0.65, "categoryDistribution": { "fact": 50, "preference": 30, "instruction": 40 } } `

---

#### 重建记忆 Embedding

`POST /agent-bus/v1/memory/rebuildEmbeddings `

启动一个后台任务，重建所有已启用 `agent.memoryConfig.embeddingEnabled=true` 的记忆 embedding 表。

**响应:** [MemoryRebuildStatus](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#memoryrebuildstatus "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#memoryrebuildstatus")

---

#### 查询记忆 Embedding 重建状态

`GET /agent-bus/v1/memory/rebuildEmbeddings/status?jobId=xxx `

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

| ------------- | -------- | ------ | ----------------------------------------- |
| `jobId` | string | 否   | 重建任务 ID；不传时返回最近一次任务状态 |

**响应:** [MemoryRebuildStatus](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#memoryrebuildstatus "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#memoryrebuildstatus")

---

#### 取消记忆 Embedding 重建

`POST /agent-bus/v1/memory/rebuildEmbeddings/cancel `

**请求体 / 查询参数:**

| 参数

```
| 类型
```

| 必填

| 说明

```
|
```

| -------------- | -------- | ------ | ------------------------------------- |
| `jobId`  | string | 否   | 重建任务 ID；不传时取消最近一次任务 |
| `reason` | string | 否   | 取消原因                            |

**响应:** [MemoryRebuildStatus](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#memoryrebuildstatus "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#memoryrebuildstatus")，并额外包含 `cancelled` 表示本次是否成功发出取消请求。

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

说明：`tokensByModel` 的 value 为该模型累计 `totalTokens`。

---

### 3.11 内置 Agent/Skill 初始化

本章接口用于部署或升级后初始化发布包内预置的 Agent 和 Skill。接口由管控 Web 调用，不面向普通业务用户；调用者必须具备全局 `AGENT_ADMIN` 权限。

初始化流程只读取 DolphinDB 可执行文件同级目录下的 `agentBuiltins/manifest.json`，不允许客户端通过请求参数指定 manifest 路径或 Skill 根目录。

#### 执行初始化

`POST /agent-bus/v1/builtin/init `

内部 action: `builtin.init`

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

内部 action: `builtin.init.status`

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

| ---------------------- | ------ | ------------- | ---------------------------------------------- |
| `includeDetails` | bool | `false` | 是否返回初始化状态表中的明细记录`states` |

WebSocket 调用时，`includeDetails` 放在 `payload` 中。

**响应:** [BuiltinInitResult](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#builtininitresult "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#builtininitresult")

**响应示例:**

`{ "initialized": false, "state": "STALE", "manifestId": "dolphindb-agent-builtins", "manifestVersion": "2026.05.13", "manifestHash": "sha256:...", "lastRunId": "builtin_init_xxx", "lastRunTime": "2026.05.13 12:30:00.000", "summary": { "createdAgents": 1, "createdSkills": 2, "updatedSkills": 0, "createdBindings": 1, "skippedExisting": 0, "skippedUnchanged": 0, "skippedUserModified": 0, "failed": 0 }, "lastFailures": [] } `

状态查询允许触发初始化状态表创建，便于管控 Web 在首次部署后直接查询。

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
7. History Tail         latest summary + raw tail，超出窗口时先触发 rolling summary
   `

说明：

* 框架内部会按最终输出预算为 chat 预留运行时空间，用于阈值判断和硬性窗口检查
* 该预留不是 `contextConfig` 的对外字段；请求和 LLM 配置未显式指定输出上限时，默认按 `clamp(contextWindow / 8, 8192, 32768)` 计算

**示例：**

`{ "maxContextTokens": 128000, "includeMemory": true, "memoryTopK": 5, "includeSkills": true, "summaryConfig": { "summaryLlmConfigId": "llm_summary_xxx", "triggerRatio": 0.8, "tailKeepTokens": 0, "onOverflow": "error" } } `

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

| --------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------- |
| `providerId`    | string    | 全局唯一 ID，注册时自动生成                                                                                             |
| `name`          | string    | Provider 名称，用于标识和展示                                                                                           |
| `adapterType`   | string    | 运行时 provider 适配器类型：`openai`/`openai-compatible`/`anthropic`/`deepseek`/`azure`/`local` |
| `baseUrl`       | string    | Provider 级基础 URL，如`https://api.openai.com`                                                                     |
| `apiKey`        | string    | Provider API Key。对外返回时始终脱敏为`***`；未配置时返回空字符串                                                   |
| `enabled`       | bool      | 是否启用                                                                                                                |
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
| `contextWindow`      | int                                                                                                                                                                                                                                                                                                                                                                        | 模型上下文窗口大小（token 数），用于上下文组装时的预算计算。为 0 时使用`contextConfig.maxContextTokens`                                                                                                  |
| `maxConcurrency`     | int                                                                                                                                                                                                                                                                                                                                                                        | 该 LLM 配置的最大并发请求数                                                                                                                                                                                  |
| `rateLimitRPM`       | int                                                                                                                                                                                                                                                                                                                                                                        | 速率限制（每分钟最大请求数）                                                                                                                                                                                 |
| `timeoutMs`          | int                                                                                                                                                                                                                                                                                                                                                                        | 单次 LLM 请求超时时间（毫秒）                                                                                                                                                                                |
| `retryConfig`        | object                                                                                                                                                                                                                                                                                                                                                                     | 重试配置：`maxRetries`（默认 3）、`initialDelayMs`（默认 1000）、`backoffMultiplier`（默认 2.0）、`maxDelayMs`（默认 30000）、`retryableStatusCodes`（默认 [429, 500, 502, 503]）        |
| `enabled`            | bool                                                                                                                                                                                                                                                                                                                                                                       | 是否启用                                                                                                                                                                                                     |
| `schemaVersion`      | int                                                                                                                                                                                                                                                                                                                                                                        | 行 Schema 版本号                                                                                                                                                                                             |
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
| `promptTokens`     | int       | 产生该消息时的输入 token 数（LLM 返回的 usage 统计），用于计量                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `completionTokens` | int       | 产生该消息时的输出 token 数（LLM 返回的 usage 统计），用于计量                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `totalTokens`      | int       | 总 token 数（通常等于 promptTokens + completionTokens），用于摘要与上下文 token 估算                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `metadata`         | object    | 自定义元数据，JSON 格式                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `schemaVersion`    | int       | 行 Schema 版本号                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `extra`            | string    | 预留扩展字段                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `createTime`       | timestamp | 消息创建时间                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

---

### MemoryEntry

| 字段

```
| 类型


  | 说明


                                                                                                                                                         |
```

| ---------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `memoryId`       | string    | 记忆唯一 ID，存储时自动生成                                                                                                                                      |
| `agentId`        | string    | 所属 Agent ID                                                                                                                                                    |
| `userId`         | string    | scope 为`user`时标识所属用户；scope 为`agent`时为空                                                                                                      |
| `scope`          | string    | 作用域：`agent`（agent 级别，所有用户可读）/`user`（用户级别，仅该 userId 可读写）                                                                       |
| `category`       | string    | 分类标签（如`"fact"`、`"preference"`、`"instruction"`），用于按分类检索和统计                                                                        |
| `content`        | string    | 记忆文本内容                                                                                                                                                     |
| `importance`     | double    | 重要度，取值范围 [0, 1]。参与混合排序                                                                                                                            |
| `accessCount`    | int       | 访问次数，每次通过 get 或 search 命中时自动 +1。参与混合排序                                                                                                     |
| `lastAccessTime` | timestamp | 最后访问时间，每次通过 get 或 search 命中时自动更新                                                                                                              |
| `expireTime`     | timestamp | 过期时间（毫秒时间戳），为空表示永不过期                                                                                                                         |
| `source`         | string    | 记忆来源：`manual`（手动创建）/`auto_extract`（自动提取）/`api`（API 写入）                                                                          |
| `sourceRef`      | string    | 来源引用信息（如来源的 sessionId 或 messageId）                                                                                                                  |
| `metadata`       | object    | 自定义元数据，JSON 格式                                                                                                                                          |
| `schemaVersion`  | int       | 行 Schema 版本号                                                                                                                                                 |
| `createTime`     | timestamp | 创建时间。参与混合排序中的时间衰减得分                                                                                                                           |
| `updateTime`     | timestamp | 最后更新时间                                                                                                                                                     |
| `textScore`      | double    | 全文搜索得分（仅搜索结果中返回），由 textdb 全文索引计算                                                                                                         |
| `relevanceScore` | double    | 语义检索得分（仅搜索结果中返回）。仅当所属 agent 启用了 memory embedding 时有意义，由启用的 embedding 配置中的`embeddingMetric`/`embeddingNormalize`定义 |
| `hybridScore`    | double    | 混合排序得分（仅搜索结果中返回），综合 importance、recency、semantic、access、text 等信号；当所属 agent 未启用 embedding 或语义分支不可用时，基于剩余信号计算    |

---

### MemoryRebuildStatus

| 字段

```
| 类型


         | 说明


                                                                                        |
```

| ----------------------- | ------------------ | ------------------------------------------------------------------------------------------------- |
| `jobId`           | string           | 重建任务 ID；没有历史任务时为空                                                                 |
| `state`           | string           | 任务状态：`queued`/`running`/`succeeded`/`failed`/`cancelled`/`unknown` |
| `completed`       | int              | 已处理的记忆条数                                                                                |
| `total`           | int              | 本次任务需要处理的记忆条数                                                                      |
| `error`           | string           | 失败或取消原因；成功时为空                                                                      |
| `startTime`       | timestamp / null | 任务开始时间                                                                                    |
| `updateTime`      | timestamp / null | 最近状态更新时间                                                                                |
| `cancelRequested` | bool             | 是否已收到取消请求                                                                              |

---

### SkillInfo

| 字段

```
| 类型


  | 说明


                                                                                                 |
```

| ------------------------------ | ----------- | ---------------------------------------------------------------------------------------------------------- |
| `skillId`                | string    | 技能唯一 ID，注册时自动生成                                                                              |
| `name`                   | string    | 技能名称，启用状态下全局唯一。用于应用层`activeSkillNames`引用和目录展示                             |
| `description`            | string    | 技能描述，在 Tier-1 技能目录中展示，帮助 LLM 判断是否需要该技能                                          |
| `license`                | string    | 许可证信息                                                                                               |
| `compatibility`          | string    | 兼容性说明（如最低框架版本要求）                                                                         |
| `argumentHint`           | string    | 参数提示信息，在 Tier-1 目录中展示，提示 LLM 如何调用该技能                                              |
| `disableModelInvocation` | bool      | 是否禁止 LLM 自动调用。为`true`时该技能不会出现在 LLM 的工具目录（Tier-1）中，但仍可通过用户显式调用 |
| `userInvocable`          | bool      | 是否允许用户直接调用该技能                                                                               |
| `hasInstruction`         | bool      | 技能包中是否包含 Tier-2 指令（SKILL.md frontmatter 之后的正文内容）                                      |
| `contentRevision`        | int       | 技能包文件内容版本                                                                                       |
| `contentHash`            | string    | 当前 Skill 规范化内容 hash                                                                               |
| `displayName`            | string    | 技能显示名称                                                                                             |
| `category`               | string    | 技能分类标签，用于按分类筛选                                                                             |
| `version`                | string    | 语义版本号（如`1.0.0`）                                                                              |
| `isCommon`               | bool      | 是否为 common skill；common skill 默认被所有 Agent 继承                                                  |
| `enabled`                | bool      | 是否启用；禁用时不参与目录和指令组装                                                                     |
| `ownerUserId`            | string    | 技能所属用户                                                                                             |
| `metadata`               | object    | 自定义元数据                                                                                             |
| `schemaVersion`          | int       | 行 Schema 版本号                                                                                         |
| `extra`                  | string    | 预留扩展字段                                                                                             |
| `createTime`             | timestamp | 创建时间                                                                                                 |
| `updateTime`             | timestamp | 最后更新时间                                                                                             |

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
| `subjectType`   | string    | 绑定主体类型：`AGENT`（agent 级别绑定）/`DB_USER`（用户级限制） |
| `subjectId`     | string    | 绑定主体 ID（agentId 或 DolphinDB userId）                              |
| `available`     | bool      | 派生可用状态。为`false`时该技能不进入 catalog 和 context            |
| `source`        | string    | 绑定来源：`EXPLICIT`、`COMMON_INHERITED`、`COMMON_DISABLED` |
| `schemaVersion` | int       | 行 Schema 版本号                                                        |
| `extra`         | string    | 预留扩展字段                                                            |
| `createTime`    | timestamp | 绑定时间                                                                |
| `updateTime`    | timestamp | 最后更新时间                                                            |
| `skill`         | SkillInfo | 关联的技能完整信息（列表接口中可选返回）                                |

---

### BuiltinInitResult

`/builtin/init` 与 `/builtin/init/status` 的响应结构。初始化接口返回当前执行结果；状态接口返回最近一次非 dryRun 初始化状态。

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

Workspace 业务错误通过上述 DataBus 错误 envelope 返回，具体原因在 `error.message` 中体现。常见标识如下：

| 标识

```
| 说明


                                                      |
```

| ----------------------------------- | --------------------------------------------------------------- |
| `WORKSPACE_REDIRECT`          | 非错误 payload，表示客户端应重定向到 workspace home node 重试 |
| `FILE_NOT_FOUND`              | workspace 文件不存在                                          |
| `FILE_TOO_LARGE`              | 文件超过单文件大小限制                                        |
| `QUOTA_EXCEEDED`              | workspace 总大小或文件数量超过限制                            |
| `READONLY_WORKSPACE`          | session 已归档，只允许读取                                    |
| `DELETE_TARGET_INVALID`       | 删除目标不是 workspace 内的普通文件                           |
| `PATCH_CONFLICT`              | patch hunk 与目标文件内容不匹配或 patch 格式不合法            |
| `PATCH_MULTI_FILE`            | patch 包含多文件或 git metadata                               |
| `PATCH_FILE_NAME_NOT_ALLOWED` | patch 文件头与目标文件名不一致                                |

---

## 6. WebSocket 协议

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

`{ "type": "REQUEST", "requestId": "req_001", "action": "chat.completions", "agentId": "agent_xxx", "sessionId": "sess_001", "payload": { "message": "你好", "stream": true, "contextEvent": true } } `

**响应帧:**

`{ "type": "RESPONSE", "msgId": "...", "correlationId": "req_001", "action": "chat.completions", "agentId": "agent_xxx", "sessionId": "sess_001", "data": { ... } } `

**流式帧:**

`{"type": "EVENT", "msgId": "...", "correlationId": "req_001", "action": "context.compaction", "agentId": "agent_xxx", "sessionId": "sess_001", "data": {"phase": "start"}} {"type": "EVENT", "msgId": "...", "correlationId": "req_001", "action": "context.compaction", "agentId": "agent_xxx", "sessionId": "sess_001", "data": {"phase": "end", "generated": true}} {"type": "STREAM_START", "msgId": "...", "correlationId": "req_001", "action": "chat.completions", "agentId": "agent_xxx", "sessionId": "sess_001", "data": {"requestId": "req_001", "model": "<resolved-model>", "llmConfigId": "llm_xxx"}} {"type": "STREAM_REASONING", "msgId": "...", "correlationId": "req_001", "action": "chat.completions", "agentId": "agent_xxx", "sessionId": "sess_001", "data": {"reasoning": "..."}} {"type": "STREAM_CHUNK", "msgId": "...", "correlationId": "req_001", "action": "chat.completions", "agentId": "agent_xxx", "sessionId": "sess_001", "data": {"content": "..."}} {"type": "STREAM_END", "msgId": "...", "correlationId": "req_001", "action": "chat.completions", "agentId": "agent_xxx", "sessionId": "sess_001", "data": {...}} `

WebSocket 对话补全也支持 `contextEvent=true`，上下文压缩事件使用同一个 `correlationId` 返回；普通 HTTP JSON 响应会忽略该参数。

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
| `llm.provider.register`   | POST /llm/provider/register               |
| `llm.provider.get`        | GET /llm/provider/{id}                    |
| `llm.provider.list`       | GET /llm/provider/list                    |
| `llm.provider.update`     | PUT /llm/provider/{id}                    |
| `llm.provider.delete`     | DELETE /llm/provider/{id}                 |
| `llm.config.register`     | POST /llm/config/register                 |
| `llm.config.get`          | GET /llm/config/{id}                      |
| `llm.config.list`         | GET /llm/config/list                      |
| `llm.config.update`       | PUT /llm/config/{id}                      |
| `llm.config.delete`       | DELETE /llm/config/{id}                   |
| `llm.complete`            | POST /llm/complete                        |
| `llm.usage`               | GET /llm/usage                            |
| `network.fetch`           | POST /network/fetch                       |
| `builtin.init`            | POST /builtin/init                        |
| `builtin.init.status`     | GET /builtin/init/status                  |
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
| `workspace.list`          | GET /workspace/{sessionId}/files          |
| `workspace.read`          | GET /workspace/{sessionId}/file           |
| `workspace.write`         | POST /workspace/{sessionId}/file          |
| `workspace.delete`        | DELETE /workspace/{sessionId}/file        |
| `workspace.search`        | POST /workspace/{sessionId}/search        |
| `workspace.applyPatch`    | POST /workspace/{sessionId}/patch         |
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
| `skill.delete`            | DELETE /skill/{id}                        |
| `skill.list`              | GET /skill/list                           |
| `skill.getInstruction`    | GET /skill/{id}/instruction               |
| `skill.files.list`        | GET /skill/{id}/files/list                |
| `skill.files.get`         | GET /skill/{id}/files/get                 |
| `skill.files.search`      | POST /skill/{id}/files/search             |
| `skill.files.batchGet`    | POST /skill/{id}/files/batchGet           |
| `skill.bind`              | POST /skill/bind                          |
| `skill.unbind`            | POST /skill/unbind                        |
| `skill.bindings`          | GET /skill/{agentId}/bindings             |
| `skill.catalog`           | GET /skill/{agentId}/catalog              |
| `skill.context`           | POST /skill/{agentId}/context             |
| `skill.user.deny`         | POST /skill/user/deny                     |
| `skill.user.allow`        | POST /skill/user/allow                    |
| `skill.user.denied`       | GET /skill/{agentId}/user/{userId}/denied |

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

`{ "schemaVersion": 1, "manifestId": "dolphindb-agent-builtins", "manifestVersion": "2026.05.13", "skills": [ { "name": "dolphindb-sql-guide", "package": "skills/dolphindb-sql-guide.zip", "common": true }, { "name": "data-analysis-playbook", "package": "skills/data-analysis-playbook.zip", "common": false } ], "agents": [ { "agentId": "agent_builtin_550e8400-e29b-41d4-a716-446655440000", "agentName": "Data Q&A Assistant", "description": "Built-in data analysis assistant", "status": "ACTIVE", "systemPromptFile": "prompts/data-assistant.md", "skills": [ "data-analysis-playbook" ], "contextConfig": { "includeSkillCatalog": true, "includeMemory": false }, "memoryConfig": { "embeddingEnabled": false }, "config": { "builtin": true, "builtinVersion": "2026.05.13" } } ] } `

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

注：以上设置来自 Skill 自身配置；绑定关系不提供 agent 级描述或配置覆盖。

### 注册时的解析流程

1. 校验 ZIP 格式合法性
2. 在 ZIP 中定位 `SKILL.md`（根目录或唯一子目录）
3. 分离 YAML frontmatter 和 Markdown body
4. frontmatter → 对应表列（已建列字段直接映射，未建列字段收入 `metadata`）
5. 包内每个具体文件 → `agent_skill_file.contentBase64`
6. 校验 `name` 格式和唯一性（启用状态下不可重名）
7. 合并 API 传入的 `overrides`（覆盖 frontmatter 同名字段）
8. 写入存储，返回 [SkillInfo](https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#skillinfo "https://vscode-remote+ssh-002dremote-002b192-002e168-002e0-002e182.vscode-resource.vscode-cdn.net/home/qwzhu/vscode/DolphinDB5_refactor/.doc/api_reference.md#skillinfo")
