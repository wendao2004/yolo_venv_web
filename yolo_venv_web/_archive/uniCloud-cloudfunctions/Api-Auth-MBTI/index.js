// src/BaseService.ts
var db = uniCloud.database();
var BaseService = class {
  // 成功返回
  success(data = {}, msg = "\u64CD\u4F5C\u6210\u529F") {
    return { code: 200, msg, data };
  }
  // 返回失败
  fail(msg = "\u64CD\u4F5C\u5931\u8D25", code = 500) {
    return { code, msg, data: {} };
  }
  // 获取数据库
  getDb() {
    return db;
  }
};

// src/AuthService.ts
var AuthService = class extends BaseService {
  constructor(appId) {
    super();
    this.tableName = `user_${appId}`;
  }
  encryptPassword(password) {
    return require("crypto").createHash("md5").update(password).digest("hex");
  }
  async login(account, password) {
    if (!account || !password) return this.fail("\u53C2\u6570\u4E0D\u80FD\u4E3A\u7A7A");
    try {
      const encryptPwd = this.encryptPassword(password);
      const { data } = await this.getDb().collection(this.tableName).where({ account, password: encryptPwd }).get();
      if (data.length === 0) {
        return this.fail("\u8D26\u53F7\u6216\u5BC6\u7801\u9519\u8BEF");
      }
      const token = `TOKEN_${data[0]._id}_${Date.now()}`;
      return this.success({
        token,
        user_id: data[0]._id,
        user_info: {
          nickname: data[0].nickname || data[0].account || "\u7528\u6237",
          avatar: data[0].avatar || ""
        }
      }, "\u767B\u5F55\u6210\u529F");
    } catch (error) {
      return this.fail("\u767B\u5F55\u670D\u52A1\u5F02\u5E38");
    }
  }
  async register(account, password) {
    if (!account || !password) return this.fail("\u53C2\u6570\u4E0D\u80FD\u4E3A\u7A7A");
    try {
      const encryptPwd = this.encryptPassword(password);
      const { data } = await this.getDb().collection(this.tableName).where({ account }).get();
      if (data.length) return this.fail("\u8D26\u53F7\u5DF2\u5B58\u5728");
      await this.getDb().collection(this.tableName).add({
        account,
        password: encryptPwd,
        nickname: account,
        createTime: /* @__PURE__ */ new Date()
      });
      return this.success({}, "\u6CE8\u518C\u6210\u529F");
    } catch (e) {
      console.error("\u6CE8\u518C\u903B\u8F91\u62A5\u9519\u8BE6\u60C5:", e);
      return { code: 500, msg: e.message || "\u6CE8\u518C\u670D\u52A1\u5F02\u5E38", data: {} };
    }
  }
};

// src/index.ts
exports.main = async (event) => {
  console.log("\u3010\u5B8C\u6574event\u5BF9\u8C61\u3011", JSON.stringify(event));
  console.log("\u3010event.body\u3011", event.body);
  let params = event;
  if (event.body) {
    params = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
  }
  console.log("\u3010\u89E3\u6790\u540Eparams\u3011", JSON.stringify(params));
  console.log("\u3010\u62FF\u5230\u7684appId\u3011", params.appId);
  const { action, data, appId } = params;
  const auth = new AuthService(appId);
  if (!appId) {
    console.log("\u3010\u6821\u9A8C\u5931\u8D25\u3011appId\u4E3A\u7A7A\uFF01");
    return { code: 403, msg: "\u8BF7\u4F20\u5165appId" };
  }
  switch (action) {
    case "auth/login":
      return await auth.login(data.account, data.password);
    case "auth/register":
      return await auth.register(data.account, data.password);
    default:
      return { code: 404, msg: "\u63A5\u53E3\u4E0D\u5B58\u5728" };
  }
};
