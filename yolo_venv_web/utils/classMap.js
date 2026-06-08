export const CLASS_MAP = {
  0: { name: '道路积水', en: 'waterlogging', key: 'waterlogging', color: '#409EFF', tagType: 'primary' },
  1: { name: '路面坑洼', en: 'pothole', key: 'pothole', color: '#F56C6C', tagType: 'danger' },
  2: { name: '井盖缺失', en: 'manhole_missing', key: 'manhole_missing', color: '#E6A23C', tagType: 'warning' },
  3: { name: '井盖破损', en: 'manhole_damaged', key: 'manhole_damaged', color: '#67C23A', tagType: 'success' }
}

export const BACKEND_TO_LOCAL = {
  '积水': 'waterlogging',
  'waterlogging': 'waterlogging',
  '坑洼': 'pothole',
  'pothole': 'pothole',
  '井盖缺失': 'manhole_missing',
  'manhole_missing': 'manhole_missing',
  '井盖破损': 'manhole_damaged',
  'manhole_damaged': 'manhole_damaged'
}

export const LOCAL_TO_DISPLAY = {
  'waterlogging': { name: '道路积水', color: '#409EFF', cssClass: 'water' },
  'pothole': { name: '路面坑洼', color: '#F56C6C', cssClass: 'pothole' },
  'manhole_missing': { name: '井盖缺失', color: '#E6A23C', cssClass: 'missing' },
  'manhole_damaged': { name: '井盖破损', color: '#67C23A', cssClass: 'damaged' }
}

export function getClassInfo(classId) {
  return CLASS_MAP[classId] || { name: '未知', en: 'unknown', key: 'unknown', color: '#909399', tagType: 'info' }
}

export function getClassKey(classId) {
  const keyMap = { 0: 'waterlogging', 1: 'pothole', 2: 'manhole_missing', 3: 'manhole_damaged' }
  return keyMap[classId]
}

export function mapBackendKey(backendKey) {
  return BACKEND_TO_LOCAL[backendKey] || null
}

export function getDisplayInfo(localKey) {
  return LOCAL_TO_DISPLAY[localKey] || { name: localKey, color: '#909399', cssClass: 'unknown' }
}

export const CLASS_STATS_INIT = {
  waterlogging: 0,
  pothole: 0,
  manhole_missing: 0,
  manhole_damaged: 0
}
