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
    // 优先从环境变量或配置获取
    const wsHost = process.env.WS_HOST || 'localhost'
    const wsPort = process.env.WS_PORT || '8766'
    
    // 在H5端尝试从URL参数获取
    if (typeof window !== 'undefined' && window.location) {
      try {
        const searchParams = new URLSearchParams(window.location.search)
        const customPort = searchParams.get('wsPort')
        if (customPort) {
          return `ws://${wsHost}:${customPort}`
        }
        const pagePort = window.location.port
        if (pagePort === '8001') {
          return 'ws://localhost:8766'
        }
      } catch (e) {
        console.log('无法从URL获取WebSocket配置:', e)
      }
    }
    
    return `ws://${wsHost}:${wsPort}`
  }

  connect() {
    return new Promise((resolve, reject) => {
      if (this.socket) {
        this.socket.close()
      }

      this.isManuallyClosed = false
      
      const socketTask = uni.connectSocket({
        url: this.getUrl(),
        complete: () => {}
      })

      this.socket = socketTask

      uni.onSocketOpen(() => {
        this.reconnectAttempts = 0
        this.emit('connected')
        resolve()
      })

      uni.onSocketMessage((res) => {
        try {
          const data = JSON.parse(res.data)
          this.handleMessage(data)
        } catch (e) {
          console.error('消息解析失败:', e)
        }
      })

      uni.onSocketError((err) => {
        this.emit('error', err)
        reject(err)
        this.attemptReconnect()
      })

      uni.onSocketClose(() => {
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
    } else if (data.type === 'saved_captures_info') {
      this.emit('savedCapturesInfo', data)
    } else if (data.type === 'work_order') {
      this.emit('workOrder', data)
    } else if (data.type === 'hardware_status') {
      this.emit('hardwareStatus', data)
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
    this.emit('reconnecting', { attempt: this.reconnectAttempts, max: this.maxReconnectAttempts })
    
    setTimeout(() => {
      if (!this.isManuallyClosed) {
        this.connect().catch(() => {})
      }
    }, this.reconnectDelay)
  }

  send(data) {
    uni.sendSocketMessage({
      data: JSON.stringify(data)
    })
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

  saveCapture(image, timestamp) {
    this.send({
      type: 'save_capture',
      image: image,
      timestamp: timestamp
    })
  }

  checkSavedCaptures() {
    this.send({
      type: 'check_saved_captures'
    })
  }

  startAutoScore(directory, count) {
    this.send({
      type: 'start_auto_score',
      directory: directory,
      count: count
    })
  }

  updateWorkOrder(orderId, status) {
    this.send({
      type: 'update_work_order',
      order_id: orderId,
      status: status
    })
  }

  getWorkOrders() {
    this.send({
      type: 'get_work_orders'
    })
  }

  close() {
    this.isManuallyClosed = true
    if (this.socket) {
      uni.closeSocket({})
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
