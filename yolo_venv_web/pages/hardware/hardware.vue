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
				<view class="hardware-status" :class="{ active: hardwareConnected }">
					{{ hardwareConnected ? '硬件在线' : '硬件离线' }}
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
			<view class="overview-section">
				<text class="section-title">设备状态</text>
				<view class="overview-grid">
					<view class="device-card">
						<view class="device-icon">📺</view>
						<view class="device-info">
							<text class="device-name">LCD1602 显示屏</text>
							<text class="device-status" :class="hardwareStatus.lcd_status ? 'active' : 'inactive'">
								{{ hardwareStatus.lcd_status ? '运行中' : '未连接' }}
							</text>
						</view>
						<text class="device-value">{{ hardwareStatus.lcd_text || '---' }}</text>
					</view>
					<view class="device-card">
						<view class="device-icon">🚨</view>
						<view class="device-info">
							<text class="device-name">旋转警示灯</text>
							<text class="device-status" :class="hardwareStatus.warning_light ? 'active' : 'inactive'">
								{{ hardwareStatus.warning_light ? '闪烁中' : '关闭' }}
							</text>
						</view>
						<text class="device-value">{{ getLightColor(hardwareStatus.light_color) }}</text>
					</view>
					<view class="device-card">
						<view class="device-icon">🔔</view>
						<view class="device-info">
							<text class="device-name">蜂鸣器</text>
							<text class="device-status" :class="hardwareStatus.buzzer ? 'active' : 'inactive'">
								{{ hardwareStatus.buzzer ? '鸣叫中' : '静音' }}
							</text>
						</view>
						<text class="device-value">{{ hardwareStatus.buzzer_freq || '---' }}</text>
					</view>
				</view>
			</view>

			<view class="control-section">
				<text class="section-title">手动控制</text>

				<view class="control-group">
					<text class="control-label">风险等级控制</text>
					<view class="btn-grid-4">
						<button class="control-btn high" @click="sendRiskCommand('high')">高风险</button>
						<button class="control-btn medium" @click="sendRiskCommand('medium')">中风险</button>
						<button class="control-btn low" @click="sendRiskCommand('low')">低风险</button>
						<button class="control-btn clear" @click="sendRiskCommand('none')">清除</button>
					</view>
				</view>

				<view class="control-group">
					<text class="control-label">警示灯控制</text>
					<view class="btn-grid-4">
						<button class="control-btn red" @click="sendLightCommand('red')">红色</button>
						<button class="control-btn yellow" @click="sendLightCommand('yellow')">黄色</button>
						<button class="control-btn blue" @click="sendLightCommand('blue')">蓝色</button>
						<button class="control-btn off" @click="sendLightCommand('off')">关闭</button>
					</view>
				</view>

				<view class="control-group">
					<text class="control-label">蜂鸣器控制</text>
					<view class="btn-grid-3">
						<button class="control-btn danger" @click="sendBuzzerCommand('on')">开启</button>
						<button class="control-btn gray" @click="sendBuzzerCommand('off')">关闭</button>
						<button class="control-btn purple" @click="sendBuzzerCommand('alert')">警报模式</button>
					</view>
				</view>

				<view class="control-group">
					<text class="control-label">LCD显示文本</text>
					<input class="lcd-input" :value="lcdText" @input="onLcdInput" placeholder="输入显示文本" />
					<button class="btn-primary w-full" @click="sendLcdCommand">发送到显示屏</button>
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

	export default {
		name: 'HardwareStatus',
		data() {
			return {
				socket: null,
				isConnected: false,
				hardwareConnected: false,
				hardwareStatus: {
					lcd_status: false,
					lcd_text: '',
					warning_light: false,
					light_color: '',
					buzzer: false,
					buzzer_freq: ''
				},
				lcdText: '',
				logs: [],
				isDarkTheme: getTheme() === 'dark',
				statusBarHeight: 0
			}
		},
		onLoad() {
			const sysInfo = uni.getSystemInfoSync()
			this.statusBarHeight = sysInfo.statusBarHeight || 0
			this.initSocket()
		},
		onUnload() {
			if (this.socket) this.socket.close()
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
				uni.showToast({
					title: newTheme === 'dark' ? '已切换深色模式' : '已切换浅色模式',
					icon: 'none',
					duration: 1500
				})
			},
			initSocket() {
				this.socket = new DetectSocket()
				this.socket.on('connected', () => {
					this.isConnected = true;
					uni.showToast({
						title: '已连接',
						icon: 'success',
						duration: 1500
					})
				})
				this.socket.on('disconnected', () => {
					this.isConnected = false;
					this.hardwareConnected = false
				})
				this.socket.on('error', () => {
					uni.showToast({
						title: '连接失败',
						icon: 'error',
						duration: 2000
					})
				})
				this.socket.on('hardwareStatus', (data) => {
					this.handleHardwareStatus(data)
				})
				this.socket.connect().catch(() => {})
			},
			handleHardwareStatus(data) {
				this.hardwareConnected = data.connected || false
				this.hardwareStatus = {
					...this.hardwareStatus,
					...data
				}
				this.addLog('info',
					`硬件状态更新: LCD=${data.lcd_status ? 'ON' : 'OFF'}, Light=${data.warning_light ? 'ON' : 'OFF'}, Buzzer=${data.buzzer ? 'ON' : 'OFF'}`
					)
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
			sendRiskCommand(riskLevel) {
				if (!this.socket) return
				const commands = {
					high: 'RISK_HIGH',
					medium: 'RISK_MEDIUM',
					low: 'RISK_LOW',
					none: 'RISK_NONE'
				}
				this.socket.send({
					type: 'hardware_command',
					command: commands[riskLevel]
				})
				this.addLog('command', `发送风险等级指令: ${riskLevel}`)
				uni.showToast({
					title: '指令已发送',
					icon: 'success',
					duration: 1500
				})
			},
			sendLightCommand(color) {
				if (!this.socket) return
				const commands = {
					red: 'LIGHT_RED',
					yellow: 'LIGHT_YELLOW',
					blue: 'LIGHT_BLUE',
					off: 'LIGHT_OFF'
				}
				this.socket.send({
					type: 'hardware_command',
					command: commands[color]
				})
				this.addLog('command', `发送灯光指令: ${color}`)
				uni.showToast({
					title: '指令已发送',
					icon: 'success',
					duration: 1500
				})
			},
			sendBuzzerCommand(action) {
				if (!this.socket) return
				const commands = {
					on: 'BUZZER_ON',
					off: 'BUZZER_OFF',
					alert: 'BUZZER_ALERT'
				}
				this.socket.send({
					type: 'hardware_command',
					command: commands[action]
				})
				this.addLog('command', `发送蜂鸣器指令: ${action}`)
				uni.showToast({
					title: '指令已发送',
					icon: 'success',
					duration: 1500
				})
			},
			sendLcdCommand() {
				if (!this.socket || !this.lcdText.trim()) {
					uni.showToast({
						title: '请输入文本',
						icon: 'none',
						duration: 1500
					});
					return
				}
				this.socket.send({
					type: 'hardware_command',
					command: `LCD:${this.lcdText}`
				})
				this.addLog('command', `发送LCD文本: ${this.lcdText}`)
				uni.showToast({
					title: '指令已发送',
					icon: 'success',
					duration: 1500
				})
				this.lcdText = ''
			},
			onLcdInput(e) {
				this.lcdText = e.detail.value || ''
			},
			clearLogs() {
				this.logs = [];
				uni.showToast({
					title: '日志已清空',
					icon: 'success',
					duration: 1500
				})
			},
			getLightColor(color) {
				const colors = {
					'red': '🔴 红色',
					'yellow': '🟡 黄色',
					'blue': '🔵 蓝色',
					'': '---'
				};
				return colors[color] || color
			},
			reconnect() {
				if (this.socket) this.socket.close();
				this.initSocket()
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

	.overview-section {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.section-title {
		font-size: 15px;
		font-weight: 600;
		color: var(--text-primary);
	}

	.overview-grid {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.device-card {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 18px;
		background: var(--bg-card);
		border-radius: var(--radius-md);
		border: 1px solid var(--border-color);
		transition: all 0.2s ease;
	}

	.device-card:active {
		transform: scale(0.98);
	}

	.device-icon {
		font-size: 32px;
	}

	.device-info {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.device-name {
		font-size: 14px;
		font-weight: 600;
		color: var(--text-primary);
	}

	.device-status {
		font-size: 12px;
		margin-top: 4px;
	}

	.device-status.active {
		color: var(--success);
		font-weight: 500;
	}

	.device-status.inactive {
		color: var(--text-muted);
	}

	.device-value {
		font-family: 'SF Mono', monospace;
		font-size: 13px;
		color: var(--text-secondary);
		margin-top: 2px;
	}

	.control-section {
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

	.btn-grid-4 {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 8px;
	}

	.btn-grid-3 {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
	}

	.control-btn {
		padding: 13px 8px;
		border-radius: var(--radius-sm);
		font-size: 11px;
		font-weight: 600;
		transition: all 0.2s ease;
	}

	.control-btn:active {
		transform: scale(0.95);
	}

	.control-btn.high {
		background: var(--danger-light);
		color: var(--danger);
		border: 1px solid var(--danger);
	}

	.control-btn.medium {
		background: var(--warning-light);
		color: var(--warning);
		border: 1px solid var(--warning);
	}

	.control-btn.low {
		background: var(--success-light);
		color: var(--success);
		border: 1px solid var(--success);
	}

	.control-btn.clear {
		background: var(--bg-input);
		color: var(--text-secondary);
		border: 1px solid var(--border-color);
	}

	.control-btn.red {
		background: var(--danger-light);
		color: var(--danger);
		border: 1px solid var(--danger);
	}

	.control-btn.yellow {
		background: var(--warning-light);
		color: var(--warning);
		border: 1px solid var(--warning);
	}

	.control-btn.blue {
		background: var(--info-light);
		color: var(--info);
		border: 1px solid var(--info);
	}

	.control-btn.off {
		background: var(--bg-input);
		color: var(--text-secondary);
		border: 1px solid var(--border-color);
	}

	.control-btn.danger {
		background: var(--danger-light);
		color: var(--danger);
		border: 1px solid var(--danger);
	}

	.control-btn.gray {
		background: var(--bg-input);
		color: var(--text-secondary);
		border: 1px solid var(--border-color);
	}

	.control-btn.purple {
		background: rgba(139, 92, 246, 0.15);
		color: #8b5cf6;
		border: 1px solid #8b5cf6;
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

	.btn-primary {
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

	.w-full {
		width: 100%;
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

	.btn-sm {
		padding: 6px 10px;
		font-size: 11px;
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

		.overview-grid {
			flex-direction: row;
		}

		.device-card {
			flex: 1;
		}
	}
</style>