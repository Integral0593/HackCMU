// 课程相关的实用函数

// 从课程名称中提取课号 - 增强版支持多种格式
export function extractCourseCode(courseName: string): string | null {
  if (!courseName) return null;
  
  // 标准化全角冒号为ASCII冒号
  const normalized = courseName.replace(/[：:]{2,}/g, '::').replace(/：/g, ':');
  
  // 匹配 "：： 12345 1" 或 ":: 12345 1" 格式，提取五位数字
  const match = normalized.match(/::\s*(\d{5})(?:\s+\d+)?/);
  if (match) {
    return match[1]; // 返回五位数课号
  }
  
  // 匹配独立的5位数字（不在其他数字序列中）
  const fiveDigitMatch = normalized.match(/(?<!\d)(\d{5})(?!\d)/);
  if (fiveDigitMatch) {
    return fiveDigitMatch[1];
  }
  
  // 如果没有匹配到五位数字，返回null而不是第一个词
  return null;
}

// 为课号生成一致的颜色
export function getCourseColor(courseCode: string): string {
  const colors = [
    'bg-red-100 text-red-800 border-red-200',
    'bg-blue-100 text-blue-800 border-blue-200',
    'bg-green-100 text-green-800 border-green-200',
    'bg-yellow-100 text-yellow-800 border-yellow-200',
    'bg-purple-100 text-purple-800 border-purple-200',
    'bg-pink-100 text-pink-800 border-pink-200',
    'bg-indigo-100 text-indigo-800 border-indigo-200',
    'bg-orange-100 text-orange-800 border-orange-200',
    'bg-teal-100 text-teal-800 border-teal-200',
    'bg-cyan-100 text-cyan-800 border-cyan-200'
  ];
  
  // 使用课号生成一个稳定的哈希值
  let hash = 0;
  for (let i = 0; i < courseCode.length; i++) {
    const char = courseCode.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }
  
  // 确保哈希值为正数并选择颜色
  const colorIndex = Math.abs(hash) % colors.length;
  return colors[colorIndex];
}

// 格式化课程显示名称（移除课号部分）
export function formatCourseName(courseName: string): string {
  // 如果匹配 "：： 12345 1" 格式，移除这部分
  const cleanName = courseName.replace(/：：\s*\d{5}\s+\d+\s*/, '').trim();
  return cleanName || courseName; // 如果清理后为空，返回原名称
}