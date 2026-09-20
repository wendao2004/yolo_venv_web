/**
 * @Description:
 * 后端项目分层
 * Ts接口
 * @author liuzhiheng
 * @createTime 2026-04-27 22:00:00
 * @Copyright by 文刀
 */

// 统一返回接口
export interface IApiResult {
	code: number;
	msg: string;
	data: any;
}

// AI诊断请求接口
export interface IDiagnoseRequest {
	description: string;
	price: string;
	reason: string;
}

// 诊断问题接口
export interface ISoulQuestion {
	soulQuestion: string;
	itemFullScore: number;
}

// 诊断结果接口
export interface IDiagnoseResult {
	soulQuestions: ISoulQuestion[];
	buyText: string;
	carefulText: string;
	notBuyText: string;
	isRefusal?: boolean;
}

// AI服务接口
export interface IAIService {
	diagnose(data: IDiagnoseRequest): Promise<IApiResult>;
}
