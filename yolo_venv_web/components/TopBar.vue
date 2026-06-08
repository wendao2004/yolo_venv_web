<template>
  <view class="header">
    <view class="header-left">
      <text class="logo">🚦 城市道路智能检测系统</text>
      <view class="status-badge" :class="connectionStatus.class">
        <view class="status-dot" :class="connectionStatus.dot"></view>
        <text class="status-text">{{ connectionStatus.text }}</text>
      </view>
    </view>
    
    <view class="header-right">
      <view class="mode-selector">
        <button 
          class="mode-btn" 
          :class="{ active: currentMode === 'camera' }"
          @click="handleModeChange('camera')"
        >
          <text>📷 摄像头</text>
        </button>
        <button 
          class="mode-btn" 
          :class="{ active: currentMode === 'images' }"
          @click="handleModeChange('images')"
        >
          <text>🖼️ 图片</text>
        </button>
      </view>
      
      <view class="camera-selector" v-if="currentMode === 'camera'">
        <text class="selector-label">设备:</text>
        <picker 
          mode="selector" 
          :range="cameraOptions" 
          :value="selectedCameraIndex"
          @change="handleCameraSelect"
          class="camera-picker"
        >
          <view class="picker-display">
            <text class="picker-text">{{ currentCameraName }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
        <view class="camera-info" v-if="cameraInfoText">
          <text class="info-text">{{ cameraInfoText }}</text>
        </view>
      </view>
      
      <view class="folder-selector" v-else>
        <text class="selector-label">📂 文件夹:</text>
        <input 
          class="folder-input" 
          :value="localFolderPath"
          @input="onFolderInput"
          placeholder="输入图片文件夹路径..."
          @confirm="handleLoadImages"
        />
        <button class="folder-btn primary" @click="handleLoadImages">
          <text>加载</text>
        </button>
        <view class="image-count" v-if="imageCount >= 0">
          <text class="count-text">{{ imageCount }} 张</text>
        </view>
      </view>
      
      <view class="stat-item">
        <text class="stat-label">FPS</text>
        <text class="stat-value">{{ fps }}</text>
      </view>
      <view class="stat-item">
        <text class="stat-label">已处理帧数</text>
        <text class="stat-value">{{ frameIndex }}</text>
      </view>
      
      <button class="btn btn-secondary" @click="$emit('reset')">
        <text>🔄 重置</text>
      </button>
      <button class="btn btn-primary" @click="handleReconnect">
        <text>🔗 重连</text>
      </button>
    </view>
  </view>
</template>

<script>
export default {
  name: 'TopBar',
  props: {
    isConnected: { type: Boolean, default: false },
    isReconnecting: { type: Boolean, default: false },
    reconnectAttempt: { type: Number, default: 0 },
    fps: { type: [Number, String], default: 0 },
    frameIndex: { type: [Number, String], default: 0 },
    currentMode: { type: String, default: 'camera' },
    cameras: { type: Array, default: () => [] },
    selectedCamera: { type: [Number, null], default: null },
    cameraInfo: { type: Object, default: null },
    folderPath: { type: String, default: '' },
    imageCount: { type: Number, default: -1 }
  },
  data() {
    return {
      localFolderPath: this.folderPath || ''
    }
  },
  watch: {
    folderPath(newVal) {
      this.localFolderPath = newVal || ''
    }
  },
  computed: {
    connectionStatus() {
      if (this.isReconnecting) {
        return {
          text: '重连中 (' + this.reconnectAttempt + '/5)',
          class: 'connected',
          dot: 'connected'
        }
      }
      if (this.isConnected) {
        return {
          text: '已连接',
          class: 'connected',
          dot: 'connected'
        }
      }
      return {
        text: '未连接',
        class: 'disconnected',
        dot: 'disconnected'
      }
    },
    cameraOptions() {
      if (!this.cameras || this.cameras.length === 0) {
        return ['未检测到摄像头']
      }
      return this.cameras.map(c => `${c.name} (${c.width}x${c.height})`)
    },
    selectedCameraIndex() {
      if (!this.cameras || this.cameras.length === 0) return 0
      if (this.selectedCamera === null) return 0
      const idx = this.cameras.findIndex(c => c.index === this.selectedCamera)
      return idx >= 0 ? idx : 0
    },
    currentCameraName() {
      if (!this.cameras || this.cameras.length === 0) {
        return '未检测到摄像头'
      }
      const cam = this.cameras[this.selectedCameraIndex]
      return cam ? `${cam.name} (${cam.width}x${cam.height})` : '请选择'
    },
    cameraInfoText() {
      if (!this.cameraInfo) return ''
      return `${this.cameraInfo.width}x${this.cameraInfo.height} @ ${this.cameraInfo.fps}fps`
    }
  },
  methods: {
    handleModeChange(mode) {
      if (mode !== this.currentMode) {
        this.$emit('mode-change', mode)
      }
    },
    handleCameraSelect(e) {
      const idx = e.detail.value
      if (this.cameras && this.cameras[idx]) {
        this.$emit('camera-select', this.cameras[idx].index)
      }
    },
    onFolderInput(e) {
      this.localFolderPath = e.detail.value || ''
    },
    handleLoadImages() {
      if (this.localFolderPath && this.localFolderPath.trim()) {
        this.$emit('load-images', this.localFolderPath.trim())
      }
    },
    handleReconnect() {
      this.$emit('reconnect')
    }
  }
}
</script>

<style scoped lang="scss">
.header {
  grid-area: header;
  background: linear-gradient(90deg, #0f3460, #16213e);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  border-bottom: 2px solid #e94560;
  height: 60px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.logo {
  font-size: 20px;
  font-weight: bold;
  color: #e94560;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 13px;
}

.status-badge.connected {
  background: rgba(34, 197, 94, 0.2);
  color: #22c55e;
}

.status-badge.disconnected {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.connected {
  background: #22c55e;
  animation: pulse 1.5s infinite;
}

.status-dot.disconnected {
  background: #ef4444;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.status-text {
  font-size: 13px;
  font-weight: 500;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 15px;
}

.mode-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.05);
  padding: 4px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.mode-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  background: transparent;
  color: #888;
  transition: all 0.3s;
}

.mode-btn.active {
  background: #e94560;
  color: #fff;
}

.mode-btn:hover:not(.active) {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.camera-selector {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.05);
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.folder-selector {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.05);
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.selector-label {
  font-size: 13px;
  color: #888;
  white-space: nowrap;
}

.camera-picker {
  min-width: 150px;
}

.picker-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  padding: 6px 10px;
  min-width: 150px;
}

.picker-text {
  font-size: 13px;
  color: #fff;
}

.picker-arrow {
  font-size: 10px;
  color: #888;
  margin-left: 8px;
}

.camera-info {
  font-size: 11px;
  color: #888;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.info-text {
  font-size: 11px;
  color: #888;
}

.folder-input {
  background: rgba(0, 0, 0, 0.3);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  padding: 6px 10px;
  font-size: 12px;
  min-width: 200px;
}

.folder-input::placeholder {
  color: #666;
}

.folder-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  transition: all 0.3s;
}

.folder-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.folder-btn.primary {
  background: #e94560;
}

.folder-btn.primary:hover {
  background: #ff6b8a;
}

.image-count {
  font-size: 11px;
  color: #888;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  white-space: nowrap;
}

.count-text {
  font-size: 11px;
  color: #888;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 15px;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
}

.stat-item:last-child {
  border-right: none;
}

.stat-label {
  font-size: 11px;
  color: #888;
}

.stat-value {
  font-size: 18px;
  font-weight: bold;
  color: #e94560;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.3s;
}

.btn-primary {
  background: #e94560;
  color: #fff;
}

.btn-primary:hover {
  background: #ff6b8a;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
