var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  main: () => main
});
module.exports = __toCommonJS(index_exports);

// src/BaseService.ts
var BaseService = class {
  // 成功返回
  success(data = {}, msg = "\u64CD\u4F5C\u6210\u529F") {
    return { code: 200, msg, data };
  }
  // 返回失败
  fail(msg = "\u64CD\u4F5C\u5931\u8D25", code = 500) {
    return { code, msg, data: {} };
  }
};

// src/AIService.ts
// ⚠ 密钥不得硬编码：原值已删，改读环境变量。详见 src/AIService.ts 注释。
var ARK_API_KEY = process.env.ARK_API_KEY || "";
var ARK_API_URL = "https://ark.cn-beijing.volces.com/api/v3/responses";
var AIService = class extends BaseService {
  /**
   * 商品冷静期诊断
   * @param data 诊断请求数据
   */
  async diagnose(data) {
    console.log("\u3010AIService.ts - diagnose\u5F00\u59CB\u3011");
    console.log("\u3010AIService.ts - \u63A5\u6536\u5230\u7684data\u3011", JSON.stringify(data));
    if (!data.description || !data.price || !data.reason) {
      console.log("\u3010AIService.ts - \u53C2\u6570\u9A8C\u8BC1\u5931\u8D25\u3011");
      return this.fail("\u53C2\u6570\u4E0D\u80FD\u4E3A\u7A7A");
    }
    try {
      console.log("\u3010AIService.ts - \u5F00\u59CB\u6784\u5EFA\u8BF7\u6C42\u3011");
      const requestBody = {
        model: "ep-20260427210733-cv8c9",
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: '\u4F60\u662F\u4E00\u4E2A\u5546\u54C1\u51B7\u9759\u671F\u8BCA\u65AD\u52A9\u624B\uFF0C\u8D1F\u8D23\u6839\u636E\u7528\u6237\u63D0\u4F9B\u7684\u5546\u54C1\u4FE1\u606F\u751F\u62104\u4E2A\u7075\u9B42\u62F7\u95EE\u95EE\u9898\uFF0C\u6BCF\u4E2A\u95EE\u9898\u6EE1\u520625\u5206\uFF0C\u4EE5\u53CA\u63A8\u8350\u8D2D\u4E70\u3001\u8C28\u614E\u8D2D\u4E70\u548C\u4E0D\u63A8\u8350\u8D2D\u4E70\u7684\u6587\u6848\u3002\u8BF7\u4E25\u683C\u6309\u7167\u4EE5\u4E0BJSON\u683C\u5F0F\u8FD4\u56DE\uFF0C\u4E0D\u8981\u8F93\u51FA\u4EFB\u4F55\u5176\u4ED6\u5185\u5BB9\uFF1A[{"soulQuestion": "\u62F7\u95EE\u95EE\u9898\u5185\u5BB9", "itemFullScore": 25}, {"soulQuestion": "\u62F7\u95EE\u95EE\u9898\u5185\u5BB9", "itemFullScore": 25}, {"soulQuestion": "\u62F7\u95EE\u95EE\u9898\u5185\u5BB9", "itemFullScore": 25}, {"soulQuestion": "\u62F7\u95EE\u95EE\u9898\u5185\u5BB9", "itemFullScore": 25}, {"buyText": "\u63A8\u8350\u8D2D\u4E70\u6587\u6848\uFF0C\u8981\u7ED3\u5408\u7528\u6237\u8F93\u5165\u7684\u5546\u54C1\u4FE1\u606F\u7ED9\u51FA\u5177\u4F53\u5EFA\u8BAE"}, {"carefulText": "\u8C28\u614E\u8D2D\u4E70\u6587\u6848\uFF0C\u8981\u7ED3\u5408\u7528\u6237\u8F93\u5165\u7684\u5546\u54C1\u4FE1\u606F\u7ED9\u51FA\u5177\u4F53\u5EFA\u8BAE"}, {"notBuyText": "\u4E0D\u5EFA\u8BAE\u8D2D\u4E70\u6587\u6848\uFF0C\u8981\u7ED3\u5408\u7528\u6237\u8F93\u5165\u7684\u5546\u54C1\u4FE1\u606F\u7ED9\u51FA\u5177\u4F53\u5EFA\u8BAE"}]'
              }
            ]
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `\u7269\u54C1\u63CF\u8FF0\uFF1A${data.description}\uFF0C\u4EF7\u683C\uFF1A${data.price}\uFF0C\u8D2D\u4E70\u7406\u7531\uFF1A${data.reason}`
              }
            ]
          }
        ]
      };
      console.log("\u3010AIService.ts - \u8BF7\u6C42\u4F53\u3011", JSON.stringify(requestBody));
      console.log("\u3010AIService.ts - \u5F00\u59CB\u53D1\u9001HTTP\u8BF7\u6C42\u3011");
      let responseData;
      try {
        responseData = await this.uniCloudHttpRequest(ARK_API_URL, requestBody);
        console.log("\u3010AIService.ts - ARK API\u54CD\u5E94\u3011", JSON.stringify(responseData));
      } catch (httpError) {
        console.error("\u3010AIService.ts - HTTP\u8BF7\u6C42\u5931\u8D25\uFF0C\u4F7F\u7528\u9ED8\u8BA4\u8BCA\u65AD\u3011", httpError.message);
        return this.success(this.getDefaultDiagnoseResult(), "\u8BCA\u65AD\u6210\u529F\uFF08AI\u670D\u52A1\u6682\u4E0D\u53EF\u7528\uFF09");
      }
      let fullContent = "";
      let actualData = responseData;
      if (responseData.data) {
        actualData = responseData.data;
        console.log("\u3010AIService.ts - \u4F7F\u7528responseData.data\u3011");
      }
      console.log("\u3010AIService.ts - \u68C0\u67E5output\u6570\u7EC4\u3011");
      if (actualData.output && Array.isArray(actualData.output)) {
        console.log("\u3010AIService.ts - output\u6570\u7EC4\u957F\u5EA6\u3011", actualData.output.length);
        for (let i = 0; i < actualData.output.length; i++) {
          const outputItem = actualData.output[i];
          console.log("\u3010AIService.ts - output[" + i + "].type\u3011", outputItem.type);
          if (outputItem.content && Array.isArray(outputItem.content)) {
            console.log("\u3010AIService.ts - output[" + i + "].content\u957F\u5EA6\u3011", outputItem.content.length);
            for (let j = 0; j < outputItem.content.length; j++) {
              const contentItem = outputItem.content[j];
              console.log("\u3010AIService.ts - content[" + j + "].type\u3011", contentItem.type);
              if (contentItem.type === "output_text" && contentItem.text) {
                fullContent = contentItem.text;
                console.log("\u3010AIService.ts - \u627E\u5230output_text\u5185\u5BB9\u3011");
                break;
              }
            }
          }
          if (!fullContent && outputItem.text) {
            fullContent = outputItem.text;
            console.log("\u3010AIService.ts - \u4ECEoutput[" + i + "].text\u63D0\u53D6\u5185\u5BB9\u3011");
          }
          if (fullContent) break;
        }
      }
      if (!fullContent) {
        if (actualData.choices && actualData.choices[0]?.message?.content) {
          fullContent = actualData.choices[0].message.content;
          console.log("\u3010AIService.ts - \u4ECEchoices.message.content\u63D0\u53D6\u5185\u5BB9\u3011");
        } else if (actualData.data && actualData.data[0]?.text) {
          fullContent = actualData.data[0].text;
          console.log("\u3010AIService.ts - \u4ECEdata[0].text\u63D0\u53D6\u5185\u5BB9\u3011");
        } else {
          console.log("\u3010AIService.ts - \u672A\u5339\u914D\u5230\u4EFB\u4F55\u6570\u636E\u7ED3\u6784\u7684key\u3011");
          console.log("\u3010AIService.ts - actualData keys\u3011", Object.keys(actualData));
          if (actualData.output) {
            console.log("\u3010AIService.ts - actualData.output\u7C7B\u578B\u3011", typeof actualData.output, Array.isArray(actualData.output));
            if (Array.isArray(actualData.output)) {
              for (let i = 0; i < actualData.output.length; i++) {
                const outputItem = actualData.output[i];
                console.log("\u3010AIService.ts - output[" + i + "].\u5B8C\u6574\u5185\u5BB9\u3011", JSON.stringify(outputItem));
              }
            }
          }
        }
      }
      console.log("\u3010AIService.ts - AI\u8FD4\u56DE\u5185\u5BB9\u3011", fullContent);
      let diagnoseResult;
      try {
        if (fullContent) {
          console.log("\u3010AIService.ts - \u5C1D\u8BD5\u89E3\u6790JSON\u3011");
          const parsedContent = JSON.parse(fullContent);
          console.log("\u3010AIService.ts - \u89E3\u6790\u6210\u529F\u3011", JSON.stringify(parsedContent));
          diagnoseResult = this.parseDiagnoseResult(parsedContent);
        } else {
          console.log("\u3010AIService.ts - \u5185\u5BB9\u4E3A\u7A7A\uFF0C\u4F7F\u7528\u9ED8\u8BA4\u8BCA\u65AD\u7ED3\u679C\u3011");
          diagnoseResult = this.getDefaultDiagnoseResult();
        }
      } catch (e) {
        console.error("\u3010AIService.ts - \u89E3\u6790AI\u8FD4\u56DE\u5185\u5BB9\u5931\u8D25\uFF0C\u4F7F\u7528\u9ED8\u8BA4\u8BCA\u65AD\u3011", e.message);
        diagnoseResult = this.getDefaultDiagnoseResult();
      }
      console.log("\u3010AIService.ts - \u8FD4\u56DE\u6210\u529F\u7ED3\u679C\u3011", JSON.stringify(diagnoseResult));
      return this.success(diagnoseResult, "\u8BCA\u65AD\u6210\u529F");
    } catch (error) {
      console.error("\u3010AIService.ts - \u8BCA\u65AD\u5F02\u5E38\u3011", error.message);
      return this.fail(`\u8BCA\u65AD\u670D\u52A1\u5F02\u5E38: ${error.message}`);
    }
  }
  /**
   * 使用uniCloud.httpclient发送HTTP POST请求
   */
  uniCloudHttpRequest(url, data) {
    return new Promise((resolve, reject) => {
      console.log("\u3010uniCloudHttpRequest - \u5F00\u59CB\u8BF7\u6C42\u3011", url);
      try {
        const httpClient = uniCloud.httpclient;
        console.log("\u3010uniCloudHttpRequest - httpClient\u83B7\u53D6\u6210\u529F\u3011", typeof httpClient);
        const requestOptions = {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${ARK_API_KEY}`
          },
          data,
          dataType: "json",
          timeout: 3e4
          // 30秒超时
        };
        console.log("\u3010uniCloudHttpRequest - requestOptions\u3011", JSON.stringify(requestOptions));
        httpClient.request(url, requestOptions).then((res) => {
          console.log("\u3010uniCloudHttpRequest - \u54CD\u5E94\u3011", JSON.stringify(res));
          if (res.status === 200) {
            resolve(res.data);
          } else {
            reject(new Error(`HTTP\u9519\u8BEF: ${res.status} - ${res.statusText}`));
          }
        }).catch((err) => {
          console.error("\u3010uniCloudHttpRequest - \u8BF7\u6C42\u5931\u8D25\u3011", err);
          reject(err);
        });
      } catch (e) {
        console.error("\u3010uniCloudHttpRequest - \u540C\u6B65\u5F02\u5E38\u3011", e.message);
        reject(e);
      }
    });
  }
  /**
   * 解析诊断结果
   */
  parseDiagnoseResult(content) {
    const soulQuestions = content.filter((item) => item.soulQuestion && item.itemFullScore);
    const buyTextItem = content.find((item) => item.buyText);
    const carefulTextItem = content.find((item) => item.carefulText);
    const notBuyTextItem = content.find((item) => item.notBuyText);
    return {
      soulQuestions,
      buyText: buyTextItem?.buyText || "\u63A8\u8350\u8D2D\u4E70\u6B64\u5546\u54C1",
      carefulText: carefulTextItem?.carefulText || "\u5EFA\u8BAE\u60A8\u518D\u8003\u8651\u4E00\u4E0B\uFF0C\u786E\u4FDD\u8FD9\u4E2A\u8D2D\u4E70\u662F\u5FC5\u8981\u7684",
      notBuyText: notBuyTextItem?.notBuyText || "\u4E0D\u5EFA\u8BAE\u8D2D\u4E70\u6B64\u5546\u54C1"
    };
  }
  /**
   * 获取默认诊断结果
   */
  getDefaultDiagnoseResult() {
    return {
      soulQuestions: [
        {
          soulQuestion: "\u4F60\u662F\u5426\u771F\u7684\u9700\u8981\u8FD9\u4E2A\u5546\u54C1\uFF1F",
          itemFullScore: 25
        },
        {
          soulQuestion: "\u8FD9\u4E2A\u5546\u54C1\u7684\u4EF7\u683C\u662F\u5426\u5408\u7406\uFF1F",
          itemFullScore: 25
        },
        {
          soulQuestion: "\u8FD9\u4E2A\u5546\u54C1\u7684\u8D28\u91CF\u662F\u5426\u53EF\u9760\uFF1F",
          itemFullScore: 25
        },
        {
          soulQuestion: "\u4F60\u662F\u5426\u6709\u8DB3\u591F\u7684\u9884\u7B97\u8D2D\u4E70\u8FD9\u4E2A\u5546\u54C1\uFF1F",
          itemFullScore: 25
        }
      ],
      buyText: "\u63A8\u8350\u8D2D\u4E70\u6B64\u5546\u54C1",
      carefulText: "\u5EFA\u8BAE\u60A8\u518D\u8003\u8651\u4E00\u4E0B\uFF0C\u786E\u4FDD\u8FD9\u4E2A\u8D2D\u4E70\u662F\u5FC5\u8981\u7684",
      notBuyText: "\u4E0D\u5EFA\u8BAE\u8D2D\u4E70\u6B64\u5546\u54C1"
    };
  }
};

// src/index.ts
var main = async (event) => {
  console.log("\u3010index.ts - \u5B8C\u6574event\u5BF9\u8C61\u3011", JSON.stringify(event));
  const action = event.action;
  const data = event.data;
  console.log("\u3010index.ts - action\u3011", action);
  console.log("\u3010index.ts - data\u3011", JSON.stringify(data));
  const aiService = new AIService();
  switch (action) {
    case "ai/diagnose":
      console.log("\u3010index.ts - \u5F00\u59CB\u8C03\u7528diagnose\u65B9\u6CD5\u3011");
      const result = await aiService.diagnose(data);
      console.log("\u3010index.ts - diagnose\u7ED3\u679C\u3011", JSON.stringify(result));
      return result;
    default:
      console.log("\u3010index.ts - \u63A5\u53E3\u4E0D\u5B58\u5728, action\u3011", action);
      return { code: 404, msg: "\u63A5\u53E3\u4E0D\u5B58\u5728" };
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  main
});
