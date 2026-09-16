export const CLASS_MAP = {
  0: { name: '道路积水', en: 'waterlogging', key: 'waterlogging', color: '#3B82F6', tagType: 'primary', cssClass: 'water' },
  1: { name: '井盖异常', en: 'manhole', key: 'manhole', color: '#EAB308', tagType: 'warning', cssClass: 'manhole' },
  2: { name: '路面坑洼', en: 'pothole', key: 'pothole', color: '#8B5CF6', tagType: 'danger', cssClass: 'pothole' },
  3: { name: '道路裂纹', en: 'road_crack', key: 'crack', color: '#DC2626', tagType: 'danger', cssClass: 'crack' }
}

export const BACKEND_TO_LOCAL = {
  '积水': 'waterlogging',
  'waterlogging': 'waterlogging',
  '坑洼': 'pothole',
  'pothole': 'pothole',
  '井盖缺失': 'manhole',
  'manhole_missing': 'manhole',
  '井盖破损': 'manhole',
  'manhole_damaged': 'manhole',
  'manhole': 'manhole',
  '裂纹': 'crack',
  'road_crack': 'crack',
  'crack': 'crack'
}

export const LOCAL_TO_DISPLAY = {
  'waterlogging': { name: '道路积水', color: '#3B82F6', cssClass: 'water', riskLevel: 'medium' },
  'pothole': { name: '路面坑洼', color: '#8B5CF6', cssClass: 'pothole', riskLevel: 'high' },
  'manhole': { name: '井盖异常', color: '#EAB308', cssClass: 'manhole', riskLevel: 'high' },
  'crack': { name: '道路裂纹', color: '#DC2626', cssClass: 'crack', riskLevel: 'low' }
}

export const CLASS_STATS_INIT = {
  waterlogging: 0,
  pothole: 0,
  manhole: 0,
  crack: 0
}

export const DEFAULT_THRESHOLDS = {
  0: 0.50,
  1: 0.60,
  2: 0.55,
  3: 0.35
}

export const THRESHOLD_LABELS = ['积水', '井盖异常', '坑洼', '道路裂纹']

export function getClassInfo(classId) {
  return CLASS_MAP[classId] || { name: '未知', en: 'unknown', key: 'unknown', color: '#909399', tagType: 'info', cssClass: 'unknown' }
}

export function getClassKey(classId) {
  const keyMap = { 0: 'waterlogging', 1: 'manhole', 2: 'pothole', 3: 'crack' }
  return keyMap[classId] || 'unknown'
}

export function mapBackendKey(backendKey) {
  return BACKEND_TO_LOCAL[backendKey] || null
}

export function getDisplayInfo(localKey) {
  return LOCAL_TO_DISPLAY[localKey] || { name: localKey, color: '#909399', cssClass: 'unknown', riskLevel: 'low' }
}

export function getRiskLevel(localKey) {
  const info = getDisplayInfo(localKey)
  return info.riskLevel || 'low'
}

export function getRiskColor(riskLevel) {
  const colors = {
    high: '#DC2626',
    medium: '#D4A800',
    low: '#2D9E45',
    none: '#555555'
  }
  return colors[riskLevel] || colors.none
}

export function getRiskLabel(riskLevel) {
  const labels = {
    high: '高风险',
    medium: '中风险',
    low: '低风险',
    none: '无风险'
  }
  return labels[riskLevel] || labels.none
}
