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
  // 获取数据库实例
  getDb() {
    return uniCloud.database();
  }
};

// src/RecordService.ts
var RecordService = class extends BaseService {
  constructor() {
    super(...arguments);
    // 表名
    this.tableName = "diagnosis_record";
  }
  /**
   * 保存诊断记录
   * @param data 保存请求数据
   */
  async save(data) {
    if (!data.user_id) {
      return this.fail("\u7528\u6237ID\u4E0D\u80FD\u4E3A\u7A7A");
    }
    try {
      const recordData = {
        user_id: data.user_id,
        product_info: data.product_info,
        diagnosis_report: data.diagnosis_report,
        create_time: /* @__PURE__ */ new Date(),
        status: "completed"
      };
      const addResult = await this.getDb().collection(this.tableName).add(recordData);
      return this.success({
        record_id: addResult.id
      }, "\u4FDD\u5B58\u6210\u529F");
    } catch (error) {
      console.error("\u4FDD\u5B58\u8BB0\u5F55\u5931\u8D25:", error);
      return this.fail(`\u4FDD\u5B58\u670D\u52A1\u5F02\u5E38: ${error.message}`);
    }
  }
  /**
   * 获取用户诊断历史记录（包含完整详情）
   * @param data 请求数据
   */
  async getHistory(data) {
    if (!data.user_id) {
      return this.fail("\u7528\u6237ID\u4E0D\u80FD\u4E3A\u7A7A");
    }
    try {
      const page = data.page || 1;
      const pageSize = data.page_size || 100;
      const skip = (page - 1) * pageSize;
      const { data: records, total } = await this.getDb().collection(this.tableName).where({ user_id: data.user_id }).orderBy("create_time", "desc").skip(skip).limit(pageSize).get();
      const formattedRecords = records.map((record) => {
        const conclusion = record.diagnosis_report?.conclusion || "\u672A\u77E5";
        const price = record.product_info?.price;
        const shouldIntercept = conclusion.includes("\u4E0D\u5EFA\u8BAE\u8D2D\u4E70") || conclusion.includes("\u8C28\u614E\u8D2D\u4E70");
        return {
          record_id: record._id,
          product_info: {
            name: record.product_info?.description || "\u8BCA\u65AD\u5546\u54C1",
            price: price || "0",
            image: record.product_info?.image || ""
          },
          conclusion,
          diagnosis_time: record.create_time,
          intercept_amount: shouldIntercept && price && price !== "" ? price : null,
          // 包含完整详情
          analysis: {
            need_diagnosis: record.diagnosis_report?.buy_text || "",
            value_evaluation: record.diagnosis_report?.not_buy_text || "",
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
        total,
        page,
        page_size: pageSize
      }, "\u83B7\u53D6\u6210\u529F");
    } catch (error) {
      console.error("\u83B7\u53D6\u5386\u53F2\u8BB0\u5F55\u5931\u8D25:", error);
      return this.fail(`\u83B7\u53D6\u5386\u53F2\u8BB0\u5F55\u5F02\u5E38: ${error.message}`);
    }
  }
  /**
   * 获取诊断记录详情
   * @param data 请求数据
   */
  async getDetail(data) {
    if (!data.user_id) {
      return this.fail("\u7528\u6237ID\u4E0D\u80FD\u4E3A\u7A7A");
    }
    if (!data.record_id) {
      return this.fail("\u8BB0\u5F55ID\u4E0D\u80FD\u4E3A\u7A7A");
    }
    try {
      const { data: records } = await this.getDb().collection(this.tableName).doc(data.record_id).get();
      if (records.length === 0) {
        return this.fail("\u8BB0\u5F55\u4E0D\u5B58\u5728");
      }
      const record = records[0];
      if (record.user_id !== data.user_id) {
        return this.fail("\u65E0\u6743\u8BBF\u95EE\u6B64\u8BB0\u5F55");
      }
      const result = {
        record_id: record._id,
        product_info: {
          name: record.product_info?.description || "\u8BCA\u65AD\u5546\u54C1",
          price: record.product_info?.price || "0",
          image: record.product_info?.image || ""
        },
        diagnosis_time: record.create_time,
        conclusion: record.diagnosis_report?.conclusion || "\u672A\u77E5",
        intercept_amount: record.diagnosis_report?.conclusion?.includes("\u4E0D\u5EFA\u8BAE\u8D2D\u4E70") || record.diagnosis_report?.conclusion?.includes("\u8C28\u614E\u8D2D\u4E70") ? record.product_info?.price : null,
        analysis: {
          need_diagnosis: record.diagnosis_report?.buy_text || "",
          value_evaluation: record.diagnosis_report?.not_buy_text || "",
          alternatives: []
        }
      };
      return this.success(result, "\u83B7\u53D6\u6210\u529F");
    } catch (error) {
      console.error("\u83B7\u53D6\u8BB0\u5F55\u8BE6\u60C5\u5931\u8D25:", error);
      return this.fail(`\u83B7\u53D6\u8BB0\u5F55\u8BE6\u60C5\u5F02\u5E38: ${error.message}`);
    }
  }
};

// src/index.ts
var main = async (event) => {
  console.log("\u3010\u5B8C\u6574event\u5BF9\u8C61\u3011", JSON.stringify(event));
  const action = event.action;
  const data = event.data;
  console.log("\u3010action\u3011", action);
  console.log("\u3010data\u3011", JSON.stringify(data));
  const recordService = new RecordService();
  switch (action) {
    case "record/save":
      return await recordService.save(data);
    case "record/list":
      return await recordService.getHistory(data);
    case "record/detail":
      return await recordService.getDetail(data);
    default:
      return { code: 404, msg: "\u63A5\u53E3\u4E0D\u5B58\u5728" };
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  main
});
