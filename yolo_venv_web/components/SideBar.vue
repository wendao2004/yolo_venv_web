<template>
  <view class="sidebar">
    <view class="sidebar-title">
      <text>实时统计</text>
    </view>
    
    <view class="stat-card water">
      <view class="icon">
        <text>💧</text>
      </view>
      <view class="info">
        <text class="class-name">积水</text>
        <text class="count">{{ stats.waterlogging }}</text>
      </view>
    </view>
    
    <view class="stat-card pothole">
      <view class="icon">
        <text>🕳️</text>
      </view>
      <view class="info">
        <text class="class-name">坑洼</text>
        <text class="count">{{ stats.pothole }}</text>
      </view>
    </view>
    
    <view class="stat-card missing">
      <view class="icon">
        <text>⭕</text>
      </view>
      <view class="info">
        <text class="class-name">井盖缺失</text>
        <text class="count">{{ stats.manhole_missing }}</text>
      </view>
    </view>
    
    <view class="stat-card damaged">
      <view class="icon">
        <text>⚠️</text>
      </view>
      <view class="info">
        <text class="class-name">井盖破损</text>
        <text class="count">{{ stats.manhole_damaged }}</text>
      </view>
    </view>
    
    <view class="legend">
      <text class="legend-title">图例说明</text>
      <view class="legend-item">
        <view class="legend-color water"></view>
        <text>积水 (waterlogging)</text>
      </view>
      <view class="legend-item">
        <view class="legend-color pothole"></view>
        <text>坑洼 (pothole)</text>
      </view>
      <view class="legend-item">
        <view class="legend-color missing"></view>
        <text>井盖缺失 (manhole_missing)</text>
      </view>
      <view class="legend-item">
        <view class="legend-color damaged"></view>
        <text>井盖破损 (manhole_damaged)</text>
      </view>
    </view>
  </view>
</template>

<script>
import { CLASS_STATS_INIT } from '@/utils/classMap.js'

export default {
  name: 'SideBar',
  props: {
    stats: {
      type: Object,
      default: () => ({ ...CLASS_STATS_INIT })
    },
    isConnected: { type: Boolean, default: false }
  }
}
</script>

<style scoped lang="scss">
.sidebar {
  grid-area: sidebar;
  background: rgba(15, 52, 96, 0.8);
  padding: 20px;
  overflow-y: auto;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
}

.sidebar-title {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 20px;
  color: #e94560;
  display: flex;
  align-items: center;
  gap: 8px;
}

.sidebar-title::before {
  content: '';
  width: 4px;
  height: 16px;
  background: #e94560;
  border-radius: 2px;
}

.stat-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 15px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: transform 0.3s;
}

.stat-card:active {
  transform: translateX(5px);
}

.stat-card .icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.stat-card .info {
  flex: 1;
}

.stat-card .class-name {
  font-size: 14px;
  font-weight: 600;
}

.stat-card .count {
  font-size: 24px;
  font-weight: bold;
  margin-top: 4px;
}

.stat-card.water .icon {
  background: rgba(255, 165, 0, 0.2);
}

.stat-card.water .class-name,
.stat-card.water .count {
  color: #ffa500;
}

.stat-card.pothole .icon {
  background: rgba(239, 68, 68, 0.2);
}

.stat-card.pothole .class-name,
.stat-card.pothole .count {
  color: #ef4444;
}

.stat-card.missing .icon {
  background: rgba(0, 255, 165, 0.2);
}

.stat-card.missing .class-name,
.stat-card.missing .count {
  color: #00ffa5;
}

.stat-card.damaged .icon {
  background: rgba(255, 255, 0, 0.2);
}

.stat-card.damaged .class-name,
.stat-card.damaged .count {
  color: #ffff00;
}

.legend {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.legend-title {
  font-size: 13px;
  color: #888;
  margin-bottom: 15px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  font-size: 13px;
}

.legend-color {
  width: 20px;
  height: 20px;
  border-radius: 4px;
}

.legend-color.water { background: #ffa500; }
.legend-color.pothole { background: #ef4444; }
.legend-color.missing { background: #00ffa5; }
.legend-color.damaged { background: #ffff00; }
</style>
