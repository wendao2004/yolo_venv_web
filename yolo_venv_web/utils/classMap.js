export const CLASS_MAP = {
  0: { name: '道路积水', en: 'waterlogging', color: '#409EFF', tagType: 'primary' },
  1: { name: '路面坑洼', en: 'pothole', color: '#F56C6C', tagType: 'danger' },
  2: { name: '井盖缺失', en: 'manhole_missing', color: '#E6A23C', tagType: 'warning' },
  3: { name: '井盖破损', en: 'manhole_damaged', color: '#67C23A', tagType: 'success' }
}

export function getClassInfo(classId) {
  return CLASS_MAP[classId] || { name: '未知', en: 'unknown', color: '#909399', tagType: 'info' }
}

export function getClassKey(classId) {
  const keyMap = { 0: 'waterlogging', 1: 'pothole', 2: 'manhole_missing', 3: 'manhole_damaged' }
  return keyMap[classId]
}

export const CLASS_STATS_INIT = {
  waterlogging: 0,
  pothole: 0,
  manhole_missing: 0,
  manhole_damaged: 0
}
