// src/BaseService.ts
var db = uniCloud.database();
var BaseService = class {
  // 成功返回
  success(data, msg = "\u64CD\u4F5C\u6210\u529F") {
    return { code: 200, msg, data };
  }
  // 返回失败
  fail(msg = "\u64CD\u4F5C\u5931\u8D25", code = 500) {
    return { code, msg, data: void 0 };
  }
  // 获取数据库
  getDb() {
    return db;
  }
};

// src/MBTIService.ts
var apiKey = "c26cc712d663f986db1d1d28371d16b9";
var questionsUrl = "https://apis.juhe.cn/fapig/character_test/questions";
var analysisUrl = "https://apis.juhe.cn/fapig/character_test/analysis";
var MBTIService = class extends BaseService {
  async getMbtiData() {
    try {
      const dbQuestionSet = await this.getQuestionSetFromDB();
      this.fetchAndUpdateQuestionSet().catch((e) => {
        console.error("\u540E\u53F0\u66F4\u65B0\u6570\u636E\u5E93\u5931\u8D25:", e);
      });
      if (dbQuestionSet) {
        console.log("\u4F7F\u7528\u6570\u636E\u5E93\u7F13\u5B58\u7684\u9898\u5E93\u96C6\uFF0C\u5171", dbQuestionSet.questions.length, "\u9053");
        return this.success({
          questions: dbQuestionSet.questions,
          total: dbQuestionSet.total
        });
      }
      console.log("\u6570\u636E\u5E93\u65E0\u9898\u5E93\u96C6\uFF0C\u8C03\u7528API\u83B7\u53D6\u9898\u76EE");
      const apiQuestions = await this.fetchFromAPI();
      if (apiQuestions.length > 0) {
        await this.saveQuestionSetToDB(apiQuestions);
        const questions = this.transformQuestions(apiQuestions);
        return this.success({
          questions,
          total: questions.length
        });
      }
      console.log("API\u4E5F\u5931\u8D25\uFF0C\u4F7F\u7528mock\u6570\u636E");
      return this.success(this.generateMockQuestions());
    } catch (error) {
      console.error("\u83B7\u53D6\u9898\u76EE\u5931\u8D25:", error);
      return this.success(this.generateMockQuestions());
    }
  }
  async fetchAndUpdateQuestionSet() {
    try {
      const apiQuestions = await this.fetchFromAPI();
      if (apiQuestions.length > 0) {
        await this.saveQuestionSetToDB(apiQuestions);
        await this.recordAPICall();
      }
    } catch (e) {
      console.error("\u540E\u53F0\u66F4\u65B0\u5931\u8D25:", e);
    }
  }
  async getQuestionSetFromDB() {
    try {
      const db2 = uniCloud.database();
      const result = await db2.collection("mbti_questions").orderBy("updated_at", "desc").limit(1).get();
      if (result.data && result.data.length > 0) {
        return result.data[0];
      }
    } catch (e) {
      console.error("\u4ECE\u6570\u636E\u5E93\u8BFB\u53D6\u9898\u5E93\u96C6\u5931\u8D25:", e);
    }
    return null;
  }
  async saveQuestionSetToDB(questions) {
    try {
      const db2 = uniCloud.database();
      const now = Date.now();
      const questionSet = {
        set_id: `set_${now}`,
        version: "1.0.0",
        questions: questions.map((q, i) => ({
          id: q.id || i + 1,
          q: q.q,
          a: q.a,
          b: q.b,
          ia: q.ia,
          ib: q.ib
        })),
        total: questions.length,
        created_at: now,
        updated_at: now
      };
      await db2.collection("mbti_questions").add(questionSet);
      console.log("\u9898\u5E93\u96C6\u4FDD\u5B58\u6210\u529F:", questionSet.set_id, "\u5171", questionSet.total, "\u9053");
    } catch (e) {
      console.error("\u4FDD\u5B58\u9898\u5E93\u96C6\u5931\u8D25:", e);
    }
  }
  async fetchFromAPI() {
    const requestUrl = `${questionsUrl}?key=${apiKey}&level=senior`;
    console.log("\u83B7\u53D6\u9898\u76EE\u8BF7\u6C42URL:", requestUrl);
    const res = await uniCloud.httpclient.request(requestUrl, {
      method: "GET",
      dataType: "json",
      timeout: 3e4
    });
    console.log("\u83B7\u53D6\u9898\u76EEAPI\u8FD4\u56DE:", JSON.stringify(res.data));
    const statusCode = res.statusCode || res.status;
    if (statusCode !== 200) {
      console.error("\u7F51\u7EDC\u8BF7\u6C42\u5931\u8D25\uFF0CstatusCode:", statusCode);
      return [];
    }
    const data = res.data;
    if (data.error_code !== 0) {
      console.error("\u83B7\u53D6\u9898\u76EEAPI\u9519\u8BEF:", data.reason);
      return [];
    }
    if (!data.result || data.result.length === 0) {
      console.error("\u83B7\u53D6\u9898\u76EEAPI\u8FD4\u56DE\u7A7A\u6570\u636E");
      return [];
    }
    const firstItem = data.result[0];
    if (!firstItem || !firstItem.q || !firstItem.a || !firstItem.b) {
      console.error("\u83B7\u53D6\u9898\u76EEAPI\u8FD4\u56DE\u7684\u6570\u636E\u5B57\u6BB5\u4E3A\u7A7A");
      return [];
    }
    return data.result;
  }
  async recordAPICall() {
    try {
      const db2 = uniCloud.database();
      const result = await db2.collection("mbti_config").where({ key: "api_call_count" }).get();
      if (result.data.length > 0) {
        const count = parseInt(result.data[0].value) || 0;
        await db2.collection("mbti_config").doc(result.data[0]._id).update({ value: String(count + 1), updatedAt: Date.now() });
      } else {
        await db2.collection("mbti_config").add({
          key: "api_call_count",
          value: "1",
          updatedAt: Date.now()
        });
      }
    } catch (e) {
      console.error("\u8BB0\u5F55API\u8C03\u7528\u6B21\u6570\u5931\u8D25:", e);
    }
  }
  transformQuestions(questions) {
    return questions.map((item, index) => ({
      id: item.id || index + 1,
      q: item.q || `\u9898\u76EE ${index + 1}`,
      a: item.a || "\u9009\u9879A",
      b: item.b || "\u9009\u9879B",
      ia: item.ia || "",
      ib: item.ib || ""
    }));
  }
  async analyzeAnswers(answers) {
    try {
      console.log("\u63D0\u4EA4\u7B54\u6848:", answers);
      const requestUrl = `${analysisUrl}?key=${apiKey}&answers=${encodeURIComponent(answers)}`;
      console.log("\u5206\u6790\u8BF7\u6C42URL:", requestUrl);
      const res = await uniCloud.httpclient.request(requestUrl, {
        method: "GET",
        dataType: "json",
        timeout: 3e4
      });
      console.log("\u5206\u6790API\u8FD4\u56DE:", JSON.stringify(res.data));
      const statusCode = res.statusCode || res.status;
      if (statusCode !== 200) {
        console.error("\u7F51\u7EDC\u8BF7\u6C42\u5931\u8D25\uFF0CstatusCode:", statusCode);
        return this.fail("\u7F51\u7EDC\u8BF7\u6C42\u5931\u8D25");
      }
      const data = res.data;
      if (data.error_code !== 0) {
        console.error("\u5206\u6790API\u9519\u8BEF:", data.reason);
        return this.fail(data.reason || "\u5206\u6790\u5931\u8D25");
      }
      return this.success({
        alphabet: data.result.alphabet,
        vocabulary: data.result.vocabulary,
        occupation: data.result.occupation,
        summarize: data.result.summarize || [],
        desc: data.result.desc || [],
        characteristic: data.result.characteristic || []
      });
    } catch (error) {
      console.error("\u5206\u6790\u5931\u8D25:", error);
      return this.fail("\u5206\u6790\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5");
    }
  }
  generateMockQuestions() {
    return {
      questions: [
        { id: 1, q: "\u5904\u7406\u8BB8\u591A\u4E8B\u60C5\u4E0A\uFF0C\u4F60\u4F1A\u559C\u6B22", a: "\u51ED\u5174\u6240\u81F3\u884C\u4E8B", b: "\u6309\u7167\u8BA1\u5212\u884C\u4E8B", ia: "prqJ", ib: "Awzo" },
        { id: 2, q: "\u5F53\u4F60\u8981\u5728\u4E00\u4E2A\u661F\u671F\u5185\u5B8C\u6210\u4E00\u4E2A\u5927\u9879\u76EE\uFF0C\u4F60\u5728\u5F00\u59CB\u65F6\u5019\u4F1A", a: "\u628A\u8981\u505A\u7684\u5DE5\u4F5C\u4F9D\u6B21\u5217\u51FA", b: "\u9A6C\u4E0A\u52A8\u5DE5", ia: "6l7h", ib: "PjOx" },
        { id: 3, q: "\u4E0B\u9762\u6BCF\u4E00\u5BF9\u8BCD\u8BED\u4E2D\uFF0C\u54EA\u4E2A\u8BCD\u8BED\u66F4\u5408\u4F60\u5FC3\u610F", a: "\u4E8B\u5B9E", b: "\u610F\u5FF5", ia: "ZNYs", ib: "ycx8" },
        { id: 4, q: "\u5728\u4E00\u5927\u7FA4\u4EBA\u4E2D\uFF0C\u901A\u5E38\u662F", a: "\u4F60\u4ECB\u7ECD\u5927\u5BB6\u8BA4\u8BC6", b: "\u522B\u4EBA\u4ECB\u7ECD\u4F60", ia: "YeZd", ib: "jLiA" },
        { id: 5, q: "\u4E0B\u9762\u6BCF\u4E00\u5BF9\u8BCD\u8BED\u4E2D\uFF0C\u54EA\u4E2A\u8BCD\u8BED\u66F4\u5408\u4F60\u5FC3\u610F", a: "\u5BA2\u89C2\u7684", b: "\u70ED\u60C5\u7684", ia: "EnDx", ib: "ckbg" },
        { id: 6, q: "\u8981\u4F5C\u51B3\u5B9A\u65F6\uFF0C\u4F60\u8BA4\u4E3A\u6BD4\u8F83\u91CD\u8981\u7684\u662F", a: "\u636E\u4E8B\u5B9E\u8861\u91CF", b: "\u8003\u8651\u4ED6\u4EBA\u7684\u611F\u53D7\u548C\u610F\u89C1", ia: "LwMS", ib: "cgbk" },
        { id: 7, q: "\u603B\u7684\u8BF4\u6765\uFF0C\u8981\u505A\u4E00\u4E2A\u5927\u578B\u4F5C\u4E1A\u65F6\uFF0C\u4F60\u4F1A\u9009", a: "\u8FB9\u505A\u8FB9\u60F3\u8BE5\u505A\u4EC0\u4E48", b: "\u9996\u5148\u628A\u5DE5\u4F5C\u6309\u6B65\u7EC6\u5206", ia: "NgMu", ib: "LAMI" },
        { id: 8, q: "\u4E0B\u9762\u6BCF\u4E00\u5BF9\u8BCD\u8BED\u4E2D\uFF0C\u54EA\u4E2A\u8BCD\u8BED\u66F4\u5408\u4F60\u5FC3\u610F", a: "\u5BCC\u60F3\u8C61\u7684", b: "\u4EE5\u4E8B\u8BBA\u4E8B", ia: "9Z8R", ib: "6N86" },
        { id: 9, q: "\u4F60\u8BA4\u4E3A\u522B\u4EBA\u4E00\u822C", a: "\u9700\u82B1\u5F88\u591A\u65F6\u95F4\u624D\u8BA4\u8BC6\u4F60", b: "\u7528\u5F88\u77ED\u65F6\u95F4\u4FBF\u8BA4\u8BC6\u4F60", ia: "atbm", ib: "KRJS" },
        { id: 10, q: "\u54EA\u4E00\u4E2A\u7B54\u6848\u6700\u8D34\u5207\u63CF\u7ED8\u4F60\u4E00\u822C\u7684\u611F\u53D7\u6216\u884C\u4E3A", a: "\u4EC1\u6148\u6177\u6168\u7684", b: "\u610F\u5FD7\u575A\u5B9A\u7684", ia: "6l7t", ib: "J1Ib" },
        { id: 11, q: "\u8981\u505A\u8BB8\u591A\u4EBA\u4E5F\u505A\u7684\u4E8B\uFF0C\u4F60\u6BD4\u8F83\u559C\u6B22", a: "\u6309\u7167\u4E00\u822C\u8BA4\u53EF\u7684\u65B9\u6CD5\u505A", b: "\u6784\u60F3\u4E00\u4E2A\u81EA\u5DF1\u7684\u60F3\u6CD5", ia: "WnXC", ib: "GuFm" },
        { id: 12, q: "\u5728\u793E\u4EA4\u805A\u4F1A\u4E0A\uFF0C\u4F60\u4F1A", a: "\u662F\u8BF4\u8BDD\u5F88\u591A\u7684\u4E00\u4E2A", b: "\u8BA9\u522B\u4EBA\u591A\u8BF4\u8BDD", ia: "qkpn", ib: "GKFB" }
      ],
      total: 12
    };
  }
  async submitTest(params) {
    try {
      const { answers, questions, questionSetId } = params;
      const answerKey = answers.join("+");
      console.log("\u63D0\u4EA4\u6D4B\u8BD5\uFF0C\u7B54\u6848\u6570\u91CF:", answers.length, "\u9898\u5E93ID:", questionSetId);
      if (answers.length === 4 || answers.length === 12) {
        console.log("\u9898\u76EE\u6570\u91CF\u7B26\u5408API\u8981\u6C42\uFF0C\u5C1D\u8BD5\u8C03\u7528API");
        const apiResult = await this.analyzeAnswers(answers.join(","));
        if (apiResult.code === 200 && apiResult.data) {
          console.log("API\u5206\u6790\u6210\u529F\uFF0C\u6536\u96C6\u7528\u6237\u6570\u636E");
          await this.collectUserSubmission(questions, answers, answerKey, questionSetId, apiResult.data);
          return this.success(apiResult.data);
        } else {
          console.log("API\u5206\u6790\u5931\u8D25:", apiResult.msg);
        }
      } else {
        console.log("\u9898\u76EE\u6570\u91CF\u4E0D\u7B26\u5408API\u8981\u6C42\uFF08\u97004\u621612\u9898\uFF09\uFF0C\u8DF3\u8FC7API\u8C03\u7528");
      }
      console.log("\u67E5\u8BE2\u672C\u5730\u7B54\u6848\u6620\u5C04\u8868");
      const mappingResult = await this.findAnswerMapping(answerKey);
      if (mappingResult) {
        console.log("\u672C\u5730\u7B54\u6848\u6620\u5C04\u8868\u547D\u4E2D");
        return this.success({
          alphabet: mappingResult.alphabet,
          vocabulary: mappingResult.vocabulary,
          occupation: mappingResult.occupation,
          summarize: typeof mappingResult.summarize === "string" ? JSON.parse(mappingResult.summarize) : mappingResult.summarize || [],
          desc: typeof mappingResult.desc === "string" ? JSON.parse(mappingResult.desc) : mappingResult.desc || [],
          characteristic: typeof mappingResult.characteristic === "string" ? JSON.parse(mappingResult.characteristic) : mappingResult.characteristic || []
        });
      }
      console.log("\u672C\u5730\u6620\u5C04\u8868\u65E0\u5339\u914D\uFF0C\u8FD4\u56DE\u964D\u7EA7\u7ED3\u679C");
      return this.success(this.getFallbackResult(answerKey));
    } catch (error) {
      console.error("\u63D0\u4EA4\u6D4B\u8BD5\u5931\u8D25:", error);
      return this.fail("\u63D0\u4EA4\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5");
    }
  }
  async collectUserSubmission(questions, answers, answerKey, questionSetId, apiResult) {
    try {
      const db2 = uniCloud.database();
      const exists = await db2.collection("mbti_user_submissions").where({ answer_key: answerKey }).count();
      if (exists.total === 0) {
        await db2.collection("mbti_user_submissions").add({
          question_set_id: questionSetId,
          questions: questions.map((q) => ({
            id: q.id,
            q: q.q,
            a: q.a,
            b: q.b,
            ia: q.ia,
            ib: q.ib
          })),
          answers,
          answer_key: answerKey,
          api_result: apiResult,
          created_at: Date.now()
        });
        console.log("\u7528\u6237\u6570\u636E\u6536\u96C6\u6210\u529F");
        await this.updateAnswerMapping(answerKey, answers, apiResult);
      }
    } catch (e) {
      console.error("\u6536\u96C6\u7528\u6237\u6570\u636E\u5931\u8D25:", e);
    }
  }
  async findAnswerMapping(answerKey) {
    try {
      const db2 = uniCloud.database();
      const result = await db2.collection("mbti_answer_mapping").where({ answer_key: answerKey }).get();
      if (result.data && result.data.length > 0) {
        const mapping = result.data[0];
        await db2.collection("mbti_answer_mapping").doc(mapping._id).update({ usage_count: (mapping.usage_count || 0) + 1 });
        return mapping;
      }
    } catch (e) {
      console.error("\u67E5\u8BE2\u7B54\u6848\u6620\u5C04\u8868\u5931\u8D25:", e);
    }
    return null;
  }
  async updateAnswerMapping(answerKey, answers, apiResult) {
    try {
      const db2 = uniCloud.database();
      const exists = await db2.collection("mbti_answer_mapping").where({ answer_key: answerKey }).count();
      if (exists.total === 0) {
        await db2.collection("mbti_answer_mapping").add({
          question_set_id: "preset_12",
          answer_key: answerKey,
          answers: answers.join(","),
          alphabet: apiResult.alphabet,
          vocabulary: apiResult.vocabulary,
          occupation: apiResult.occupation,
          summarize: apiResult.summarize,
          desc: apiResult.desc,
          characteristic: apiResult.characteristic,
          usage_count: 1,
          created_at: Date.now(),
          updated_at: Date.now()
        });
        console.log("\u7B54\u6848\u6620\u5C04\u8868\u66F4\u65B0\u6210\u529F");
      }
    } catch (e) {
      console.error("\u66F4\u65B0\u7B54\u6848\u6620\u5C04\u8868\u5931\u8D25:", e);
    }
  }
  getFallbackResult(answerKey) {
    return {
      alphabet: "\u5206\u6790\u4E2D",
      vocabulary: "\u5F85\u786E\u5B9A",
      occupation: "\u7CFB\u7EDF\u6B63\u5728\u5B66\u4E60\u6B64\u7B54\u6848\u7EC4\u5408",
      summarize: ["\u7B54\u6848\u7EC4\u5408\u672A\u6536\u5F55\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5", "\u611F\u8C22\u60A8\u7684\u53C2\u4E0E"],
      desc: ["\u6211\u4EEC\u6B63\u5728\u6536\u96C6\u66F4\u591A\u6570\u636E\u6765\u5B8C\u5584\u5206\u6790"],
      characteristic: [
        { title: "\u6570\u636E\u6536\u96C6\u4E2D", desc: ["\u7CFB\u7EDF\u6B63\u5728\u5B66\u4E60\u6B64\u7B54\u6848\u7EC4\u5408"] }
      ]
    };
  }
};

// src/UserDataService.ts
var UserDataService = class extends BaseService {
  async getUserData(user_id) {
    try {
      const db2 = uniCloud.database();
      const result = await db2.collection("mbti_user_data").where({ user_id }).get();
      if (result.data && result.data.length > 0) {
        return this.success(result.data[0]);
      } else {
        return this.success(null);
      }
    } catch (error) {
      console.error("\u83B7\u53D6\u7528\u6237\u6570\u636E\u5931\u8D25:", error);
      return this.fail("\u83B7\u53D6\u7528\u6237\u6570\u636E\u5931\u8D25");
    }
  }
  async saveUserData(user_id, history, favorites) {
    try {
      const db2 = uniCloud.database();
      const now = Date.now();
      const exists = await db2.collection("mbti_user_data").where({ user_id }).count();
      if (exists.total > 0) {
        await db2.collection("mbti_user_data").where({ user_id }).update({
          history,
          favorites,
          updated_at: now
        });
        console.log("\u7528\u6237\u6570\u636E\u66F4\u65B0\u6210\u529F:", user_id);
      } else {
        await db2.collection("mbti_user_data").add({
          user_id,
          history,
          favorites,
          updated_at: now,
          created_at: now
        });
        console.log("\u7528\u6237\u6570\u636E\u521B\u5EFA\u6210\u529F:", user_id);
      }
      return this.success({ success: true });
    } catch (error) {
      console.error("\u4FDD\u5B58\u7528\u6237\u6570\u636E\u5931\u8D25:", error);
      return this.fail("\u4FDD\u5B58\u7528\u6237\u6570\u636E\u5931\u8D25");
    }
  }
  async syncUserData(params) {
    try {
      const { user_id, local_history = [], local_favorites = [], local_updated_at = 0 } = params;
      const db2 = uniCloud.database();
      const result = await db2.collection("mbti_user_data").where({ user_id }).get();
      let cloud_history = [];
      let cloud_favorites = [];
      let cloud_updated_at = 0;
      if (result.data && result.data.length > 0) {
        const userData = result.data[0];
        cloud_history = userData.history || [];
        cloud_favorites = userData.favorites || [];
        cloud_updated_at = userData.updated_at || 0;
      }
      if (cloud_updated_at === 0 && local_updated_at === 0) {
        if (local_history.length > 0 || local_favorites.length > 0) {
          await this.saveUserData(user_id, local_history, local_favorites);
        }
        return this.success({
          cloud_history: local_history,
          cloud_favorites: local_favorites,
          cloud_updated_at: Date.now()
        });
      }
      if (local_updated_at >= cloud_updated_at) {
        const mergedHistory = this.mergeHistory(local_history, cloud_history);
        const mergedFavorites = this.mergeFavorites(local_favorites, cloud_favorites);
        await this.saveUserData(user_id, mergedHistory, mergedFavorites);
        return this.success({
          cloud_history: mergedHistory,
          cloud_favorites: mergedFavorites,
          cloud_updated_at: Date.now()
        });
      } else {
        return this.success({
          cloud_history,
          cloud_favorites,
          cloud_updated_at
        });
      }
    } catch (error) {
      console.error("\u540C\u6B65\u7528\u6237\u6570\u636E\u5931\u8D25:", error);
      return this.fail("\u540C\u6B65\u7528\u6237\u6570\u636E\u5931\u8D25");
    }
  }
  mergeHistory(local, cloud) {
    const merged = [...cloud];
    const cloudIds = new Set(cloud.map((item) => item.id));
    for (const item of local) {
      if (!cloudIds.has(item.id)) {
        merged.push(item);
      }
    }
    merged.sort((a, b) => b.createTime - a.createTime);
    return merged;
  }
  mergeFavorites(local, cloud) {
    const merged = [...cloud];
    const cloudTypes = new Set(cloud.map((item) => item.type));
    for (const item of local) {
      if (!cloudTypes.has(item.type)) {
        merged.push(item);
      }
    }
    merged.sort((a, b) => b.createTime - a.createTime);
    return merged;
  }
  async deleteUserData(user_id) {
    try {
      const db2 = uniCloud.database();
      await db2.collection("mbti_user_data").where({ user_id }).remove();
      return this.success({ success: true });
    } catch (error) {
      console.error("\u5220\u9664\u7528\u6237\u6570\u636E\u5931\u8D25:", error);
      return this.fail("\u5220\u9664\u7528\u6237\u6570\u636E\u5931\u8D25");
    }
  }
  async syncAll(user_id) {
    try {
      const db2 = uniCloud.database();
      const result = await db2.collection("mbti_user_data").where({ user_id }).get();
      if (result.data && result.data.length > 0) {
        const userData = result.data[0];
        return this.success({
          history: userData.history || [],
          favorites: userData.favorites || []
        });
      }
      return this.success({
        history: [],
        favorites: []
      });
    } catch (error) {
      console.error("\u540C\u6B65\u6570\u636E\u5931\u8D25:", error);
      return this.fail("\u540C\u6B65\u6570\u636E\u5931\u8D25");
    }
  }
  async saveHistory(user_id, history) {
    try {
      const db2 = uniCloud.database();
      const now = Date.now();
      const exists = await db2.collection("mbti_user_data").where({ user_id }).count();
      if (exists.total > 0) {
        await db2.collection("mbti_user_data").where({ user_id }).update({
          history,
          updated_at: now
        });
      } else {
        await db2.collection("mbti_user_data").add({
          user_id,
          history,
          favorites: [],
          updated_at: now,
          created_at: now
        });
      }
      return this.success({ success: true });
    } catch (error) {
      console.error("\u4FDD\u5B58\u5386\u53F2\u8BB0\u5F55\u5931\u8D25:", error);
      return this.fail("\u4FDD\u5B58\u5386\u53F2\u8BB0\u5F55\u5931\u8D25");
    }
  }
  async saveFavorites(user_id, favorites) {
    try {
      const db2 = uniCloud.database();
      const now = Date.now();
      const exists = await db2.collection("mbti_user_data").where({ user_id }).count();
      if (exists.total > 0) {
        await db2.collection("mbti_user_data").where({ user_id }).update({
          favorites,
          updated_at: now
        });
      } else {
        await db2.collection("mbti_user_data").add({
          user_id,
          history: [],
          favorites,
          updated_at: now,
          created_at: now
        });
      }
      return this.success({ success: true });
    } catch (error) {
      console.error("\u4FDD\u5B58\u6536\u85CF\u5931\u8D25:", error);
      return this.fail("\u4FDD\u5B58\u6536\u85CF\u5931\u8D25");
    }
  }
  async deleteAllData(user_id) {
    try {
      const db2 = uniCloud.database();
      await db2.collection("mbti_user_data").where({ user_id }).remove();
      return this.success({ success: true });
    } catch (error) {
      console.error("\u5220\u9664\u6240\u6709\u6570\u636E\u5931\u8D25:", error);
      return this.fail("\u5220\u9664\u6240\u6709\u6570\u636E\u5931\u8D25");
    }
  }
};

// src/index.ts
exports.main = async (event) => {
  const { action, data, appId, uid } = event;
  if (!appId) return { code: 403, msg: "\u8BF7\u4F20\u5165appId", data: {} };
  const mbtiService = new MBTIService();
  const userDataService = new UserDataService();
  switch (action) {
    case "MBTI/list":
      return await mbtiService.getMbtiData();
    case "MBTI/analysis":
      return await mbtiService.analyzeAnswers(data?.answers || "");
    case "MBTI/submit":
      return await mbtiService.submitTest(data || {});
    case "User/getData":
      return await userDataService.getUserData(data?.user_id || "");
    case "User/saveData":
      return await userDataService.saveUserData(
        data?.user_id || "",
        data?.history || [],
        data?.favorites || []
      );
    case "User/sync":
      return await userDataService.syncUserData(data || {});
    case "User/deleteData":
      return await userDataService.deleteUserData(data?.user_id || "");
    case "Data/sync":
      return await userDataService.syncAll(data?.user_id || "");
    case "Data/saveHistory":
      return await userDataService.saveHistory(data?.user_id || "", data?.history || []);
    case "Data/saveFavorites":
      return await userDataService.saveFavorites(data?.user_id || "", data?.favorites || []);
    case "Data/deleteAll":
      return await userDataService.deleteAllData(data?.user_id || "");
    default:
      return { code: 404, msg: "\u63A5\u53E3\u4E0D\u5B58\u5728" };
  }
};
