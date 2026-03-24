<p align="center">
  <a href="https://byerun.pages.dev" target="_blank" rel="noopener noreferrer">
    <img width="180" src="https://raw.githubusercontent.com/yanyaoli/byerun-web/main/public/favicon.svg" alt="Byerun logo">
  </a>
</p>

<h1 align="center"/>Byerun <sup><em>web</em></sup></h1>

<p align="center">
Goodbye Unirun - 校园跑步助手 Web 版 & 自动化签到守护助手🏃‍♂️
</p>

## 前言

基于 https://github.com/yanyaoli/byerun-web 项目旧版本进行二次开发, 着重于本地运行, 新添加俱乐部定时签到签退功能

## ✨ 核心功能

本项目不仅提供供日常浏览操作的现代 Web 端视图，还内置了**全自动、防风控的俱乐部活动签到/签退托管系统**。支持通过**纯前端 Web Worker 长效轮询** 或 **Node.js 守护脚本** 两种方式运行，自动识别目标活动时间窗口并完成地理位置打卡，彻底解放双手。

### 🛡️ 自动化反风控与高可用特性 (Anti-WAF)

- **动态频率与时间窗口 (New)**：前端托管系统具备智能休眠与冲刺模式。在活动窗口外保持低频（10~15分钟）心跳节省资源；临近活动时自动进入高频（2~5分钟）监测；进入窗口期后执行操作，防错过。
- **Web Worker 线程保活 (New)**：前端 Web 端采用独立的 Web Worker 进行多线程定时任务调度，即使页面切换到后台也能在一定程度上抵抗浏览器的休眠冻结（建议手机端保持屏幕常亮）。
- **指数退避重试**：遇到网络异常或接口限制时，按照 $2^n$ 秒加随机抖动进行指数级重试，防止并发过高被封禁。
- **地理位置抖动**：每次打卡时在基准经纬度上加入随机坐标微小偏移，规避物理坐标长期完全一致的高危风控。
- **静默断线重连**：当检测到 Token 失效或被踢下线时，系统会自动利用本地缓存凭证静默重登，恢复托管接管，无需人工干预。

## 🌐 Web 端托管使用方法（推荐）

直接访问已部署的 Web 端（或本地启动），在【仪表盘】->【签到】面板中：

1. **报名活动**：查看并报名近期的俱乐部活动。
2. **开启托管**：打开「🚀 自动签到/签退托管」开关。
3. **保持运行**：设置好允许的签到/签退窗口误差（默认±10分钟）。**建议在手机上将页面保持在前台，并开启“屏幕常亮”，系统将自动完成后续所有的签到和签退操作。**

---

## 🚀 独立 Node.js 脚本使用方法

如果您有长期挂机的服务器，可以使用项目内自带的 Node 脚本进行 24 小时无人值守。

⚠️ **特别提示**：由于目标服务器配置了 Cloudflare WAF（五秒盾），会严格封杀来自 GitHub Actions、Azure 等国外云主机数据中心的 IP 段（报 `403 Forbidden`）。**强烈建议在国内云服务器或软路由/树莓派上运行。**

### 1. 初始化

```bash
cd app
npm install
```

### 2. 配置环境变量与运行

在你的运行环境中注入你的账号信息：

- **Windows (PowerShell)**:
  ```powershell
  $env:USER_PHONE="你的手机号"
  $env:USER_PWD="你的明文密码"
  node scripts/runner.js
  ```
- **Linux / macOS**:
  ```bash
  export USER_PHONE="你的手机号"
  export USER_PWD="你的明文密码"
  node scripts/runner.js
  ```

> **长期挂机建议**：通过 Windows“任务计划程序” 或 Linux `crontab -e` 设置每 10~15 分钟执行一次该脚本。

---

## ☁️ 在线部署列表

| 部署平台   | Byerun                              | Unirun                              |
| ---------- | ----------------------------------- | ----------------------------------- |
| Cloudflare | [Byerun](https://byerun.pages.dev)  | [Unirun](https://unirun.pages.dev)  |
| Vercel     | [Byerun](https://byerun.vercel.app) | [Unirun](https://unirun.vercel.app) |

Web 端基于 Vue/Vite 开发，进入 `app` 目录后可通过 `npm run dev` 启动开发服务器。支持一键部署到 Cloudflare Worker 或 Vercel Serverless 以解决跨域问题。

## Disclaimer & License

This project is for learning and research purposes only and shall not be used for any commercial or illegal purposes. If you need to experience the full functionality, please use the official App.

Any direct or indirect risk damage of any nature caused by the use of this project shall be borne by the user, and the developer shall not bear any responsibility for the user`s illegal behavior.

Byerun is released under the [CC BY-NC License, Version 4.0](https://creativecommons.org/licenses/by-nc/4.0/).
Acknowledgements: [@msojocs/AutoRun](https://github.com/msojocs/AutoRun)
