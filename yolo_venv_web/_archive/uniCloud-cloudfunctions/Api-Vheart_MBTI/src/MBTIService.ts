/**
 * @Description: 
 * MBTI数据服务
 * @author liuzhiheng
 * @createTime: 2026-05-15 15:18:02
 */
declare var uniCloud : any;
import BaseService from "./BaseService";
import { 
	IApiResult, 
	IGetMbtiData, 
	QuestionData, 
	AnalysisData,
	JuHeQuestionsResponse,
	JuHeAnalysisResponse,
	JuHeQuestion
} from "./interface";

const apiKey = 'c26cc712d663f986db1d1d28371d16b9';
const questionsUrl = 'https://apis.juhe.cn/fapig/character_test/questions';
const analysisUrl = 'https://apis.juhe.cn/fapig/character_test/analysis';

export class MBTIService extends BaseService implements IGetMbtiData {
	async getMbtiData() : Promise<IApiResult<QuestionData>> {
		try {
			// 1. 优先从数据库读取完整题库集
			const dbQuestionSet = await this.getQuestionSetFromDB();
			
			// 2. 异步调用API获取最新题目（不阻塞返回）
			this.fetchAndUpdateQuestionSet().catch(e => {
				console.error('后台更新数据库失败:', e);
			});
			
			// 3. 如果数据库有题库集，直接返回
			if (dbQuestionSet) {
				console.log('使用数据库缓存的题库集，共', dbQuestionSet.questions.length, '道');
				return this.success({
					questions: dbQuestionSet.questions,
					total: dbQuestionSet.total
				});
			}
			
			// 4. 数据库无数据，同步调用API
			console.log('数据库无题库集，调用API获取题目');
			const apiQuestions = await this.fetchFromAPI();
			
			if (apiQuestions.length > 0) {
				await this.saveQuestionSetToDB(apiQuestions);
				const questions = this.transformQuestions(apiQuestions);
				return this.success({
					questions,
					total: questions.length
				});
			}
			
			// 5. 降级使用mock数据
			console.log('API也失败，使用mock数据');
			return this.success(this.generateMockQuestions());
			
		} catch (error : any) {
			console.error('获取题目失败:', error);
			return this.success(this.generateMockQuestions());
		}
	}
	
	private async fetchAndUpdateQuestionSet(): Promise<void> {
		try {
			const apiQuestions = await this.fetchFromAPI();
			if (apiQuestions.length > 0) {
				await this.saveQuestionSetToDB(apiQuestions);
				await this.recordAPICall();
			}
		} catch (e) {
			console.error('后台更新失败:', e);
		}
	}
	
	private async getQuestionSetFromDB(): Promise<any> {
		try {
			const db = uniCloud.database();
			const result = await db.collection('mbti_questions')
				.orderBy('updated_at', 'desc')
				.limit(1)
				.get();
			
			if (result.data && result.data.length > 0) {
				return result.data[0];
			}
		} catch (e) {
			console.error('从数据库读取题库集失败:', e);
		}
		return null;
	}
	
	private async saveQuestionSetToDB(questions: JuHeQuestion[]): Promise<void> {
		try {
			const db = uniCloud.database();
			const now = Date.now();
			
			const questionSet = {
				set_id: `set_${now}`,
				version: '1.0.0',
				questions: questions.map((q, i) => ({
					id: q.id || i + 1,
					q: q.q,
					a: q.a,
					b: q.b,
					ia: q.ia,
					ib: q.ib
				})),
				total: questions.length,
				created_at: now,
				updated_at: now
			};
			
			await db.collection('mbti_questions').add(questionSet);
			console.log('题库集保存成功:', questionSet.set_id, '共', questionSet.total, '道');
			
		} catch (e) {
			console.error('保存题库集失败:', e);
		}
	}
	
	private async fetchFromAPI(): Promise<JuHeQuestion[]> {
		const requestUrl = `${questionsUrl}?key=${apiKey}&level=senior`;
		console.log('获取题目请求URL:', requestUrl);
		
		const res = await uniCloud.httpclient.request(requestUrl, {
			method: 'GET',
			dataType: 'json',
			timeout: 30000
		});
		
		console.log('获取题目API返回:', JSON.stringify(res.data));
		
		const statusCode = res.statusCode || res.status;
		if (statusCode !== 200) {
			console.error('网络请求失败，statusCode:', statusCode);
			return [];
		}
		
		const data = res.data as JuHeQuestionsResponse;
		
		if (data.error_code !== 0) {
			console.error('获取题目API错误:', data.reason);
			return [];
		}
		
		if (!data.result || data.result.length === 0) {
			console.error('获取题目API返回空数据');
			return [];
		}
		
		const firstItem = data.result[0];
		if (!firstItem || !firstItem.q || !firstItem.a || !firstItem.b) {
			console.error('获取题目API返回的数据字段为空');
			return [];
		}
		
		return data.result;
	}
	
	
	
	private async recordAPICall(): Promise<void> {
		try {
			const db = uniCloud.database();
			const result = await db.collection('mbti_config')
				.where({ key: 'api_call_count' }).get();
			
			if (result.data.length > 0) {
				const count = parseInt(result.data[0].value) || 0;
				await db.collection('mbti_config')
					.doc(result.data[0]._id)
					.update({ value: String(count + 1), updatedAt: Date.now() });
			} else {
				await db.collection('mbti_config').add({
					key: 'api_call_count',
					value: '1',
					updatedAt: Date.now()
				});
			}
		} catch (e) {
			console.error('记录API调用次数失败:', e);
		}
	}
	
	private transformQuestions(questions: JuHeQuestion[]): any[] {
		return questions.map((item, index) => ({
			id: item.id || index + 1,
			q: item.q || `题目 ${index + 1}`,
			a: item.a || '选项A',
			b: item.b || '选项B',
			ia: item.ia || '',
			ib: item.ib || ''
		}));
	}
	
	async analyzeAnswers(answers: string) : Promise<IApiResult<AnalysisData>> {
		try {
			console.log('提交答案:', answers);
			
			const requestUrl = `${analysisUrl}?key=${apiKey}&answers=${encodeURIComponent(answers)}`;
			console.log('分析请求URL:', requestUrl);
			
			const res = await uniCloud.httpclient.request(requestUrl, {
				method: 'GET',
				dataType: 'json',
				timeout: 30000
			});
			
			console.log('分析API返回:', JSON.stringify(res.data));
			
			const statusCode = res.statusCode || res.status;
			if (statusCode !== 200) {
				console.error('网络请求失败，statusCode:', statusCode);
				return this.fail('网络请求失败');
			}
			
			const data = res.data as JuHeAnalysisResponse;
			
			if (data.error_code !== 0) {
				console.error('分析API错误:', data.reason);
				return this.fail(data.reason || '分析失败');
			}
			
			return this.success({
				alphabet: data.result.alphabet,
				vocabulary: data.result.vocabulary,
				occupation: data.result.occupation,
				summarize: data.result.summarize || [],
				desc: data.result.desc || [],
				characteristic: data.result.characteristic || []
			});
			
		} catch (error : any) {
			console.error('分析失败:', error);
			return this.fail('分析失败，请稍后重试');
		}
	}
	
	private generateMockQuestions(): QuestionData {
		return {
			questions: [
				{ id: 1, q: '处理许多事情上，你会喜欢', a: '凭兴所至行事', b: '按照计划行事', ia: 'prqJ', ib: 'Awzo' },
				{ id: 2, q: '当你要在一个星期内完成一个大项目，你在开始时候会', a: '把要做的工作依次列出', b: '马上动工', ia: '6l7h', ib: 'PjOx' },
				{ id: 3, q: '下面每一对词语中，哪个词语更合你心意', a: '事实', b: '意念', ia: 'ZNYs', ib: 'ycx8' },
				{ id: 4, q: '在一大群人中，通常是', a: '你介绍大家认识', b: '别人介绍你', ia: 'YeZd', ib: 'jLiA' },
				{ id: 5, q: '下面每一对词语中，哪个词语更合你心意', a: '客观的', b: '热情的', ia: 'EnDx', ib: 'ckbg' },
				{ id: 6, q: '要作决定时，你认为比较重要的是', a: '据事实衡量', b: '考虑他人的感受和意见', ia: 'LwMS', ib: 'cgbk' },
				{ id: 7, q: '总的说来，要做一个大型作业时，你会选', a: '边做边想该做什么', b: '首先把工作按步细分', ia: 'NgMu', ib: 'LAMI' },
				{ id: 8, q: '下面每一对词语中，哪个词语更合你心意', a: '富想象的', b: '以事论事', ia: '9Z8R', ib: '6N86' },
				{ id: 9, q: '你认为别人一般', a: '需花很多时间才认识你', b: '用很短时间便认识你', ia: 'atbm', ib: 'KRJS' },
				{ id: 10, q: '哪一个答案最贴切描绘你一般的感受或行为', a: '仁慈慷慨的', b: '意志坚定的', ia: '6l7t', ib: 'J1Ib' },
				{ id: 11, q: '要做许多人也做的事，你比较喜欢', a: '按照一般认可的方法做', b: '构想一个自己的想法', ia: 'WnXC', ib: 'GuFm' },
				{ id: 12, q: '在社交聚会上，你会', a: '是说话很多的一个', b: '让别人多说话', ia: 'qkpn', ib: 'GKFB' }
			],
			total: 12
		};
	}
	
	async submitTest(params: {
		answers: string[];
		questions: any[];
		questionSetId: string;
	}): Promise<IApiResult<AnalysisData>> {
		try {
			const { answers, questions, questionSetId } = params;
			const answerKey = answers.join('+');
			
			console.log('提交测试，答案数量:', answers.length, '题库ID:', questionSetId);
			
			// 第一优先级：API直接分析（仅4题或12题）
			if (answers.length === 4 || answers.length === 12) {
				console.log('题目数量符合API要求，尝试调用API');
				const apiResult = await this.analyzeAnswers(answers.join(','));
				
				if (apiResult.code === 200 && apiResult.data) {
					console.log('API分析成功，收集用户数据');
					await this.collectUserSubmission(questions, answers, answerKey, questionSetId, apiResult.data);
					return this.success(apiResult.data);
				} else {
					console.log('API分析失败:', apiResult.msg);
				}
			} else {
				console.log('题目数量不符合API要求（需4或12题），跳过API调用');
			}
			
			// 第二优先级：查询本地答案映射表
			console.log('查询本地答案映射表');
			const mappingResult = await this.findAnswerMapping(answerKey);
			
			if (mappingResult) {
				console.log('本地答案映射表命中');
				return this.success({
					alphabet: mappingResult.alphabet,
					vocabulary: mappingResult.vocabulary,
					occupation: mappingResult.occupation,
					summarize: typeof mappingResult.summarize === 'string' ? JSON.parse(mappingResult.summarize) : (mappingResult.summarize || []),
					desc: typeof mappingResult.desc === 'string' ? JSON.parse(mappingResult.desc) : (mappingResult.desc || []),
					characteristic: typeof mappingResult.characteristic === 'string' ? JSON.parse(mappingResult.characteristic) : (mappingResult.characteristic || [])
				});
			}
			
			// 第三优先级：降级处理
			console.log('本地映射表无匹配，返回降级结果');
			return this.success(this.getFallbackResult(answerKey));
			
		} catch (error: any) {
			console.error('提交测试失败:', error);
			return this.fail('提交失败，请稍后重试');
		}
	}
	
	private async collectUserSubmission(
		questions: any[],
		answers: string[],
		answerKey: string,
		questionSetId: string,
		apiResult: AnalysisData
	): Promise<void> {
		try {
			const db = uniCloud.database();
			
			// 检查是否已存在相同答案组合
			const exists = await db.collection('mbti_user_submissions')
				.where({ answer_key: answerKey })
				.count();
			
			if (exists.total === 0) {
				// 收集用户数据（脱敏处理）
				await db.collection('mbti_user_submissions').add({
					question_set_id: questionSetId,
					questions: questions.map((q: any) => ({
						id: q.id,
						q: q.q,
						a: q.a,
						b: q.b,
						ia: q.ia,
						ib: q.ib
					})),
					answers: answers,
					answer_key: answerKey,
					api_result: apiResult,
					created_at: Date.now()
				});
				
				console.log('用户数据收集成功');
				
				// 同时更新答案映射表
				await this.updateAnswerMapping(answerKey, answers, apiResult);
			}
		} catch (e) {
			console.error('收集用户数据失败:', e);
		}
	}
	
	private async findAnswerMapping(answerKey: string): Promise<any> {
		try {
			const db = uniCloud.database();
			const result = await db.collection('mbti_answer_mapping')
				.where({ answer_key: answerKey })
				.get();
			
			if (result.data && result.data.length > 0) {
				const mapping = result.data[0];
				
				// 增加使用次数
				await db.collection('mbti_answer_mapping')
					.doc(mapping._id)
					.update({ usage_count: (mapping.usage_count || 0) + 1 });
				
				return mapping;
			}
		} catch (e) {
			console.error('查询答案映射表失败:', e);
		}
		return null;
	}
	
	private async updateAnswerMapping(
		answerKey: string,
		answers: string[],
		apiResult: AnalysisData
	): Promise<void> {
		try {
			const db = uniCloud.database();
			
			// 检查是否已存在
			const exists = await db.collection('mbti_answer_mapping')
				.where({ answer_key: answerKey })
				.count();
			
			if (exists.total === 0) {
				await db.collection('mbti_answer_mapping').add({
					question_set_id: 'preset_12',
					answer_key: answerKey,
					answers: answers.join(','),
					alphabet: apiResult.alphabet,
					vocabulary: apiResult.vocabulary,
					occupation: apiResult.occupation,
					summarize: apiResult.summarize,
					desc: apiResult.desc,
					characteristic: apiResult.characteristic,
					usage_count: 1,
					created_at: Date.now(),
					updated_at: Date.now()
				});
				
				console.log('答案映射表更新成功');
			}
		} catch (e) {
			console.error('更新答案映射表失败:', e);
		}
	}
	
	private getFallbackResult(answerKey: string): AnalysisData {
		return {
			alphabet: '分析中',
			vocabulary: '待确定',
			occupation: '系统正在学习此答案组合',
			summarize: ['答案组合未收录，请稍后再试', '感谢您的参与'],
			desc: ['我们正在收集更多数据来完善分析'],
			characteristic: [
				{ title: '数据收集中', desc: ['系统正在学习此答案组合'] }
			]
		};
	}
}