/**
 * @Description:
 * 云函数入口
 * 所有云函数业务入口
 * @author liuzhiheng
 * @createTime 2026-03-17 14:07:37
 * @Copyright by 文刀
 */


import { MBTIService } from "./MBTIService";
import { UserDataService } from "./UserDataService";
declare var exports : any;
exports.main = async (event : any) => {
	const { action, data, appId, uid } = event;
	if (!appId) return { code: 403, msg: "请传入appId", data: {} };
	
	const mbtiService = new MBTIService();
	const userDataService = new UserDataService();
	
	switch (action) {
		case 'MBTI/list':
			return await mbtiService.getMbtiData();
		case 'MBTI/analysis':
			return await mbtiService.analyzeAnswers(data?.answers || '');
		case 'MBTI/submit':
			return await mbtiService.submitTest(data || {});
		case 'User/getData':
			return await userDataService.getUserData(data?.user_id || '');
		case 'User/saveData':
			return await userDataService.saveUserData(
				data?.user_id || '',
				data?.history || [],
				data?.favorites || []
			);
		case 'User/sync':
			return await userDataService.syncUserData(data || {});
		case 'User/deleteData':
			return await userDataService.deleteUserData(data?.user_id || '');
		case 'Data/sync':
			return await userDataService.syncAll(data?.user_id || '');
		case 'Data/saveHistory':
			return await userDataService.saveHistory(data?.user_id || '', data?.history || []);
		case 'Data/saveFavorites':
			return await userDataService.saveFavorites(data?.user_id || '', data?.favorites || []);
		case 'Data/deleteAll':
			return await userDataService.deleteAllData(data?.user_id || '');
		default:
			return { code: 404, msg: '接口不存在' };
	}
}