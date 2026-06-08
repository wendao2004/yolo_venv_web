<template>
  <view class="page">
    <TopBar 
      :is-connected="isConnected"
      :is-reconnecting="isReconnecting"
      :reconnect-attempt="reconnectAttempt"
      :fps="fps"
      :frame-index="frameIndex"
      :current-mode="currentMode"
      :cameras="cameras"
      :selected-camera="selectedCamera"
      :camera-info="cameraInfo"
      :folder-path="folderPath"
      :image-count="imageCount"
      @mode-change="handleModeChange"
      @camera-select="handleCameraSelect"
      @load-images="handleLoadImages"
      @reset="resetStats"
      @reconnect="reconnect"
    />
    
    <SideBar 
      :stats="stats"
      :is-connected="isConnected"
    />
    
    <VideoDisplay 
      :image="currentImage"
      :is-connected="isConnected"
      :detections="currentDetections"
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
import { CLASS_STATS_INIT, mapBackendKey } from '@/utils/classMap.js'

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
      isReconnecting: false,
      reconnectAttempt: 0,
      currentImage: '',
      frameIndex: 0,
      fps: 0,
      currentDetections: {},
      stats: { ...CLASS_STATS_INIT },
      showErrorBanner: false,
      currentMode: 'camera',
      cameras: [],
      selectedCamera: null,
      cameraInfo: null,
      folderPath: 'mosquito_det/integrated/images/val',
      imageCount: -1
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
        this.cameras = []
        this.selectedCamera = null
        this.cameraInfo = null
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
      
      this.socket.on('cameraList', (data) => {
        this.handleCameraList(data)
      })
      
      this.socket.on('testImagesList', (data) => {
        this.imageCount = data.count
        if (data.directory) {
          this.folderPath = data.directory
        }
      })
      
      this.socket.connect().catch(() => {})
    },
    
    handleFrame(data) {
      this.currentImage = data.image
      this.frameIndex = data.frameIndex
      this.fps = data.fps
      this.currentDetections = data.detections || {}
      
      if (data.cameraInfo) {
        this.cameraInfo = data.cameraInfo
      }
      
      if (data.detections) {
        for (const [backendKey, count] of Object.entries(data.detections)) {
          const localKey = mapBackendKey(backendKey)
          if (localKey && this.stats[localKey] !== undefined && count > 0) {
            this.stats[localKey] += count
          }
        }
      }
    },
    
    handleCameraList(data) {
      this.cameras = data.cameras || []
      this.selectedCamera = data.currentCamera
      
      if (data.currentMode) {
        this.currentMode = data.currentMode
      }
      
      if (data.testImagesDir) {
        this.folderPath = data.testImagesDir
      }
    },
    
    handleModeChange(mode) {
      if (this.socket) {
        this.socket.setMode(mode)
        this.currentMode = mode
      }
    },
    
    handleCameraSelect(cameraIndex) {
      if (this.socket) {
        this.socket.selectCamera(cameraIndex)
        this.selectedCamera = cameraIndex
      }
    },
    
    handleLoadImages(folderPath) {
      if (this.socket) {
        this.socket.setTestDir(folderPath)
        this.folderPath = folderPath
      }
    },
    
    resetStats() {
      this.stats = { ...CLASS_STATS_INIT }
      this.frameIndex = 0
      this.fps = 0
      this.currentDetections = {}
      this.currentImage = ''
      uni.showToast({ title: '统计已重置', icon: 'success', duration: 1500 })
    },
    
    reconnect() {
      if (this.socket) {
        this.socket.close()
      }
      this.currentImage = ''
      this.currentDetections = {}
      this.showErrorBanner = false
      this.fps = 0
      this.frameIndex = 0
      this.cameras = []
      this.selectedCamera = null
      this.cameraInfo = null
      this.imageCount = -1
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
  grid-template-rows: 60px 1fr;
  grid-template-columns: 280px 1fr;
  grid-template-areas:
    "header header"
    "sidebar main";
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
}

.page > :first-child {
  grid-area: header;
}

.page > :nth-child(2) {
  grid-area: sidebar;
  height: calc(100vh - 60px);
}

.page > :nth-child(3) {
  grid-area: main;
  height: calc(100vh - 60px);
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
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.5);
  border-radius: 12px;
}

.error-icon {
  font-size: 18px;
}

.error-text {
  font-size: 14px;
  font-weight: 500;
  color: #ef4444;
}

.error-btn {
  padding: 8px 16px;
  background: #ef4444;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.error-btn:active {
  background: #dc2626;
}
</style>
