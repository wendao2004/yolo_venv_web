/**
 * @Description:
 * 云函数入口
 * 所有云函数业务入口
 * @author liuzhiheng
 * @createTime 2026-04-27 22:00:00
 * @Copyright by 文刀
 */

import RecordService from "./RecordService";

export const main = async (event: any) => {
    // 调试日志
    console.log("【完整event对象】", JSON.stringify(event));


    // uniCloud.callFunction传递的参数直接是event对象
    // 前端调用格式: api.call('record-save', { action: 'record/save', data: {...} })
    const action = event.action;
    const data = event.data;
    
    console.log("【action】", action);
    console.log("【data】", JSON.stringify(data));
    
    const recordService = new RecordService();
	
    switch (action) {
        case 'record/save':
            return await recordService.save(data);
        case 'record/list':
            return await recordService.getHistory(data);
        case 'record/detail':
            return await recordService.getDetail(data);
        default:
            return { code: 404, msg: '接口不存在' };
    }
};
