/**
 * @Description:
 * 登录 + 注册，实现 TS 接口
 * @author liuzhiheng
 * @createTime 2026-03-17 13:42:57
 * @Copyright by 文刀
 */


import BaseService from "./BaseService";
import { IApiResult, IAuth } from "./interface";

export default class AuthService extends BaseService implements IAuth {
	private tableName : string

	constructor(appId : string) {
		super()
		this.tableName = `user_${appId}`
	}

	private encryptPassword(password : string) {
		return require('crypto').createHash('md5').update(password).digest('hex');
	}

	async login(account : string, password : string) : Promise<IApiResult> {
		if (!account || !password) return this.fail("参数不能为空");
		try {
			const encryptPwd = this.encryptPassword(password);
			const { data } = await this.getDb()
				.collection(this.tableName)
				.where({ account, password: encryptPwd })
				.get()

			if (data.length === 0) {
				return this.fail("账号或密码错误")
			}

			const token = `TOKEN_${data[0]._id}_${Date.now()}`;
			return this.success({
				token,
				user_id: data[0]._id,
				user_info: {
					nickname: data[0].nickname || data[0].account || '用户',
					avatar: data[0].avatar || ''
				}
			}, '登录成功')
		} catch (error) {
			return this.fail("登录服务异常")
		}
	}

	async register(account : string, password : string) : Promise<IApiResult> {
		if (!account || !password) return this.fail("参数不能为空");
		try {
			const encryptPwd = this.encryptPassword(password);
			const { data } = await this.getDb().collection(this.tableName).where({ account }).get();
			if (data.length) return this.fail("账号已存在");
			await this.getDb().collection(this.tableName).add({
				account, password: encryptPwd, nickname: account, createTime: new Date()
			});
			return this.success({}, "注册成功");
		} catch (e:any) {
			console.error('注册逻辑报错详情:', e);
			return { code: 500, msg: e.message || '注册服务异常', data: {} };
		}
	}

}