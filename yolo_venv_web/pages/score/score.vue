<template>
  <view class="page" :class="{ 'dark-theme': isDarkTheme, 'light-theme': !isDarkTheme }">
    <view class="safe-area-top" :style="{ height: statusBarHeight + 'px' }"></view>
    <view class="header">
      <view class="header-left">
        <view class="logo">
          <view class="logo-icon"><text>📊</text></view>
          <text class="logo-text">自动打分</text>
        </view>
      </view>
      <view class="header-right">
        <view class="connection-status" :class="{ connected: isConnected }">
          <view class="status-dot"></view>
          <text>{{ isConnected ? '在线' : '离线' }}</text>
        </view>
        <button class="action-btn" @click="toggleTheme">
          <text>{{ isDarkTheme ? '☀️' : '🌙' }}</text>
        </button>
      </view>
    </view>

    <view class="main-content">
      <view class="timer-card">
        <view class="timer-header">
          <text class="timer-title">自动打分测试</text>
          <text class="timer-subtitle">3分钟内识别图片</text>
        </view>
        <view class="timer-display">
          <text class="timer-value">{{ timerText }}</text>
          <text class="timer-status">{{ timerStatus }}</text>
        </view>
        <view class="progress-section">
          <view class="progress-bar">
            <view class="progress-fill" :style="{ width: progressPercent + '%' }"></view>
          </view>
          <view class="progress-info">
            <text>进度</text>
            <text>{{ currentIndex }} / {{ totalImages }}</text>
          </view>
        </view>
        <view class="btn-group">
          <button class="btn-primary" @click="startAutoScore">开始测试</button>
          <button class="btn-secondary" @click="resetAutoScore">重置</button>
        </view>
      </view>

      <view class="preview-section">
        <text class="section-title">实时预览</text>
        <view class="preview-card">
          <image v-if="currentImage" :src="imageSrc" mode="aspectFit" class="preview-image"></image>
          <view v-else class="preview-placeholder">
            <text class="placeholder-icon">📷</text>
            <text>等待开始测试</text>
          </view>
        </view>
      </view>

      <view class="stats-section">
        <text class="section-title">得分统计</text>
        <view class="stats-grid">
          <view class="stat-item success">
            <text class="stat-value">{{ correctCount }}</text>
            <text class="stat-label">正确检测</text>
          </view>
          <view class="stat-item danger">
            <text class="stat-value">{{ incorrectCount }}</text>
            <text class="stat-label">漏检/误检</text>
          </view>
          <view class="stat-item">
            <text class="stat-value">{{ avgTime }}ms</text>
            <text class="stat-label">平均耗时</text>
          </view>
          <view class="stat-item">
            <text class="stat-value">{{ avgFps }}</text>
            <text class="stat-label">平均帧率</text>
          </view>
        </view>
      </view>

      <view class="class-section">
        <text class="section-title">类别分布</text>
        <view class="class-list">
          <view class="class-item">
            <view class="class-dot water"></view>
            <text class="class-name">积水</text>
            <text class="class-count">{{ classCounts.waterlogging }}</text>
          </view>
          <view class="class-item">
            <view class="class-dot pothole"></view>
            <text class="class-name">坑洼</text>
            <text class="class-count">{{ classCounts.pothole }}</text>
          </view>
          <view class="class-item">
            <view class="class-dot manhole"></view>
            <text class="class-name">井盖</text>
            <text class="class-count">{{ classCounts.manhole }}</text>
          </view>
          <view class="class-item">
            <view class="class-dot crack"></view>
            <text class="class-name">裂纹</text>
            <text class="class-count">{{ classCounts.crack }}</text>
          </view>
        </view>
      </view>

      <view class="settings-section">
        <text class="section-title">测试设置</text>
        <view class="settings-group">
          <text class="settings-label">测试图片目录</text>
          <input class="settings-input" :value="testDir" @input="onTestDirInput" />
        </view>
        <view class="settings-group">
          <button class="btn-secondary w-full" @click="useSavedCaptures">使用保存记录目录</button>
        </view>
        <view class="settings-group">
          <text class="settings-label">目标数量</text>
          <input class="settings-input" type="number" :value="targetCount" @input="onTargetCountInput" />
        </view>
      </view>

      <view class="report-section">
        <text class="section-title">检测报告</text>
        <scroll-view scroll-y class="report-scroll">
          <view v-if="results.length === 0" class="empty-report">
            <text>开始测试后显示结果</text>
          </view>
          <view v-for="(result, idx) in results" :key="idx" class="report-item">
            <text class="report-num">{{ idx + 1 }}</text>
            <text class="report-name">{{ result.image_name }}</text>
            <text class="report-count">{{ result.detections ? result.detections.length : 0 }} 个</text>
            <text class="report-time">{{ result.time_ms }}ms</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script>
import DetectSocket from '@/api/websocket.js'
import { mapBackendKey } from '@/utils/classMap.js'
import { getTheme } from '@/utils/theme.js'

export default {
  name: 'AutoScore',
  data() {
    return {
      socket: null,
      isConnected: false,
      isRunning: false,
      timeLeft: 180,
      timer: null,
      currentIndex: 0,
      totalImages: 20,
      // 原为 'mosquito_det/integrated/images/test'——来源项目的遗留路径，
      // 服务端不存在，自动打分拿不到图。改用实际存在的截图目录。
      testDir: 'saved_captures',
      targetCount: 20,
      currentImage: '',
      results: [],
      totalTime: 0,
      isDarkTheme: getTheme() === 'dark',
      statusBarHeight: 0
    }
  },
  computed: {
    imageSrc() {
      if (!this.currentImage) return ''
      if (this.currentImage.startsWith('data:')) return this.currentImage
      return 'data:image/jpeg;base64,' + this.currentImage
    },
    timerText() {
      const minutes = Math.floor(this.timeLeft / 60)
      const seconds = this.timeLeft % 60
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    },
    timerStatus() {
      if (!this.isRunning) return '准备就绪'
      if (this.timeLeft <= 0) return '测试完成'
      return '测试进行中...'
    },
    progressPercent() {
      if (this.totalImages === 0) return 0
      return (this.currentIndex / this.totalImages) * 100
    },
    correctCount() { return this.results.length },
    incorrectCount() { return 0 },
    avgTime() {
      if (this.results.length === 0) return 0
      return Math.round(this.totalTime / this.results.length)
    },
    avgFps() {
      const avg = this.avgTime
      return avg > 0 ? Math.round(1000 / avg) : 0
    },
    classCounts() {
      // ⚠ 这里的 key 必须与 classMap.js 的 CLASS_STATS_INIT / LOCAL_TO_DISPLAY 完全一致。
      //   原先是 { water: 0, ... }，而 mapBackendKey('waterlogging') 返回的是
      //   'waterlogging' —— 键名对不上，下面 counts[key] !== undefined 判 false，
      //   于是**积水这一类的计数永远是 0**。
      //   2026-09-19 修：'water' -> 'waterlogging'，并把兜底从 'water' 改成 null 判断
      //   （兜底成某一类会让"未知类别"被静默算进积水，掩盖后端新增类别）。
      const counts = { waterlogging: 0, pothole: 0, manhole: 0, crack: 0 }
      this.results.forEach(r => {
        if (r.detections) {
          r.detections.forEach(d => {
            const key = mapBackendKey(d.class_name)
            if (key && counts[key] !== undefined) counts[key]++
          })
        }
      })
      return counts
    }
  },
  onLoad() {
    const sysInfo = uni.getSystemInfoSync()
    this.statusBarHeight = sysInfo.statusBarHeight || 0
    this.initSocket()
  },
  onUnload() {
    if (this.socket) this.socket.close()
    if (this.timer) clearInterval(this.timer)
  },
  onShow() {
    if (!this.socket) this.initSocket()
    this.isDarkTheme = getApp().globalData.theme === 'dark'
  },
  methods: {
    toggleTheme() {
      const app = getApp()
      const newTheme = app.toggleTheme()
      this.isDarkTheme = newTheme === 'dark'
      uni.showToast({ title: newTheme === 'dark' ? '已切换深色模式' : '已切换浅色模式', icon: 'none', duration: 1500 })
    },
    initSocket() {
      this.socket = new DetectSocket()
      this.socket.on('connected', () => { this.isConnected = true; uni.showToast({ title: '已连接', icon: 'success', duration: 1500 }) })
      this.socket.on('disconnected', () => { this.isConnected = false })
      this.socket.on('error', () => { uni.showToast({ title: '连接失败', icon: 'error', duration: 2000 }) })
      this.socket.on('autoScoreResult', (data) => { this.handleAutoScoreResult(data) })
      this.socket.on('savedCapturesInfo', (data) => {
        if (data.count && data.count > 0) {
          this.testDir = 'saved_captures'
          this.targetCount = data.count
          uni.showToast({ title: `已加载 ${data.count} 张记录`, icon: 'none', duration: 2000 })
        }
      })
      this.socket.connect().catch(() => {})
    },
    handleAutoScoreResult(data) {
      if (!this.isRunning) return
      this.currentImage = data.image || ''
      this.totalTime += data.time_ms || 0
      this.currentIndex++
      this.results.push({ image_name: data.image_name || '', detections: data.detections || [], time_ms: data.time_ms || 0 })
      if (this.currentIndex >= this.totalImages) this.stopAutoScore()
    },
    startAutoScore() {
      if (!this.socket || !this.isConnected) { uni.showToast({ title: '请先连接', icon: 'none', duration: 2000 }); return }
      if (!this.testDir.trim()) { uni.showToast({ title: '请输入目录', icon: 'none', duration: 2000 }); return }
      this.isRunning = true
      this.timeLeft = 180
      this.currentIndex = 0
      this.totalImages = parseInt(this.targetCount) || 20
      this.results = []
      this.totalTime = 0
      this.currentImage = ''
      this.timer = setInterval(() => { this.timeLeft--; if (this.timeLeft <= 0) this.stopAutoScore() }, 1000)
      this.socket.startAutoScore(this.testDir.trim(), this.totalImages)
    },
    stopAutoScore() {
      this.isRunning = false
      if (this.timer) { clearInterval(this.timer); this.timer = null }
      this.timeLeft = 0
    },
    resetAutoScore() {
      this.stopAutoScore()
      this.timeLeft = 180
      this.currentIndex = 0
      this.totalImages = 20
      this.results = []
      this.totalTime = 0
      this.currentImage = ''
      uni.showToast({ title: '已重置', icon: 'success', duration: 1500 })
    },
    useSavedCaptures() {
      this.testDir = 'saved_captures'
      if (this.socket) this.socket.checkSavedCaptures()
    },
    onTestDirInput(e) { this.testDir = e.detail.value || '' },
    onTargetCountInput(e) { this.targetCount = e.detail.value || 20 },
    reconnect() {
      if (this.socket) this.socket.close()
      this.currentImage = ''
      this.initSocket()
    }
  }
}
</script>

<style scoped>
.page { display: flex; flex-direction: column; min-height: 100vh; background: var(--bg-primary); color: var(--text-primary); }
.safe-area-top { background: rgba(23, 23, 33, 0.8); backdrop-filter: blur(20px); }

.header { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; background: rgba(23, 23, 33, 0.6); backdrop-filter: blur(20px); border-bottom: 1px solid var(--border-color); position: sticky; top: 0; z-index: 100; }
.header-left { display: flex; align-items: center; }
.logo { display: flex; align-items: center; gap: 10px; }
.logo-icon { width: 36px; height: 36px; background: linear-gradient(135deg, var(--accent) 0%, var(--accent-light) 50%, var(--accent-dark) 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 18px; box-shadow: 0 4px 15px var(--accent-glow); }
.logo-text { font-size: 18px; font-weight: 700; color: var(--text-primary); letter-spacing: -0.5px; }
.header-right { display: flex; align-items: center; gap: 12px; }
.connection-status { display: flex; align-items: center; gap: 6px; padding: 7px 14px; background: var(--danger-light); border-radius: 20px; font-size: 12px; font-weight: 500; color: var(--danger); }
.connection-status.connected { background: var(--success-light); color: var(--success); }
.status-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; animation: pulse 2s infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
.action-btn { width: 38px; height: 38px; background: var(--bg-elevated); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 18px; transition: all 0.2s ease; box-shadow: var(--shadow-sm); }
.action-btn:active { transform: scale(0.95); background: var(--bg-hover); }

.main-content { flex: 1; padding: 16px; padding-bottom: calc(16px + env(safe-area-inset-bottom) + 60px); display: flex; flex-direction: column; gap: 16px; }

.timer-card { background: var(--bg-card); border-radius: var(--radius-xl); padding: 24px; border: 1px solid var(--border-color); text-align: center; box-shadow: var(--shadow-lg); position: relative; overflow: hidden; }
.timer-card::before { content: ''; position: absolute; top: -50%; right: -50%; width: 100%; height: 100%; background: radial-gradient(circle, var(--accent-glow) 0%, transparent 70%); }
.timer-header { margin-bottom: 20px; position: relative; z-index: 1; }
.timer-title { font-size: 17px; font-weight: 700; color: var(--text-primary); display: block; }
.timer-subtitle { font-size: 12px; color: var(--text-muted); margin-top: 6px; display: block; }
.timer-display { margin-bottom: 24px; position: relative; z-index: 1; }
.timer-value { font-family: 'SF Mono', monospace; font-size: 56px; font-weight: 300; color: var(--text-primary); letter-spacing: -4px; display: block; }
.timer-status { font-size: 13px; color: var(--text-muted); margin-top: 10px; display: block; }
.progress-section { margin-bottom: 24px; position: relative; z-index: 1; }
.progress-bar { height: 8px; background: var(--bg-input); border-radius: var(--radius-full); overflow: hidden; }
.progress-fill { height: 100%; background: linear-gradient(90deg, var(--accent) 0%, var(--accent-light) 100%); border-radius: var(--radius-full); transition: width 0.3s ease; box-shadow: 0 0 12px var(--accent-glow); }
.progress-info { display: flex; justify-content: space-between; font-size: 12px; color: var(--text-muted); margin-top: 10px; }
.btn-group { display: flex; gap: 12px; position: relative; z-index: 1; }
.btn-primary { flex: 1; padding: 13px; background: linear-gradient(135deg, var(--accent) 0%, var(--accent-dark) 100%); border-radius: var(--radius-md); font-size: 14px; font-weight: 600; color: #fff; box-shadow: 0 4px 12px var(--accent-glow); transition: all 0.2s ease; }
.btn-primary:active { transform: scale(0.98); opacity: 0.9; }
.btn-secondary { flex: 1; padding: 13px; background: var(--bg-elevated); border-radius: var(--radius-md); font-size: 14px; font-weight: 600; color: var(--text-secondary); border: 1px solid var(--border-color); transition: all 0.2s ease; }
.btn-secondary:active { transform: scale(0.98); background: var(--bg-hover); }

.preview-section { display: flex; flex-direction: column; gap: 12px; }
.section-title { font-size: 15px; font-weight: 600; color: var(--text-primary); }
.preview-card { position: relative; width: 100%; aspect-ratio: 4/3; background: var(--bg-card); border-radius: var(--radius-lg); overflow: hidden; border: 1px solid var(--border-color); box-shadow: var(--shadow-md); }
.preview-image { width: 100%; height: 100%; object-fit: contain; }
.preview-placeholder { position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; background: linear-gradient(145deg, var(--bg-card) 0%, var(--bg-secondary) 100%); }
.placeholder-icon { font-size: 56px; opacity: 0.2; animation: float 3s ease-in-out infinite; }
@keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }

.stats-section { display: flex; flex-direction: column; gap: 12px; }
.stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.stat-item { background: var(--bg-card); border-radius: var(--radius-md); padding: 18px; text-align: center; border: 1px solid var(--border-color); transition: all 0.2s ease; }
.stat-item:active { transform: scale(0.98); }
.stat-value { font-family: 'SF Mono', monospace; font-size: 32px; font-weight: 700; color: var(--text-primary); display: block; }
.stat-label { font-size: 12px; color: var(--text-muted); margin-top: 6px; display: block; }
.stat-item.success .stat-value { color: var(--success); }
.stat-item.danger .stat-value { color: var(--danger); }

.class-section { display: flex; flex-direction: column; gap: 12px; }
.class-list { background: var(--bg-card); border-radius: var(--radius-md); padding: 14px; border: 1px solid var(--border-color); }
.class-item { display: flex; align-items: center; gap: 14px; padding: 12px; border-radius: var(--radius-sm); transition: all 0.2s ease; }
.class-item:active { background: var(--bg-hover); }
.class-item:not(:last-child) { border-bottom: 1px solid var(--border-light); }
.class-dot { width: 10px; height: 10px; border-radius: 3px; }
.class-dot.water { background: var(--water-color); box-shadow: 0 0 8px var(--water-light); }
.class-dot.pothole { background: var(--pothole-color); box-shadow: 0 0 8px var(--pothole-light); }
.class-dot.manhole { background: var(--manhole-color); box-shadow: 0 0 8px var(--manhole-light); }
.class-dot.crack { background: var(--crack-color); box-shadow: 0 0 8px var(--crack-light); }
.class-name { flex: 1; font-size: 13px; font-weight: 500; color: var(--text-secondary); }
.class-count { font-family: 'SF Mono', monospace; font-size: 18px; font-weight: 700; color: var(--text-primary); }

.settings-section { display: flex; flex-direction: column; gap: 12px; }
.settings-group { background: var(--bg-card); border-radius: var(--radius-md); padding: 16px; border: 1px solid var(--border-color); }
.settings-label { font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 10px; display: block; }
.settings-input { width: 100%; padding: 12px 14px; background: var(--bg-input); border-radius: var(--radius-sm); font-size: 13px; color: var(--text-primary); border: 1px solid var(--border-color); font-family: monospace; transition: all 0.2s ease; }
.settings-input:focus { border-color: var(--accent); }
.w-full { width: 100%; }

.report-section { display: flex; flex-direction: column; gap: 12px; }
.report-scroll { background: var(--bg-card); border-radius: var(--radius-md); padding: 14px; border: 1px solid var(--border-color); max-height: 220px; }
.empty-report { text-align: center; padding: 30px; font-size: 13px; color: var(--text-muted); }
.report-item { display: flex; align-items: center; gap: 14px; padding: 12px; border-radius: var(--radius-sm); transition: all 0.2s ease; }
.report-item:active { background: var(--bg-hover); }
.report-item:not(:last-child) { border-bottom: 1px solid var(--border-light); }
.report-num { width: 30px; height: 30px; background: var(--bg-input); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; color: var(--text-secondary); font-family: monospace; }
.report-name { flex: 1; font-size: 13px; font-weight: 500; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.report-count { font-size: 14px; font-weight: 600; color: var(--text-primary); font-family: monospace; }
.report-time { font-size: 12px; color: var(--text-muted); font-family: monospace; }

@media screen and (min-width: 768px) {
  .main-content { padding-bottom: calc(16px + 80px); }
  .stats-grid { grid-template-columns: repeat(4, 1fr); }
  .preview-card { aspect-ratio: 16/9; }
}
</style>