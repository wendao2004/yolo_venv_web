<template>
	<view class="page" :class="{ 'dark-theme': isDarkTheme, 'light-theme': !isDarkTheme }">
		<view class="safe-area-top" :style="{ height: statusBarHeight + 'px' }"></view>
		<view class="header">
			<view class="header-left">
				<view class="logo">
					<view class="logo-icon"><text>⚙️</text></view>
					<text class="logo-text">硬件状态</text>
				</view>
			</view>
			<view class="header-right">
				<view class="connection-status" :class="{ connected: isConnected }">
					<view class="status-dot"></view>
					<text>{{ isConnected ? '在线' : '离线' }}</text>
				</view>
				<view class="hardware-status" :class="{ active: hardwareOnline }">
					{{ hardwareOnline ? '硬件在线' : '硬件离线' }}
				</view>
				<button class="action-btn" @click="toggleTheme">
					<text>{{ isDarkTheme ? '☀️' : '🌙' }}</text>
				</button>
				<button class="action-btn" @click="reconnect">
					<text>🔄</text>
				</button>
			</view>
		</view>

		<view class="main-content">
			<!-- 服务器地址：App 端没有 location，必须能手动指定 PC 的局域网 IP（见对接文档 §5.3）。 -->
			<view class="control-section">
				<text class="section-title">服务器地址</text>
				<view class="control-group">
					<text class="control-label">PC 局域网地址（IP 或 IP:端口）</text>
					<input class="lcd-input" :value="hostInput" @input="onHostInput" placeholder="例如 192.168.137.1:8766" />
					<view class="btn-row">
						<button class="btn-primary" @click="saveHost">保存并重连</button>
						<button class="btn-secondary" @click="resetHost">恢复默认</button>
					</view>
					<text class="source-info">当前连接：{{ currentUrl }}</text>
				</view>
			</view>

			<view class="overview-section">
				<text class="section-title">设备状态</text>
				<view v-if="!hardwareOnline" class="hint-box">
					<text>等待 ESP32-S3 上报 s3_status…</text>
					<text class="hint-sub">硬件每 2 秒上报一次；超过 6 秒未收到即判定离线。</text>
				</view>
				<view class="metric-grid">
					<view v-for="item in metrics" :key="item.label" class="metric-card">
						<text class="metric-icon">{{ item.icon }}</text>
						<view class="metric-info">
							<text class="metric-label">{{ item.label }}</text>
							<text class="metric-value" :class="item.cls">{{ item.value }}</text>
						</view>
					</view>
				</view>
			</view>

			<view class="log-section">
				<view class="section-header">
					<text class="section-title">硬件日志</text>
					<button class="btn-secondary btn-sm" @click="clearLogs">清空</button>
				</view>
				<scroll-view scroll-y class="log-scroll">
					<view v-if="logs.length === 0" class="empty-log">
						<text>暂无日志</text>
					</view>
					<view v-for="(log, idx) in logs" :key="idx" class="log-item">
						<text class="log-time">{{ log.time }}</text>
						<text class="log-message" :class="log.type">{{ log.message }}</text>
					</view>
				</scroll-view>
			</view>
		</view>
	</view>
</template>

<script>
	import DetectSocket from '@/api/websocket.js'
	import {
		getTheme
	} from '@/utils/theme.js'

	// 硬件心跳判定窗口：s3_status 每 2s 一条，超过该时长未收到即视为离线。
	const HARDWARE_TIMEOUT_MS = 6000
	// 服务器地址的本地存储键，必须与 api/websocket.js 的 getUrl() 读取的键一致。
	const HOST_KEY = 'ws_host'
	const PORT_KEY = 'ws_port'

	export default {
		name: 'HardwareStatus',
		data() {
			return {
				socket: null,
				isConnected: false,
				// 硬件（ESP32-S3）是否在线：以最近一条 s3_status 的新鲜度为准，
				// 因为 s3_status 报文里没有 connected 字段。
				hardwareOnline: false,
				lastStatusAt: 0,
				status: {},
				now: Date.now(),
				ticker: null,
				// 用于检测"重连次数 / 丢帧数"这类只增不减的计数变化
				lastReconnects: null,
				lastDropFrames: null,
				hostInput: '',
				currentUrl: '',
				logs: [],
				isDarkTheme: getTheme() === 'dark',
				statusBarHeight: 0
			}
		},
		computed: {
			metrics() {
				const s = this.status
				return [{
						label: '运行时长',
						icon: '⏱️',
						value: this.formatUptime(s.uptime_s)
					},
					{
						label: 'WiFi 信号',
						icon: '📶',
						value: this.formatRssi(s.wifi_rssi),
						cls: this.rssiClass(s.wifi_rssi)
					},
					{
						label: '可用内存',
						icon: '🧠',
						value: this.formatKb(s.free_heap_kb)
					},
					{
						label: 'PSRAM',
						icon: '💾',
						value: this.formatKb(s.free_psram_kb)
					},
					{
						label: '音量',
						icon: '🔊',
						value: this.isNumber(s.volume) ? s.volume + '%' : '—'
					},
					{
						label: '静音',
						icon: '🔇',
						value: typeof s.muted === 'boolean' ? (s.muted ? '是' : '否') : '—'
					},
					{
						label: '正在播放',
						icon: '🎵',
						value: s.playing ? String(s.playing) : '空闲'
					},
					{
						label: '帧龄',
						icon: '🖼️',
						value: this.isNumber(s.frame_age_ms) ? s.frame_age_ms + ' ms' : '—',
						cls: this.frameAgeClass(s.frame_age_ms)
					},
					{
						label: '实测帧率',
						icon: '📈',
						value: this.isNumber(s.fps) ? Number(s.fps).toFixed(1) : '—'
					},
					{
						label: '接收帧数',
						icon: '📥',
						value: this.isNumber(s.rx_frames) ? String(s.rx_frames) : '—'
					},
					{
						label: '丢帧数',
						icon: '⚠️',
						value: this.isNumber(s.drop_frames) ? String(s.drop_frames) : '—',
						cls: this.isNumber(s.drop_frames) && s.drop_frames > 0 ? 'value-warn' : ''
					},
					{
						label: '重连次数',
						icon: '🔁',
						value: this.isNumber(s.reconnects) ? String(s.reconnects) : '—',
						cls: this.isNumber(s.reconnects) && s.reconnects > 0 ? 'value-warn' : ''
					}
				]
			}
		},
		onLoad() {
			const sysInfo = uni.getSystemInfoSync()
			this.statusBarHeight = sysInfo.statusBarHeight || 0
			this.loadHostInput()
			this.initSocket()
			this.startTicker()
		},
		onShow() {
			if (!this.socket) this.initSocket()
			this.isDarkTheme = getApp().globalData.theme === 'dark'
			this.startTicker()
		},
		onHide() {
			this.stopTicker()
		},
		onUnload() {
			this.stopTicker()
			if (this.socket) this.socket.close()
		},
		methods: {
			isNumber(v) {
				return typeof v === 'number' && isFinite(v)
			},
			formatUptime(sec) {
				if (!this.isNumber(sec)) return '—'
				const s = Math.max(0, Math.floor(sec))
				const d = Math.floor(s / 86400)
				const h = Math.floor((s % 86400) / 3600)
				const m = Math.floor((s % 3600) / 60)
				const ss = s % 60
				if (d > 0) return `${d}天${h}时`
				if (h > 0) return `${h}时${m}分`
				if (m > 0) return `${m}分${ss}秒`
				return `${ss}秒`
			},
			formatKb(kb) {
				if (!this.isNumber(kb)) return '—'
				if (kb >= 1024) return (kb / 1024).toFixed(1) + ' MB'
				return kb + ' KB'
			},
			formatRssi(rssi) {
				if (!this.isNumber(rssi)) return '—'
				return `${rssi} dBm`
			},
			rssiClass(rssi) {
				if (!this.isNumber(rssi)) return ''
				if (rssi >= -60) return 'value-good'
				if (rssi >= -75) return 'value-warn'
				return 'value-bad'
			},
			frameAgeClass(age) {
				if (!this.isNumber(age)) return ''
				if (age <= 200) return 'value-good'
				if (age <= 1000) return 'value-warn'
				return 'value-bad'
			},
			startTicker() {
				this.stopTicker()
				this.ticker = setInterval(() => {
					this.now = Date.now()
					const online = this.lastStatusAt > 0 &&
						(this.now - this.lastStatusAt) < HARDWARE_TIMEOUT_MS
					if (this.hardwareOnline && !online) {
						this.addLog('error', '硬件心跳超时，判定为离线')
					}
					this.hardwareOnline = online
				}, 1000)
			},
			stopTicker() {
				if (this.ticker) {
					clearInterval(this.ticker)
					this.ticker = null
				}
			},
			toggleTheme() {
				const app = getApp()
				const newTheme = app.toggleTheme()
				this.isDarkTheme = newTheme === 'dark'
				uni.showToast({
					title: newTheme === 'dark' ? '已切换深色模式' : '已切换浅色模式',
					icon: 'none',
					duration: 1500
				})
			},
			// ---- 服务器地址（写进 storage，websocket.js 的 getUrl() 会优先读取）----
			loadHostInput() {
				let host = ''
				let port = ''
				try {
					host = uni.getStorageSync(HOST_KEY) || ''
					port = uni.getStorageSync(PORT_KEY) || ''
				} catch (e) { /* 存储不可用时忽略 */ }
				this.hostInput = host ? (port && String(host).indexOf(':') < 0 ? `${host}:${port}` : String(host)) : ''
				this.refreshCurrentUrl()
			},
			onHostInput(e) {
				this.hostInput = e.detail.value || ''
			},
			refreshCurrentUrl() {
				// 用一次临时实例解析出实际会连接的地址，避免在这里重复 getUrl() 的逻辑。
				try {
					this.currentUrl = new DetectSocket().getUrl()
				} catch (e) {
					this.currentUrl = '—'
				}
			},
			saveHost() {
				const raw = (this.hostInput || '').trim()
				try {
					if (!raw) {
						uni.removeStorageSync(HOST_KEY)
						uni.removeStorageSync(PORT_KEY)
					} else {
						// 允许 'ip' 或 'ip:port' 两种写法；websocket.js 也会再解析一次。
						const m = raw.replace(/^wss?:\/\//, '')
						const idx = m.lastIndexOf(':')
						if (idx > 0 && /^\d+$/.test(m.slice(idx + 1))) {
							uni.setStorageSync(HOST_KEY, m.slice(0, idx))
							uni.setStorageSync(PORT_KEY, m.slice(idx + 1))
						} else {
							uni.setStorageSync(HOST_KEY, m)
							uni.removeStorageSync(PORT_KEY)
						}
					}
				} catch (e) {
					uni.showToast({ title: '保存失败', icon: 'none', duration: 1500 })
					return
				}
				this.refreshCurrentUrl()
				this.addLog('command', `服务器地址已更新为 ${this.currentUrl}`)
				uni.showToast({ title: '已保存，正在重连', icon: 'success', duration: 1500 })
				this.reconnect()
			},
			resetHost() {
				try {
					uni.removeStorageSync(HOST_KEY)
					uni.removeStorageSync(PORT_KEY)
				} catch (e) { /* 忽略 */ }
				this.hostInput = ''
				this.refreshCurrentUrl()
				uni.showToast({ title: '已恢复默认地址', icon: 'none', duration: 1500 })
				this.reconnect()
			},
			initSocket() {
				this.socket = new DetectSocket()
				this.socket.on('connected', () => {
					this.isConnected = true
					this.refreshCurrentUrl()
					this.addLog('info', `已连接后端 ${this.currentUrl}`)
					uni.showToast({
						title: '已连接',
						icon: 'success',
						duration: 1500
					})
				})
				this.socket.on('disconnected', () => {
					this.isConnected = false
					this.hardwareOnline = false
				})
				this.socket.on('error', () => {
					uni.showToast({
						title: '连接失败',
						icon: 'error',
						duration: 2000
					})
				})
				// s3_status 由 server.py 透传（对接文档 §5.1）；字段见 §4.2。
				// ⚠ 事件名必须是 's3Status'（api/websocket.js 的 emit 名），
				//   原实现监听的是 'hardwareStatus'，该事件从未被 emit → 页面永远不动。
				this.socket.on('s3Status', (data) => {
					this.handleS3Status(data)
				})
				this.socket.connect().catch(() => {})
			},
			handleS3Status(data) {
				if (!data || typeof data !== 'object') return
				const wasOnline = this.hardwareOnline
				this.status = data
				this.lastStatusAt = Date.now()
				this.hardwareOnline = true
				if (!wasOnline) this.addLog('info', '硬件已上线（收到 s3_status）')

				// 只增不减的计数出现变化时才记日志，避免每 2s 刷屏。
				if (this.isNumber(data.reconnects) && this.lastReconnects !== null &&
					data.reconnects > this.lastReconnects) {
					this.addLog('error', `硬件重连次数增加：${this.lastReconnects} → ${data.reconnects}`)
				}
				if (this.isNumber(data.drop_frames) && this.lastDropFrames !== null &&
					data.drop_frames > this.lastDropFrames) {
					this.addLog('error', `硬件丢帧增加：${this.lastDropFrames} → ${data.drop_frames}`)
				}
				if (this.isNumber(data.reconnects)) this.lastReconnects = data.reconnects
				if (this.isNumber(data.drop_frames)) this.lastDropFrames = data.drop_frames
			},
			addLog(type, message) {
				const now = new Date()
				const time =
					`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
				this.logs.unshift({
					time,
					type,
					message
				})
				if (this.logs.length > 50) this.logs = this.logs.slice(0, 50)
			},
			clearLogs() {
				this.logs = [];
				uni.showToast({
					title: '日志已清空',
					icon: 'success',
					duration: 1500
				})
			},
			reconnect() {
				this.stopTicker()
				if (this.socket) this.socket.close()
				this.socket = null
				this.isConnected = false
				this.hardwareOnline = false
				this.lastStatusAt = 0
				this.lastReconnects = null
				this.lastDropFrames = null
				this.initSocket()
				this.startTicker()
			}
		}
	}
</script>

<style scoped>
	.page {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		background: var(--bg-primary);
		color: var(--text-primary);
	}

	.safe-area-top {
		background: rgba(23, 23, 33, 0.8);
		backdrop-filter: blur(20px);
	}

	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 16px;
		background: rgba(23, 23, 33, 0.6);
		backdrop-filter: blur(20px);
		border-bottom: 1px solid var(--border-color);
		position: sticky;
		top: 0;
		z-index: 100;
	}

	.header-left {
		display: flex;
		align-items: center;
	}

	.logo {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.logo-icon {
		width: 36px;
		height: 36px;
		background: linear-gradient(135deg, var(--accent) 0%, var(--accent-light) 50%, var(--accent-dark) 100%);
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 18px;
		box-shadow: 0 4px 15px var(--accent-glow);
	}

	.logo-text {
		font-size: 18px;
		font-weight: 700;
		color: var(--text-primary);
		letter-spacing: -0.5px;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.connection-status {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 7px 12px;
		background: var(--danger-light);
		border-radius: 20px;
		font-size: 11px;
		font-weight: 500;
		color: var(--danger);
	}

	.connection-status.connected {
		background: var(--success-light);
		color: var(--success);
	}

	.status-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: currentColor;
		animation: pulse 2s infinite;
	}

	@keyframes pulse {

		0%,
		100% {
			opacity: 1;
		}

		50% {
			opacity: 0.5;
		}
	}

	.hardware-status {
		padding: 7px 12px;
		background: var(--danger-light);
		border-radius: 20px;
		font-size: 11px;
		font-weight: 500;
		color: var(--danger);
		border: 1px solid var(--danger);
		transition: all 0.3s ease;
	}

	.hardware-status.active {
		background: var(--success-light);
		color: var(--success);
		border-color: var(--success);
	}

	.action-btn {
		width: 38px;
		height: 38px;
		background: var(--bg-elevated);
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 18px;
		transition: all 0.2s ease;
		box-shadow: var(--shadow-sm);
	}

	.action-btn:active {
		transform: scale(0.95);
		background: var(--bg-hover);
	}

	.main-content {
		flex: 1;
		padding: 16px;
		padding-bottom: calc(16px + env(safe-area-inset-bottom) + 60px);
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.section-title {
		font-size: 15px;
		font-weight: 600;
		color: var(--text-primary);
	}

	.control-section,
	.overview-section {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.control-group {
		background: var(--bg-card);
		border-radius: var(--radius-lg);
		padding: 18px;
		border: 1px solid var(--border-color);
		box-shadow: var(--shadow-md);
	}

	.control-label {
		font-size: 12px;
		font-weight: 600;
		color: var(--text-muted);
		margin-bottom: 14px;
		display: block;
	}

	.lcd-input {
		width: 100%;
		padding: 13px 14px;
		background: var(--bg-input);
		border-radius: var(--radius-md);
		font-size: 14px;
		color: var(--text-primary);
		border: 1px solid var(--border-color);
		margin-bottom: 14px;
		transition: all 0.2s ease;
	}

	.lcd-input:focus {
		border-color: var(--accent);
	}

	.btn-row {
		display: flex;
		gap: 10px;
	}

	.btn-primary {
		flex: 1;
		padding: 13px;
		background: linear-gradient(135deg, var(--accent) 0%, var(--accent-dark) 100%);
		border-radius: var(--radius-md);
		font-size: 14px;
		font-weight: 600;
		color: #fff;
		box-shadow: 0 4px 12px var(--accent-glow);
		transition: all 0.2s ease;
	}

	.btn-primary:active {
		transform: scale(0.98);
		opacity: 0.9;
	}

	.btn-secondary {
		padding: 8px 14px;
		background: var(--bg-elevated);
		border-radius: var(--radius-sm);
		font-size: 12px;
		font-weight: 600;
		color: var(--text-secondary);
		border: 1px solid var(--border-color);
		transition: all 0.2s ease;
	}

	.btn-secondary:active {
		background: var(--bg-hover);
	}

	.btn-row .btn-secondary {
		flex: 0 0 auto;
		padding: 13px 18px;
		font-size: 14px;
	}

	.btn-sm {
		padding: 6px 10px;
		font-size: 11px;
	}

	.source-info {
		display: block;
		margin-top: 12px;
		padding: 8px 12px;
		background: var(--bg-input);
		border-radius: var(--radius-sm);
		font-size: 12px;
		color: var(--text-secondary);
		font-family: monospace;
		word-break: break-all;
	}

	.hint-box {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 14px 16px;
		background: var(--bg-card);
		border-radius: var(--radius-md);
		border: 1px dashed var(--border-color);
		font-size: 13px;
		color: var(--text-secondary);
	}

	.hint-sub {
		font-size: 11px;
		color: var(--text-muted);
	}

	.metric-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 10px;
	}

	.metric-card {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 14px;
		background: var(--bg-card);
		border-radius: var(--radius-md);
		border: 1px solid var(--border-color);
		transition: all 0.2s ease;
	}

	.metric-card:active {
		transform: scale(0.98);
	}

	.metric-icon {
		font-size: 24px;
	}

	.metric-info {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.metric-label {
		font-size: 11px;
		color: var(--text-muted);
	}

	.metric-value {
		font-family: 'SF Mono', monospace;
		font-size: 15px;
		font-weight: 700;
		color: var(--text-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.metric-value.value-good {
		color: var(--success);
	}

	.metric-value.value-warn {
		color: var(--warning);
	}

	.metric-value.value-bad {
		color: var(--danger);
	}

	.log-section {
		background: var(--bg-card);
		border-radius: var(--radius-lg);
		padding: 18px;
		border: 1px solid var(--border-color);
		box-shadow: var(--shadow-md);
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 14px;
	}

	.log-scroll {
		max-height: 220px;
	}

	.empty-log {
		text-align: center;
		padding: 30px;
		font-size: 13px;
		color: var(--text-muted);
	}

	.log-item {
		display: flex;
		gap: 14px;
		padding: 10px 0;
		transition: all 0.2s ease;
	}

	.log-item:not(:last-child) {
		border-bottom: 1px solid var(--border-light);
	}

	.log-time {
		font-family: 'SF Mono', monospace;
		font-size: 11px;
		color: var(--text-muted);
		flex-shrink: 0;
	}

	.log-message {
		font-size: 12px;
		color: var(--text-secondary);
		word-break: break-all;
	}

	.log-message.command {
		color: var(--accent);
		font-weight: 500;
	}

	.log-message.info {
		color: var(--info);
	}

	.log-message.error {
		color: var(--danger);
		font-weight: 500;
	}

	@media screen and (min-width: 768px) {
		.main-content {
			padding-bottom: calc(16px + 80px);
		}

		.metric-grid {
			grid-template-columns: repeat(4, 1fr);
		}
	}
</style>
