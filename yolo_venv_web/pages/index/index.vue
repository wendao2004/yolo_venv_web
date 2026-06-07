<template>
  <view class="page">
    <TopBar 
      :is-connected="isConnected"
      :is-running="isRunning"
      :is-reconnecting="isReconnecting"
      :reconnect-attempt="reconnectAttempt"
      :fps="fps"
      :frame-index="frameIndex"
      @toggle="toggleMonitor"
      @reset="resetStats"
      @reconnect="reconnect"
    />
    
    <SideBar 
      :stats="stats"
      :is-connected="isConnected"
      :avg-confidence="avgConfidence"
    />
    
    <VideoDisplay 
      :image="currentImage"
      :is-connected="isConnected"
      :is-running="isRunning"
      :detections="currentDetections"
      @start="startMonitor"
      @reconnect="reconnect"
    />
    
    <view class="error-banner" v-if="showErrorBanner">
      <view class="error-content">
        <text class="error-icon">⚠️</text>
        <text class="error-text">连接已断开，请检查后端服务</text>
        <button class="error-btn" @click="reconnect">重新连接</button>
      </view>
    </view>
  </view>
</template>

<script>
import TopBar from '@/components/TopBar.vue'
import SideBar from '@/components/SideBar.vue'
import VideoDisplay from '@/components/VideoDisplay.vue'
import DetectSocket from '@/api/websocket.js'
import { getClassKey, CLASS_STATS_INIT } from '@/utils/classMap.js'

export default {
  name: 'DetectDashboard',
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
      isReconnecting: false,
      reconnectAttempt: 0,
      currentImage: '',
      frameIndex: 0,
      fps: 0,
      frameTimes: [],
      currentDetections: [],
      stats: { ...CLASS_STATS_INIT },
      confidenceSum: 0,
      confidenceCount: 0,
      showErrorBanner: false
    }
  },
  computed: {
    avgConfidence() {
      if (this.confidenceCount === 0) return 0
      return Math.round((this.confidenceSum / this.confidenceCount) * 100)
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
  onShow() {
    if (!this.socket) {
      this.initSocket()
    }
  },
  methods: {
    initSocket() {
      this.socket = new DetectSocket()
      
      this.socket.on('connected', () => {
        this.isConnected = true
        this.isReconnecting = false
        this.reconnectAttempt = 0
        this.showErrorBanner = false
        uni.showToast({ title: '已连接', icon: 'success', duration: 1500 })
      })
      
      this.socket.on('reconnecting', (data) => {
        this.isReconnecting = true
        this.reconnectAttempt = data.attempt
      })
      
      this.socket.on('disconnected', () => {
        this.isConnected = false
        this.isRunning = false
        if (!this.isReconnecting) {
          this.showErrorBanner = true
        }
      })
      
      this.socket.on('error', () => {
        if (!this.isReconnecting) {
          uni.showToast({ title: '连接失败', icon: 'error', duration: 2000 })
        }
      })
      
      this.socket.on('frame', (data) => {
        this.handleFrame(data)
      })
      
      this.socket.on('started', () => {
        this.isRunning = true
      })
      
      this.socket.on('paused', () => {
        this.isRunning = false
      })
      
      this.socket.connect().catch(() => {})
    },
    
    handleFrame(data) {
      this.currentImage = data.image
      this.frameIndex = data.frameIndex
      this.currentDetections = data.detections || []
      
      const now = Date.now()
      this.frameTimes.push(now)
      if (this.frameTimes.length > 30) {
        this.frameTimes.shift()
      }
      if (this.frameTimes.length > 1) {
        const duration = (this.frameTimes[this.frameTimes.length - 1] - this.frameTimes[0]) / 1000
        this.fps = Math.round((this.frameTimes.length - 1) / duration)
      }
      
      if (data.detections && data.detections.length > 0) {
        data.detections.forEach(d => {
          const key = getClassKey(d.classId)
          if (key) {
            this.stats[key]++
          }
          if (d.confidence) {
            this.confidenceSum += d.confidence
            this.confidenceCount++
          }
        })
      }
    },
    
    toggleMonitor() {
      if (this.isRunning) {
        this.pauseMonitor()
      } else {
        this.startMonitor()
      }
    },
    
    startMonitor() {
      if (!this.isConnected) {
        uni.showToast({ title: '请先连接后端', icon: 'none', duration: 2000 })
        return
      }
      this.socket.start()
      this.isRunning = true
    },
    
    pauseMonitor() {
      this.socket.pause()
      this.isRunning = false
    },
    
    resetStats() {
      this.stats = { ...CLASS_STATS_INIT }
      this.frameIndex = 0
      this.frameTimes = []
      this.fps = 0
      this.currentDetections = []
      this.confidenceSum = 0
      this.confidenceCount = 0
      if (this.isConnected) {
        this.socket.reset()
      }
      uni.showToast({ title: '统计已重置', icon: 'success', duration: 1500 })
    },
    
    reconnect() {
      if (this.socket) {
        this.socket.close()
      }
      this.currentImage = ''
      this.currentDetections = []
      this.showErrorBanner = false
      this.initSocket()
    }
  }
}
</script>

<style>
page {
  height: 100%;
  width: 100%;
  overflow: hidden;
}
</style>

<style scoped lang="scss">
.page {
  display: grid;
  grid-template-rows: 56px 1fr;
  grid-template-columns: 280px 1fr;
  grid-template-areas:
    "header header"
    "sidebar main";
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background: #f9fafb;
}

.page > :first-child {
  grid-area: header;
}

.page > :nth-child(2) {
  grid-area: sidebar;
  height: calc(100vh - 56px);
}

.page > :nth-child(3) {
  grid-area: main;
  height: calc(100vh - 56px);
}

.error-banner {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
}

.error-content {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
}

.error-icon {
  font-size: 18px;
}

.error-text {
  font-size: 14px;
  font-weight: 500;
  color: #991b1b;
}

.error-btn {
  padding: 8px 16px;
  background: #dc2626;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.error-btn:active {
  background: #b91c1c;
}
</style>
