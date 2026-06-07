# 道路积水检测系统 - 前端开发文档（uni-app + 实时摄像头）

## 一、场景说明

现场演示时：
- 前端（uni-app H5）只负责 **显示**
- 后端（Python/FastAPI）负责 **调用摄像头 + YOLO 推理**
- 两者通过 **WebSocket** 实时通信

**核心变化：**
- ❌ 不再是「用户上传 20 张图片」
- ✅ 改成「摄像头实时画面 + 逐帧检测 + 结果实时推送」

---

## 二、技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **前端** | uni-app (Vue 3) + uview-plus | H5 端运行，浏览器打开 |
| **通信** | WebSocket (`uni.connectSocket`) | 实时推送视频帧和检测结果 |
| **后端** | FastAPI + OpenCV + ultralytics (YOLO) | 调用摄像头 + 推理 |

---

## 三、数据流

```
摄像头 → OpenCV 读取帧 → YOLO 推理 → 带框图片 + 检测信息 → WebSocket 推送给前端 → 前端显示
```

| 步骤 | 负责方 | 说明 |
|------|--------|------|
| 1. 读取摄像头 | 后端 | `cv2.VideoCapture(0)` |
| 2. 逐帧推理 | 后端 | `model(frame)` |
| 3. 生成带框图 | 后端 | `results[0].plot()` → Base64 |
| 4. WebSocket 推送 | 后端 | 每帧或每隔几帧推送一次 |
| 5. 接收并显示 | 前端 | `<image>` 显示 Base64 图片 |
| 6. 统计展示 | 前端 | 累计各类别数量 |

---

## 四、前端页面布局

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│  顶部状态栏                                                                          │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┬──────────────────┐   │
│  │  连接: 🟢 已连接  │  状态: 监测中    │  FPS: 15       │  已处理: 1250 帧  │  [控制按钮]     │   │
│  └──────────────┴──────────────┴──────────────┴──────────────┴──────────────────┘   │
├──────────────┬─────────────────────────────────────────────────────────────────────┤
│              │                                                                      │
│              │                                                                      │
│  左侧边栏     │                          右侧实时画面区                                │
│              │                                                                      │
│  ┌─────────┐ │  ┌───────────────────────────────────────────────────────────────┐  │
│  │ 检测统计  │ │  │                                                             │  │
│  │         │ │  │                                                             │  │
│  │ 🟦 道路积水   │ │  │                      摄像头实时画面                        │  │
│  │    5     │ │  │                                                             │  │
│  │         │ │  │              ┌───────────────────────────┐                   │  │
│  │ 🔴 路面坑洼   │ │  │              │                           │                   │  │
│  │    3     │ │  │              │    🟦 道路积水             │                   │  │
│  │         │ │  │              │    🔴 路面坑洼             │                   │  │
│  │ 🟠 井盖缺失   │ │  │              │                           │                   │  │
│  │    1     │ │  │              └───────────────────────────┘                   │  │
│  │         │ │  │                                                             │  │
│  │ 🟢 井盖破损   │ │  │                                                             │  │
│  │    2     │ │  │                                                             │  │
│  │         │ │  └───────────────────────────────────────────────────────────────┘  │
│  └─────────┘ │                                                                      │
│              │                                                                      │
│              │                                                                      │
└──────────────┴─────────────────────────────────────────────────────────────────────┘
```

### 4.1 布局区域说明

| 区域 | 位置 | 内容 |
|------|------|------|
| **顶部状态栏** | 最上方，横向占满 | 连接状态、运行状态、FPS、已处理帧数、控制按钮（开始/暂停/重置） |
| **左侧边栏** | 左侧，竖向 | 实时统计（4 个类别数量 + 颜色标识） |
| **右侧画面区** | 右侧，剩余空间 | 后端推送的带检测框实时画面 |

### 4.2 布局实现（CSS Grid）

```css
.page {
  display: grid;
  grid-template-rows: 80rpx 1fr;
  grid-template-columns: 320rpx 1fr;
  grid-template-areas:
    "header header"
    "sidebar main";
  height: 100vh;
}

.top-bar {
  grid-area: header;
}

.sidebar {
  grid-area: sidebar;
}

.video-area {
  grid-area: main;
}
```

---

## 五、WebSocket 协议

### 5.1 连接地址

```
ws://localhost:8000/ws/detect
```

### 5.2 后端 → 前端（帧数据）

**推送频率：** 每 2-3 帧推送一次（避免前端卡顿）

**消息格式：**

```json
{
  "type": "frame",
  "timestamp": 1717843200000,
  "frameIndex": 1250,
  "image": "data:image/jpeg;base64,......",
  "detections": [
    {
      "classId": 0,
      "className": "道路积水",
      "confidence": 0.945,
      "box": [100, 200, 350, 400]
    },
    {
      "classId": 1,
      "className": "路面坑洼",
      "confidence": 0.872,
      "box": [500, 300, 650, 450]
    }
  ],
  "stats": {
    "waterlogging": 2,
    "pothole": 1,
    "manhole_missing": 0,
    "manhole_damaged": 0
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| type | String | 固定 `"frame"` |
| timestamp | Number | 时间戳（毫秒） |
| frameIndex | Number | 帧序号 |
| image | String | Base64 编码的带框图片 |
| detections | Array | 当前帧检测到的目标列表 |
| stats | Object | 当前帧的统计（前端可忽略，用自己的累计） |

### 5.3 后端 → 前端（控制消息）

**连接成功：**
```json
{ "type": "connected", "message": "WebSocket 连接成功" }
```

**开始监测：**
```json
{ "type": "started", "message": "开始实时监测" }
```

**暂停监测：**
```json
{ "type": "paused", "message": "监测已暂停" }
```

### 5.4 前端 → 后端（控制命令）

**开始：**
```json
{ "action": "start" }
```

**暂停：**
```json
{ "action": "pause" }
```

**重置统计：**
```json
{ "action": "reset" }
```

---

## 六、前端组件结构

```
src/
├── api/
│   └── websocket.js          # WebSocket 封装
├── components/
│   ├── TopBar.vue            # 顶部状态栏（连接状态 + FPS + 帧数 + 控制按钮）
│   ├── SideBar.vue           # 左侧边栏（实时统计）
│   └── VideoDisplay.vue      # 右侧视频画面显示组件（带检测框的实时画面）
├── pages/
│   └── index/
│       └── index.vue         # 主页面（布局 + 数据流转）
└── utils/
    └── classMap.js           # 类别映射（不变）
```

### 组件职责

| 组件 | 职责 |
|------|------|
| **TopBar** | 显示连接状态、运行状态、FPS、已处理帧数、控制按钮（开始/暂停/重置） |
| **SideBar** | 显示 4 个类别的实时统计数量 + 颜色标识 |
| **VideoDisplay** | 显示后端推送的带检测框的实时画面（image Base64） |
| **index.vue** | 布局（Grid）+ WebSocket 管理 + 数据分发 |

---

## 七、前端核心实现

### 7.1 WebSocket 封装 `src/api/websocket.js`

```javascript
class DetectSocket {
  constructor(url = 'ws://localhost:8000/ws/detect') {
    this.url = url
    this.socket = null
    this.isConnected = false
    this.listeners = {}
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.socket = uni.connectSocket({
        url: this.url,
        complete: () => {}
      })

      uni.onSocketOpen(() => {
        this.isConnected = true
        this.emit('connected')
        resolve()
      })

      uni.onSocketMessage((res) => {
        try {
          const data = JSON.parse(res.data)
          this.emit('message', data)
          if (data.type === 'frame') {
            this.emit('frame', data)
          }
        } catch (e) {
          console.error('消息解析失败:', e)
        }
      })

      uni.onSocketError((err) => {
        this.isConnected = false
        this.emit('error', err)
        reject(err)
      })

      uni.onSocketClose(() => {
        this.isConnected = false
        this.emit('disconnected')
      })
    })
  }

  send(data) {
    if (!this.isConnected) return
    uni.sendSocketMessage({
      data: JSON.stringify(data)
    })
  }

  start() {
    this.send({ action: 'start' })
  }

  pause() {
    this.send({ action: 'pause' })
  }

  reset() {
    this.send({ action: 'reset' })
  }

  close() {
    if (this.socket) {
      uni.closeSocket()
    }
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = []
    }
    this.listeners[event].push(callback)
  }

  emit(event, data) {
    const callbacks = this.listeners[event] || []
    callbacks.forEach(cb => cb(data))
  }
}

export default DetectSocket
```

### 7.2 顶部状态栏 `src/components/TopBar.vue`

```vue
<template>
  <view class="top-bar">
    <view class="bar-left">
      <text class="bar-title">道路积水与坑洞检测系统</text>
    </view>
    
    <view class="bar-center">
      <view class="status-item">
        <text class="status-label">连接</text>
        <text class="status-value" :class="isConnected ? 'success' : 'danger'">
          {{ isConnected ? '🟢 已连接' : '🔴 未连接' }}
        </text>
      </view>
      
      <view class="status-item">
        <text class="status-label">状态</text>
        <text class="status-value" :class="isRunning ? 'primary' : 'info'">
          {{ isRunning ? '监测中' : '已暂停' }}
        </text>
      </view>
      
      <view class="status-item">
        <text class="status-label">FPS</text>
        <text class="status-value">{{ fps }}</text>
      </view>
      
      <view class="status-item">
        <text class="status-label">已处理</text>
        <text class="status-value">{{ frameIndex }} 帧</text>
      </view>
    </view>
    
    <view class="bar-right">
      <u-button 
        :type="isRunning ? 'warning' : 'primary'" 
        size="small"
        @click="$emit('toggle')"
      >
        {{ isRunning ? '暂停' : '开始' }}
      </u-button>
      <u-button 
        type="default" 
        size="small"
        @click="$emit('reset')"
      >
        重置
      </u-button>
    </view>
  </view>
</template>

<script>
export default {
  name: 'TopBar',
  props: {
    isConnected: { type: Boolean, default: false },
    isRunning: { type: Boolean, default: false },
    fps: { type: Number, default: 0 },
    frameIndex: { type: Number, default: 0 }
  }
}
</script>

<style scoped>
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 80rpx;
  padding: 0 32rpx;
  background: #fff;
  border-bottom: 1rpx solid #ebeef5;
}

.bar-left .bar-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #303133;
}

.bar-center {
  display: flex;
  gap: 48rpx;
}

.status-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.status-label {
  font-size: 22rpx;
  color: #909399;
}

.status-value {
  font-size: 26rpx;
  font-weight: 500;
  color: #303133;
}

.status-value.primary { color: #409eff; }
.status-value.success { color: #67c23a; }
.status-value.danger { color: #f56c6c; }
.status-value.info { color: #909399; }

.bar-right {
  display: flex;
  gap: 16rpx;
}
</style>
```

### 7.3 左侧边栏 `src/components/SideBar.vue`

```vue
<template>
  <view class="sidebar">
    <view class="sidebar-title">实时统计</view>
    
    <view class="stat-list">
      <view 
        v-for="item in statsList" 
        :key="item.en" 
        class="stat-item"
        :style="{ borderLeftColor: item.color }"
      >
        <view class="stat-dot" :style="{ backgroundColor: item.color }"></view>
        <view class="stat-info">
          <text class="stat-name">{{ item.name }}</text>
          <text class="stat-count">{{ item.count }}</text>
        </view>
      </view>
    </view>
    
    <view class="sidebar-tip">
      <text class="tip-title">图例说明</text>
      <view class="tip-list">
        <view class="tip-item" v-for="item in statsList" :key="item.en">
          <view class="tip-dot" :style="{ backgroundColor: item.color }"></view>
          <text class="tip-text">{{ item.name }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { CLASS_MAP } from '@/utils/classMap'

export default {
  name: 'SideBar',
  props: {
    stats: {
      type: Object,
      default: () => ({
        waterlogging: 0,
        pothole: 0,
        manhole_missing: 0,
        manhole_damaged: 0
      })
    }
  },
  computed: {
    statsList() {
      return Object.entries(CLASS_MAP).map(([id, info]) => ({
        ...info,
        count: this.stats[info.en] || 0
      }))
    }
  }
}
</script>

<style scoped>
.sidebar {
  width: 100%;
  height: 100%;
  background: #fff;
  border-right: 1rpx solid #ebeef5;
  padding: 32rpx;
  box-sizing: border-box;
}

.sidebar-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #303133;
  margin-bottom: 32rpx;
}

.stat-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  margin-bottom: 64rpx;
}

.stat-item {
  display: flex;
  align-items: center;
  padding: 24rpx;
  background: #f5f7fa;
  border-radius: 12rpx;
  border-left: 8rpx solid;
}

.stat-dot {
  width: 24rpx;
  height: 24rpx;
  border-radius: 50%;
  margin-right: 24rpx;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-name {
  font-size: 26rpx;
  color: #606266;
}

.stat-count {
  font-size: 40rpx;
  font-weight: 600;
  color: #303133;
}

.sidebar-tip {
  position: absolute;
  bottom: 32rpx;
  left: 32rpx;
  right: 32rpx;
}

.tip-title {
  font-size: 24rpx;
  color: #909399;
  display: block;
  margin-bottom: 16rpx;
}

.tip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.tip-item {
  display: flex;
  align-items: center;
}

.tip-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  margin-right: 8rpx;
}

.tip-text {
  font-size: 22rpx;
  color: #909399;
}
</style>
```

### 7.4 视频显示组件 `src/components/VideoDisplay.vue`

```vue
<template>
  <view class="video-area">
    <view class="video-container">
      <image 
        v-if="currentImage" 
        :src="currentImage" 
        mode="aspectFit" 
        class="video-frame"
      ></image>
      <view v-else class="video-placeholder">
        <text class="placeholder-icon">📷</text>
        <text class="placeholder-text">等待连接摄像头...</text>
        <text class="placeholder-sub" v-if="!isConnected">请确保后端已启动</text>
        <text class="placeholder-sub" v-else-if="!isRunning">点击右上角「开始」开始监测</text>
      </view>
    </view>
    
    <view v-if="currentFrameDetections.length > 0" class="detections-overlay">
      <view class="overlay-title">当前帧检测到 {{ currentFrameDetections.length }} 个目标</view>
      <view class="detection-tags">
        <u-tag 
          v-for="(det, idx) in currentFrameDetections" 
          :key="idx"
          :type="det.tagType"
          size="mini"
          class="detection-tag"
        >
          {{ det.className }} {{ (det.confidence * 100).toFixed(0) }}%
        </u-tag>
      </view>
    </view>
  </view>
</template>

<script>
import { getClassInfo } from '@/utils/classMap'

export default {
  name: 'VideoDisplay',
  props: {
    image: { type: String, default: '' },
    isConnected: { type: Boolean, default: false },
    isRunning: { type: Boolean, default: false },
    detections: { type: Array, default: () => [] }
  },
  computed: {
    currentImage() {
      if (!this.image) return ''
      if (this.image.startsWith('data:')) {
        return this.image
      }
      return 'data:image/jpeg;base64,' + this.image
    },
    currentFrameDetections() {
      return this.detections.map(d => ({
        ...d,
        ...getClassInfo(d.classId)
      }))
    }
  }
}
</script>

<style scoped>
.video-area {
  width: 100%;
  height: 100%;
  background: #1a1a2e;
  position: relative;
  display: flex;
  flex-direction: column;
}

.video-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx;
}

.video-frame {
  max-width: 100%;
  max-height: 100%;
  border-radius: 16rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.3);
}

.video-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #909399;
  text-align: center;
}

.placeholder-icon {
  font-size: 80rpx;
  margin-bottom: 24rpx;
}

.placeholder-text {
  font-size: 28rpx;
  color: #909399;
}

.placeholder-sub {
  font-size: 24rpx;
  color: #606266;
  margin-top: 16rpx;
}

.detections-overlay {
  position: absolute;
  bottom: 32rpx;
  left: 32rpx;
  right: 32rpx;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 12rpx;
  padding: 20rpx;
}

.overlay-title {
  font-size: 24rpx;
  color: #fff;
  margin-bottom: 12rpx;
}

.detection-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.detection-tag {
  margin: 0;
}
</style>
```

### 7.5 主页面 `src/pages/index/index.vue`

```vue
<template>
  <view class="page">
    <TopBar 
      :is-connected="isConnected"
      :is-running="isRunning"
      :fps="fps"
      :frame-index="frameIndex"
      @toggle="toggleMonitor"
      @reset="resetStats"
    />
    
    <SideBar :stats="stats" />
    
    <VideoDisplay 
      :image="currentImage"
      :is-connected="isConnected"
      :is-running="isRunning"
      :detections="currentDetections"
    />
  </view>
</template>

<script>
import TopBar from '@/components/TopBar.vue'
import SideBar from '@/components/SideBar.vue'
import VideoDisplay from '@/components/VideoDisplay.vue'
import DetectSocket from '@/api/websocket.js'

export default {
  components: {
    TopBar,
    SideBar,
    VideoDisplay
  },
  data() {
    return {
      socket: null,
      isConnected: false,
      isRunning: false,
      currentImage: '',
      frameIndex: 0,
      fps: 0,
      frameTimes: [],
      currentDetections: [],
      stats: {
        waterlogging: 0,
        pothole: 0,
        manhole_missing: 0,
        manhole_damaged: 0
      }
    }
  },
  onLoad() {
    this.initSocket()
  },
  onUnload() {
    if (this.socket) {
      this.socket.close()
    }
  },
  methods: {
    async initSocket() {
      this.socket = new DetectSocket()
      
      this.socket.on('connected', () => {
        this.isConnected = true
      })
      
      this.socket.on('disconnected', () => {
        this.isConnected = false
        this.isRunning = false
      })
      
      this.socket.on('frame', (data) => {
        this.currentImage = data.image
        this.frameIndex = data.frameIndex
        this.currentDetections = data.detections || []
        
        // 计算 FPS
        const now = Date.now()
        this.frameTimes.push(now)
        if (this.frameTimes.length > 30) {
          this.frameTimes.shift()
        }
        if (this.frameTimes.length > 1) {
          const duration = (this.frameTimes[this.frameTimes.length - 1] - this.frameTimes[0]) / 1000
          this.fps = Math.round((this.frameTimes.length - 1) / duration)
        }
        
        // 累计统计（前端自己累计）
        if (data.detections && data.detections.length > 0) {
          data.detections.forEach(d => {
            const key = this.getClassKey(d.classId)
            if (key) {
              this.stats[key]++
            }
          })
        }
      })
      
      try {
        await this.socket.connect()
      } catch (e) {
        uni.showToast({ title: '连接失败', icon: 'error' })
      }
    },
    
    getClassKey(classId) {
      const map = {
        0: 'waterlogging',
        1: 'pothole',
        2: 'manhole_missing',
        3: 'manhole_damaged'
      }
      return map[classId]
    },
    
    toggleMonitor() {
      if (this.isRunning) {
        this.socket.pause()
        this.isRunning = false
      } else {
        this.socket.start()
        this.isRunning = true
      }
    },
    
    resetStats() {
      this.stats = {
        waterlogging: 0,
        pothole: 0,
        manhole_missing: 0,
        manhole_damaged: 0
      }
      this.frameIndex = 0
      this.frameTimes = []
      this.fps = 0
      this.currentDetections = []
      this.socket.reset()
    }
  }
}
</script>

<style scoped>
.page {
  display: grid;
  grid-template-rows: 80rpx 1fr;
  grid-template-columns: 320rpx 1fr;
  grid-template-areas:
    "header header"
    "sidebar main";
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.page > :first-child {
  grid-area: header;
}

.page > :nth-child(2) {
  grid-area: sidebar;
  position: relative;
}

.page > :nth-child(3) {
  grid-area: main;
}
</style>
```

---

## 八、后端参考（FastAPI + WebSocket + OpenCV）

前端开发时可以对接这个后端：

```python
import cv2
import base64
import json
from io import BytesIO
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
from PIL import Image

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

model = YOLO("best.pt")

CLASS_NAMES = {
    0: "道路积水",
    1: "路面坑洼",
    2: "井盖缺失",
    3: "井盖破损"
}


@app.websocket("/ws/detect")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    await websocket.send_json({"type": "connected", "message": "WebSocket 连接成功"})
    
    cap = cv2.VideoCapture(0)
    is_running = False
    frame_count = 0
    
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            
            if msg.get("action") == "start":
                is_running = True
                await websocket.send_json({"type": "started"})
                
                while is_running:
                    ret, frame = cap.read()
                    if not ret:
                        continue
                    
                    frame_count += 1
                    
                    # 每 2 帧推理一次（可调整）
                    if frame_count % 2 == 0:
                        # YOLO 推理
                        results = model(frame)
                        
                        # 生成带框图片
                        result_img = results[0].plot()
                        result_pil = Image.fromarray(result_img[..., ::-1])
                        buffer = BytesIO()
                        result_pil.save(buffer, format="JPEG")
                        img_base64 = base64.b64encode(buffer.getvalue()).decode()
                        
                        # 提取检测信息
                        detections = []
                        stats = {"waterlogging": 0, "pothole": 0, "manhole_missing": 0, "manhole_damaged": 0}
                        
                        if results[0].boxes:
                            boxes = results[0].boxes
                            for i in range(len(boxes)):
                                class_id = int(boxes.cls[i])
                                conf = float(boxes.conf[i])
                                box = boxes.xyxy[i].tolist()
                                
                                detections.append({
                                    "classId": class_id,
                                    "className": CLASS_NAMES.get(class_id, "未知"),
                                    "confidence": conf,
                                    "box": box
                                })
                                
                                key = ["waterlogging", "pothole", "manhole_missing", "manhole_damaged"][class_id]
                                stats[key] += 1
                        
                        # 推送给前端
                        await websocket.send_json({
                            "type": "frame",
                            "timestamp": int(cv2.getTickCount()),
                            "frameIndex": frame_count,
                            "image": "data:image/jpeg;base64," + img_base64,
                            "detections": detections,
                            "stats": stats
                        })
                    
                    # 检查控制消息
                    try:
                        control = await websocket.receive_text()
                        control_msg = json.loads(control)
                        if control_msg.get("action") == "pause":
                            is_running = False
                            await websocket.send_json({"type": "paused"})
                            break
                        if control_msg.get("action") == "reset":
                            frame_count = 0
                    except:
                        pass
                        
            elif msg.get("action") == "pause":
                is_running = False
                await websocket.send_json({"type": "paused"})
                
    except WebSocketDisconnect:
        cap.release()
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        cap.release()
```

---

## 九、关键优化点

### 9.1 推送频率

| 策略 | 效果 |
|------|------|
| 每帧都推 | 前端压力大，可能卡顿 |
| **每 2-3 帧推一次** | 平衡实时性和性能 ✅ 推荐 |
| 只在检测到目标时推 | 画面有跳变感 |

### 9.2 图片质量

Base64 图片可能较大，建议：
- JPEG 质量 70-80
- 分辨率可以降一点（如 640x480）

### 9.3 前端 FPS 计算

前端自己计算 FPS（用时间戳差值），而不是依赖后端推送。

---

## 十、现场部署

### 方案：前端 H5 + 后端同机

1. **启动后端**（调用摄像头 + YOLO）：
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000
   ```

2. **启动前端**（uni-app H5 开发模式）：
   ```bash
   npm run dev:h5
   ```

3. **浏览器打开**：
   ```
   http://localhost:5173  或  http://本机IP:5173
   ```

### 生产部署（现场演示）

1. 前端构建：
   ```bash
   npm run build:h5
   ```

2. 把 `dist` 目录放到后端静态目录，后端同时提供页面和 API + WebSocket

3. 浏览器直接访问 `http://localhost:8000`

---

## 十一、对比

| 维度 | 旧方案（上传图片） | 新方案（实时摄像头） |
|------|-------------------|---------------------|
| 交互 | 用户主动上传 20 张 | 摄像头自动采集 |
| 通信 | HTTP 请求/响应 | WebSocket 长连接 |
| 前端复杂度 | 低 | 中 |
| 后端复杂度 | 低（接收图片推理） | 中（调摄像头 + 推流） |
| 现场体验 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐（更炫酷） |

---

## 十二、类别映射（不变）

```javascript
// src/utils/classMap.js
export const CLASS_MAP = {
  0: { name: '道路积水', en: 'waterlogging', color: '#409EFF' },
  1: { name: '路面坑洼', en: 'pothole', color: '#F56C6C' },
  2: { name: '井盖缺失', en: 'manhole_missing', color: '#E6A23C' },
  3: { name: '井盖破损', en: 'manhole_damaged', color: '#67C23A' }
}
```

配色规范和之前一致，统计卡片、标签颜色不变。
