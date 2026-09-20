/**
 * @Description:
 * 后端项目分层
 * Ts接口
 * @author liuzhiheng
 * @createTime 2026-03-17 13:31:47
 * @Copyright by 文刀
 */

// 统一返回接口
export interface IApiResult {
	code : number
	msg : string
	data : any
}


// 微信用户接口
export interface IWechatUser {
	_id ?: string
	openid : string
	nickname : string
	avatar : string
	createTime ?: Date
}


// 认证接口
export interface IAuth {
	// 微信登录
	wechatLogin(code : string) : Promise<IApiResult>
	// 获取用户统计信息
	getUserStats(userId : string) : Promise<IApiResult>
	// 以下方法已废弃
	login?(account : string, password : string) : Promise<IApiResult>
	register?(account : string, password : string) : Promise<IApiResult>
}