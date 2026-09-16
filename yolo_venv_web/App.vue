<script>
	import { getTheme, setTheme, initTheme } from '@/utils/theme.js'

	export default {
		globalData: {
			theme: 'dark'
		},
		onLaunch: function() {
			console.log('App Launch')
			this.initGlobalTheme()
		},
		onShow: function() {
			console.log('App Show')
		},
		onHide: function() {
			console.log('App Hide')
		},
		methods: {
			initGlobalTheme() {
				const savedTheme = getTheme()
				this.globalData.theme = savedTheme
				initTheme()
				this.updateTabBarStyle(savedTheme)
				this.setDocumentThemeClass(savedTheme)
			},
			toggleTheme() {
				const current = getTheme()
				const newTheme = current === 'dark' ? 'light' : 'dark'
				setTheme(newTheme)
				this.globalData.theme = newTheme
				this.updateTabBarStyle(newTheme)
				this.setDocumentThemeClass(newTheme)
				return newTheme
			},
			updateTabBarStyle(theme) {
				if (theme === 'dark') {
					uni.setTabBarStyle({
						backgroundColor: '#111118',
						color: '#6b7280',
						selectedColor: '#4f46e5',
						borderStyle: 'black'
					})
				} else {
					uni.setTabBarStyle({
						backgroundColor: '#ffffff',
						color: '#6b7280',
						selectedColor: '#4f46e5',
						borderStyle: 'white'
					})
				}
			},
			setDocumentThemeClass(theme) {
				if (typeof document !== 'undefined' && document.documentElement) {
					if (theme === 'dark') {
						document.documentElement.classList.remove('light-theme')
						document.documentElement.classList.add('dark-theme')
					} else {
						document.documentElement.classList.remove('dark-theme')
						document.documentElement.classList.add('light-theme')
					}
				}
			}
		}
	}
</script>

<style>
	page {
		height: 100%;
		width: 100%;
		overflow-y: auto;
		background: var(--bg-primary);
		color: var(--text-primary);
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
		font-size: 14px;
		line-height: 1.6;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}

	view, text {
		box-sizing: border-box;
	}

	button {
		margin: 0;
		padding: 0;
		background: transparent;
		border: none;
		line-height: inherit;
		font-size: inherit;
	}

	button::after {
		border: none;
	}

	scroll-view {
		-webkit-overflow-scrolling: touch;
	}

	/* ==================== 暗色主题 ==================== */
	:root,
	.page.dark-theme {
		--bg-primary: #0a0a0f;
		--bg-secondary: #111118;
		--bg-card: #171721;
		--bg-elevated: #1e1e2a;
		--bg-input: #0f0f16;
		--bg-hover: #252532;
		
		--text-primary: #ffffff;
		--text-secondary: #a0aec0;
		--text-muted: #6b7280;
		--text-disabled: #4a5568;
		
		--border-color: #2d2d3d;
		--border-light: #252535;
		
		--accent: #4f46e5;
		--accent-light: #7c3aed;
		--accent-dark: #3730a3;
		--accent-glow: rgba(79, 70, 229, 0.3);
		
		--success: #10b981;
		--success-light: rgba(16, 185, 129, 0.15);
		--warning: #f59e0b;
		--warning-light: rgba(245, 158, 11, 0.15);
		--danger: #ef4444;
		--danger-light: rgba(239, 68, 68, 0.15);
		--info: #06b6d4;
		--info-light: rgba(6, 182, 212, 0.15);
		
		--water-color: #0ea5e9;
		--water-light: rgba(14, 165, 233, 0.15);
		--pothole-color: #8b5cf6;
		--pothole-light: rgba(139, 92, 246, 0.15);
		--manhole-color: #f59e0b;
		--manhole-light: rgba(245, 158, 11, 0.15);
		--crack-color: #ef4444;
		--crack-light: rgba(239, 68, 68, 0.15);
		
		--shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.4);
		--shadow-md: 0 4px 12px rgba(0, 0, 0, 0.5);
		--shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.6);
		--shadow-xl: 0 16px 48px rgba(0, 0, 0, 0.7);
		
		--radius-sm: 8px;
		--radius-md: 12px;
		--radius-lg: 16px;
		--radius-xl: 20px;
		--radius-full: 9999px;
		
		--spacing-xs: 4px;
		--spacing-sm: 8px;
		--spacing-md: 12px;
		--spacing-lg: 16px;
		--spacing-xl: 24px;
		--spacing-2xl: 32px;
	}

	/* ==================== 亮色主题 ==================== */
	.page.light-theme {
		--bg-primary: #f8fafc;
		--bg-secondary: #f1f5f9;
		--bg-card: #ffffff;
		--bg-elevated: #ffffff;
		--bg-input: #f8fafc;
		--bg-hover: #f1f5f9;
		
		--text-primary: #1e293b;
		--text-secondary: #475569;
		--text-muted: #94a3b8;
		--text-disabled: #cbd5e1;
		
		--border-color: #e2e8f0;
		--border-light: #f1f5f9;
		
		--accent: #74728b;
		--accent-light: #7c3aed;
		--accent-dark: #3730a3;
		--accent-glow: rgba(79, 70, 229, 0.15);
		
		--success: #10b981;
		--success-light: rgba(16, 185, 129, 0.1);
		--warning: #f59e0b;
		--warning-light: rgba(245, 158, 11, 0.1);
		--danger: #ef4444;
		--danger-light: rgba(239, 68, 68, 0.1);
		--info: #06b6d4;
		--info-light: rgba(6, 182, 212, 0.1);
		
		--water-color: #0ea5e9;
		--water-light: rgba(14, 165, 233, 0.1);
		--pothole-color: #8b5cf6;
		--pothole-light: rgba(139, 92, 246, 0.1);
		--manhole-color: #f59e0b;
		--manhole-light: rgba(245, 158, 11, 0.1);
		--crack-color: #ef4444;
		--crack-light: rgba(239, 68, 68, 0.1);
		
		--shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.04);
		--shadow-md: 0 4px 12px rgba(0, 0, 0, 0.06);
		--shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.08);
		--shadow-xl: 0 16px 48px rgba(0, 0, 0, 0.1);
		
		--radius-sm: 8px;
		--radius-md: 12px;
		--radius-lg: 16px;
		--radius-xl: 20px;
		--radius-full: 9999px;
		
		--spacing-xs: 4px;
		--spacing-sm: 8px;
		--spacing-md: 12px;
		--spacing-lg: 16px;
		--spacing-xl: 24px;
		--spacing-2xl: 32px;
	}

	/* ==================== H5 端 tabBar 主题样式 ==================== */
	:root.dark-theme .uni-tabbar,
	.uni-tabbar {
		background: linear-gradient(180deg, #111118 0%, #0a0a0f 100%) !important;
		border-top: 1px solid #2d2d3d !important;
		box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3) !important;
	}
	:root.dark-theme .uni-tabbar .uni-tabbar-text,
	.uni-tabbar .uni-tabbar-text {
		color: #6b7280 !important;
		font-size: 10px !important;
	}
	:root.dark-theme .uni-tabbar .uni-tabbar-text.active,
	.uni-tabbar .uni-tabbar-text.active {
		color: #4f46e5 !important;
		font-weight: 600 !important;
	}
	:root.light-theme .uni-tabbar {
		background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%) !important;
		border-top: 1px solid #e2e8f0 !important;
		box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.05) !important;
	}
	:root.light-theme .uni-tabbar .uni-tabbar-text {
		color: #6b7280 !important;
		font-size: 10px !important;
	}
	:root.light-theme .uni-tabbar .uni-tabbar-text.active {
		color: #4f46e5 !important;
		font-weight: 600 !important;
	}
</style>