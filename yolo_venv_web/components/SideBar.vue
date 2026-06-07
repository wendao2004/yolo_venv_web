<template>
  <view class="sidebar">
    <view class="section">
      <view class="section-header">
        <text class="section-title">实时统计</text>
      </view>
      
      <view class="stats-grid">
        <view 
          v-for="item in statsList" 
          :key="item.en" 
          class="stat-card"
          :style="{ '--accent': item.color }"
        >
          <view class="stat-icon" :style="{ backgroundColor: item.color + '20' }">
            <text class="icon-text" :style="{ color: item.color }">{{ item.icon }}</text>
          </view>
          <view class="stat-content">
            <text class="stat-name">{{ item.name }}</text>
            <text class="stat-count">{{ item.count }}</text>
          </view>
        </view>
      </view>
    </view>
    
    <view class="section info-section" v-if="isConnected">
      <view class="section-header">
        <text class="section-title">系统信息</text>
      </view>
      
      <view class="info-list">
        <view class="info-item">
          <text class="info-label">平均置信度</text>
          <text class="info-value">{{ avgConfidence }}%</text>
        </view>
        <view class="info-item">
          <text class="info-label">WebSocket</text>
          <text class="info-value connected">已连接</text>
        </view>
      </view>
    </view>
    
    <view class="section legend-section">
      <view class="section-header">
        <text class="section-title">类别图例</text>
      </view>
      
      <view class="legend-list">
        <view class="legend-item" v-for="item in statsList" :key="item.en">
          <view class="legend-dot" :style="{ backgroundColor: item.color }"></view>
          <text class="legend-text">{{ item.name }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { CLASS_MAP } from '@/utils/classMap.js'

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
    },
    isConnected: { type: Boolean, default: false },
    avgConfidence: { type: Number, default: 0 }
  },
  computed: {
    statsList() {
      const icons = {
        waterlogging: '💧',
        pothole: '🕳️',
        manhole_missing: '⚠️',
        manhole_damaged: '🔧'
      }
      return Object.entries(CLASS_MAP).map(([id, info]) => ({
        ...info,
        count: this.stats[info.en] || 0,
        icon: icons[info.en] || '●'
      }))
    }
  }
}
</script>

<style scoped lang="scss">
.sidebar {
  width: 100%;
  height: 100%;
  background: #ffffff;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.section {
  padding: 20px;
  border-bottom: 1px solid #f3f4f6;
}

.section:last-child {
  border-bottom: none;
}

.info-section,
.legend-section {
  background: #fafafa;
}

.section-header {
  margin-bottom: 16px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  letter-spacing: -0.01em;
}

.stats-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  transition: all 0.2s ease;
}

.stat-card:hover {
  border-color: var(--accent);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-text {
  font-size: 20px;
  line-height: 1;
}

.stat-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.stat-name {
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
  margin-bottom: 2px;
}

.stat-count {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-label {
  font-size: 13px;
  color: #6b7280;
}

.info-value {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  font-variant-numeric: tabular-nums;
}

.info-value.connected {
  color: #16a34a;
}

.legend-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-text {
  font-size: 13px;
  color: #4b5563;
}
</style>
