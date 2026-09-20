/**
 * @Description:
 * 记录服务
 * @author liuzhiheng
 * @createTime 2026-04-27 22:00:00
 * @Copyright by 文刀
 */

import BaseService from "./BaseService";
import { IApiResult, ISaveRecordRequest, IRecordService, IGetHistoryRequest, IGetDetailRequest } from "./interface";

/**
 * 记录服务类
 */
export default class RecordService extends BaseService implements IRecordService {
	// 表名
	private tableName = 'diagnosis_record';

	/**
	 * 保存诊断记录
	 * @param data 保存请求数据
	 */
	async save(data: ISaveRecordRequest): Promise<IApiResult> {
		if (!data.user_id) {
			return this.fail("用户ID不能为空");
		}

		try {
			// 构建记录数据
			const recordData = {
				user_id: data.user_id,
				product_info: data.product_info,
				diagnosis_report: data.diagnosis_report,
				create_time: new Date(),
				status: 'completed'
			};

			// 保存到数据库
			const addResult = await this.getDb().collection(this.tableName).add(recordData);

			return this.success({
				record_id: addResult.id
			}, '保存成功');
		} catch (error: any) {
			console.error('保存记录失败:', error);
			return this.fail(`保存服务异常: ${error.message}`);
		}
	}

	/**
	 * 获取用户诊断历史记录（包含完整详情）
	 * @param data 请求数据
	 */
	async getHistory(data: IGetHistoryRequest): Promise<IApiResult> {
		if (!data.user_id) {
			return this.fail("用户ID不能为空");
		}

		try {
			const page = data.page || 1;
			const pageSize = data.page_size || 100; // 默认获取100条（足够大部分用户）
			const skip = (page - 1) * pageSize;

			// 查询用户的诊断记录（包含完整详情）
			const { data: records, total } = await this.getDb()
				.collection(this.tableName)
				.where({ user_id: data.user_id })
				.orderBy('create_time', 'desc')
				.skip(skip)
				.limit(pageSize)
				.get();

			// 转换记录格式（包含完整详情）
			const formattedRecords = records.map(record => {
				const conclusion = record.diagnosis_report?.conclusion || '未知';
				const price = record.product_info?.price;
				const shouldIntercept = conclusion.includes('不建议购买') || conclusion.includes('谨慎购买');
				
				return {
					record_id: record._id,
					product_info: {
						name: record.product_info?.description || '诊断商品',
						price: price || '0',
						image: record.product_info?.image || ''
					},
					conclusion: conclusion,
					diagnosis_time: record.create_time,
					intercept_amount: shouldIntercept && price && price !== '' ? price : null,
					// 包含完整详情
					analysis: {
						need_diagnosis: record.diagnosis_report?.buy_text || '',
						value_evaluation: record.diagnosis_report?.not_buy_text || '',
						alternatives: []
					},
					// 包含灵魂问题和答案（用于详情页展示）
					soul_questions: record.diagnosis_report?.soul_questions || [],
					answers: record.diagnosis_report?.answers || [],
					total_score: record.diagnosis_report?.total_score || 0
				};
			});

			return this.success({
				records: formattedRecords,
				total: total,
				page: page,
				page_size: pageSize
			}, '获取成功');
		} catch (error: any) {
			console.error('获取历史记录失败:', error);
			return this.fail(`获取历史记录异常: ${error.message}`);
		}
	}

	/**
	 * 获取诊断记录详情
	 * @param data 请求数据
	 */
	async getDetail(data: IGetDetailRequest): Promise<IApiResult> {
		if (!data.user_id) {
			return this.fail("用户ID不能为空");
		}
		if (!data.record_id) {
			return this.fail("记录ID不能为空");
		}

		try {
			// 查询单条记录 - 使用doc方法按_id查询
			const { data: records } = await this.getDb()
				.collection(this.tableName)
				.doc(data.record_id)
				.get();

			if (records.length === 0) {
				return this.fail("记录不存在");
			}

			const record = records[0];

			// 验证用户权限
			if (record.user_id !== data.user_id) {
				return this.fail("无权访问此记录");
			}

			// 构造返回数据 - 字段映射：存储用description，前端用name
			const result = {
				record_id: record._id,
				product_info: {
					name: record.product_info?.description || '诊断商品',
					price: record.product_info?.price || '0',
					image: record.product_info?.image || ''
				},
				diagnosis_time: record.create_time,
				conclusion: record.diagnosis_report?.conclusion || '未知',
				intercept_amount: (record.diagnosis_report?.conclusion?.includes('不建议购买') || record.diagnosis_report?.conclusion?.includes('谨慎购买'))
					? record.product_info?.price
					: null,
				analysis: {
					need_diagnosis: record.diagnosis_report?.buy_text || '',
					value_evaluation: record.diagnosis_report?.not_buy_text || '',
					alternatives: []
				}
			};

			return this.success(result, '获取成功');
		} catch (error: any) {
			console.error('获取记录详情失败:', error);
			return this.fail(`获取记录详情异常: ${error.message}`);
		}
	}
}
