/**
 * @Description:
 * AI诊断服务
 * @author liuzhiheng
 * @createTime 2026-04-27 22:00:00
 * @Copyright by 文刀
 */

declare var uniCloud: any;
import BaseService from "./BaseService";
import { IApiResult, IDiagnoseRequest, IDiagnoseResult, IAIService } from "./interface";

// ARK API配置
// ⚠ 密钥不得硬编码：这里原来写死了真实的火山引擎 ARK Key，已随 TS→JS 转译产物落盘。
//   现改为读云函数环境变量，需要在 uniCloud 控制台 → 云函数 ai-diagnose →
//   「环境变量」里配置 ARK_API_KEY = <你的 Key>。本地调试可在同目录建 .env 后自行注入，
//   但**不要把 .env 提交进仓库**。
const ARK_API_KEY = process.env.ARK_API_KEY || "";
const ARK_API_URL = "https://ark.cn-beijing.volces.com/api/v3/responses";

/**
 * AI诊断服务类
 */
export default class AIService extends BaseService implements IAIService {
	/**
	 * 商品冷静期诊断
	 * @param data 诊断请求数据
	 */
	async diagnose(data: IDiagnoseRequest): Promise<IApiResult> {
		console.log("【AIService.ts - diagnose开始】");
		console.log("【AIService.ts - 接收到的data】", JSON.stringify(data));
		
		if (!data.description || !data.price || !data.reason) {
			console.log("【AIService.ts - 参数验证失败】");
			return this.fail("参数不能为空");
		}

		try {
			console.log("【AIService.ts - 开始构建请求】");
			// 构建AI请求消息，添加提示词约束返回格式
			const requestBody = {
				model: "ep-20260427210733-cv8c9",
				input: [
					{
						role: "system",
						content: [
							{
								type: "input_text",
								text: "你是一个商品冷静期诊断助手，负责根据用户提供的商品信息生成4个灵魂拷问问题，每个问题满分25分，以及推荐购买、谨慎购买和不推荐购买的文案。请严格按照以下JSON格式返回，不要输出任何其他内容：[{\"soulQuestion\": \"拷问问题内容\", \"itemFullScore\": 25}, {\"soulQuestion\": \"拷问问题内容\", \"itemFullScore\": 25}, {\"soulQuestion\": \"拷问问题内容\", \"itemFullScore\": 25}, {\"soulQuestion\": \"拷问问题内容\", \"itemFullScore\": 25}, {\"buyText\": \"推荐购买文案，要结合用户输入的商品信息给出具体建议\"}, {\"carefulText\": \"谨慎购买文案，要结合用户输入的商品信息给出具体建议\"}, {\"notBuyText\": \"不建议购买文案，要结合用户输入的商品信息给出具体建议\"}]"
							}
						]
					},
					{
						role: "user",
						content: [
							{
								type: "input_text",
								text: `物品描述：${data.description}，价格：${data.price}，购买理由：${data.reason}`
							}
						]
					}
				]
			};
			console.log("【AIService.ts - 请求体】", JSON.stringify(requestBody));

			console.log("【AIService.ts - 开始发送HTTP请求】");
			// 使用uniCloud.httpclient发送请求
			let responseData;
			try {
				responseData = await this.uniCloudHttpRequest(ARK_API_URL, requestBody);
				console.log("【AIService.ts - ARK API响应】", JSON.stringify(responseData));
			} catch (httpError: any) {
				console.error("【AIService.ts - HTTP请求失败，使用默认诊断】", httpError.message);
				// HTTP请求失败，使用默认诊断结果
				return this.success(this.getDefaultDiagnoseResult(), "诊断成功（AI服务暂不可用）");
			}
			
			let fullContent = '';
			
			// 处理 uniCloud.httpclient 返回的格式：{ data: { ... }, status: 200 }
			let actualData = responseData;
			if (responseData.data) {
				actualData = responseData.data;
				console.log("【AIService.ts - 使用responseData.data】");
			}
			
			// 处理响应 - 火山引擎 ARK API 新版返回格式
			console.log("【AIService.ts - 检查output数组】");
			if (actualData.output && Array.isArray(actualData.output)) {
				console.log("【AIService.ts - output数组长度】", actualData.output.length);
				
				// 遍历 output 数组，寻找包含 output_text 的内容
				for (let i = 0; i < actualData.output.length; i++) {
					const outputItem = actualData.output[i];
					console.log("【AIService.ts - output[" + i + "].type】", outputItem.type);
					
					// 检查 content 字段
					if (outputItem.content && Array.isArray(outputItem.content)) {
						console.log("【AIService.ts - output[" + i + "].content长度】", outputItem.content.length);
						for (let j = 0; j < outputItem.content.length; j++) {
							const contentItem = outputItem.content[j];
							console.log("【AIService.ts - content[" + j + "].type】", contentItem.type);
							if (contentItem.type === 'output_text' && contentItem.text) {
								fullContent = contentItem.text;
								console.log("【AIService.ts - 找到output_text内容】");
								break;
							}
						}
					}
					
					// 检查 text 字段
					if (!fullContent && outputItem.text) {
						fullContent = outputItem.text;
						console.log("【AIService.ts - 从output[" + i + "].text提取内容】");
					}
					
					if (fullContent) break;
				}
			}
			
			// 尝试其他格式
			if (!fullContent) {
				if (actualData.choices && actualData.choices[0]?.message?.content) {
					fullContent = actualData.choices[0].message.content;
					console.log("【AIService.ts - 从choices.message.content提取内容】");
				} else if (actualData.data && actualData.data[0]?.text) {
					fullContent = actualData.data[0].text;
					console.log("【AIService.ts - 从data[0].text提取内容】");
				} else {
					console.log("【AIService.ts - 未匹配到任何数据结构的key】");
					console.log("【AIService.ts - actualData keys】", Object.keys(actualData));
					if (actualData.output) {
						console.log("【AIService.ts - actualData.output类型】", typeof actualData.output, Array.isArray(actualData.output));
						if (Array.isArray(actualData.output)) {
							for (let i = 0; i < actualData.output.length; i++) {
								const outputItem = actualData.output[i];
								console.log("【AIService.ts - output[" + i + "].完整内容】", JSON.stringify(outputItem));
							}
						}
					}
				}
			}
			
			console.log("【AIService.ts - AI返回内容】", fullContent);

			// 解析AI返回的内容
			let diagnoseResult: IDiagnoseResult;
			try {
				if (fullContent) {
					console.log("【AIService.ts - 尝试解析JSON】");
					// 尝试解析为JSON数组
					const parsedContent = JSON.parse(fullContent);
					console.log("【AIService.ts - 解析成功】", JSON.stringify(parsedContent));
					diagnoseResult = this.parseDiagnoseResult(parsedContent);
				} else {
					console.log("【AIService.ts - 内容为空，使用默认诊断结果】");
					// 如果内容为空，使用默认诊断结果
					diagnoseResult = this.getDefaultDiagnoseResult();
				}
			} catch (e: any) {
				console.error("【AIService.ts - 解析AI返回内容失败，使用默认诊断】", e.message);
				// 如果解析失败，使用默认诊断结果
				diagnoseResult = this.getDefaultDiagnoseResult();
			}

			console.log("【AIService.ts - 返回成功结果】", JSON.stringify(diagnoseResult));
			return this.success(diagnoseResult, "诊断成功");
		} catch (error: any) {
			console.error("【AIService.ts - 诊断异常】", error.message);
			return this.fail(`诊断服务异常: ${error.message}`);
		}
	}

	/**
	 * 使用uniCloud.httpclient发送HTTP POST请求
	 */
	private uniCloudHttpRequest(url: string, data: any): Promise<any> {
		return new Promise((resolve, reject) => {
			console.log("【uniCloudHttpRequest - 开始请求】", url);
			
			try {
				const httpClient = uniCloud.httpclient;
				console.log("【uniCloudHttpRequest - httpClient获取成功】", typeof httpClient);
				
				const requestOptions = {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${ARK_API_KEY}`
					},
					data: data,
					dataType: 'json',
					timeout: 30000 // 30秒超时
				};
				console.log("【uniCloudHttpRequest - requestOptions】", JSON.stringify(requestOptions));
				
				httpClient.request(url, requestOptions).then((res: any) => {
					console.log("【uniCloudHttpRequest - 响应】", JSON.stringify(res));
					if (res.status === 200) {
						resolve(res.data);
					} else {
						reject(new Error(`HTTP错误: ${res.status} - ${res.statusText}`));
					}
				}).catch((err: any) => {
					console.error("【uniCloudHttpRequest - 请求失败】", err);
					reject(err);
				});
			} catch (e: any) {
				console.error("【uniCloudHttpRequest - 同步异常】", e.message);
				reject(e);
			}
		});
	}

	/**
	 * 解析诊断结果
	 */
	private parseDiagnoseResult(content: any[]): IDiagnoseResult {
		const soulQuestions = content.filter((item: any) => item.soulQuestion && item.itemFullScore);
		const buyTextItem = content.find((item: any) => item.buyText);
		const carefulTextItem = content.find((item: any) => item.carefulText);
		const notBuyTextItem = content.find((item: any) => item.notBuyText);

		return {
			soulQuestions: soulQuestions as any,
			buyText: buyTextItem?.buyText || "推荐购买此商品",
			carefulText: carefulTextItem?.carefulText || "建议您再考虑一下，确保这个购买是必要的",
			notBuyText: notBuyTextItem?.notBuyText || "不建议购买此商品"
		};
	}

	/**
	 * 获取默认诊断结果
	 */
	private getDefaultDiagnoseResult(): IDiagnoseResult {
		return {
			soulQuestions: [
				{
					soulQuestion: "你是否真的需要这个商品？",
					itemFullScore: 25
				},
				{
					soulQuestion: "这个商品的价格是否合理？",
					itemFullScore: 25
				},
				{
					soulQuestion: "这个商品的质量是否可靠？",
					itemFullScore: 25
				},
				{
					soulQuestion: "你是否有足够的预算购买这个商品？",
					itemFullScore: 25
				}
			],
			buyText: "推荐购买此商品",
			carefulText: "建议您再考虑一下，确保这个购买是必要的",
			notBuyText: "不建议购买此商品"
		};
	}
}
