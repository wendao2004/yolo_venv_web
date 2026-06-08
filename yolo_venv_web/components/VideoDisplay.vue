<template>
  <view class="main">
    <view class="video-container">
      <image 
        v-if="imageSrc" 
        :src="imageSrc" 
        mode="aspectFit" 
        class="video-frame"
      ></image>
      
      <view v-else class="no-signal">
        <view class="signal-icon">
          <text>📷</text>
        </view>
        <view class="signal-text">
          <text>等待视频流...</text>
        </view>
      </view>
    </view>
    
    <view class="detection-info">
      <view class="info-block">
        <text class="info-label">当前帧检测</text>
        <text class="info-value">{{ totalDetections }} 个目标</text>
      </view>
      <view class="detection-tags">
        <view 
          v-for="(tag, idx) in detectionTags" 
          :key="idx"
          class="detection-tag"
          :class="tag.cssClass"
        >
          <text>{{ tag.name }} ×{{ tag.count }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { mapBackendKey, getDisplayInfo } from '@/utils/classMap.js'

export default {
  name: 'VideoDisplay',
  props: {
    image: { type: String, default: '' },
    isConnected: { type: Boolean, default: false },
    detections: { type: Object, default: () => ({}) }
  },
  computed: {
    imageSrc() {
      if (!this.image) return ''
      if (this.image.startsWith('data:')) {
        return this.image
      }
      return 'data:image/jpeg;base64,' + this.image
    },
    totalDetections() {
      return Object.values(this.detections).reduce((sum, count) => sum + (count || 0), 0)
    },
    detectionTags() {
      const tags = []
      for (const [backendKey, count] of Object.entries(this.detections)) {
        if (count > 0) {
          const localKey = mapBackendKey(backendKey)
          if (localKey) {
            const display = getDisplayInfo(localKey)
            tags.push({
              name: display.name,
              count: count,
              cssClass: display.cssClass
            })
          }
        }
      }
      return tags
    }
  }
}
</script>

<style scoped lang="scss">
.main {
  grid-area: main;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
  width: 100%;
  height: 100%;
}

.video-container {
  flex: 1;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 15px;
  overflow: hidden;
  position: relative;
  border: 2px solid rgba(255, 255, 255, 0.1);
  min-height: 0;
}

.video-frame {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.no-signal {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: #666;
}

.signal-icon text {
  font-size: 48px;
}

.signal-text {
  margin-top: 10px;
}

.signal-text text {
  font-size: 16px;
}

.detection-info {
  background: rgba(15, 52, 96, 0.6);
  border-radius: 10px;
  padding: 15px 20px;
  display: flex;
  align-items: center;
  gap: 20px;
  flex-shrink: 0;
}

.info-block {
  display: flex;
  flex-direction: column;
}

.info-label {
  font-size: 12px;
  color: #888;
}

.info-value {
  font-size: 14px;
  font-weight: 600;
  color: #e94560;
}

.detection-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  flex: 1;
}

.detection-tag {
  padding: 4px 10px;
  border-radius: 15px;
  font-size: 12px;
  font-weight: 600;
}

.detection-tag.water {
  background: rgba(255, 165, 0, 0.2);
  color: #ffa500;
}

.detection-tag.pothole {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.detection-tag.missing {
  background: rgba(0, 255, 165, 0.2);
  color: #00ffa5;
}

.detection-tag.damaged {
  background: rgba(255, 255, 0, 0.2);
  color: #ffff00;
}
</style>
