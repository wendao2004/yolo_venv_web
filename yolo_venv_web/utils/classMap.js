// 类别键映射：后端 class_name -> 本工程内部 key
//
// ⚠ 内部 key 只有四个：waterlogging / manhole / pothole / crack
//   （crack 是 road_crack 的本地短名，见下面的 LOCAL_TO_DISPLAY）
//
// 唯一的权威来源是 server.py:29-34 的 CLASS_NAMES：
//   0 waterlogging  道路积水
//   1 manhole       下水井盖
//   2 pothole       道路坑洞
//   3 road_crack    道路裂纹
// 注意顺序：manhole 是 1、pothole 是 2。旧文档里的 data.yaml 顺序（1=pothole）
// 是错的，别照抄。
//
// 2026-09-19 清理（03-uni-app客户端.md A6）：删掉 8 个零引用导出
//   CLASS_MAP / DEFAULT_THRESHOLDS / THRESHOLD_LABELS /
//   getClassInfo / getClassKey / getRiskLevel / getRiskColor
// 它们是一套**平行的类别表**，和 server.py 的阈值/顺序各写一份，改动时极易
// 只改一边。只保留确实被调用的导出，避免后期再被误用。

/**
 * 后端 class_name -> 内部 key。查不到返回 null，**由调用方决定兜底**。
 *
 * 同时收英文名和中文标签，因为后端在不同消息里给的形态不一样：
 *   - 帧消息 detection_list[].class_name -> 英文名
 *   - 工单/截图记录里可能是中文标签
 */
export const BACKEND_TO_LOCAL = {
  // server.py CLASS_NAMES 的原样值
  'waterlogging': 'waterlogging',
  'manhole': 'manhole',
  'pothole': 'pothole',
  'road_crack': 'crack',
  // 本工程内部 short name，幂等
  'crack': 'crack',
  // 中文标签
  '积水': 'waterlogging',
  '井盖': 'manhole',
  '坑洼': 'pothole',
  '裂纹': 'crack',
  // 已废弃的五类方案别名 —— 后端不会再发，只做**入站兜底**：
  // saved_captures/ 里的历史 JSON 存着这些 class_name，映射成 null 会让
  // 旧截图在 A2 的工单页里显示不出类别。**绝不要往出站方向用这两个名字。**
  'manhole_missing': 'manhole',
  'manhole_damaged': 'manhole',
}

/** 内部 key -> 展示信息。cssClass 与 styles/ 里的定义对应。 */
export const LOCAL_TO_DISPLAY = {
  'waterlogging': { name: '道路积水', color: '#3B82F6', cssClass: 'water', riskLevel: 'medium' },
  'pothole': { name: '路面坑洼', color: '#8B5CF6', cssClass: 'pothole', riskLevel: 'high' },
  'manhole': { name: '井盖异常', color: '#EAB308', cssClass: 'manhole', riskLevel: 'high' },
  'crack': { name: '道路裂纹', color: '#DC2626', cssClass: 'crack', riskLevel: 'low' },
}

/**
 * 分类计数的初值。**四个 key 必须与 LOCAL_TO_DISPLAY 的 key 完全一致** ——
 * `stats[mapBackendKey(x)]++` 这种写法依赖两边键名对齐，写错会**静默丢计数**。
 * （2026-09-19 修过一处正是这个错：score.vue 曾用 'water'，与这里的
 *  'waterlogging' 对不上，导致整类积水从不计数。见 A6 执行记录。）
 */
export const CLASS_STATS_INIT = {
  waterlogging: 0,
  pothole: 0,
  manhole: 0,
  crack: 0,
}

/** 后端键 -> 内部 key。查不到返回 null（**不要在这里兜底成某一类**）。 */
export function mapBackendKey(backendKey) {
  return BACKEND_TO_LOCAL[backendKey] || null
}

/** 内部 key -> 展示信息。查不到时返回一个安全的 unknown 样式。 */
export function getDisplayInfo(localKey) {
  return LOCAL_TO_DISPLAY[localKey] || {
    name: localKey, color: '#909399', cssClass: 'unknown', riskLevel: 'low',
  }
}
