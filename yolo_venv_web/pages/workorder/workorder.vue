<template>
	<view class="page" :class="{ 'dark-theme': isDarkTheme, 'light-theme': !isDarkTheme }">
		<view class="safe-area-top" :style="{ height: statusBarHeight + 'px' }"></view>
		<view class="header">
			<view class="header-left">
				<view class="logo">
					<view class="logo-icon"><text>📋</text></view>
					<text class="logo-text">工单管理</text>
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
				<button class="action-btn" @click="loadWorkOrders">
					<text>🔄</text>
				</button>
			</view>
		</view>

		<view class="main-content">
			<view class="filter-section">
				<view class="filter-row">
					<view class="filter-item">
						<text class="filter-label">状态</text>
						<picker mode="selector" :range="statusOptions" :value="selectedStatus" @change="onStatusChange">
							<view class="filter-picker">
								<text>{{ statusOptions[selectedStatus] }}</text>
								<text class="picker-arrow">▼</text>
							</view>
						</picker>
					</view>
					<view class="filter-item">
						<text class="filter-label">风险</text>
						<picker mode="selector" :range="riskOptions" :value="selectedRisk" @change="onRiskChange">
							<view class="filter-picker">
								<text>{{ riskOptions[selectedRisk] }}</text>
								<text class="picker-arrow">▼</text>
							</view>
						</picker>
					</view>
					<view class="filter-item">
						<text class="filter-label">类型</text>
						<picker mode="selector" :range="typeOptions" :value="selectedType" @change="onTypeChange">
							<view class="filter-picker">
								<text>{{ typeOptions[selectedType] }}</text>
								<text class="picker-arrow">▼</text>
							</view>
						</picker>
					</view>
				</view>
				<view class="filter-summary">
					<text>共 {{ filteredOrders.length }} 条记录</text>
				</view>
			</view>

			<scroll-view scroll-y class="order-list">
				<view v-if="filteredOrders.length === 0" class="empty-state">
					<text class="empty-icon">📭</text>
					<text class="empty-text">暂无工单记录</text>
				</view>
				<view v-for="order in filteredOrders" :key="order.id" class="order-card">
					<view class="order-header">
						<view class="order-id">
							<text class="id-label">工单</text>
							<text class="id-value">{{ order.id }}</text>
						</view>
						<view class="order-status-tag" :class="order.status">
							{{ getStatusLabel(order.status) }}
						</view>
					</view>
					<view class="order-body">
						<view class="order-info-row">
							<text class="info-label">时间</text>
							<text class="info-value">{{ order.timestamp }}</text>
						</view>
						<view class="order-info-row">
							<text class="info-label">类型</text>
							<view class="info-tag" :class="getTypeClass(order.type)">
								{{ getTypeLabel(order.type) }}
							</view>
						</view>
						<view class="order-info-row">
							<text class="info-label">风险</text>
							<view class="info-tag" :class="'risk-' + order.risk_level">
								{{ getRiskLabel(order.risk_level) }}
							</view>
						</view>
						<view class="order-info-row">
							<text class="info-label">置信度</text>
							<text class="info-value mono">{{ (order.confidence * 100).toFixed(1) }}%</text>
						</view>
					</view>
					<view class="order-footer">
						<button class="action-btn-small" :class="getActionClass(order.status)"
							@click="updateOrderStatus(order.id, getNextStatus(order.status))">
							{{ getNextStatusLabel(order.status) }}
						</button>
					</view>
				</view>
			</scroll-view>
		</view>
	</view>
</template>

<script>
	import DetectSocket from '@/api/websocket.js'
	import {
		getTheme
	} from '@/utils/theme.js'

	export default {
		name: 'WorkOrder',
		data() {
			return {
				socket: null,
				isConnected: false,
				orders: [],
				selectedStatus: 0,
				selectedRisk: 0,
				selectedType: 0,
				statusOptions: ['全部', '待处理', '处理中', '已完成', '已关闭'],
				riskOptions: ['全部', '高风险', '中风险', '低风险'],
				typeOptions: ['全部', '积水', '坑洼', '井盖异常', '道路裂纹'],
				isDarkTheme: getTheme() === 'dark',
				statusBarHeight: 0
			}
		},
		computed: {
			filteredOrders() {
				let result = [...this.orders]
				if (this.selectedStatus > 0) {
					const statusMap = {
						1: 'pending',
						2: 'processing',
						3: 'completed',
						4: 'closed'
					}
					result = result.filter(o => o.status === statusMap[this.selectedStatus])
				}
				if (this.selectedRisk > 0) {
					const riskMap = {
						1: 'high',
						2: 'medium',
						3: 'low'
					}
					result = result.filter(o => o.risk_level === riskMap[this.selectedRisk])
				}
				if (this.selectedType > 0) {
					const typeMap = {
						1: 'waterlogging',
						2: 'pothole',
						3: 'manhole',
						4: 'crack'
					}
					result = result.filter(o => o.type === typeMap[this.selectedType])
				}
				return result
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
			else this.loadWorkOrders()
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
					});
					this.loadWorkOrders()
				})
				this.socket.on('disconnected', () => {
					this.isConnected = false
				})
				this.socket.on('error', () => {
					uni.showToast({
						title: '连接失败',
						icon: 'error',
						duration: 2000
					})
				})
				this.socket.on('workOrder', (data) => {
					this.handleWorkOrder(data)
				})
				this.socket.connect().catch(() => {})
			},
			handleWorkOrder(data) {
				if (data.type === 'add') {
					this.orders.unshift(data.order)
					uni.showToast({
						title: '新工单: ' + this.getTypeLabel(data.order.type),
						icon: 'none',
						duration: 2000
					})
				} else if (data.type === 'update') {
					const idx = this.orders.findIndex(o => o.id === data.order.id)
					if (idx >= 0) this.orders[idx] = {
						...this.orders[idx],
						...data.order
					}
				}
			},
			loadWorkOrders() {
				if (this.socket) this.socket.getWorkOrders()
			},
			updateOrderStatus(orderId, status) {
				if (this.socket) {
					this.socket.updateWorkOrder(orderId, status)
					uni.showToast({
						title: '状态已更新',
						icon: 'success',
						duration: 1500
					})
				}
			},
			onStatusChange(e) {
				this.selectedStatus = e.detail.value
			},
			onRiskChange(e) {
				this.selectedRisk = e.detail.value
			},
			onTypeChange(e) {
				this.selectedType = e.detail.value
			},
			getStatusLabel(status) {
				const labels = {
					pending: '待处理',
					processing: '处理中',
					completed: '已完成',
					closed: '已关闭'
				};
				return labels[status] || status
			},
			getRiskLabel(risk) {
				const labels = {
					high: '高风险',
					medium: '中风险',
					low: '低风险'
				};
				return labels[risk] || risk
			},
			getTypeLabel(type) {
				const labels = {
					waterlogging: '道路积水',
					pothole: '路面坑洼',
					manhole: '井盖异常',
					crack: '道路裂纹'
				};
				return labels[type] || type
			},
			getTypeClass(type) {
				const classes = {
					waterlogging: 'water',
					pothole: 'pothole',
					manhole: 'manhole',
					crack: 'crack'
				};
				return classes[type] || ''
			},
			getActionClass(status) {
				if (status === 'pending') return 'primary';
				if (status === 'processing') return 'success';
				if (status === 'completed') return 'secondary';
				return 'disabled'
			},
			getNextStatus(status) {
				const next = {
					pending: 'processing',
					processing: 'completed',
					completed: 'closed',
					closed: 'closed'
				};
				return next[status] || status
			},
			getNextStatusLabel(status) {
				const labels = {
					pending: '开始处理',
					processing: '完成处理',
					completed: '关闭工单',
					closed: '已关闭'
				};
				return labels[status] || '操作'
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
		gap: 10px;
	}

	.connection-status {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 7px 14px;
		background: var(--danger-light);
		border-radius: 20px;
		font-size: 12px;
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
		display: flex;
		flex-direction: column;
	}

	.filter-section {
		background: var(--bg-card);
		padding: 16px;
		border-bottom: 1px solid var(--border-color);
	}

	.filter-row {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 10px;
	}

	.filter-item {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.filter-label {
		font-size: 11px;
		font-weight: 600;
		color: var(--text-muted);
	}

	.filter-picker {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 11px 12px;
		background: var(--bg-input);
		border-radius: var(--radius-sm);
		font-size: 13px;
		font-weight: 500;
		color: var(--text-primary);
		border: 1px solid var(--border-color);
		transition: all 0.2s ease;
	}

	.filter-picker:active {
		border-color: var(--accent);
	}

	.picker-arrow {
		font-size: 10px;
		color: var(--text-muted);
	}

	.filter-summary {
		text-align: center;
		margin-top: 14px;
		font-size: 12px;
		color: var(--text-muted);
	}

	.order-list {
		flex: 1;
		padding: 16px;
		padding-bottom: calc(16px + env(safe-area-inset-bottom) + 60px);
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 80px 20px;
	}

	.empty-icon {
		font-size: 64px;
		opacity: 0.15;
		margin-bottom: 16px;
		animation: float 3s ease-in-out infinite;
	}

	@keyframes float {

		0%,
		100% {
			transform: translateY(0);
		}

		50% {
			transform: translateY(-10px);
		}
	}

	.empty-text {
		font-size: 14px;
		color: var(--text-muted);
	}

	.order-card {
		background: var(--bg-card);
		border-radius: var(--radius-lg);
		margin-bottom: 12px;
		border: 1px solid var(--border-color);
		overflow: hidden;
		box-shadow: var(--shadow-md);
		transition: all 0.2s ease;
	}

	.order-card:active {
		transform: scale(0.98);
	}

	.order-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px;
		background: var(--bg-elevated);
	}

	.order-id {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.id-label {
		font-size: 11px;
		font-weight: 600;
		color: var(--text-muted);
	}

	.id-value {
		font-family: 'SF Mono', monospace;
		font-size: 15px;
		font-weight: 700;
		color: var(--text-primary);
	}

	.order-status-tag {
		padding: 5px 12px;
		border-radius: var(--radius-full);
		font-size: 11px;
		font-weight: 600;
	}

	.order-status-tag.pending {
		background: var(--warning-light);
		color: var(--warning);
	}

	.order-status-tag.processing {
		background: var(--info-light);
		color: var(--info);
	}

	.order-status-tag.completed {
		background: var(--success-light);
		color: var(--success);
	}

	.order-status-tag.closed {
		background: var(--bg-input);
		color: var(--text-muted);
	}

	.order-body {
		padding: 16px;
	}

	.order-info-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 0;
	}

	.order-info-row:not(:last-child) {
		border-bottom: 1px solid var(--border-light);
	}

	.info-label {
		font-size: 12px;
		font-weight: 500;
		color: var(--text-muted);
	}

	.info-value {
		font-size: 13px;
		font-weight: 500;
		color: var(--text-primary);
	}

	.mono {
		font-family: 'SF Mono', monospace;
	}

	.info-tag {
		padding: 5px 12px;
		border-radius: var(--radius-full);
		font-size: 11px;
		font-weight: 600;
	}

	.info-tag.water {
		background: var(--water-light);
		color: var(--water-color);
	}

	.info-tag.pothole {
		background: var(--pothole-light);
		color: var(--pothole-color);
	}

	.info-tag.manhole {
		background: var(--manhole-light);
		color: var(--manhole-color);
	}

	.info-tag.crack {
		background: var(--crack-light);
		color: var(--crack-color);
	}

	.info-tag.risk-high {
		background: var(--danger-light);
		color: var(--danger);
	}

	.info-tag.risk-medium {
		background: var(--warning-light);
		color: var(--warning);
	}

	.info-tag.risk-low {
		background: var(--success-light);
		color: var(--success);
	}

	.order-footer {
		padding: 14px 16px;
		border-top: 1px solid var(--border-light);
	}

	.action-btn-small {
		width: 100%;
		padding: 12px;
		border-radius: var(--radius-md);
		font-size: 14px;
		font-weight: 600;
		transition: all 0.2s ease;
	}

	.action-btn-small:active {
		transform: scale(0.98);
	}

	.action-btn-small.primary {
		background: linear-gradient(135deg, var(--accent) 0%, var(--accent-dark) 100%);
		color: #fff;
		box-shadow: 0 4px 12px var(--accent-glow);
	}

	.action-btn-small.success {
		background: linear-gradient(135deg, var(--success) 0%, #059669 100%);
		color: #fff;
	}

	.action-btn-small.secondary {
		background: var(--bg-elevated);
		color: var(--text-secondary);
		border: 1px solid var(--border-color);
	}

	.action-btn-small.disabled {
		background: var(--bg-input);
		color: var(--text-disabled);
		border: 1px solid var(--border-color);
	}

	@media screen and (min-width: 768px) {
		.order-list {
			padding-bottom: calc(16px + 80px);
		}

		.order-card {
			margin-bottom: 16px;
		}
	}
</style>