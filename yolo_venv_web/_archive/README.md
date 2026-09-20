# _archive —— 不属于本课题的模板残留（**不是垃圾场，别删**）

> 建：2026-09-19（Track A 任务 A6）
> 来源：本工程 `yolo_venv_web` 是从一个 **uni-app 模板工程**改的，
> 里面混进了作者**别的项目**的大量文件。A6 把它们**移到这里**，
> **没有删除** —— 因为 A5（登录链路）尚未定稿，可能还要从里面取东西。

## 为什么用「移动」而不是「删除」

`git mv` 保留了全部历史，任何一项都能一条命令取回：

```bash
# 取回单个云函数
git mv _archive/uniCloud-cloudfunctions/register uniCloud-alipay/cloudfunctions/register

# 取回单个 core 文件
git mv _archive/core/model/use-chat-model.ts core/model/use-chat-model.ts
```

## 一、`core/` —— 与"音乐/聊天/动漫"模板相关的死代码

**判定依据**：从 `main.js` / `App.vue` / `pages.json` 出发做**全链条可达性分析**，
以下文件**引用计数为 0**（grep 证据见 `03-uni-app客户端.md` A6 执行记录）：

| 归档文件 | 它是干什么的 |
|---|---|
| `core/model/use-music-model.ts` | 音乐播放器模板 |
| `core/model/use-chat-model.ts` | 聊天模板 |
| `core/model/use-anime-model.ts` | 动漫模板 |
| `core/model/use-favorite-model.ts` | 收藏 |
| `core/model/use-selection-model.ts` | 选择 |
| `core/model/use-session-model.ts` | 会话 |
| `core/model/use-touch-handler.ts` | 触摸手势 |
| `core/data/music-data.ts` | 上述 model 的数据层 |
| `core/data/message-data.ts` | 同上 |
| `core/data/session-data.ts` | 同上 |

⚠️ **注意 `use-user-model.ts` 不在归档里**——它是**活的**，被 5 处引用。
但要看清楚：它引用的是 `push-service.ts`（一键登录推送）和 `net-api.ts`
（整套聊天后端 REST），**与道路病害无关**。它目前**连在一条死链路上**，
`utils/classMap.js` 那套才是本课题真正在用的。**A5 定稿时再决定它的去留。**

**归档后 `core/` 只剩 5 个文件**，且互相引用闭环、无悬空 import：
`bean/index.ts`、`data/user-data.ts`、`model/use-user-model.ts`、
`net/net-api.ts`、`services/push-service.ts`。

## 二、`uniCloud-cloudfunctions/` —— 40 个全部与本课题无关

**判定依据**：全工程 `grep -rn "uniCloud.callFunction"` = **0 命中**
（只有 `Login/index.js` 和 `uni_modules/` 里的注释提到 callFunction）。
**前端根本不调用任何云函数**，所以 40 个全是孤儿。

分层证据（逐目录读过 `index.js`）：

| 组 | 云函数 | 明显属于别的项目 |
|---|---|---|
| Vheart 系列 | `Vheart-Model`、`Vheart-chatApi`、`Api-Vheart-Chat`、`Api-Vheart_MBTI`、`Api-Auth-MBTI` | 另一个 uni-app x 工程 |
| 商品诊断 | `ai-diagnose`、`record-save`、`deepseek-chat` | **提示词原文写着**「你是一个**商品冷静期诊断助手**」——购物决策，与道路病害毫无关系 |
| 音乐/字典/知乎 | `ReqMusic`、`RequestMusic-NetEase`、`Harmony_Dictionary`、`Harmony_PicLink`、`Web_zhihuNews`、`Famous_school_records`、`TextDungeon_UserData`、`RelicsDream-updata`、`Free_image`、`pixel_getimage` | 各类小工具模板 |
| 智能家居 | `SmartHome_Register`、`SmartHome_UserLogin`、`getDeviceData`、`uploadDeviceData` | ⚠️ **最容易被误认成是本课题的**：它们的确是 ESP32 上行链路，但字段是 `temperature` / `humidity`（温湿度传感器），**不是检测结果**。**不是本项目要用的那套** |
| 登录/注册 | `Login`、`userLogin`、`register`、`getPhoneNumber`、`deleteUser`、`weixinLogin`、`Api-Auth`、`Api-AuthWeixin` | ⚠️ **A5 若选方案①，这里面的 `Api-Auth` / `register` / `userLogin` 可能要用** —— 取回方法见上 |
| uni 官方统计 | `uni-stat-cron`、`uni-stat-receiver`、`uni-analyse-searchhot`、`uni-upgrade-center`、`uni-portal`、`uni-sms-co` | 从 uni-admin 模板带进来的 |
| `common/uni-stat` | 整个目录 | uni-admin 模板的统计公共模块（`package.json` 里 `plugin-dev-name: uni-template-admin`） |

> ⚠️ **`register/index.js:27` 以明文存储密码** —— 若 A5 选方案①要复用它，
> **必须先改成加盐哈希**，否则论文 §4.6 的 RBAC/加盐哈希叙述不成立。
> 详见 `03-uni-app客户端.md` A5。
>
> ⚠️ `ai-diagnose/index.js` 会调用火山方舟 ARK API，但 **key 是从环境变量读的**
> （`process.env.ARK_API_KEY || ""`，见该文件 `:40`）——**文件里没有明文 key**。
> 实测：全工程 `grep -rn "ark-[0-9a-zA-Z]\{8\}"` = **0 命中**，
> `git log --all -S "ark-0efffc43"` 也 = **0 命中**。归档它不会泄露任何密钥。

## 三、不要归档的东西

| 路径 | 为什么留着 |
|---|---|
| `uni_modules/` | uni-app 官方/第三方插件（含 `uni-id-pages`），HBuilderX 按需引用，**不是残留** |
| `unpackage/` | 构建产物，跑一次构建就会被覆盖；里面的旧内容不影响源码 |
| `core/model/use-user-model.ts` 等 5 个文件 | 见上，A5 定稿前不动 |
