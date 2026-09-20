/**
 * @Description: 
 * 接口定义
 * @author liuzhiheng
 * @createTime: 2026-05-15 15:11:35
 */

// 统一返回接口
export interface IApiResult<T> {
	code : number
	msg : string
	data : T
}


// 单个题目接口（聚合数据API格式）
export interface JuHeQuestion {
	id?: number | string;
	q: string;
	a: string;
	b: string;
	ia: string;
	ib: string;
}

// 获取题目API返回
export interface JuHeQuestionsResponse {
	reason: string;
	error_code: number;
	result: JuHeQuestion[];
}

// 性格特点
export interface Characteristic {
	title: string;
	desc: string[];
}

// 分析结果（聚合数据API格式）
export interface JuHeAnalysisResult {
	alphabet: string;
	vocabulary: string;
	occupation: string;
	summarize: string[];
	desc: string[];
	characteristic: Characteristic[];
}

// 分析API返回
export interface JuHeAnalysisResponse {
	reason: string;
	error_code: number;
	result: JuHeAnalysisResult;
}

// 统一返回的题目列表格式
export interface QuestionData {
	questions: {
		id: number;
		q: string;
		a: string;
		b: string;
		ia: string;
		ib: string;
	}[];
	total: number;
}

// 统一返回的分析结果格式
export interface AnalysisData {
	alphabet: string;
	vocabulary: string;
	occupation: string;
	summarize: string[];
	desc: string[];
	characteristic: Characteristic[];
}

export interface IGetMbtiData {
	getMbtiData() : Promise<IApiResult<QuestionData>>
	analyzeAnswers(answers: string) : Promise<IApiResult<AnalysisData>>
}