/**
 * UniApp响应式工具函数
 * 使用JS检测替代CSS媒体查询，确保跨平台兼容性
 */

/**
 * 获取系统信息
 */
export function getSystemInfo() {
  try {
    return uni.getSystemInfoSync()
  } catch (e) {
    return {
      windowWidth: 375,
      windowHeight: 667,
      pixelRatio: 2
    }
  }
}

/**
 * 判断是否为移动端
 * @param {number} width - 窗口宽度
 * @returns {boolean}
 */
export function isMobile(width = getSystemInfo().windowWidth) {
  return width <= 768
}

/**
 * 判断是否为小屏设备（手机）
 * @param {number} width - 窗口宽度
 * @returns {boolean}
 */
export function isSmallScreen(width = getSystemInfo().windowWidth) {
  return width <= 480
}

/**
 * 获取响应式状态对象
 * @returns {object}
 */
export function getResponsiveState() {
  const info = getSystemInfo()
  const width = info.windowWidth
  return {
    windowWidth: width,
    windowHeight: info.windowHeight,
    pixelRatio: info.pixelRatio,
    isMobile: isMobile(width),
    isSmallScreen: isSmallScreen(width),
    deviceType: width <= 480 ? 'phone' : width <= 768 ? 'tablet' : 'desktop'
  }
}

/**
 * 将px转换为rpx
 * @param {number} px - 像素值
 * @param {number} baseWidth - 基准宽度，默认375
 * @returns {number}
 */
export function px2rpx(px, baseWidth = 375) {
  const info = getSystemInfo()
  return Math.round((px * 750) / info.windowWidth)
}

/**
 * 将rpx转换为px
 * @param {number} rpx - rpx值
 * @returns {number}
 */
export function rpx2px(rpx) {
  const info = getSystemInfo()
  return (rpx * info.windowWidth) / 750
}

/**
 * 响应式混合，可用于Vue组件
 */
export const ResponsiveMixin = {
  data() {
    return {
      responsive: getResponsiveState()
    }
  },
  onLoad() {
    this.updateResponsive()
  },
  onShow() {
    this.updateResponsive()
  },
  methods: {
    updateResponsive() {
      this.responsive = getResponsiveState()
    }
  },
  computed: {
    isMobile() {
      return this.responsive.isMobile
    },
    isSmallScreen() {
      return this.responsive.isSmallScreen
    },
    deviceType() {
      return this.responsive.deviceType
    },
    windowWidth() {
      return this.responsive.windowWidth
    },
    windowHeight() {
      return this.responsive.windowHeight
    }
  }
}
