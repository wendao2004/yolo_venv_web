<template>
	<view class="page" :class="{ 'dark-theme': isDarkTheme, 'light-theme': !isDarkTheme }">
		<view class="safe-area-top" :style="{ height: statusBarHeight + 'px' }"></view>
		<view class="header">
			<view class="header-left">
				<view class="logo">
					<view class="logo-icon"><text>📋</text></view>
					<text class="logo-text">病害记录</text>
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
				<button class="action-btn" @click="loadRecords">
					<text>🔄</text>
				</button>
			</view>
		</view>

		<view class="main-content">
			<view class="filter-section">
				<view class="filter-row">
					<view class="filter-item">
						<text class="filter-label">类别</text>
						<picker mode="selector" :range="typeOptions" :value="selectedType" @change="onTypeChange">
							<view class="filter-picker">
								<text>{{ typeOptions[selectedType] }}</text>
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
						<text class="filter-label">排序</text>
						<picker mode="selector" :range="sortOptions" :value="selectedSort" @change="onSortChange">
							<view class="filter-picker">
								<text>{{ sortOptions[selectedSort] }}</text>
								<text class="picker-arrow">▼</text>
							</view>
						</picker>
					</view>
				</view>
				<view class="filter-summary">
					<text>共 {{ filteredRecords.length }} 条记录</text>
					<text v-if="loading" class="filter-hint">加载中…</text>
					<text v-else-if="!isConnected" class="filter-hint">未连接后端</text>
				</view>
				<text class="source-note">数据来源：后端 saved_captures/ 目录（{{ directory || '未知' }}）</text>
			</view>

			<scroll-view scroll-y class="order-list">
				<view v-if="filteredRecords.length === 0" class="empty-state">
					<text class="empty-icon">📭</text>
					<text class="empty-text">{{ emptyText }}</text>
				</view>
				<view v-for="item in filteredRecords" :key="item.file" class="order-card">
					<!-- ==================== 一次打分 = 一条汇总记录 ==================== -->
					<view v-if="item.kind === 'score_run'">
						<view class="order-header">
							<view class="order-id">
								<text class="id-label">打分</text>
								<text class="id-value">{{ item.run.id }}</text>
							</view>
							<view class="order-status-tag run">打分记录</view>
						</view>
						<view class="order-body">
							<view class="order-info-row">
								<text class="info-label">打分时间</text>
								<text class="info-value">{{ formatTime(item.mtime) }}</text>
							</view>
							<view class="order-info-row">
								<text class="info-label">图片张数</text>
								<text class="info-value">{{ item.run.image_count }} 张</text>
							</view>
							<view class="order-info-row">
								<text class="info-label">检出目标总数</text>
								<text class="info-value">{{ item.run.detections_total }}</text>
							</view>
							<view class="order-info-row">
								<text class="info-label">平均耗时</text>
								<text class="info-value mono">{{ item.run.avg_time_ms }}ms</text>
							</view>
							<view class="order-info-row">
								<text class="info-label">类别分布</text>
								<text class="info-value">{{ runClassSummary(item) }}</text>
							</view>
						</view>
						<view class="order-footer">
							<button class="action-btn-small primary" @click="openRun(item)">查看逐张明细</button>
						</view>
					</view>

					<!-- ==================== 单帧截图 ==================== -->
					<view v-else>
						<view class="order-header">
							<view class="order-id">
								<text class="id-label">记录</text>
								<text class="id-value">{{ item.file }}</text>
							</view>
							<view class="order-status-tag" :class="riskClassOf(item)">{{ riskLabelOf(item) }}</view>
						</view>
						<view class="order-body">
							<view class="order-info-row">
								<text class="info-label">采集时间</text>
								<text class="info-value">{{ formatTime(item.mtime) }}</text>
							</view>
							<view class="order-info-row">
								<text class="info-label">主要类别</text>
								<view v-if="primaryTypeOf(item)" class="info-tag" :class="primaryTypeOf(item).cssClass">
									{{ primaryTypeOf(item).name }}
								</view>
								<!-- 两种「没有类别」必须分开说：metadata 缺失是"这条记录没元数据"，
								     metadata 在但 detection_list 为空是"那一帧确实没检出目标"。
								     原来两种情况都显示「无元数据」，把后者说成了前者。 -->
								<text v-else class="info-value muted">
									{{ item.metadata ? '本帧无检出目标' : '无元数据' }}
								</text>
							</view>
							<view class="order-info-row">
								<text class="info-label">最高置信度</text>
								<text class="info-value mono">{{ maxConfidenceOf(item) }}</text>
							</view>
							<view class="order-info-row">
								<text class="info-label">检出目标数</text>
								<text class="info-value">{{ targetCountOf(item) }}</text>
							</view>
							<view class="order-info-row">
								<text class="info-label">文件大小</text>
								<text class="info-value mono">{{ formatSize(item.size) }}</text>
							</view>
						</view>
						<view class="order-footer">
							<button class="action-btn-small primary" @click="openItem(item)">查看留证原图</button>
						</view>
						<text v-if="!item.metadata" class="record-note">
							该图早于「记录元数据」功能，只有原图，没有类别 / 置信度
						</text>
					</view>
				</view>
			</scroll-view>
		</view>

		<view class="modal-overlay" :class="{ show: showModal }" @click="closeModal">
			<view class="modal-content" @click.stop>
				<!-- ---------- 打分运行：列出逐张明细 ---------- -->
				<view v-if="currentRun">
					<text class="modal-title">{{ currentRun.run.id }}</text>
					<text class="modal-run-summary">
						{{ currentRun.run.image_count }} 张 · 检出 {{ currentRun.run.detections_total }} 个 ·
						平均 {{ currentRun.run.avg_time_ms }}ms · {{ formatTime(currentRun.mtime) }}
					</text>
					<scroll-view scroll-y class="modal-run-list">
						<view v-for="(it, i) in runItemsOf(currentRun)" :key="i" class="run-item">
							<view class="run-item-head">
								<text class="run-item-name">{{ i + 1 }}. {{ it.image_name }}</text>
								<text class="run-item-time mono">{{ it.time_ms }}ms</text>
							</view>
							<view v-if="(it.detections || []).length" class="run-item-dets">
								<view v-for="(d, j) in it.detections" :key="j" class="modal-meta-row">
									<text class="modal-meta-name">{{ displayNameOf(d.class_name) }}</text>
									<text class="modal-meta-conf mono">{{ (d.confidence * 100).toFixed(1) }}%</text>
								</view>
							</view>
							<text v-else class="run-item-empty">本张无检出</text>
						</view>
						<view v-if="runItemsOf(currentRun).length === 0" class="empty-log">
							<text>这条记录没有逐张明细</text>
						</view>
					</scroll-view>
				</view>

				<!-- ---------- 单帧截图：原图 + 检测明细 ---------- -->
				<view v-else>
					<text class="modal-title">{{ currentItem ? currentItem.file : '' }}</text>
					<image v-if="currentItem" :src="imageUrlOf(currentItem)" mode="widthFix" class="modal-image"
						@error="onImageError"></image>
					<text v-if="imageError" class="modal-error">原图加载失败：{{ imageUrlOf(currentItem) }}</text>
					<view v-if="currentDetections.length" class="modal-meta">
						<view v-for="(det, i) in currentDetections" :key="i" class="modal-meta-row">
							<text class="modal-meta-name">{{ det.name }}</text>
							<text class="modal-meta-conf mono">{{ (det.confidence * 100).toFixed(1) }}%</text>
						</view>
					</view>
					<text v-else class="modal-no-meta">该记录无检测明细</text>
				</view>

				<button class="modal-btn close" @click="closeModal">关闭</button>
			</view>
		</view>
	</view>
</template>

<script>
	import DetectSocket from '@/api/websocket.js'
	import {
		mapBackendKey,
		getDisplayInfo
	} from '@/utils/classMap.js'
	import {
		getTheme
	} from '@/utils/theme.js'

	// 类别筛选的顺序**必须与 server.py:29-34 的 CLASS_NAMES 一致**：
	// 0 waterlogging / 1 manhole / 2 pothole / 3 road_crack。
	// （manhole 是 1、pothole 是 2；旧 data.yaml 的顺序是反的，别照抄。）
	const TYPE_KEYS = ['', 'waterlogging', 'manhole', 'pothole', 'crack']

	export default {
		name: 'DiseaseRecord',
		data() {
			return {
				socket: null,
				isConnected: false,
				// 后端 saved_captures/ 的真实清单：[{file, size, mtime, metadata}]
				records: [],
				directory: '',
				loading: false,
				selectedType: 0,
				selectedRisk: 0,
				selectedSort: 0,
				typeOptions: ['全部', '积水', '井盖异常', '坑洼', '道路裂纹'],
				riskOptions: ['全部', '高风险', '中风险', '无风险', '无元数据'],
				sortOptions: ['最新在前', '最早在前'],
				currentItem: null,
				// 当前打开的是「打分运行记录」时的对象（与 currentItem 二选一）
				currentRun: null,
				showModal: false,
				imageError: false,
				isDarkTheme: getTheme() === 'dark',
				statusBarHeight: 0
			}
		},
		computed: {
			filteredRecords() {
				let result = [...this.records]
				const typeKey = TYPE_KEYS[this.selectedType]
				if (typeKey) {
					result = result.filter(item => {
						// 打分运行记录没有逐条 detection_list，按 class_counts 的键匹配。
						if (item.kind === 'score_run') {
							return Object.keys((item.run && item.run.class_counts) || {})
								.some(name => mapBackendKey(name) === typeKey)
						}
						const dets = this.detectionListOf(item)
						return dets.some(d => mapBackendKey(d.class_name) === typeKey)
					})
				}
				if (this.selectedRisk > 0) {
					const want = ['', 'high', 'medium', 'normal', 'none'][this.selectedRisk]
					result = result.filter(item => {
						// 打分运行记录是一次批量测试的汇总，本身不带风险等级 ——
						// 选了具体风险就把它排掉，别让它混在"高风险"里误导。
						if (item.kind === 'score_run') return false
						const meta = item.metadata
						if (want === 'none') return !meta
						if (!meta) return false
						const level = meta.risk_level || 'normal'
						return level === want
					})
				}
				if (this.selectedSort === 0) {
					result.sort((a, b) => b.mtime - a.mtime)
				} else {
					result.sort((a, b) => a.mtime - b.mtime)
				}
				return result
			},
			emptyText() {
				if (!this.isConnected) return '未连接后端，无法读取记录'
				if (this.loading) return '正在读取…'
				if (this.records.length === 0) return 'saved_captures/ 目录为空，去「智检」页保存一条试试'
				return '当前筛选条件下没有记录'
			},
			currentDetections() {
				if (!this.currentItem) return []
				return this.detectionListOf(this.currentItem).map(d => {
					const info = getDisplayInfo(mapBackendKey(d.class_name))
					return {
						name: info.name,
						confidence: typeof d.confidence === 'number' ? d.confidence : 0
					}
				})
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
			else if (this.socket.needsReconnect()) this.reconnect()
			else this.loadRecords()
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
			// onShow 检测到服务器地址变了时调用（见 api/websocket.js 的 needsReconnect）。
			reconnect() {
				if (this.socket) this.socket.close()
				this.socket = null
				this.isConnected = false
				this.records = []
				this.initSocket()
			},
			initSocket() {
				this.socket = new DetectSocket()
				this.socket.on('connected', () => {
					this.isConnected = true
					this.loadRecords()
				})
				this.socket.on('disconnected', () => {
					this.isConnected = false
				})
				this.socket.on('error', () => {
					this.isConnected = false
				})
				this.socket.on('savedCapturesList', (data) => {
					this.handleSavedCapturesList(data)
				})
				this.socket.connect().catch(() => {})
			},
			handleSavedCapturesList(data) {
				this.loading = false
				this.records = Array.isArray(data.records) ? data.records : []
				this.directory = data.directory || ''
			},
			loadRecords() {
				if (!this.socket || !this.isConnected) return
				this.loading = true
				this.socket.listSavedCaptures()
				// 后端不回包时（例如服务端异常）不能让「加载中」永远挂着
				if (this.loadTimer) clearTimeout(this.loadTimer)
				this.loadTimer = setTimeout(() => {
					this.loading = false
				}, 5000)
			},
			// ---- 元数据取值（缺失时一律给安全的占位，绝不假造） ----
			detectionListOf(item) {
				const meta = item && item.metadata
				if (!meta || !Array.isArray(meta.detection_list)) return []
				return meta.detection_list
			},
			primaryTypeOf(item) {
				const dets = this.detectionListOf(item)
				if (dets.length === 0) return null
				let best = dets[0]
				for (const d of dets) {
					if ((d.confidence || 0) > (best.confidence || 0)) best = d
				}
				return getDisplayInfo(mapBackendKey(best.class_name))
			},
			maxConfidenceOf(item) {
				const dets = this.detectionListOf(item)
				if (dets.length === 0) return '—'
				const best = dets.reduce((m, d) => Math.max(m, d.confidence || 0), 0)
				return (best * 100).toFixed(1) + '%'
			},
			targetCountOf(item) {
				const dets = this.detectionListOf(item)
				if (dets.length === 0) return item && item.metadata ? '0' : '—'
				return String(dets.length)
			},
			riskLevelOf(item) {
				if (!item || !item.metadata) return 'none'
				return item.metadata.risk_level || 'normal'
			},
			riskLabelOf(item) {
				const labels = {
					high: '高风险',
					medium: '中风险',
					normal: '无风险',
					none: '无元数据'
				}
				return labels[this.riskLevelOf(item)] || this.riskLevelOf(item)
			},
			riskClassOf(item) {
				return 'risk-' + this.riskLevelOf(item)
			},
			imageUrlOf(item) {
				if (!item || !this.socket) return ''
				// 后端 HTTP 静态服务（8001）把进程工作目录当站点根，
				// saved_captures/ 就在根下，所以直接拼相对路径即可。
				return `${this.socket.httpBase()}/saved_captures/${encodeURIComponent(item.file)}`
			},
			formatTime(mtime) {
				if (!mtime) return '—'
				const d = new Date(mtime * 1000)
				const p = n => String(n).padStart(2, '0')
				return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
			},
			formatSize(bytes) {
				if (!bytes && bytes !== 0) return '—'
				if (bytes < 1024) return bytes + ' B'
				if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
				return (bytes / 1024 / 1024).toFixed(2) + ' MB'
			},
			onTypeChange(e) {
				this.selectedType = Number(e.detail.value)
			},
			onRiskChange(e) {
				this.selectedRisk = Number(e.detail.value)
			},
			onSortChange(e) {
				this.selectedSort = Number(e.detail.value)
			},
			openItem(item) {
				this.currentItem = item
				this.currentRun = null
				this.imageError = false
				this.showModal = true
			},
			// 打分运行记录：没有单张原图，弹窗里列逐张明细。
			openRun(item) {
				this.currentRun = item
				this.currentItem = null
				this.imageError = false
				this.showModal = true
			},
			runItemsOf(item) {
				if (!item || !item.run || !Array.isArray(item.run.items)) return []
				return item.run.items
			},
			// 把 class_counts 渲染成「道路积水×3 路面坑洼×8」这种一行摘要。
			runClassSummary(item) {
				const counts = (item && item.run && item.run.class_counts) || {}
				const parts = Object.keys(counts).map(name => {
					const info = getDisplayInfo(mapBackendKey(name))
					return `${info.name}×${counts[name]}`
				})
				return parts.length ? parts.join('  ') : '无检出'
			},
			displayNameOf(className) {
				return getDisplayInfo(mapBackendKey(className)).name
			},
			closeModal() {
				this.showModal = false
				this.currentItem = null
				this.currentRun = null
			},
			onImageError() {
				this.imageError = true
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
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		margin-top: 14px;
		font-size: 12px;
		color: var(--text-muted);
	}

	.filter-hint {
		color: var(--accent);
	}

	.source-note {
		display: block;
		margin-top: 8px;
		text-align: center;
		font-size: 10px;
		color: var(--text-disabled);
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
		text-align: center;
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
		gap: 10px;
		padding: 16px;
		background: var(--bg-elevated);
	}

	.order-id {
		display: flex;
		align-items: center;
		gap: 10px;
		min-width: 0;
		flex: 1;
	}

	.id-label {
		font-size: 11px;
		font-weight: 600;
		color: var(--text-muted);
		flex-shrink: 0;
	}

	.id-value {
		font-family: 'SF Mono', monospace;
		font-size: 12px;
		font-weight: 700;
		color: var(--text-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.order-status-tag {
		padding: 5px 12px;
		border-radius: var(--radius-full);
		font-size: 11px;
		font-weight: 600;
		flex-shrink: 0;
	}

	.order-status-tag.risk-high {
		background: var(--danger-light);
		color: var(--danger);
	}

	.order-status-tag.risk-medium {
		background: var(--warning-light);
		color: var(--warning);
	}

	.order-status-tag.risk-normal {
		background: var(--success-light);
		color: var(--success);
	}

	.order-status-tag.risk-none {
		background: var(--bg-input);
		color: var(--text-muted);
	}

	.order-status-tag.run {
		background: var(--accent-light, rgba(79, 70, 229, 0.15));
		color: var(--accent);
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

	.info-value.muted {
		color: var(--text-muted);
		font-style: italic;
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

	.info-tag.unknown {
		background: var(--bg-input);
		color: var(--text-muted);
	}

	.order-footer {
		padding: 14px 16px;
		border-top: 1px solid var(--border-light);
	}

	.record-note {
		display: block;
		padding: 0 16px 14px;
		font-size: 11px;
		line-height: 1.5;
		color: var(--text-disabled);
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

	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.75);
		display: none;
		align-items: center;
		justify-content: center;
		z-index: 999;
		padding: 24px;
	}

	.modal-overlay.show {
		display: flex;
	}

	.modal-content {
		width: 100%;
		max-width: 560px;
		max-height: 80vh;
		overflow-y: auto;
		background: var(--bg-card);
		border-radius: var(--radius-lg);
		padding: 16px;
		border: 1px solid var(--border-color);
	}

	.modal-title {
		display: block;
		font-family: 'SF Mono', monospace;
		font-size: 12px;
		color: var(--text-muted);
		margin-bottom: 10px;
		word-break: break-all;
	}

	.modal-image {
		width: 100%;
		border-radius: var(--radius-md);
		background: var(--bg-input);
	}

	.modal-error {
		display: block;
		padding: 12px;
		font-size: 12px;
		color: var(--danger);
		word-break: break-all;
	}

	.modal-meta {
		margin-top: 12px;
	}

	.modal-meta-row {
		display: flex;
		justify-content: space-between;
		padding: 8px 0;
		font-size: 13px;
		border-bottom: 1px solid var(--border-light);
	}

	.modal-meta-name {
		color: var(--text-secondary);
	}

	.modal-meta-conf {
		color: var(--text-primary);
	}

	.modal-no-meta {
		display: block;
		text-align: center;
		padding: 12px;
		font-size: 12px;
		color: var(--text-muted);
	}

	/* ---- 打分运行记录（逐张明细）---- */
	.modal-run-summary {
		display: block;
		font-size: 12px;
		color: var(--text-secondary);
		margin-bottom: 10px;
	}

	.modal-run-list {
		max-height: 52vh;
	}

	.run-item {
		padding: 10px 0;
	}

	.run-item:not(:last-child) {
		border-bottom: 1px solid var(--border-light);
	}

	.run-item-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 10px;
	}

	.run-item-name {
		font-size: 12px;
		font-weight: 600;
		color: var(--text-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.run-item-time {
		font-size: 11px;
		color: var(--text-muted);
		flex-shrink: 0;
	}

	.run-item-dets {
		margin-top: 4px;
	}

	.run-item-empty {
		display: block;
		font-size: 11px;
		color: var(--text-disabled);
		margin-top: 4px;
	}

	.empty-log {
		padding: 24px;
		text-align: center;
		font-size: 12px;
		color: var(--text-muted);
	}

	.modal-btn.close {
		width: 100%;
		margin-top: 16px;
		padding: 12px;
		border-radius: var(--radius-md);
		font-size: 14px;
		font-weight: 600;
		background: var(--bg-elevated);
		color: var(--text-secondary);
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
