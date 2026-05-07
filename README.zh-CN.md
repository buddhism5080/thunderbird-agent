# Thunderbird Agent

[English](README.md) | [简体中文](README.zh-CN.md)

Thunderbird Agent 把本地 Thunderbird 配置文件暴露成一个**面向 AI agent 的 CLI 优先自动化接口**。

它适合 Claude Code、Codex、OpenClaw、Hermes 以及其他能够执行 shell 命令的 agent，用来安全地处理：

- 邮件搜索与读取
- 草稿、回复、转发
- 文件夹整理、标签与清理
- 过滤器的增删改查与手动执行
- 联系人、日历与任务

项目结构刻意保持简单：

1. **Thunderbird 扩展**：真正的执行端与权限边界
2. **共享传输核心**：连接发现、鉴权、重试、localhost JSON-RPC
3. **本地 CLI**：agent 主要调用入口
4. **仓库内说明与 skill**：供不同 agent runtime 复用

---

## 项目来源

这个仓库是**直接从** [`TKasperczyk/thunderbird-mcp`](https://github.com/TKasperczyk/thunderbird-mcp) **重构出来的**，那才是这次改造工作的实际起点。

该上游 README 里也提到它早先受过 [`bb1/thunderbird-mcp`](https://github.com/bb1/thunderbird-mcp) 启发，但就这次重构而言，当前项目的**直接来源仓库**是 `TKasperczyk/thunderbird-mcp`。

现在的 Thunderbird Agent 已经是一个范围更明确的下游重写版本，和原项目相比主要变化是：

- 项目名改为 `thunderbird-agent`
- 入口改为 CLI-first，而不是 MCP-first
- 不再保留 MCP 兼容层
- 增加面向多种 AI agent 的通用 instruction / skill surfaces

本 README 不再嵌入上游的演示动图；后续如果需要演示素材，应单独为当前仓库重新录制。

---

## 这个项目解决什么问题

Thunderbird 是很强的本地邮件客户端，但很多 AI 自动化方案默认只考虑浏览器自动化或云端 API。
Thunderbird Agent 的目标是：

- **邮件仍留在本地 Thunderbird 中**
- **agent 可以获得高层工具接口**
- **尽量不引入远程服务和额外协议层**

默认安全姿态比较保守：

- 发信相关流程优先走 Thunderbird 内复核界面
- 账户可见性和工具权限由扩展设置控制
- 鉴权令牌是会话级的，本地保存于连接文件
- 没有远程监听器，也没有云端转发

---

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/buddhism5080/thunderbird-agent.git
cd thunderbird-agent
```

### 2. 构建扩展产物

```bash
npm run build
```

构建结果包括：

- `dist/thunderbird-agent.xpi`
- 更新后的 `shared/tool-catalog.json`

### 3. 在 Thunderbird 中安装扩展

在 Thunderbird 里：

- 打开 **工具 → 附加组件和主题**
- 点击右上角齿轮菜单
- 选择 **从文件安装附加组件...**
- 选中 `dist/thunderbird-agent.xpi`
- 重启 Thunderbird

如果是在本地工作站，也可以直接执行：

```bash
./scripts/install.sh
```

### 4. 验证 CLI 能否连到 Thunderbird

```bash
node packages/cli/thunderbird-agent.cjs doctor
```

### 5. 直接调用工具

```bash
node packages/cli/thunderbird-agent.cjs tools list
node packages/cli/thunderbird-agent.cjs tools call searchMessages --args '{"query":"invoice","maxResults":10}'
```

如果已经全局安装 CLI：

```bash
thunderbird-agent doctor
thunderbird-agent tools list
```

---

## 当前能力范围

Thunderbird Agent 目前导出 **36 个工具**，大致分为六类：

### 邮件

- 账户与文件夹查询
- 邮件搜索、读取、展示
- 邮件更新、删除
- 文件夹创建、重命名、移动、删除
- 清空垃圾箱 / 垃圾邮件

### 写信相关

- `sendMail`
- `replyToMessage`
- `forwardMessage`

### 过滤器

- `listFilters`
- `createFilter`
- `updateFilter`
- `deleteFilter`
- `reorderFilters`
- `applyFilters`

### 联系人

- 联系人搜索、创建、更新、删除

### 日历与任务

- 日历列表
- 事件创建、查询、更新、删除
- 任务创建、查询、更新

### 访问控制可见性

- `getAccountAccess`

查看权威机器可读目录：

```bash
node packages/cli/thunderbird-agent.cjs tools list --catalog
```

---

## 常用 CLI 命令

```bash
thunderbird-agent doctor
thunderbird-agent tools list
thunderbird-agent tools list --catalog
thunderbird-agent tools call searchMessages --args '{"query":"from:alice report","maxResults":5}'
thunderbird-agent rpc --request '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

命令说明：

- `doctor`：检查连接发现与实时可达性
- `tools list`：读取正在运行的 Thunderbird 暴露出来的实时工具列表
- `tools list --catalog`：查看离线导出的工具目录
- `tools call <name> --args <json>`：直接调用单个工具并打印 JSON 结果
- `catalog [show <name>]`：查看共享工具目录
- `rpc --request <json>`：手工发原始 JSON-RPC 请求，便于调试

---

## 推荐使用流程

### 读邮件并总结

1. 先用 `searchMessages` 缩小范围
2. 用 `getMessage` 读取目标邮件
3. 再让 agent 总结、归类、给出建议

### 安全回复邮件

1. 先定位目标邮件
2. 使用 `replyToMessage`
3. 默认保持 `skipReview: false`
4. 让用户在 Thunderbird 里复核后再发送

### 做批量清理

1. 先用 `searchMessages` + `countOnly` 估算范围
2. 必要时再取具体邮件
3. 使用 `updateMessage`、`deleteMessages`、`applyFilters`、`emptyTrash`、`emptyJunk`

### 创建过滤器

1. 先看真实邮件样本
2. 再用 `createFilter` 建规则
3. 用 `listFilters` 确认顺序
4. 必要时用 `applyFilters` 手工执行

---

## 面向不同 agent 的集成入口

这个仓库主要针对的是：**有仓库上下文、能跑 shell 命令的 agent**。

主要入口有：

- `AGENTS.md`：通用 agent 仓库级说明
- `CLAUDE.md`：Claude Code 辅助说明
- `skills/thunderbird-agent/SKILL.md`：可复用的 Thunderbird 工作流 skill
- `docs/agents/`：面向 Claude Code、Codex、OpenClaw 的简明说明

建议从这里开始看：

- `docs/README.md`
- `docs/agents/README.md`

---

## 构建与打包

标准构建命令：

```bash
npm run check:versions
npm run build:catalog
npm run build:xpi
npm run build
npm run pack:check
```

它们的作用分别是：

- `check:versions`：确保 `package.json` 与 `extension/manifest.json` 版本一致
- `build:catalog`：重新导出 `shared/tool-catalog.json`
- `build:xpi`：生成 `dist/thunderbird-agent.xpi`，且**不污染源码树**
- `build`：执行完整本地发布流水线
- `pack:check`：预览 npm 包内容与体积

npm 包会保留：

- CLI
- 扩展源码
- tool catalog
- skill / docs 说明面
- 已构建的 XPI 产物

同时会排除仅仓库内部使用的大型资源。

---

## 连接发现

共享传输层在缓存失效时会重新寻找 `connection.json`，搜索顺序为：

1. `THUNDERBIRD_AGENT_CONNECTION_FILE`
2. 本机临时目录：`<os.tmpdir()>/thunderbird-agent/connection.json`
3. macOS 临时目录回退：`/var/folders/*/*/T/thunderbird-agent/connection.json`
4. Thunderbird Snap `TMPDIR` 及 snap 官方回退路径
5. Flatpak / Betterbird 在 `$XDG_RUNTIME_DIR/app/*/thunderbird-agent/connection.json` 下的运行时路径

常用覆盖变量：

```bash
export THUNDERBIRD_AGENT_CONNECTION_FILE=/absolute/path/to/connection.json
export THUNDERBIRD_AGENT_CLI=/absolute/path/to/thunderbird-agent/packages/cli/thunderbird-agent.cjs
```

---

## 安全模型

- **仅 localhost**：没有远程监听
- **会话级 bearer token**：写入本地连接文件，并使用较严格权限
- **写信优先复核**：邮件可先在 Thunderbird 中打开复核
- **账户权限可控**：扩展设置里可限制 mailbox 可见范围
- **工具权限可控**：扩展设置里可按工具禁用能力

如果要让 agent 发送或修改邮件，除非用户明确要求静默发送，否则建议始终保持 `skipReview: false`。

---

## 故障排查

| 问题 | 优先检查 |
|---|---|
| `doctor` 提示找不到 connection file | Thunderbird 是否运行；扩展是否启用；连接文件覆盖路径是否正确 |
| CLI 只能读 catalog，读不到 live tools | Thunderbird 还没启动，或扩展初始化失败 |
| compose 相关调用在 `skipReview` 下失败 | 可能是扩展侧仍开启了安全阻止策略 |
| IMAP 状态看起来过期 | 先在 Thunderbird 中打开对应文件夹，或执行同步/修复后重试 |
| 没有生成构建产物 | 重新执行 `npm run build`，确认 `dist/thunderbird-agent.xpi` 存在 |

---

## 文档索引

- `README.md` — 英文主文档
- `docs/README.md` — 文档总览
- `docs/agents/README.md` — agent 集成总览
- `docs/agents/claude-code.md` — Claude Code 说明
- `docs/agents/codex.md` — Codex 说明
- `docs/agents/openclaw.md` — OpenClaw 说明
- `docs/filter-api-research.md` — 归档的过滤器实现研究笔记

---

## 开发检查清单

```bash
npm test
npm run build
npm run pack:check
```

如果你修改了 `extension/agent_server/api.js` 里的工具元数据，提交前记得刷新 `shared/tool-catalog.json`。
