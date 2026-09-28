class DetectSocket {
	constructor() {
		this.socket = null
		this.listeners = {}
		this.reconnectAttempts = 0
		this.maxReconnectAttempts = 5
		this.reconnectDelay = 3000
		this.isManuallyClosed = false
	}

	getUrl() {
		// ⚠ 不要依赖 process.env
		// ---------------------------------
		// App 编译器会把 process.env 整体替换成**空对象**，证据是编译产物里的
		// `var define_process_env_default = {};`，于是原来这行
		//     const wsHost = process.env.WS_HOST || 'localhost'
		// 恒等于 'localhost'——**而手机上 localhost 就是手机自己**，
		// 所以 App 永远连不上 PC 上的 server.py。这是 App 端连不上的根因。
		//
		// 现在改成三级回退，优先级从高到低：
		//   1. 本地存储（用户可在「硬件」页填服务器地址，换网络不用重新打包）
		//   2. H5：从页面 URL 推断（保持原逻辑不变）
		//   3. App：写死的局域网默认值 / H5：localhost
		let wsHost = ''
		let wsPort = '8766'

		// ---- 1) 本地存储优先（H5 与 App 都生效）----
		try {
			const saved = uni.getStorageSync('ws_host')
			if (saved) {
				// 允许存 'ip' 或 'ip:port' 两种写法
				const m = String(saved).trim().replace(/^wss?:\/\//, '')
				const idx = m.lastIndexOf(':')
				if (idx > 0 && /^\d+$/.test(m.slice(idx + 1))) {
					wsHost = m.slice(0, idx)
					wsPort = m.slice(idx + 1)
				} else {
					wsHost = m
				}
			}
			// ⚠ 原来写的是 `if (savedPort && !wsPort)`，而 wsPort 上面已被初始化成
			// '8766'（恒为真）→ 这个条件永远不成立 → **用户在「硬件」页保存的端口
			// 从来没生效过**，永远退回默认 8766。改成只要存了端口就用它。
			const savedPort = uni.getStorageSync('ws_port')
			if (savedPort) wsPort = String(savedPort)
		} catch (e) { /* 存储不可用时忽略 */ }

		// ---- 2) H5：从 URL 推断 ----
		// #ifdef H5
		if (typeof window !== 'undefined' && window.location) {
			try {
				const searchParams = new URLSearchParams(window.location.search)
				const customPort = searchParams.get('wsPort')
				if (customPort) {
					return `ws://${wsHost || window.location.hostname || 'localhost'}:${customPort}`
				}
				const pagePort = window.location.port
				if (!wsHost && pagePort === '8001') {
					return 'ws://localhost:8766'
				}
				if (!wsHost) wsHost = window.location.hostname || 'localhost'
			} catch (e) {
				console.log('无法从URL获取WebSocket配置:', e)
			}
		}
		// #endif

		// ---- 3) 兜底 ----
		if (!wsHost) {
			// #ifdef APP-PLUS
			// App 侧没有 location，必须给一个显式地址。
			// ⚠ 这里是**占位值**：换成你 PC 在同一 WiFi 下的局域网 IP
			//   （cmd 里 ipconfig 看 IPv4 地址）。或者在 App 的「硬件」页
			//   填一次服务器地址，存进 storage 后就会覆盖这里，不用重新打包。
			wsHost = '192.168.1.100'
			// #endif
			// #ifndef APP-PLUS
			wsHost = 'localhost'
			// #endif
		}

		return `ws://${wsHost}:${wsPort}`
	}

	/**
	 * 后端 HTTP 静态服务的根地址（A2）。
	 *
	 * server.py 同时开两个端口：8766 是 WebSocket，8001 是静态文件服务，
	 * 且它把**进程工作目录**当站点根——而 `server.py` 必须在含 `best.pt` 的
	 * 目录（`thesis_work`）下启动，所以 `saved_captures/<file>.jpg` 正好可以通过
	 * `http://<host>:8001/saved_captures/<file>.jpg` 取到。
	 *
	 * 主机名复用 getUrl() 的解析结果，只把端口换成 8001 ——
	 * 这样「硬件」页里改过服务器地址之后，图片地址会跟着一起变。
	 */
	httpBase() {
		const m = /^wss?:\/\/([^:/]+)/.exec(this.getUrl())
		const host = (m && m[1]) || 'localhost'
		return `http://${host}:8001`
	}

	connect() {
		return new Promise((resolve, reject) => {
			if (this.socket) {
				// 用实例方法关，不要用 uni.closeSocket
				try { this.socket.close({}) } catch (e) {}
			}

			this.isManuallyClosed = false

			// ⚠ 事件必须挂在 socketTask 实例上，不能用 uni.onSocketXxx
			// ------------------------------------------------------
			// `uni.onSocketOpen/onSocketMessage/onSocketError/onSocketClose`
			// 以及 `uni.sendSocketMessage` / `uni.closeSocket` 都是**单目标**的，
			// 只作用于内部 `socketTasks[0]`。
			// 而本项目四个 tab 页（index/score/workorder/hardware）**各自** new 一个
			// DetectSocket 并 connect，于是：
			//   · 第 2~4 个 socket 的事件回调被挂到第 1 个对象上 → 永久哑掉
			//   · this.socket.close() 实际关的是第 1 个 → 关错对象
			// 改成 socketTask.onOpen/onMessage/... 后，每个连接互相独立。
			// （uni.connectSocket 本身会返回 socketTask，这行原代码就是对的，保留。）
			const socketTask = uni.connectSocket({
				url: this.getUrl(),
				complete: () => {}
			})

			this.socket = socketTask

			socketTask.onOpen(() => {
				this.reconnectAttempts = 0
				this.emit('connected')
				resolve()
			})

			socketTask.onMessage((res) => {
				try {
					const data = JSON.parse(res.data)
					this.handleMessage(data)
				} catch (e) {
					console.error('消息解析失败:', e)
				}
			})

			socketTask.onError((err) => {
				// 已经 reject 过的 Promise 再 reject 是空操作，安全
				this.emit('error', err)
				reject(err)
				this.attemptReconnect()
			})

			socketTask.onClose(() => {
				this.emit('disconnected')
				this.attemptReconnect()
			})
		})
	}

	handleMessage(data) {
		this.emit('message', data)

		if (data.type === 'camera_list') {
			this.emit('cameraList', {
				cameras: data.cameras || [],
				currentCamera: data.current_camera,
				currentMode: data.current_mode,
				testImagesDir: data.test_images_dir
			})
		} else if (data.type === 'test_images_list') {
			this.emit('testImagesList', {
				count: data.count,
				directory: data.directory
			})
		} else if (data.type === 'auto_score_result') {
			this.emit('autoScoreResult', data)
		} else if (data.type === 'expert_image_data') {
			// A4：专家打分逐张回图。注意 detections[] 是 **xywh 形状**
			// （x,y 是中心点），与帧消息的 xyxy 不同——画框不能复用。
			this.emit('expertImageData', data)
		} else if (data.type === 'saved_captures_info') {
			this.emit('savedCapturesInfo', data)
		} else if (data.type === 'saved_captures_list') {
			// A2：带元数据的完整截图清单
			this.emit('savedCapturesList', data)
		} else if (data.type === 's3_status') {
			// A3：ESP32-S3 上报的状态。字段集尚未最终定稿（I-1 待 S3 上板，
			// 见 plan/01-后端协议参考.md §5），所以原样透传，页面按可选字段读。
			this.emit('s3Status', data)
		} else if (data.type === 's3_command') {
			// 自己下发的硬件指令会被 server.py 广播回来（它广播给所有 8766 客户端）。
			// 必须显式接住：否则会掉进下面的 else，被当成一帧把画面打黑，
			// 或者至少打一条"未知消息类型"的警告。
			this.emit('s3Command', data)
		} else if (data.type === 'save_capture_result') {
			// ⚠ 必须显式分支，不能让下面 else 兜底
			// -----------------------------------
			// 这个回包**没有 image 字段**。原来它会掉进 else 被当成一帧，
			// 于是 emit('frame', {image: undefined, ...})，页面把 currentImage
			// 置空 → 实时画面当场变黑。加了这个分支就不会了。
			//
			// ⚠ 字段名是 `filepath`（server.py 的 save_capture 分支），
			// 不是 `path`——原来读 data.path 恒为 undefined。
			this.emit('saveCaptureResult', {
				success: data.success,
				filepath: data.filepath
			})
		} else if (data.frame === undefined && data.image === undefined) {
			// 剩下的未知类型：只有确实带 frame/image 才当帧处理，
			// 否则记一条日志，避免任何无 image 的消息把画面打黑。
			console.warn('[ws] 未知消息类型，已忽略:', data.type)
		} else {
			this.emit('frame', {
				image: data.image,
				fps: data.fps || 0,
				frameIndex: data.frame || 0,
				cameraInfo: data.camera_info,
				detections: data.detection_list || [],
				riskLevel: data.risk_level,
				riskMessage: data.risk_message,
				thresholds: data.thresholds
			})
		}
	}

	attemptReconnect() {
		if (this.isManuallyClosed || this.reconnectAttempts >= this.maxReconnectAttempts) {
			return
		}

		this.reconnectAttempts++
		this.emit('reconnecting', {
			attempt: this.reconnectAttempts,
			max: this.maxReconnectAttempts
		})

		setTimeout(() => {
			if (!this.isManuallyClosed) {
				this.connect().catch(() => {})
			}
		}, this.reconnectDelay)
	}

	send(data) {
		// 必须用实例方法：uni.sendSocketMessage 只发给 socketTasks[0]，
		// 四个页面各有一个连接时会发错对象。
		if (!this.socket) {
			console.warn('[ws] 未连接，丢弃消息:', data && data.type)
			return
		}
		try {
			this.socket.send({ data: JSON.stringify(data) })
		} catch (e) {
			console.error('[ws] 发送失败:', e)
		}
	}

	selectCamera(cameraIndex) {
		this.send({
			type: 'select_camera',
			camera_index: cameraIndex
		})
	}

	setMode(mode) {
		this.send({
			type: 'set_mode',
			mode: mode
		})
	}

	setTestDir(directory) {
		this.send({
			type: 'set_test_dir',
			directory: directory
		})
	}

	setThreshold(classId, threshold) {
		this.send({
			type: 'set_threshold',
			class_id: classId,
			threshold: threshold
		})
	}

	resetThresholds() {
		this.send({
			type: 'reset_thresholds'
		})
	}

	saveCapture(image, timestamp, metadata) {
		// metadata 是可选的第 3 个参数（A2）：服务端会把它连同图片一起
		// 记进 saved_captures/records.json，供「病害记录」页展示类别/风险/置信度。
		// 不传也能保存，只是这条记录在列表里显示为“无元数据”。
		this.send({
			type: 'save_capture',
			image: image,
			timestamp: timestamp,
			metadata: metadata
		})
	}

	checkSavedCaptures() {
		this.send({
			type: 'check_saved_captures'
		})
	}

	listSavedCaptures() {
		// A2：拉取 saved_captures/ 的完整清单（文件名 + 元数据）。
		// 与 checkSavedCaptures 的区别是它回 `saved_captures_list`（带 records 数组），
		// 而不是只有 count。
		this.send({
			type: 'list_saved_captures'
		})
	}

	/**
	 * 下发一条硬件控制指令（s3_command）。
	 *
	 * 链路：本端 --ws 8766--> server.py --广播--> s3_bridge.py --ws 8767--> ESP32-S3
	 *   · server.py 的 handle_client 有 `s3_command` 分支，收到就 broadcast；
	 *   · s3_bridge.py 的 on_frame 认出 s3_command 并转发给 ESP；
	 *   · 固件 ws_client.cpp 解析后交给 net_task 的 onCommand 执行。
	 *
	 * @param {string} cmd   'volume' | 'mute' | 'play' | 'reboot'
	 * @param {*}      value volume: 0..100；mute: boolean；play: 素材名；reboot: 省略
	 */
	sendS3Command(cmd, value) {
		const msg = {
			type: 's3_command',
			cmd
		}
		if (value !== undefined) msg.value = value
		this.send(msg)
	}

	startAutoScore(directory, count) {
		this.send({
			type: 'start_auto_score',
			directory: directory,
			count: count
		})
	}

	startExpertScore(directory) {
		// A4：开始专家打分。服务端回第一条 expert_image_data。
		this.send({
			type: 'start_expert_score',
			directory: directory
		})
	}

	nextExpertImage() {
		// A4：请求下一条。服务端总会回一条 expert_image_data
		// （走完最后一张后 current_index 不再增加，由页面判断结束）。
		this.send({
			type: 'next_expert_image'
		})
	}

	close() {
		this.isManuallyClosed = true
		if (this.socket) {
			// 用实例方法关自己的连接。原来用 uni.closeSocket 关的是
			// socketTasks[0]，多页面时会把别的页面的连接关掉。
			try { this.socket.close({}) } catch (e) { /* 已关闭 */ }
			this.socket = null
		}
	}

	on(event, callback) {
		if (!this.listeners[event]) {
			this.listeners[event] = []
		}
		this.listeners[event].push(callback)
	}

	off(event, callback) {
		if (!this.listeners[event]) return
		if (callback) {
			this.listeners[event] = this.listeners[event].filter(cb => cb !== callback)
		} else {
			delete this.listeners[event]
		}
	}

	emit(event, data) {
		const callbacks = this.listeners[event] || []
		callbacks.forEach(cb => {
			try {
				cb(data)
			} catch (e) {
				console.error(`Listener error for ${event}:`, e)
			}
		})
	}
}

export default DetectSocket