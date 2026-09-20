/** 
  * @Description: 
  * 云函数入口 
  * 所有云函数业务入口 
  * @author liuzhiheng 
  * @createTime 2026-03-17 14:07:37 
  * @Copyright by 文刀 
  */ 

 import AuthService from "./AuthService" 

 exports.main = async (event: any) => { 
     // ====================== 调试日志（关键！） ====================== 
     console.log("【完整event对象】", JSON.stringify(event)); 
     console.log("【event类型】", typeof event); 
     console.log("【event.data】", event ? event.data : "undefined"); 
     console.log("【event.data类型】", event ? typeof event.data : "undefined"); 
     console.log("【event.body】", event ? event.body : "undefined"); 
     console.log("【event.body类型】", event ? typeof event.body : "undefined"); 
     console.log("【event.appId直接访问】", event ? event.appId : "undefined"); 
 	 
 	 
     // 解析参数 - 尝试多种可能的参数结构 
     let params = event; 
     if (event && event.data) { 
         if (typeof event.data === "string") { 
             params = JSON.parse(event.data); 
         } else { 
             params = { ...event, ...event.data }; 
         } 
     } else if (event && event.body) { 
         if (typeof event.body === "string") { 
             params = JSON.parse(event.body); 
         } else { 
             params = { ...event, ...event.body }; 
         } 
     } 
     
     // 打印解析后的参数 
     console.log("【解析后params】", JSON.stringify(params)); 
     console.log("【拿到的appId】", params ? params.appId : "params为空"); 
     console.log("【拿到的action】", params ? params.action : "params为空"); 
     console.log("【拿到的data】", params ? JSON.stringify(params.data) : "params为空"); 
     // ============================================================== 

     const { action, data, appId } = params; 
     
     // 强制校验APPID 
     if (!appId) { 
         console.log("【校验失败】appId为空！"); 
         return { code: 403, msg: "请传入appId" }; 
     } 
     
     const auth = new AuthService(appId); 
     
     switch (action) { 
         case 'auth/login': 
             return await auth.login(data.account, data.password); 
         case 'auth/register': 
             return await auth.register(data.account, data.password); 
         case 'auth/wechatLogin': 
             return await auth.wechatLogin(data); 
         case 'user/stats': 
             return await auth.getUserStats(data.user_id); 
         default: 
             return { code: 404, msg: '接口不存在' }; 
     } 
 }