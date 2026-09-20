/**
 * @Description:
 * 微信登录实现
 * @author liuzhiheng
 * @createTime 2026-03-17 13:42:57
 * @Copyright by 文刀
 */


import BaseService from "./BaseService";
import { IApiResult, IAuth } from "./interface";
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import axios from 'axios';

// MD5加密
function md5(password : string) : string {
	return crypto.createHash('md5').update(password).digest('hex');
}

// 微信小程序配置 - 需要在微信公众平台获取secret
const WX_CONFIG = {
	appid: 'wx4f14d8e492e0bf26',
	secret: '46f6d1c022f758aa9b7daa7e382d93af',
	code2SessionUrl: 'https://api.weixin.qq.com/sns/jscode2session'
};

export default class AuthService extends BaseService implements IAuth {
	private tableName : string
	private jwtSecret : string = 'wendao';

	constructor(appId : string) {
		super()
		this.tableName = `user_${appId}`
	}

	// 调用微信code2Session获取openid
	private async getWechatOpenid(code : string) : Promise<any> {
		if (!WX_CONFIG.secret || WX_CONFIG.secret === '') {
			console.log('微信secret未配置，使用模拟openid');
			return { openid: `OPENID_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` };
		}

		try {
			const url = `${WX_CONFIG.code2SessionUrl}?appid=${WX_CONFIG.appid}&secret=${WX_CONFIG.secret}&js_code=${code}&grant_type=authorization_code`;
			console.log('微信code2Session请求URL:', url);
			const response = await axios.get(url, { timeout: 10000 });
			console.log('微信code2Session响应:', response.data);
			return response.data;
		} catch (error) {
			console.error('调用微信code2Session失败:', error);
			return { errmsg: '网络请求失败' };
		}
	}

	// 微信登录方法
	async wechatLogin(params : any) : Promise<IApiResult> {
		console.log('wechatLogin接收到的params:', JSON.stringify(params));
		
		let code, nickName, avatarUrl, city, signature;
		
		if (params && typeof params === 'object') {
			code = params.code;
			nickName = params.nickName || params.nickname;
			avatarUrl = params.avatarUrl || params.avatar;
			city = params.city;
			signature = params.signature;
		}
		
		console.log('解析后的code:', code);
		console.log('解析后的nickName:', nickName);
		
		if (!code) {
			console.log('code为空，返回错误');
			return this.fail("参数不能为空");
		}
		
		try {
			console.log('微信登录参数:', params);

			const wxResult = await this.getWechatOpenid(code);
			console.log('微信登录结果:', wxResult);

			if (!wxResult.openid) {
				return this.fail(wxResult.errmsg || '微信登录失败');
			}

			const openid = wxResult.openid;
			console.log('获取到openid:', openid);

			const { data } = await this.getDb()
				.collection(this.tableName)
				.where({ openid })
				.get();

			let userInfo;
			if (data.length === 0) {
				const addResult = await this.getDb().collection(this.tableName).add({
					openid,
					nickname: nickName || '微信用户',
					avatar: avatarUrl || '',
					city: city || '',
					signature: signature || '',
					createTime: new Date()
				});

				const { data: newUser } = await this.getDb()
					.collection(this.tableName)
					.doc(addResult.id)
					.get();
				userInfo = newUser[0];
			} else {
				userInfo = data[0];
				if (nickName || avatarUrl) {
					await this.getDb().collection(this.tableName)
						.doc(userInfo._id)
						.update({
							nickname: nickName || userInfo.nickname,
							avatar: avatarUrl || userInfo.avatar,
							city: city || userInfo.city,
							signature: signature || userInfo.signature
						});
				}
			}

			const token = this.generateToken(userInfo);

			return this.success({
				token,
				user_id: userInfo._id,
				user_info: {
					nickname: userInfo.nickname || '微信用户',
					avatar: userInfo.avatar || ''
				}
			}, '登录成功');
		} catch (error) {
			console.error('微信登录失败:', error);
			return this.fail(`登录服务异常: ${error.message}`);
		}
	}

	private generateToken(userInfo : any) : string {
		const payload = {
			userId: userInfo._id,
			account: userInfo.account,
			nickname: userInfo.nickname,
			avatar: userInfo.avatar || '',
			exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7)
		};
		return jwt.sign(payload, this.jwtSecret, { algorithm: 'HS256' });
	}

	async login(account : string, password : string) : Promise<IApiResult> {
		if (!account || !password) return this.fail("账号和密码不能为空");
		try {
			const encryptedPassword = md5(password);

			const { data } = await this.getDb()
				.collection(this.tableName)
				.where({ account, password: encryptedPassword })
				.get();

			if (data.length === 0) {
				return this.fail("账号或密码错误");
			}

			const userInfo = data[0];
			const token = this.generateToken(userInfo);

			return this.success({
				token,
				user_id: userInfo._id,
				user_info: {
					nickname: userInfo.nickname || account,
					avatar: userInfo.avatar || ''
				}
			}, '登录成功');
		} catch (error) {
			console.error('登录失败:', error);
			return this.fail(`登录服务异常: ${error.message}`);
		}
	}

	async register(account : string, password : string) : Promise<IApiResult> {
		if (!account || !password) return this.fail("账号和密码不能为空");
		try {
			const { data } = await this.getDb()
				.collection(this.tableName)
				.where({ account })
				.get();

			if (data.length > 0) {
				return this.fail("账号已存在");
			}

			const encryptedPassword = md5(password);

			const addResult = await this.getDb().collection(this.tableName).add({
				account,
				password: encryptedPassword,
				nickname: account,
				avatar: '',
				createTime: new Date()
			});

			const { data: newUser } = await this.getDb()
				.collection(this.tableName)
				.doc(addResult.id)
				.get();

			const userInfo = newUser[0];
			const token = this.generateToken(userInfo);

			return this.success({
				token,
				user_id: userInfo._id,
				user_info: {
					nickname: userInfo.nickname || account,
					avatar: userInfo.avatar || ''
				}
			}, '注册成功');
		} catch (error) {
			console.error('注册失败:', error);
			return this.fail(`注册服务异常: ${error.message}`);
		}
	}

	async getUserStats(userId : string) : Promise<IApiResult> {
		if (!userId) return this.fail("用户ID不能为空");
		try {
			const { data: records } = await this.getDb()
				.collection('diagnosis_record')
				.where({ user_id: userId })
				.get();

			const totalDiagnoses = records.length;

			let totalSaved = 0;
			records.forEach(record => {
				if (record.diagnosis_report && record.diagnosis_report.conclusion) {
					const conclusion = record.diagnosis_report.conclusion;
					if (conclusion.includes('不建议购买') || conclusion.includes('谨慎购买')) {
						if (record.product_info && record.product_info.price) {
							totalSaved += parseFloat(record.product_info.price) || 0;
						}
					}
				}
			});

			const { data: users } = await this.getDb()
				.collection(this.tableName)
				.doc(userId)
				.get();

			const userInfo = users.length > 0 ? users[0] : null;

			return this.success({
				total_saved: totalSaved.toFixed(2),
				total_diagnoses: totalDiagnoses,
				user_info: userInfo ? {
					nickname: userInfo.nickname || '用户',
					avatar: userInfo.avatar || ''
				} : {
					nickname: '用户',
					avatar: ''
				}
			}, '获取成功');
		} catch (error) {
			console.error('获取用户统计信息失败:', error);
			return this.fail(`获取统计信息异常: ${error.message}`);
		}
	}

}