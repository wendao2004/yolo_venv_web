/**
 * 全局主题管理工具
 * 支持黑色/白色主题切换，使用localStorage持久化保存
 */

const THEME_KEY = 'detection_theme'
const THEME_DARK = 'dark'
const THEME_LIGHT = 'light'

/**
 * 获取当前主题
 * @returns {string} 'dark' | 'light'
 */
export function getTheme() {
  try {
    const saved = uni.getStorageSync(THEME_KEY)
    if (saved && (saved === THEME_DARK || saved === THEME_LIGHT)) {
      return saved
    }
  } catch (e) {
    console.error('读取主题失败:', e)
  }
  return THEME_DARK
}

/**
 * 设置主题
 * @param {string} theme - 'dark' | 'light'
 */
export function setTheme(theme) {
  if (theme !== THEME_DARK && theme !== THEME_LIGHT) {
    theme = THEME_DARK
  }
  try {
    uni.setStorageSync(THEME_KEY, theme)
  } catch (e) {
    console.error('保存主题失败:', e)
  }
  
  // 更新全局样式变量
  updateGlobalTheme(theme)
}

/**
 * 切换主题
 * @returns {string} 切换后的主题
 */
export function toggleTheme() {
  const current = getTheme()
  const newTheme = current === THEME_DARK ? THEME_LIGHT : THEME_DARK
  setTheme(newTheme)
  return newTheme
}

/**
 * 更新全局主题样式
 * @param {string} theme - 'dark' | 'light'
 */
function updateGlobalTheme(theme) {
  // 在H5端可以通过document.documentElement设置类名
  if (typeof window !== 'undefined' && document) {
    const html = document.documentElement
    if (theme === THEME_LIGHT) {
      html.classList.remove('dark-theme')
      html.classList.add('light-theme')
    } else {
      html.classList.remove('light-theme')
      html.classList.add('dark-theme')
    }
  }
}

/**
 * 判断是否为暗色主题
 * @returns {boolean}
 */
export function isDarkTheme() {
  return getTheme() === THEME_DARK
}

/**
 * 判断是否为亮色主题
 * @returns {boolean}
 */
export function isLightTheme() {
  return getTheme() === THEME_LIGHT
}

/**
 * 获取主题配置对象
 * @returns {object} 包含各种颜色配置
 */
export function getThemeConfig() {
  const theme = getTheme()
  if (theme === THEME_LIGHT) {
    return {
      theme: 'light',
      pageBg: '#f5f5f5',
      cardBg: '#ffffff',
      headerBg: '#ffffff',
      textPrimary: '#1a1a1a',
      textSecondary: '#666666',
      textTertiary: '#999999',
      borderColor: '#e0e0e0',
      accentColor: '#E85D04',
      successColor: '#2D9E45',
      dangerColor: '#DC2626',
      warningColor: '#D4A800',
      infoColor: '#2563EB',
      inputBg: '#f0f0f0',
      badgeBg: '#f5f5f5',
      hoverBg: '#f0f0f0'
    }
  }
  return {
    theme: 'dark',
    pageBg: '#0c0c0c',
    cardBg: '#141414',
    headerBg: '#141414',
    textPrimary: '#e8e8e8',
    textSecondary: '#888888',
    textTertiary: '#555555',
    borderColor: '#2a2a2a',
    accentColor: '#E85D04',
    successColor: '#2D9E45',
    dangerColor: '#DC2626',
    warningColor: '#D4A800',
    infoColor: '#2563EB',
    inputBg: '#0c0c0c',
    badgeBg: '#1a1a1a',
    hoverBg: '#1a1a1a'
  }
}

/**
 * 初始化主题（应用保存的主题设置）
 */
export function initTheme() {
  const theme = getTheme()
  updateGlobalTheme(theme)
}
