class DetectSocket {
  constructor(url = 'ws://localhost:8000/ws/detect') {
    this.url = url
    this.socket = null
    this.isConnected = false
    this.listeners = {}
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectDelay = 1000
    this.isManuallyClosed = false
  }

  connect() {
    return new Promise((resolve, reject) => {
      if (this.isConnected) {
        resolve()
        return
      }

      this.isManuallyClosed = false
      
      const socketTask = uni.connectSocket({
        url: this.url,
        complete: () => {}
      })

      this.socket = socketTask

      uni.onSocketOpen(() => {
        this.isConnected = true
        this.reconnectAttempts = 0
        this.emit('connected')
        resolve()
      })

      uni.onSocketMessage((res) => {
        try {
          const data = JSON.parse(res.data)
          this.emit('message', data)
          if (data.type === 'frame') {
            this.emit('frame', data)
          } else if (data.type === 'connected') {
            this.emit('server-connected', data)
          } else if (data.type === 'started') {
            this.emit('started', data)
          } else if (data.type === 'paused') {
            this.emit('paused', data)
          }
        } catch (e) {
          console.error('消息解析失败:', e)
        }
      })

      uni.onSocketError((err) => {
        this.isConnected = false
        this.emit('error', err)
        reject(err)
        this.attemptReconnect()
      })

      uni.onSocketClose(() => {
        this.isConnected = false
        this.emit('disconnected')
        this.attemptReconnect()
      })
    })
  }

  attemptReconnect() {
    if (this.isManuallyClosed || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return
    }
    
    this.reconnectAttempts++
    this.emit('reconnecting', { attempt: this.reconnectAttempts, max: this.maxReconnectAttempts })
    
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    setTimeout(() => {
      if (!this.isManuallyClosed) {
        this.connect().catch(() => {})
      }
    }, delay)
  }

  send(data) {
    if (!this.isConnected) return
    uni.sendSocketMessage({
      data: JSON.stringify(data)
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
