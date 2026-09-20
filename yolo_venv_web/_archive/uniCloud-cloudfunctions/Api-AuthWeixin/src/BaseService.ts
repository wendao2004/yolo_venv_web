/**
 * @Description:
 * 基类
 * @author liuzhiheng
 * @createTime 2026-03-17 13:37:15
 * @Copyright by 文刀
 */
declare var uniCloud : any;
import { IApiResult } from "./interface";


export default class BaseService {
	private db: any;
	
	// 构造函数
	constructor() {
		this.db = uniCloud.database();
	}
	
	// 成功返回
	protected success(data : any = {}, msg = '操作成功') : IApiResult {
		return { code: 200, msg, data }
	}
	// 返回失败
	protected fail(msg = "操作失败", code = 500) : IApiResult {
		return { code, msg, data: {} }
	}
	// 获取数据库
	protected getDb() {
		try {
			if (!this.db) {
				this.db = uniCloud.database();
			}
			return this.db;
		} catch (error) {
			console.error('获取数据库失败:', error);
			throw new Error('数据库连接失败');
		}
	}
}