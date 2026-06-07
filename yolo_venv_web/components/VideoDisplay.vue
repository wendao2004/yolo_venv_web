<template>
  <view class="video-area">
    <view class="video-container" :class="{ 'has-image': currentImage }">
      <image 
        v-if="currentImage" 
        :src="currentImage" 
        mode="aspectFit" 
        class="video-frame"
      ></image>
      
      <view v-else class="video-placeholder" :class="placeholderState.class">
        <view class="placeholder-icon">
          <text class="icon">{{ placeholderState.icon }}</text>
        </view>
        <text class="placeholder-title">{{ placeholderState.title }}</text>
        <text class="placeholder-sub">{{ placeholderState.subtitle }}</text>
        
        <view class="placeholder-actions" v-if="!isConnected">
          <button class="btn-primary" @click="$emit('reconnect')">
            尝试重新连接
          </button>
          <text class="placeholder-tip">
            请确保后端服务已启动：<code>uvicorn main:app --host 0.0.0.0 --port 8000</code>
          </text>
        </view>
        
        <view class="placeholder-actions" v-else-if="!isRunning">
          <button class="btn-primary" @click="$emit('start')">
            开始监测
          </button>
          <text class="placeholder-tip">点击上方"开始监测"按钮开始实时检测</text>
        </view>
      </view>
    </view>
    
    <view class="detection-bar" v-if="currentImage && currentDetections.length > 0">
      <view class="bar-left">
        <text class="bar-label">当前帧检测到 {{ currentDetections.length }} 个目标</text>
      </view>
      <view class="bar-tags">
        <view 
          v-for="(det, idx) in uniqueDetections" 
          :key="idx"
          class="tag"
          :style="{ backgroundColor: det.color + '20', color: det.color }"
        >
          <text class="tag-text">{{ det.name }} ×{{ det.count }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { getClassInfo } from '@/utils/classMap.js'

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
    placeholderState() {
      if (!this.isConnected) {
        return {
          icon: '🔌',
          title: '未连接到后端',
          subtitle: '无法接收检测数据',
          class: 'state-disconnected'
        }
      }
      if (!this.isRunning) {
        return {
          icon: '⏸️',
          title: '等待开始',
          subtitle: '点击"开始监测"按钮',
          class: 'state-paused'
        }
      }
      return {
        icon: '📷',
        title: '等待视频流',
        subtitle: '正在初始化摄像头...',
        class: 'state-loading'
      }
    },
    uniqueDetections() {
      const map = {}
      this.detections.forEach(d => {
        const info = getClassInfo(d.classId)
        if (!map[info.en]) {
          map[info.en] = {
            name: info.name,
            color: info.color,
            count: 0
          }
        }
        map[info.en].count++
      })
      return Object.values(map)
    }
  }
}
</script>

<style scoped lang="scss">
.video-area {
  width: 100%;
  height: 100%;
  background: #0f172a;
  display: flex;
  flex-direction: column;
  position: relative;
}

.video-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  position: relative;
  overflow: hidden;
}

.video-container.has-image {
  background: #000;
}

.video-frame {
  max-width: 100%;
  max-height: 100%;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  object-fit: contain;
}

.video-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 48px;
}

.placeholder-icon {
  width: 80px;
  height: 80px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.state-disconnected .placeholder-icon {
  background: rgba(239, 68, 68, 0.15);
}

.state-paused .placeholder-icon {
  background: rgba(156, 163, 175, 0.15);
}

.state-loading .placeholder-icon {
  background: rgba(59, 130, 246, 0.15);
}

.icon {
  font-size: 40px;
  line-height: 1;
}

.placeholder-title {
  font-size: 20px;
  font-weight: 600;
  color: #f1f5f9;
  margin-bottom: 8px;
}

.placeholder-sub {
  font-size: 14px;
  color: #94a3b8;
  margin-bottom: 24px;
}

.placeholder-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.btn-primary {
  padding: 12px 28px;
  background: #007aff;
  color: #ffffff;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-primary:hover {
  background: #0066cc;
}

.btn-primary:active {
  transform: scale(0.98);
}

.placeholder-tip {
  font-size: 12px;
  color: #64748b;
  line-height: 1.6;
}

code {
  background: rgba(255, 255, 255, 0.08);
  padding: 2px 8px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 11px;
}

.detection-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: rgba(15, 23, 42, 0.95);
  border-top: 1px solid rgba(148, 163, 184, 0.1);
  gap: 16px;
}

.bar-label {
  font-size: 13px;
  font-weight: 500;
  color: #94a3b8;
  white-space: nowrap;
}

.bar-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
  flex: 1;
}

.tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 6px;
}

.tag-text {
  font-size: 12px;
  font-weight: 600;
}
</style>
