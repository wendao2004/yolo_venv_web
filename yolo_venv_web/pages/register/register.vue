<template>
	<view class="register-container" :style="{ paddingTop: statusBarHeight + 'px' }">
		<view class="bg-decoration">
			<view class="bg-circle bg-circle-1"></view>
			<view class="bg-circle bg-circle-2"></view>
			<view class="bg-circle bg-circle-3"></view>
		</view>
		<view class="register-wrapper">
			<view class="register-header">
				<view class="logo-wrapper">
					<image src="../../static/logo.png" class="logo" mode="aspectFit"></image>
				</view>
				<text class="app-name">道路病害巡检</text>
				<text class="app-slogan">轻量检测 · 跨端告警</text>
			</view>
			<view class="register-card">
				<view class="register-form">
					<view class="form-item">
						<view class="input-group" :class="{ focused: focusedField === 'phone' }">
							<text class="input-icon">📱</text>
							<input 
								v-model="formData.phoneNumber" 
								type="text" 
								placeholder="请输入手机号" 
								class="form-input"
								@focus="focusedField = 'phone'"
								@blur="focusedField = ''"
							/>
						</view>
					</view>
					<view class="form-item">
						<view class="input-group" :class="{ focused: focusedField === 'password' }">
							<text class="input-icon">🔒</text>
							<input 
								v-model="formData.password" 
								type="password" 
								placeholder="请设置密码" 
								class="form-input"
								@focus="focusedField = 'password'"
								@blur="focusedField = ''"
							/>
						</view>
					</view>
					<view class="form-item">
						<view class="input-group" :class="{ focused: focusedField === 'confirmPassword' }">
							<text class="input-icon">🔑</text>
							<input 
								v-model="formData.confirmPassword" 
								type="password" 
								placeholder="请确认密码" 
								class="form-input"
								@focus="focusedField = 'confirmPassword'"
								@blur="focusedField = ''"
							/>
						</view>
					</view>
					<view class="form-button">
						<button @click="handleRegister" class="register-button" :disabled="loading">
							<text v-if="!loading" class="btn-text">注 册</text>
							<view v-else class="btn-loading">
								<view class="spinner"></view>
								<text class="loading-text">注册中...</text>
							</view>
						</button>
					</view>
				</view>
			</view>
			<view class="register-footer">
				<text class="footer-text">已有账号？</text>
				<text class="footer-link" @click="handleLogin">立即登录</text>
			</view>
		</view>
	</view>
</template>

<script setup>
	import {
		ref,
		onMounted
	} from 'vue';
	import {
		onLoad
	} from '@dcloudio/uni-app';
	import {
		globalUser
	} from '../../core/model/use-user-model';
	import md5 from 'js-md5';
	const loading = ref(false);
	const focusedField = ref('');
	const formData = ref({
		phoneNumber: '',
		password: '',
		confirmPassword: ''
	});

	const statusBarHeight = ref(20);

	onLoad((query) => {
		if (query.phoneNumber) {
			formData.value.phoneNumber = decodeURIComponent(query.phoneNumber);
		}
	});

	onMounted(() => {
		initSystemInfo();
	});

	const initSystemInfo = () => {
		statusBarHeight.value = uni.getStorageSync('statusBarHeight') || 20;
	};

	const encryptPassword = (password) => {
		return md5(password);
	};

	const handleRegister = async () => {
		if (!formData.value.phoneNumber.trim()) {
			uni.showToast({
				title: '请输入手机号',
				icon: 'none'
			});
			return;
		}
		if (!globalUser.validatePhoneNumber(formData.value.phoneNumber)) {
			uni.showToast({
				title: '手机号格式不正确',
				icon: 'none'
			});
			return;
		}
		if (!formData.value.password.trim()) {
			uni.showToast({
				title: '请设置密码',
				icon: 'none'
			});
			return;
		}
		if (formData.value.password !== formData.value.confirmPassword) {
			uni.showToast({
				title: '两次输入的密码不一致',
				icon: 'none'
			});
			return;
		}

		loading.value = true;
		try {
			const account = formData.value.phoneNumber;

			const user = await globalUser.register({
				account: account,
				password: formData.value.password,
			});
			console.log('注册成功，用户信息：', user);
			const encryptedPwd = encryptPassword(formData.value.password);
			await globalUser.login({
				account: formData.value.phoneNumber,
				password: encryptedPwd,
			});

			uni.showToast({
				title: '注册成功',
				icon: 'success'
			});
			setTimeout(() => {
				uni.switchTab({
					url: '/pages/index/index'
				});
			}, 1000);
		} catch (error) {
			console.error('注册失败', error);
			const errorMsg = error?.message || '';
			if (errorMsg.includes('已存在')) {
				uni.showToast({
					title: '该手机号已注册',
					icon: 'none'
				});
			} else {
				uni.showToast({
					title: '注册失败，请重试',
					icon: 'none'
				});
			}
		} finally {
			loading.value = false;
		}
	};

	const handleLogin = () => {
		uni.navigateBack();
	};
</script>

<style scoped>
	.register-container {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%);
		position: relative;
		overflow: hidden;
		min-height: 100vh;
	}

	.bg-decoration {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		overflow: hidden;
		pointer-events: none;
	}

	.bg-circle {
		position: absolute;
		border-radius: 50%;
	}

	.bg-circle-1 {
		width: 400rpx;
		height: 400rpx;
		background: rgba(7, 193, 96, 0.08);
		top: -10%;
		left: -10%;
	}

	.bg-circle-2 {
		width: 500rpx;
		height: 500rpx;
		background: rgba(16, 185, 129, 0.06);
		bottom: -15%;
		right: -15%;
	}

	.bg-circle-3 {
		width: 250rpx;
		height: 250rpx;
		background: rgba(52, 211, 153, 0.05);
		top: 40%;
		left: 60%;
	}

	.register-wrapper {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 100%;
		max-width: 480rpx;
		padding: 40rpx 32rpx;
		position: relative;
		z-index: 1;
	}

	.register-header {
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-bottom: 48rpx;
		margin-top: 40rpx;
	}

	.logo-wrapper {
		width: 120rpx;
		height: 120rpx;
		background: rgba(7, 193, 96, 0.1);
		border: 2rpx solid rgba(7, 193, 96, 0.2);
		border-radius: 32rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 24rpx;
	}

	.logo {
		width: 80rpx;
		height: 80rpx;
	}

	.app-name {
		font-size: 40rpx;
		font-weight: 700;
		color: #1e293b;
		margin-bottom: 8rpx;
		letter-spacing: 2rpx;
	}

	.app-slogan {
		font-size: 24rpx;
		color: #64748b;
	}

	.register-card {
		width: 100%;
		background: #fff;
		border-radius: 32rpx;
		padding: 48rpx 40rpx;
		box-shadow: 0 20rpx 60rpx rgba(7, 193, 96, 0.08);
	}

	.register-form {
		display: flex;
		flex-direction: column;
	}

	.form-item {
		margin-bottom: 28rpx;
	}

	.input-group {
		display: flex;
		align-items: center;
		background: #f5f7fa;
		border-radius: 16rpx;
		padding: 0 24rpx;
		height: 88rpx;
		border: 2rpx solid transparent;
	}

	.input-group.focused {
		background: #fff;
		border-color: #07C160;
		box-shadow: 0 0 0 6rpx rgba(7, 193, 96, 0.1);
	}

	.input-icon {
		font-size: 32rpx;
		margin-right: 16rpx;
	}

	.form-input {
		flex: 1;
		height: 100%;
		font-size: 28rpx;
		color: #333;
		background: transparent;
	}

	.form-input::placeholder {
		color: #999;
	}

	.form-button {
		margin-top: 8rpx;
	}

	.register-button {
		width: 100%;
		height: 96rpx;
		background: linear-gradient(135deg, #07C160 0%, #10B981 100%);
		color: #fff;
		font-size: 32rpx;
		font-weight: 600;
		border-radius: 16rpx;
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 8rpx 24rpx rgba(7, 193, 96, 0.4);
	}

	.register-button:active {
		transform: scale(0.98);
		box-shadow: 0 4rpx 12rpx rgba(7, 193, 96, 0.4);
	}

	.register-button:disabled {
		background: linear-gradient(135deg, #ccc 0%, #ddd 100%);
		box-shadow: none;
		transform: none;
	}

	.btn-text {
		letter-spacing: 8rpx;
	}

	.btn-loading {
		display: flex;
		align-items: center;
	}

	.spinner {
		width: 32rpx;
		height: 32rpx;
		border: 3rpx solid rgba(255, 255, 255, 0.3);
		border-top-color: #fff;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
		margin-right: 16rpx;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.loading-text {
		font-size: 28rpx;
	}

	.register-footer {
		display: flex;
		align-items: center;
		margin-top: 48rpx;
		padding-bottom: 40rpx;
	}

	.footer-text {
		font-size: 26rpx;
		color: #64748b;
	}

	.footer-link {
		font-size: 26rpx;
		color: #07C160;
		font-weight: 500;
		margin-left: 8rpx;
	}

	@media screen and (min-width: 768px) {
		.register-wrapper {
			max-width: 520rpx;
			padding: 60rpx 40rpx;
		}

		.register-card {
			padding: 56rpx 48rpx;
		}
	}

	@media screen and (min-width: 1024px) {
		.register-container {
			justify-content: center;
		}

		.register-wrapper {
			max-width: 560rpx;
			padding: 80rpx 40rpx;
		}

		.register-header {
			margin-top: 0;
			margin-bottom: 56rpx;
		}

		.register-card {
			padding: 64rpx 56rpx;
			box-shadow: 0 30rpx 80rpx rgba(7, 193, 96, 0.1);
		}
	}
</style>