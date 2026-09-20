/**
 * @Description:
 * 云函数入口
 * 所有云函数业务入口
 * @author liuzhiheng
 * @createTime 2026-04-27 22:00:00
 * @Copyright by 文刀
 */

import AIService from "./AIService";

export const main = async (event: any) => {
    // 调试日志
    console.log("【index.ts - 完整event对象】", JSON.stringify(event));
    
	
    // uniCloud.callFunction传递的参数直接是event对象
    // 前端调用格式: api.call('ai/diagnose', {...})
    const action = event.action;
    const data = event.data;
    
    console.log("【index.ts - action】", action);
    console.log("【index.ts - data】", JSON.stringify(data));
    
    const aiService = new AIService();
    
    switch (action) {
        case 'ai/diagnose':
            console.log("【index.ts - 开始调用diagnose方法】");
            const result = await aiService.diagnose(data);
            console.log("【index.ts - diagnose结果】", JSON.stringify(result));
            return result;
        default:
            console.log("【index.ts - 接口不存在, action】", action);
            return { code: 404, msg: '接口不存在' };
    }
};
