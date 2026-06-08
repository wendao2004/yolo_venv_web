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
    const pagePort = window?.location?.port || ''
    
    if (pagePort === '8001') {
      return 'ws://localhost:8766'
    }
    
    const searchParams = new URLSearchParams(window?.location?.search || '')
    const wsPort = searchParams.get('wsPort') || '8766'
    
    return 'ws://localhost:' + wsPort
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
    } else {
      this.emit('frame', {
        image: data.image,
        fps: data.fps || 0,
        frameIndex: data.frame || 0,
        cameraInfo: data.camera_info,
        detections: data.detections || {}
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

  start() {
    this.send({ action: 'start' })
  }

  pause() {
    this.send({ action: 'pause' })
  }

  reset() {
    this.send({ action: 'reset' })
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
