<template>
  <view class="top-bar">
    <view class="bar-section bar-left">
      <view class="logo-dot"></view>
      <text class="bar-title">道路积水与路病检测系统</text>
    </view>
    
    <view class="bar-section bar-center">
      <view class="status-group">
        <view class="status-pill" :class="connectionStatus.class">
          <view class="status-dot" :class="connectionStatus.dot"></view>
          <text class="status-text">{{ connectionStatus.text }}</text>
        </view>
      </view>
      
      <view class="divider"></view>
      
      <view class="metric" v-if="isConnected">
        <text class="metric-label">状态</text>
        <text class="metric-value" :class="isRunning ? 'value-active' : 'value-inactive'">
          {{ isRunning ? '监测中' : '已暂停' }}
        </text>
      </view>
      
      <view class="metric" v-if="isConnected">
        <text class="metric-label">FPS</text>
        <text class="metric-value">{{ fps }}</text>
      </view>
      
      <view class="metric" v-if="isConnected">
        <text class="metric-label">帧</text>
        <text class="metric-value">{{ frameIndex }}</text>
      </view>
    </view>
    
    <view class="bar-section bar-right">
      <button 
        class="btn btn-primary"
        v-if="!isConnected"
        @click="$emit('reconnect')"
      >
        重新连接
      </button>
      <button 
        class="btn" 
        :class="isRunning ? 'btn-warning' : 'btn-primary'"
        v-if="isConnected"
        @click="$emit('toggle')"
      >
        {{ isRunning ? '暂停' : '开始监测' }}
      </button>
      <button 
        class="btn btn-default"
        v-if="isConnected"
        @click="$emit('reset')"
      >
        重置统计
      </button>
    </view>
  </view>
</template>

<script>
export default {
  name: 'TopBar',
  props: {
    isConnected: { type: Boolean, default: false },
    isRunning: { type: Boolean, default: false },
    isReconnecting: { type: Boolean, default: false },
    reconnectAttempt: { type: Number, default: 0 },
    fps: { type: Number, default: 0 },
    frameIndex: { type: Number, default: 0 }
  },
  computed: {
    connectionStatus() {
      if (this.isReconnecting) {
        return {
          text: '重连中 (' + this.reconnectAttempt + '/5)',
          class: 'status-connecting',
          dot: 'dot-connecting'
        }
      }
      if (this.isConnected) {
        return {
          text: '已连接',
          class: 'status-connected',
          dot: 'dot-connected'
        }
      }
      return {
        text: '未连接',
        class: 'status-disconnected',
        dot: 'dot-disconnected'
      }
    }
  }
}
</script>

<style scoped lang="scss">
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 24px;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  z-index: 100;
}

.bar-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.bar-left {
  flex: 1;
}

.logo-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: linear-gradient(135deg, #007aff 0%, #0056b3 100%);
  box-shadow: 0 2px 8px rgba(0, 122, 255, 0.3);
}

.bar-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  letter-spacing: -0.02em;
}

.bar-center {
  flex: 2;
  justify-content: center;
  gap: 24px;
}

.status-group {
  display: flex;
  align-items: center;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 9999px;
  font-size: 13px;
  font-weight: 500;
}

.status-connected {
  background: rgba(76, 217, 100, 0.1);
  color: #16a34a;
}

.status-connecting {
  background: rgba(240, 173, 78, 0.1);
  color: #d97706;
}

.status-disconnected {
  background: rgba(221, 82, 77, 0.1);
  color: #dc2626;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.dot-connected {
  background: #22c55e;
}

.dot-connecting {
  background: #f59e0b;
  animation: pulse 1s infinite;
}

.dot-disconnected {
  background: #ef4444;
  animation: none;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.divider {
  width: 1px;
  height: 24px;
  background: #e5e7eb;
}

.metric {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.metric-label {
  font-size: 11px;
  font-weight: 500;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  line-height: 1;
  margin-bottom: 2px;
}

.metric-value {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
  font-variant-numeric: tabular-nums;
}

.value-active {
  color: #007aff;
}

.value-inactive {
  color: #9ca3af;
}

.bar-right {
  flex: 1;
  justify-content: flex-end;
  gap: 12px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  line-height: 1.5;
}

.btn:active {
  transform: scale(0.98);
}

.btn-primary {
  background: #007aff;
  color: #ffffff;
}

.btn-primary:hover {
  background: #0066cc;
}

.btn-warning {
  background: #f0ad4e;
  color: #ffffff;
}

.btn-warning:hover {
  background: #ec971f;
}

.btn-default {
  background: #f3f4f6;
  color: #4b5563;
}

.btn-default:hover {
  background: #e5e7eb;
}
</style>
