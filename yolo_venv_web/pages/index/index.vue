<template>
	<view class="page" :class="{ 'dark-theme': isDarkTheme, 'light-theme': !isDarkTheme }">
		<view class="safe-area-top" :style="{ height: statusBarHeight + 'px' }"></view>
		<view class="header">
			<view class="header-left">
				<view class="logo">
					<!-- <view class="logo-icon"><text>🚦</text></view> -->
					<image src="/static/logo.png" mode="aspectFill" style="width: 72rpx;height: 72rpx;"></image>
					<text class="logo-text">道路检测</text>
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
			<view class="video-section">
				<view class="video-wrapper">
					<image v-if="currentImage" :src="imageSrc" mode="aspectFit" class="video-frame"></image>
					<view v-else class="video-placeholder">
						<!-- <text class="placeholder-icon">📷</text> -->
						<text class="placeholder-text">等待视频流...</text>
					</view>
					<view class="video-overlay">
						<view class="video-stats">
							<text class="stat-item">FPS: {{ fps }}</text>
							<text class="stat-item">帧: {{ frameIndex }}</text>
						</view>
						<view class="video-action" @click="saveCurrentFrame">保存记录</view>
					</view>
				</view>
				<view class="detection-tags">
					<view v-for="tag in detectionTags" :key="tag.key" class="tag-item" :class="tag.cssClass">
						<view class="tag-dot" :style="{ background: getTagColor(tag.key) }"></view>
						<text>{{ tag.name }} ×{{ tag.count }}</text>
					</view>
					<view v-if="detectionTags.length === 0" class="tag-empty"><text>当前帧无检测目标</text></view>
				</view>
			</view>

			<view class="control-panel">
				<view class="mode-switch">
					<view class="switch-item" :class="{ active: currentMode === 'camera' }" @click="setMode('camera')">
						<image src="/static/Camera_dark.png" mode="aspectFill" style="width: 72rpx;height: 72rpx;">
						</image>
						<text>摄像头</text>
					</view>
					<view class="switch-item" :class="{ active: currentMode === 'images' }" @click="setMode('images')">
						<image src="/static/picture_dark.png" mode="aspectFill" style="width: 72rpx;height: 72rpx;">
						</image>
						<text>图片</text>
					</view>
				</view>
				<view class="source-selector" v-if="currentMode === 'camera'">
					<picker mode="selector" :range="cameraOptions" :value="selectedCameraIndex" @change="selectCamera">
						<view class="picker-box">
							<text>{{ currentCameraName }}</text>
							<text class="picker-arrow">▼</text>
						</view>
					</picker>
					<text v-if="cameraInfoText" class="source-info">{{ cameraInfoText }}</text>
				</view>
				<view class="source-selector" v-else>
					<input class="input-field" :value="folderPath" @input="onFolderInput" placeholder="输入图片路径" />
					<button class="btn-primary" @click="loadTestImages">加载</button>
					<text class="source-info">{{ imageCount }} 张</text>
				</view>
			</view>

			<view class="stats-section">
				<text class="section-title">检测统计</text>
				<view class="stats-grid">
					<view class="stat-card water">
						<image src="/static/water.png" mode="" style="width: 72rpx;height: 72rpx;"></image>
						<view class="stat-info"><text class="stat-label">积水</text><text
								class="stat-value">{{ stats.waterlogging }}</text></view>
					</view>
					<view class="stat-card pothole">
						<image src="/static/pit.png" mode="" style="width: 72rpx;height: 72rpx;"></image>
						<view class="stat-info"><text class="stat-label">坑洼</text><text
								class="stat-value">{{ stats.pothole }}</text></view>
					</view>
					<view class="stat-card manhole">
						<image src="/static/warning.png" mode="" style="width: 52rpx;height: 52rpx;"></image>
						<view class="stat-info"><text class="stat-label">井盖异常</text><text
								class="stat-value">{{ stats.manhole }}</text></view>
					</view>
					<view class="stat-card crack">
						<image src="/static/Crack.png" mode="" style="width: 62rpx;height: 62rpx;"></image>
						<view class="stat-info"><text class="stat-label">道路裂纹</text><text
								class="stat-value">{{ stats.crack }}</text></view>
					</view>
				</view>
			</view>

			<view class="threshold-section">
				<view class="section-header">
					<text class="section-title">检测阈值</text>
					<text class="reset-btn" @click="resetThresholds">重置</text>
				</view>
				<view class="threshold-list">
					<view class="threshold-item">
						<view class="threshold-header">
							<view class="threshold-label">
								<view class="dot water"></view><text>积水</text>
							</view>
							<text class="threshold-value">{{ thresholds[0].toFixed(2) }}</text>
						</view>
						<slider :value="thresholds[0] * 100" :min="10" :max="90" :step="5" activeColor="#3b82f6"
							backgroundColor="transparent" block-size="14" @change="updateThreshold(0, $event)" />
					</view>
					<view class="threshold-item">
						<view class="threshold-header">
							<view class="threshold-label">
								<view class="dot manhole"></view><text>井盖异常</text>
							</view>
							<text class="threshold-value">{{ thresholds[1].toFixed(2) }}</text>
						</view>
						<slider :value="thresholds[1] * 100" :min="10" :max="90" :step="5" activeColor="#f59e0b"
							backgroundColor="transparent" block-size="14" @change="updateThreshold(1, $event)" />
					</view>
					<view class="threshold-item">
						<view class="threshold-header">
							<view class="threshold-label">
								<view class="dot pothole"></view><text>坑洼</text>
							</view>
							<text class="threshold-value">{{ thresholds[2].toFixed(2) }}</text>
						</view>
						<slider :value="thresholds[2] * 100" :min="10" :max="90" :step="5" activeColor="#8b5cf6"
							backgroundColor="transparent" block-size="14" @change="updateThreshold(2, $event)" />
					</view>
					<view class="threshold-item">
						<view class="threshold-header">
							<view class="threshold-label">
								<view class="dot crack"></view><text>道路裂纹</text>
							</view>
							<text class="threshold-value">{{ thresholds[3].toFixed(2) }}</text>
						</view>
						<slider :value="thresholds[3] * 100" :min="10" :max="90" :step="5" activeColor="#ef4444"
							backgroundColor="transparent" block-size="14" @change="updateThreshold(3, $event)" />
					</view>
				</view>
			</view>

			<view class="records-section">
				<view class="section-header">
					<text class="section-title">保存记录</text>
					<text class="score-badge">{{ expertScore.toFixed(1) }} 分</text>
				</view>
				<scroll-view scroll-x class="records-scroll">
					<view class="records-list">
						<view v-for="item in thumbnails" :key="item.id" class="record-card"
							:class="{ correct: item.status === 'correct', incorrect: item.status === 'incorrect' }"
							@click="openModal(item)">
							<image :src="'data:image/jpeg;base64,' + item.image" mode="aspectFill" class="record-image">
							</image>
							<view class="record-overlay">
								<text class="record-time">{{ item.timestamp }}</text>
								<text class="record-count">{{ item.detections.length }}个</text>
							</view>
							<view v-if="item.status === 'correct'" class="record-badge correct">✓</view>
							<view v-if="item.status === 'incorrect'" class="record-badge incorrect">✗</view>
						</view>
						<view v-if="thumbnails.length === 0" class="empty-records"><text>暂无保存记录</text></view>
					</view>
				</scroll-view>
				<view class="action-row">
					<button class="btn-secondary" @click="resetStats">重置统计</button>
					<button class="btn-primary" @click="reconnect">重新连接</button>
				</view>
			</view>
		</view>

		<view class="risk-alert" :class="[riskLevel, { show: showRiskAlert }]">
			<text class="alert-icon">{{ riskLevel === 'high' ? '⚠️' : riskLevel === 'medium' ? '⚡' : 'ℹ️' }}</text>
			<text>{{ riskMessage }}</text>
		</view>

		<view class="modal-overlay" :class="{ show: showModal }" @click="closeModal">
			<view class="modal-content" @click.stop>
				<image v-if="currentModalItem" :src="'data:image/jpeg;base64,' + currentModalItem.image"
					mode="aspectFit" class="modal-image"></image>
				<view class="modal-actions">
					<button class="modal-btn correct" @click="markThumbnail('correct')">✓ 正确</button>
					<button class="modal-btn incorrect" @click="markThumbnail('incorrect')">✗ 错误</button>
					<button class="modal-btn close" @click="closeModal">关闭</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	import DetectSocket from '@/api/websocket.js'
	import {
		CLASS_STATS_INIT,
		mapBackendKey,
		getDisplayInfo
	} from '@/utils/classMap.js'
	import {
		getTheme
	} from '@/utils/theme.js'

	export default {
		name: 'DetectDashboard',
		data() {
			return {
				socket: null,
				isConnected: false,
				currentImage: '',
				frameIndex: 0,
				fps: 0,
				currentDetections: [],
				stats: {
					...CLASS_STATS_INIT
				},
				savedStats: {
					...CLASS_STATS_INIT
				},
				currentMode: 'camera',
				cameras: [],
				selectedCamera: null,
				cameraInfo: null,
				// 原为 'mosquito_det/integrated/images/val'——那是来源项目（蚊子检测）
				// 的路径，服务端**不存在**这个目录，连通后自动打分会拿不到图。
				// 改用 server.py 实际写入的截图目录（SAVED_IMAGES_DIR = "saved_captures"）。
				folderPath: 'saved_captures',
				imageCount: 0,
				thumbnails: [],
				expertScore: 0,
				currentModalItem: null,
				showModal: false,
				riskLevel: '',
				riskMessage: '',
				showRiskAlert: false,
				riskAlertTimer: null,
				currentFrameData: null,
				thresholds: [0.50, 0.60, 0.55, 0.35],
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
			cameraOptions() {
				if (!this.cameras || this.cameras.length === 0) return ['未检测到摄像头']
				return this.cameras.map(c => c.name)
			},
			selectedCameraIndex() {
				if (!this.cameras || this.cameras.length === 0) return 0
				if (this.selectedCamera === null) return 0
				const idx = this.cameras.findIndex(c => c.index === this.selectedCamera)
				return idx >= 0 ? idx : 0
			},
			currentCameraName() {
				if (!this.cameras || this.cameras.length === 0) return '未检测到摄像头'
				const cam = this.cameras[this.selectedCameraIndex]
				return cam ? cam.name : '请选择'
			},
			cameraInfoText() {
				if (!this.cameraInfo) return ''
				return `${this.cameraInfo.width}x${this.cameraInfo.height} @${this.cameraInfo.fps}fps`
			},
			detectionTags() {
				const classCounts = {}
				for (const det of this.currentDetections) {
					const className = det.class_name || det.class
					const key = mapBackendKey(className) || 'waterlogging'
					if (!classCounts[key]) classCounts[key] = 0
					classCounts[key]++
				}
				return Object.entries(classCounts).map(([key, count]) => {
					const display = getDisplayInfo(key)
					return {
						key,
						name: display.name,
						count,
						cssClass: display.cssClass
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
			this.isDarkTheme = getApp().globalData.theme === 'dark'
		},
		methods: {
			getTagColor(key) {
				const colors = {
					waterlogging: '#3b82f6',
					pothole: '#8b5cf6',
					manhole: '#f59e0b',
					crack: '#ef4444'
				}
				return colors[key] || '#3b82f6'
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
					this.currentImage = ''
				})
				this.socket.on('error', () => {
					uni.showToast({
						title: '连接失败',
						icon: 'error',
						duration: 2000
					})
				})
				this.socket.on('frame', (data) => {
					this.handleFrame(data)
				})
				this.socket.on('cameraList', (data) => {
					this.cameras = data.cameras || [];
					this.selectedCamera = data.currentCamera;
					if (data.currentMode) this.currentMode = data.currentMode;
					if (data.testImagesDir) this.folderPath = data.testImagesDir
				})
				this.socket.on('testImagesList', (data) => {
					this.imageCount = data.count || 0;
					if (data.directory) this.folderPath = data.directory
				})
				this.socket.on('savedCapturesInfo', (data) => {
					if (data.count && data.count > 0) uni.showToast({
						title: `已加载 ${data.count} 张记录`,
						icon: 'none',
						duration: 2000
					})
				})
				// ⚠ 保存结果必须以后端回包为准。原来这里没有这个监听，点一下就直接弹
				//「保存成功」——而服务端可能压根没写成（实测过：时间戳含冒号时
				// cv2.imwrite 在 Windows 上直接失败，客户端却仍然报成功）。
				// 真实的落盘结果只有 save_capture_result 知道。
				this.socket.on('saveCaptureResult', (data) => {
					if (data && data.success) {
						uni.showToast({
							title: '保存成功',
							icon: 'success',
							duration: 1000
						})
					} else {
						uni.showToast({
							title: '保存失败：后端未落盘',
							icon: 'none',
							duration: 2000
						})
					}
				})
				this.socket.connect().catch(() => {})
			},
			handleFrame(data) {
				this.currentImage = data.image || ''
				this.frameIndex = data.frameIndex || 0
				this.fps = data.fps || 0
				this.currentDetections = data.detections || []
				if (data.cameraInfo) this.cameraInfo = data.cameraInfo
				if (data.thresholds) {
					for (const [classId, threshold] of Object.entries(data.thresholds)) {
						const id = parseInt(classId)
						if (this.thresholds[id] !== undefined) this.thresholds[id] = parseFloat(threshold)
					}
				}
				if (data.riskLevel) this.showRiskAlertMessage(data.riskLevel, data.riskMessage)
				this.currentFrameData = {
					image: this.currentImage,
					detections: this.currentDetections,
					// 后端 risk_level 是逐帧算好的权威值（server.py analyse_frame：
					// 取该帧所有检出的最高风险，无风险时为 null）。保存记录时要
					// 连同它一起落盘，所以必须在这里留住，不能像原来那样丢掉。
					riskLevel: data.riskLevel,
					timestamp: new Date().toLocaleTimeString()
				}
				for (const det of this.currentDetections) {
					const className = det.class_name || det.class
					const key = mapBackendKey(className)
					if (key && this.stats[key] !== undefined) this.stats[key]++
				}
			},
			showRiskAlertMessage(riskLevel, message) {
				this.riskLevel = riskLevel
				this.riskMessage = message
				this.showRiskAlert = true
				if (this.riskAlertTimer) clearTimeout(this.riskAlertTimer)
				this.riskAlertTimer = setTimeout(() => {
					this.showRiskAlert = false
				}, 3000)
			},
			setMode(mode) {
				if (!this.socket || mode === this.currentMode) return
				this.currentMode = mode
				this.socket.setMode(mode)
			},
			selectCamera(e) {
				const idx = e.detail.value
				if (this.cameras && this.cameras[idx]) {
					this.selectedCamera = this.cameras[idx].index
					this.socket.selectCamera(this.selectedCamera)
				}
			},
			onFolderInput(e) {
				this.folderPath = e.detail.value || ''
			},
			loadTestImages() {
				if (!this.socket || !this.folderPath.trim()) return
				this.socket.setTestDir(this.folderPath.trim())
			},
			saveCurrentFrame() {
				if (!this.currentFrameData) {
					uni.showToast({
						title: '当前无可用画面',
						icon: 'none',
						duration: 1500
					});
					return
				}
				const item = {
					id: Date.now(),
					image: this.currentFrameData.image,
					detections: this.currentFrameData.detections,
					timestamp: this.currentFrameData.timestamp,
					status: null
				}
				this.thumbnails.unshift(item)
				for (const det of this.currentFrameData.detections) {
					const className = det.class_name || det.class
					const key = mapBackendKey(className)
					if (key && this.savedStats[key] !== undefined) this.savedStats[key]++
				}
				// 时间戳按原生客户端（index.html:2237）的既有约定生成：
				// 2026-09-21T02-14-33 —— ISO 前 19 位，冒号/点换成短横线。
				// 不能沿用 item.timestamp（toLocaleTimeString() → "12:07:25"）：
				// 冒号在 Windows 上是非法文件名字符，server.py 拿它拼
				// capture_<timestamp>.jpg 会让 cv2.imwrite 直接失败。
				const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
				this.socket.saveCapture(
					this.currentFrameData.image,
					stamp,
					this.buildCaptureMetadata()
				)
				// 成功/失败提示交给 saveCaptureResult 回包（见 initSocket），
				// 这里不再抢答——否则写盘失败时照样弹「保存成功」。
			},
			// 组装 save_capture 的 metadata（A2）：字段名与「病害记录」页读的
			// metadata.detection_list / metadata.risk_level 逐字对齐
			// （workorder.vue 的 detectionListOf / riskLevelOf）。
			// 两个值都直接照抄后端帧消息，前端不做推断、不补造。
			buildCaptureMetadata() {
				const dets = this.currentFrameData.detections || []
				return {
					risk_level: this.currentFrameData.riskLevel || 'normal',
					detection_count: dets.length,
					detection_list: dets.map(d => ({
						class_name: d.class_name || d.class || '',
						confidence: typeof d.confidence === 'number' ? d.confidence : 0,
						risk_level: d.risk_level || 'normal'
					}))
				}
			},
			openModal(item) {
				this.currentModalItem = item;
				this.showModal = true
			},
			closeModal() {
				this.showModal = false;
				this.currentModalItem = null
			},
			markThumbnail(status) {
				if (!this.currentModalItem) return
				const idx = this.thumbnails.findIndex(t => t.id === this.currentModalItem.id)
				if (idx >= 0) {
					this.thumbnails[idx].status = status
					if (status === 'correct') this.expertScore += 1.5
				}
				this.closeModal()
			},
			resetStats() {
				this.stats = {
					...CLASS_STATS_INIT
				}
				this.savedStats = {
					...CLASS_STATS_INIT
				}
				this.expertScore = 0
				this.frameIndex = 0
				this.fps = 0
				this.currentDetections = []
				this.currentImage = ''
				this.thumbnails = []
				uni.showToast({
					title: '统计已重置',
					icon: 'success',
					duration: 1500
				})
			},
			updateThreshold(classId, event) {
				const value = event.detail.value / 100
				this.thresholds[classId] = parseFloat(value.toFixed(2))
				if (this.socket) this.socket.setThreshold(classId, this.thresholds[classId])
			},
			resetThresholds() {
				this.thresholds = [0.50, 0.60, 0.55, 0.35]
				if (this.socket) this.socket.resetThresholds()
				uni.showToast({
					title: '阈值已重置',
					icon: 'success',
					duration: 1500
				})
			},
			reconnect() {
				if (this.socket) this.socket.close()
				this.currentImage = ''
				this.currentDetections = []
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
		gap: 12px;
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
		transition: all 0.3s ease;
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
		padding: 16px;
		padding-bottom: calc(16px + env(safe-area-inset-bottom) + 60px);
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.video-section {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.video-wrapper {
		position: relative;
		width: 100%;
		aspect-ratio: 4/3;
		background: var(--bg-card);
		border-radius: var(--radius-lg);
		overflow: hidden;
		border: 1px solid var(--border-color);
		box-shadow: var(--shadow-lg);
	}

	.video-frame {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.video-placeholder {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 16px;
		background: linear-gradient(145deg, var(--bg-card) 0%, var(--bg-secondary) 100%);
	}

	.placeholder-icon {
		font-size: 56px;
		opacity: 0.2;
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

	.placeholder-text {
		font-size: 14px;
		color: var(--text-muted);
	}

	.video-overlay {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		padding: 16px;
		background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.video-stats {
		display: flex;
		gap: 12px;
	}

	.stat-item {
		font-family: 'SF Mono', monospace;
		font-size: 11px;
		color: rgba(255, 255, 255, 0.8);
		padding: 4px 10px;
		background: rgba(0, 0, 0, 0.5);
		border-radius: 6px;
		backdrop-filter: blur(10px);
	}

	.video-action {
		padding: 8px 16px;
		background: linear-gradient(135deg, var(--accent) 0%, var(--accent-dark) 100%);
		border-radius: 20px;
		font-size: 12px;
		font-weight: 600;
		color: #fff;
		box-shadow: 0 4px 12px var(--accent-glow);
		transition: all 0.2s ease;
	}

	.video-action:active {
		transform: scale(0.95);
		opacity: 0.9;
	}

	.detection-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.tag-item {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 8px 14px;
		background: var(--bg-card);
		border-radius: 20px;
		font-size: 12px;
		font-weight: 500;
		color: var(--text-secondary);
		border: 1px solid var(--border-color);
		transition: all 0.2s ease;
	}

	.tag-item:active {
		transform: scale(0.98);
	}

	.tag-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
	}

	.tag-item.water {
		background: var(--water-light);
		color: var(--water-color);
		border-color: rgba(14, 165, 233, 0.3);
	}

	.tag-item.pothole {
		background: var(--pothole-light);
		color: var(--pothole-color);
		border-color: rgba(139, 92, 246, 0.3);
	}

	.tag-item.manhole {
		background: var(--manhole-light);
		color: var(--manhole-color);
		border-color: rgba(245, 158, 11, 0.3);
	}

	.tag-item.crack {
		background: var(--crack-light);
		color: var(--crack-color);
		border-color: rgba(239, 68, 68, 0.3);
	}

	.tag-empty {
		padding: 8px 14px;
		font-size: 12px;
		color: var(--text-muted);
	}

	.control-panel {
		background: var(--bg-card);
		border-radius: var(--radius-lg);
		padding: 18px;
		border: 1px solid var(--border-color);
		box-shadow: var(--shadow-md);
	}

	.mode-switch {
		display: flex;
		background: var(--bg-input);
		border-radius: var(--radius-md);
		padding: 4px;
		margin-bottom: 16px;
	}

	.switch-item {
		flex: 1;
		padding: 11px;
		text-align: center;
		border-radius: var(--radius-sm);
		font-size: 13px;
		font-weight: 600;
		color: var(--text-secondary);
		transition: all 0.3s ease;
	}

	.switch-item.active {
		background: linear-gradient(135deg, var(--accent) 0%, var(--accent-dark) 100%);
		color: #fff;
		box-shadow: 0 4px 12px var(--accent-glow);
		display: flex;
		flex-direction: row;
		justify-content: space-around;
		align-items: center;
	}

	.source-selector {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}

	.picker-box {
		flex: 1;
		min-width: 120px;
		padding: 11px 14px;
		background: var(--bg-input);
		border-radius: var(--radius-md);
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 13px;
		color: var(--text-primary);
		border: 1px solid var(--border-color);
		transition: all 0.2s ease;
	}

	.picker-box:active {
		border-color: var(--accent);
	}

	.picker-arrow {
		font-size: 10px;
		color: var(--text-muted);
	}

	.input-field {
		flex: 1;
		min-width: 150px;
		padding: 11px 14px;
		background: var(--bg-input);
		border-radius: var(--radius-md);
		font-size: 13px;
		color: var(--text-primary);
		border: 1px solid var(--border-color);
		transition: all 0.2s ease;
	}

	.input-field:focus {
		border-color: var(--accent);
	}

	.btn-primary {
		padding: 11px 22px;
		background: linear-gradient(135deg, var(--accent) 0%, var(--accent-dark) 100%);
		border-radius: var(--radius-md);
		font-size: 13px;
		font-weight: 600;
		color: #fff;
		box-shadow: 0 4px 12px var(--accent-glow);
		transition: all 0.2s ease;
	}

	.btn-primary:active {
		transform: scale(0.98);
		opacity: 0.9;
	}

	.source-info {
		padding: 8px 14px;
		background: var(--bg-input);
		border-radius: var(--radius-sm);
		font-size: 12px;
		color: var(--text-secondary);
		font-family: monospace;
	}

	.stats-section {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.section-title {
		font-size: 15px;
		font-weight: 600;
		color: var(--text-primary);
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 10px;
	}

	.stat-card {
		background: var(--bg-card);
		border-radius: var(--radius-md);
		padding: 16px;
		display: flex;
		align-items: center;
		gap: 14px;
		border: 1px solid var(--border-color);
		transition: all 0.2s ease;
	}

	.stat-card:active {
		transform: scale(0.98);
	}

	.stat-icon {
		font-size: 28px;
	}

	.stat-info {
		display: flex;
		flex-direction: column;
	}

	.stat-label {
		font-size: 12px;
		color: var(--text-secondary);
	}

	.stat-value {
		font-size: 24px;
		font-weight: 700;
		font-family: 'SF Mono', monospace;
		color: var(--text-primary);
	}

	.stat-card.water .stat-value {
		color: var(--water-color);
	}

	.stat-card.pothole .stat-value {
		color: var(--pothole-color);
	}

	.stat-card.manhole .stat-value {
		color: var(--manhole-color);
	}

	.stat-card.crack .stat-value {
		color: var(--crack-color);
	}

	.threshold-section {
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
		margin-bottom: 16px;
	}

	.reset-btn {
		font-size: 12px;
		font-weight: 600;
		color: var(--accent);
		padding: 6px 12px;
		border-radius: var(--radius-sm);
		transition: all 0.2s ease;
	}

	.reset-btn:active {
		background: var(--accent-light);
	}

	.threshold-list {
		display: flex;
		flex-direction: column;
		gap: 18px;
	}

	.threshold-item {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.threshold-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.threshold-label {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 13px;
		font-weight: 500;
		color: var(--text-secondary);
	}

	.dot {
		width: 10px;
		height: 10px;
		border-radius: 3px;
	}

	.dot.water {
		background: var(--water-color);
		box-shadow: 0 0 8px var(--water-light);
	}

	.dot.pothole {
		background: var(--pothole-color);
		box-shadow: 0 0 8px var(--pothole-light);
	}

	.dot.manhole {
		background: var(--manhole-color);
		box-shadow: 0 0 8px var(--manhole-light);
	}

	.dot.crack {
		background: var(--crack-color);
		box-shadow: 0 0 8px var(--crack-light);
	}

	.threshold-value {
		font-family: 'SF Mono', monospace;
		font-size: 15px;
		font-weight: 600;
		color: var(--text-primary);
	}

	.records-section {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.score-badge {
		font-family: 'SF Mono', monospace;
		font-size: 16px;
		font-weight: 700;
		color: var(--success);
		padding: 6px 14px;
		background: var(--success-light);
		border-radius: var(--radius-sm);
	}

	.records-scroll {
		white-space: nowrap;
	}

	.records-list {
		display: inline-flex;
		gap: 12px;
	}

	.record-card {
		width: 100px;
		height: 100px;
		background: var(--bg-input);
		border-radius: var(--radius-md);
		overflow: hidden;
		position: relative;
		border: 2px solid var(--border-color);
		flex-shrink: 0;
		transition: all 0.3s ease;
	}

	.record-card:active {
		transform: scale(0.95);
	}

	.record-card.correct {
		border-color: var(--success);
		box-shadow: 0 0 15px var(--success-light);
	}

	.record-card.incorrect {
		border-color: var(--danger);
		box-shadow: 0 0 15px var(--danger-light);
	}

	.record-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.record-overlay {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		padding: 6px 8px;
		background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
		display: flex;
		justify-content: space-between;
		font-size: 10px;
		color: #fff;
	}

	.record-badge {
		position: absolute;
		top: 6px;
		right: 6px;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 11px;
		font-weight: bold;
	}

	.record-badge.correct {
		background: var(--success);
		color: #fff;
	}

	.record-badge.incorrect {
		background: var(--danger);
		color: #fff;
	}

	.empty-records {
		padding: 30px 60px;
		font-size: 13px;
		color: var(--text-muted);
	}

	.action-row {
		display: flex;
		gap: 12px;
	}

	.btn-secondary {
		flex: 1;
		padding: 11px;
		background: var(--bg-elevated);
		border-radius: var(--radius-md);
		font-size: 13px;
		font-weight: 600;
		color: var(--text-secondary);
		border: 1px solid var(--border-color);
		transition: all 0.2s ease;
	}

	.btn-secondary:active {
		transform: scale(0.98);
		background: var(--bg-hover);
	}

	.risk-alert {
		position: fixed;
		top: calc(70px + var(--status-bar-height, 0));
		right: 16px;
		left: 16px;
		padding: 16px;
		border-radius: var(--radius-md);
		font-size: 14px;
		font-weight: 600;
		display: flex;
		align-items: center;
		gap: 12px;
		z-index: 1000;
		opacity: 0;
		transform: translateY(-20px);
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		backdrop-filter: blur(10px);
	}

	.risk-alert.show {
		opacity: 1;
		transform: translateY(0);
	}

	.alert-icon {
		font-size: 20px;
	}

	.risk-alert.high {
		background: linear-gradient(135deg, var(--danger) 0%, #dc2626 100%);
		color: #fff;
		box-shadow: 0 8px 24px rgba(239, 68, 68, 0.4);
	}

	.risk-alert.medium {
		background: linear-gradient(135deg, var(--warning) 0%, #d97706 100%);
		color: #1e293b;
		box-shadow: 0 8px 24px rgba(245, 158, 11, 0.4);
	}

	.risk-alert.low {
		background: linear-gradient(135deg, var(--success) 0%, #059669 100%);
		color: #fff;
		box-shadow: 0 8px 24px rgba(16, 185, 129, 0.4);
	}

	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.9);
		display: none;
		align-items: center;
		justify-content: center;
		z-index: 2000;
		backdrop-filter: blur(10px);
	}

	.modal-overlay.show {
		display: flex;
	}

	.modal-content {
		width: 92%;
		max-width: 420px;
		background: var(--bg-card);
		border-radius: var(--radius-xl);
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 20px;
		box-shadow: var(--shadow-xl);
		border: 1px solid var(--border-color);
	}

	.modal-image {
		width: 100%;
		max-height: 320px;
		border-radius: var(--radius-md);
	}

	.modal-actions {
		display: flex;
		gap: 10px;
	}

	.modal-btn {
		flex: 1;
		padding: 13px;
		border-radius: var(--radius-md);
		font-size: 14px;
		font-weight: 600;
		transition: all 0.2s ease;
	}

	.modal-btn:active {
		transform: scale(0.98);
	}

	.modal-btn.correct {
		background: linear-gradient(135deg, var(--success) 0%, #059669 100%);
		color: #fff;
	}

	.modal-btn.incorrect {
		background: linear-gradient(135deg, var(--danger) 0%, #dc2626 100%);
		color: #fff;
	}

	.modal-btn.close {
		background: var(--bg-elevated);
		color: var(--text-secondary);
		border: 1px solid var(--border-color);
	}

	@media screen and (min-width: 768px) {
		.main-content {
			padding-bottom: calc(16px + 80px);
		}

		.video-wrapper {
			aspect-ratio: 16/9;
		}

		.stats-grid {
			grid-template-columns: repeat(4, 1fr);
		}

		.record-card {
			width: 140px;
			height: 140px;
		}

		.risk-alert {
			right: 24px;
			left: auto;
			max-width: 340px;
		}
	}
</style>