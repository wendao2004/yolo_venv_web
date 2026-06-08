# 城市道路智能检测系统 - 前端

> uni-app (Vue 3) 跨平台前端项目，支持 H5、小程序、App
> **三个团队共用**：道路积水检测、病虫害检测、垃圾分类检测

---

## 目录结构

```
yolo_venv_web/
├── api/
│   └── websocket.js           # ⭐ WebSocket 通信配置（后端端口）
├── components/
│   ├── TopBar.vue             # ⭐ 顶部栏（Logo、标题）
│   ├── SideBar.vue            # ⭐ 侧边栏（检测类别文字）
│   └── VideoDisplay.vue       # 视频显示区域
├── pages/
│   └── index/
│       └── index.vue          # ⭐ 主页面
├── utils/
│   └── classMap.js            # ⭐ 检测类别映射（核心配置）
├── pages.json                 # ⭐ 页面配置（标题）
├── manifest.json              # ⭐ 应用配置（名称、描述）
├── uni.scss                   # 全局样式变量
└── index.html                 # 入口 HTML
```

---

## 快速开始

### 1. 环境要求

- HBuilderX 3.0+（用于 uni-app 开发）
- Node.js 16+
- 后端 WebSocket 服务（Python + YOLO）

### 2. 运行项目

1. 用 HBuilderX 打开 `yolo_venv_web/` 目录
2. 启动后端 WebSocket 服务（默认端口 8766）
3. 运行 → 运行到浏览器 → Chrome

### 3. 后端服务地址

```
WebSocket: ws://localhost:8766
HTTP Demo: http://localhost:8001/index.html
```

### 4. H5 打包

#### 4.1 打包步骤

1. 用 HBuilderX 打开 `yolo_venv_web/` 目录
2. 菜单 → **发行** → **网站-PC Web 或手机 H5**
3. 填写配置：
   - 网站标题：城市道路智能检测系统
   - 域名（可选）：`./`（本地运行用相对路径）
4. 点击 **发行**

#### 4.2 打包输出位置

```
yolo_venv_web/
└── unpackage/
    └── dist/
        └── build/
            └── h5/              ← 打包输出目录
                ├── index.html
                ├── static/
                └── ...
```

#### 4.3 本地运行打包产物

**⚠️ 重要**：H5 打包后是静态文件，**不能直接双击打开**，必须通过 HTTP 服务器运行。

**方案一：Python 内置服务器（推荐）**

```bash
# 进入打包目录
cd yolo_venv_web/unpackage/dist/build/h5

# 启动 HTTP 服务器（Python 3）
python -m http.server 8080

# 或 Python 2
python -m SimpleHTTPServer 8080
```

浏览器访问：
```
http://localhost:8080
```

**方案二：Node.js http-server**

```bash
# 全局安装
npm install -g http-server

# 进入打包目录
cd yolo_venv_web/unpackage/dist/build/h5

# 启动服务器
http-server -p 8080
```

**方案三：VS Code Live Server 插件**

1. VS Code 安装 **Live Server** 插件
2. 右键点击打包生成的 `index.html`
3. 选择 **Open with Live Server**

#### 4.4 打包后的 WebSocket 连接

打包后页面运行在 `http://localhost:8080`，会自动连接 WebSocket：

```
# 默认连接 8766
http://localhost:8080

# 指定连接其他端口（如病虫害检测后端）
http://localhost:8080/?wsPort=8765

# 垃圾分类检测
http://localhost:8080/?wsPort=9000
```

#### 4.5 常见问题

| 问题 | 原因 | 解决 |
|------|------|------|
| 双击 index.html 空白 | 浏览器跨域限制 | 必须用 HTTP 服务器，不能用 `file://` |
| WebSocket 连接失败 | 后端未启动 | 先启动 `python server.py` |
| 端口被占用 | 8080 被其他程序使用 | 换端口：`python -m http.server 9000` |

---

## ⭐ 后端对接配置

**位置**: [yolo_venv_web/api/websocket.js](file:///d:/GithubProject/yolo_venv_web/yolo_venv_web/api/websocket.js)

### 修改 WebSocket 端口

```javascript
// 第 19 行：修改默认端口
const wsPort = searchParams.get('wsPort') || '8766'  // 改这里

// 修改为你的端口，例如：
const wsPort = searchParams.get('wsPort') || '8765'
```

### 运行时切换端口（无需改代码）

访问时添加查询参数 `?wsPort=端口号`：

**开发环境（HBuilderX 运行到浏览器）**：
```
http://localhost:5173/?wsPort=8765
http://localhost:5173/?wsPort=8766
http://localhost:5173/?wsPort=9000
```

**打包后（HTTP 服务器运行）**：
```
http://localhost:8080/?wsPort=8765
http://localhost:8080/?wsPort=8766
http://localhost:8080/?wsPort=9000
```

### WebSocket 消息协议

| 消息类型 | 说明 |
|----------|------|
| `camera_list` | 摄像头列表，包含当前摄像头和模式 |
| `test_images_list` | 测试图片列表，包含数量和目录 |
| 帧数据 | 直接发送 `{ image, fps, frame, detections, camera_info }` |

### 发送命令

```javascript
// 选择摄像头
{ type: 'select_camera', camera_index: 0 }

// 设置模式
{ type: 'set_mode', mode: 'camera' | 'images' }

// 设置测试图片目录
{ type: 'set_test_dir', directory: 'path/to/images' }
```

---

## ⭐ 前端文字替换位置

### 1. 核心类别配置（最重要）

**文件**: [yolo_venv_web/utils/classMap.js](file:///d:/GithubProject/yolo_venv_web/yolo_venv_web/utils/classMap.js)

**修改前（道路积水检测）**:

```javascript
export const CLASS_MAP = {
  0: { name: '道路积水', en: 'waterlogging', key: 'waterlogging', color: '#409EFF', tagType: 'primary' },
  1: { name: '路面坑洼', en: 'pothole', key: 'pothole', color: '#F56C6C', tagType: 'danger' },
  2: { name: '井盖缺失', en: 'manhole_missing', key: 'manhole_missing', color: '#E6A23C', tagType: 'warning' },
  3: { name: '井盖破损', en: 'manhole_damaged', key: 'manhole_damaged', color: '#67C23A', tagType: 'success' }
}
```

**修改后示例（病虫害检测）**:

```javascript
export const CLASS_MAP = {
  0: { name: '蚜虫', en: 'aphid', key: 'aphid', color: '#409EFF', tagType: 'primary' },
  1: { name: '白粉病', en: 'powdery_mildew', key: 'powdery_mildew', color: '#F56C6C', tagType: 'danger' },
  2: { name: '红蜘蛛', en: 'red_spider', key: 'red_spider', color: '#E6A23C', tagType: 'warning' },
  3: { name: '炭疽病', en: 'anthracnose', key: 'anthracnose', color: '#67C23A', tagType: 'success' }
}
```

**同时修改以下映射**:

```javascript
// 后端类名 → 本地key
export const BACKEND_TO_LOCAL = {
  '积水': 'waterlogging',           // 改为你的后端输出
  '蚜虫': 'aphid',                   // 新增
  // ...
}

// 本地key → 显示信息
export const LOCAL_TO_DISPLAY = {
  'waterlogging': { name: '道路积水', color: '#409EFF', cssClass: 'water' },
  'aphid': { name: '蚜虫', color: '#409EFF', cssClass: 'aphid' },
  // ...
}
```

### 2. 侧边栏显示文字

**文件**: [yolo_venv_web/components/SideBar.vue](file:///d:/GithubProject/yolo_venv_web/yolo_venv_web/components/SideBar.vue)

**修改位置**: 第 12、22、32、42 行

```vue
<!-- 修改前 -->
<text class="class-name">积水</text>
<text class="class-name">坑洼</text>
<text class="class-name">井盖缺失</text>
<text class="class-name">井盖破损</text>

<!-- 修改示例 -->
<text class="class-name">蚜虫</text>
<text class="class-name">白粉病</text>
<text class="class-name">红蜘蛛</text>
<text class="class-name">炭疽病</text>
```

**图例说明**: 第 51、55、59、63 行

```vue
<!-- 修改前 -->
<text>积水 (waterlogging)</text>
<text>坑洼 (pothole)</text>
<text>井盖缺失 (manhole_missing)</text>
<text>井盖破损 (manhole_damaged)</text>

<!-- 修改示例 -->
<text>蚜虫 (aphid)</text>
<text>白粉病 (powdery_mildew)</text>
<text>红蜘蛛 (red_spider)</text>
<text>炭疽病 (anthracnose)</text>
```

### 3. 顶部栏 Logo 和标题

**文件**: [yolo_venv_web/components/TopBar.vue](file:///d:/GithubProject/yolo_venv_web/yolo_venv_web/components/TopBar.vue)

**修改位置**: 第 4 行

```vue
<!-- 修改前 -->
<text class="logo">🚦 城市道路智能检测系统</text>

<!-- 修改示例（病虫害） -->
<text class="logo">🌿 植物病虫害智能检测系统</text>

<!-- 修改示例（垃圾分类） -->
<text class="logo">🗑️ 智能垃圾分类检测系统</text>
```

### 4. 页面配置标题

**文件**: [yolo_venv_web/pages.json](file:///d:/GithubProject/yolo_venv_web/yolo_venv_web/pages.json)

**修改位置**: 第 7、14 行

```json
{
  "pages": [
    {
      "path": "pages/index/index",
      "style": {
        "navigationBarTitleText": "道路积水检测系统"  // ⭐ 改这里
      }
    }
  ],
  "globalStyle": {
    "navigationBarTitleText": "道路积水检测系统"  // ⭐ 改这里
  }
}
```

### 5. 应用配置（App 打包时）

**文件**: [yolo_venv_web/manifest.json](file:///d:/GithubProject/yolo_venv_web/yolo_venv_web/manifest.json)

**修改位置**: 第 2、4 行

```json
{
  "name": "yolo_venv_web",           // ⭐ 应用名称
  "description": "",                 // ⭐ 应用描述
  "versionName": "1.0.0",
  "versionCode": "100"
}
```

---

## 🎨 颜色主题配置

### 主色调

**文件**: [yolo_venv_web/components/TopBar.vue](file:///d:/GithubProject/yolo_venv_web/yolo_venv_web/components/TopBar.vue) 第 230 行

```scss
// 主色调（当前：道路积水红色系）
$primary: #e94560

// 可选配色：
// 病虫害：#4CAF50（绿色）
// 垃圾分类：#FF9800（橙色）
```

### 检测类别颜色

**文件**: [yolo_venv_web/utils/classMap.js](file:///d:/GithubProject/yolo_venv_web/yolo_venv_web/utils/classMap.js)

每个类别可独立设置颜色：

| 类别 | 颜色 | 说明 |
|------|------|------|
| 道路积水 | `#ffa500` | 橙色 |
| 路面坑洼 | `#ef4444` | 红色 |
| 井盖缺失 | `#00ffa5` | 青绿色 |
| 井盖破损 | `#ffff00` | 黄色 |

---

## 👥 三个团队使用指南

### 团队 A：道路积水检测（当前配置）

| 配置项 | 当前值 |
|--------|--------|
| WebSocket 端口 | `8766` |
| Logo | `🚦 城市道路智能检测系统` |
| 检测类别 | 积水、坑洼、井盖缺失、井盖破损 |
| 主色调 | `#e94560` |

**无需修改**，直接使用。

### 团队 B：病虫害检测

**需要修改的文件清单**:

| 文件 | 修改内容 | 行数 |
|------|----------|------|
| [classMap.js](file:///d:/GithubProject/yolo_venv_web/yolo_venv_web/utils/classMap.js) | 4 个类别映射、颜色 | 全部 |
| [SideBar.vue](file:///d:/GithubProject/yolo_venv_web/yolo_venv_web/components/SideBar.vue) | 侧边栏文字、图例 | 12, 22, 32, 42, 51, 55, 59, 63 |
| [TopBar.vue](file:///d:/GithubProject/yolo_venv_web/yolo_venv_web/components/TopBar.vue) | Logo 标题 | 4 |
| [pages.json](file:///d:/GithubProject/yolo_venv_web/yolo_venv_web/pages.json) | 页面标题 | 7, 14 |
| [websocket.js](file:///d:/GithubProject/yolo_venv_web/yolo_venv_web/api/websocket.js) | WebSocket 端口 | 19 |

**推荐配置**:
```
Logo: 🌿 植物病虫害智能检测系统
主色调: #4CAF50
类别: 蚜虫、白粉病、红蜘蛛、炭疽病
WebSocket: ?wsPort=8765
```

### 团队 C：垃圾分类检测

**需要修改的文件清单**:

| 文件 | 修改内容 | 行数 |
|------|----------|------|
| [classMap.js](file:///d:/GithubProject/yolo_venv_web/yolo_venv_web/utils/classMap.js) | 4 个类别映射、颜色 | 全部 |
| [SideBar.vue](file:///d:/GithubProject/yolo_venv_web/yolo_venv_web/components/SideBar.vue) | 侧边栏文字、图例 | 12, 22, 32, 42, 51, 55, 59, 63 |
| [TopBar.vue](file:///d:/GithubProject/yolo_venv_web/yolo_venv_web/components/TopBar.vue) | Logo 标题 | 4 |
| [pages.json](file:///d:/GithubProject/yolo_venv_web/yolo_venv_web/pages.json) | 页面标题 | 7, 14 |
| [websocket.js](file:///d:/GithubProject/yolo_venv_web/yolo_venv_web/api/websocket.js) | WebSocket 端口 | 19 |

**推荐配置**:
```
Logo: 🗑️ 智能垃圾分类检测系统
主色调: #FF9800
类别: 可回收、有害、厨余、其他
WebSocket: ?wsPort=9000
```

---

## 📝 快速替换清单

### 文字替换总表

| 替换位置 | 文件路径 | 搜索关键词 |
|----------|----------|------------|
| 端口号 | `api/websocket.js` | `8766` |
| Logo 标题 | `components/TopBar.vue` | `城市道路智能检测系统` |
| 侧边栏文字 | `components/SideBar.vue` | `积水`、`坑洼`、`井盖` |
| 图例说明 | `components/SideBar.vue` | `waterlogging`、`pothole` |
| 类别映射 | `utils/classMap.js` | `道路积水`、`路面坑洼` |
| 页面标题 | `pages.json` | `道路积水检测系统` |
| 应用名称 | `manifest.json` | `yolo_venv_web` |

### 颜色替换总表

| 替换位置 | 文件路径 | 搜索颜色 |
|----------|----------|----------|
| 主色调 | `components/TopBar.vue` | `#e94560` |
| 积水色 | `components/SideBar.vue` | `#ffa500` |
| 坑洼色 | `components/SideBar.vue` | `#ef4444` |
| 缺失色 | `components/SideBar.vue` | `#00ffa5` |
| 破损色 | `components/SideBar.vue` | `#ffff00` |

---

## 🔧 故障排查

### 1. WebSocket 连接失败

**现象**: 显示"未连接"

**检查步骤**:
1. 后端服务是否启动：`python server.py`
2. 端口是否正确：检查 `api/websocket.js` 第 19 行
3. 运行时切换端口：`?wsPort=8765`

### 2. 检测数据不显示

**现象**: 视频正常但统计为 0

**检查步骤**:
1. 后端返回的类名是否与 `BACKEND_TO_LOCAL` 匹配
2. 查看 Console 日志：`console.log(data.detections)`
3. 确认映射关系：`'后端返回' → '本地key'`

### 3. H5 预览正常但小程序异常

**原因**: uni-app 跨平台差异

**检查**:
1. WebSocket API 使用 `uni.connectSocket`（已正确实现）
2. 小程序需在 `manifest.json` 配置域名白名单

---

## 📚 参考文档

- 后端参考实现: [index.html](file:///d:/GithubProject/yolo_venv_web/index.html)
- 设计规范: [DESIGN.md](file:///d:/GithubProject/yolo_venv_web/DESIGN.md)
- 产品定义: [PRODUCT.md](file:///d:/GithubProject/yolo_venv_web/PRODUCT.md)

---

## 📦 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0.0 | 2026-06-08 | 初始版本，道路积水检测 |

---

> **提示**: 建议每个团队创建自己的 git 分支，避免相互影响。
> - 主分支: `main`（道路积水检测）
> - 病虫害: `feature/pest-detection`
> - 垃圾分类: `feature/garbage-classification`
