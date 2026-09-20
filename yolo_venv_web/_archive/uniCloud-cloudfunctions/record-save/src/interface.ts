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

// 保存记录请求接口
export interface ISaveRecordRequest {
	user_id: string;
	product_info: {
		description: string;
		price: string;
	};
	diagnosis_report: {
		conclusion: string;
		total_score: number;
		soul_questions: Array<{
			soulQuestion: string;
			itemFullScore: number;
		}>;
		answers: number[];
		buy_text: string;
		not_buy_text: string;
	};
}

// 获取历史记录请求接口
export interface IGetHistoryRequest {
	user_id: string;
	page?: number;
	page_size?: number;
}

// 获取详情请求接口
export interface IGetDetailRequest {
	user_id: string;
	record_id: string;
}

// 记录服务接口
export interface IRecordService {
	save(data: ISaveRecordRequest): Promise<IApiResult>;
	getHistory(data: IGetHistoryRequest): Promise<IApiResult>;
	getDetail(data: IGetDetailRequest): Promise<IApiResult>;
}
