# algorithm.py
"""
Campus Status Algorithm Module
核心状态判断和推荐算法
"""

import json
from datetime import datetime, timedelta
import os
from typing import Dict, List, Optional, Any

# ==================== 数据文件路径 ====================
DATA_DIR = '../data'  # 从backend目录到data目录
USERS_FILE = os.path.join(DATA_DIR, 'users.json')
SCHEDULES_FILE = os.path.join(DATA_DIR, 'schedules.json') 
STATUS_FILE = os.path.join(DATA_DIR, 'status.json')

# ==================== 基础数据加载函数 ====================
def load_json_file(filename: str) -> Dict:
    """
    Load JSON file or return empty dict if file doesn't exist
    包含完整错误处理
    """
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Warning: {filename} not found, returning empty dict")
        return {}
    except json.JSONDecodeError as e:
        print(f"Warning: JSON decode error in {filename}: {e}")
        return {}
    except Exception as e:
        print(f"Warning: Unexpected error loading {filename}: {e}")
        return {}

def save_json_file(filename: str, data: Dict) -> bool:
    """Save data to JSON file with atomic write"""
    try:
        os.makedirs(os.path.dirname(filename), exist_ok=True)
        # 先写临时文件
        temp_file = f"{filename}.tmp"
        with open(temp_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        # 原子性替换
        os.replace(temp_file, filename)
        return True
    except Exception as e:
        print(f"Error saving {filename}: {e}")
        return False

# ==================== 推荐引擎类 ====================
class RecommendationEngine:
    """推荐引擎主类"""
    
    def __init__(self):
        """初始化并加载数据"""
        self.users = {}
        self.schedules = {}
        self.statuses = {}
        self.refresh_data()
        
    def refresh_data(self):
        """
        Refresh data from files
        每次查询前调用，保证数据最新
        """
        self.users = load_json_file(USERS_FILE)
        self.schedules = load_json_file(SCHEDULES_FILE)
        self.statuses = load_json_file(STATUS_FILE)
        print(f"Data refreshed - Users: {len(self.users)}, Schedules: {len(self.schedules)}, Statuses: {len(self.statuses)}")
    
    def get_user_classes(self, user_id: str) -> List[str]:
        """Get list of classes for a user"""
        if user_id not in self.schedules:
            return []
        
        classes = []
        schedule = self.schedules.get(user_id, {}).get('schedule', [])
        for class_info in schedule:
            if 'courseCode' in class_info:
                classes.append(class_info['courseCode'])
        return classes
    
    def get_shared_classes(self, user1_id: str, user2_id: str) -> List[str]:
        """Get classes shared between two users"""
        user1_classes = set(self.get_user_classes(user1_id))
        user2_classes = set(self.get_user_classes(user2_id))
        return list(user1_classes.intersection(user2_classes))
    
    def get_user_availability(self, user_id: str) -> Dict[str, str]:
        """
        Determine user's current availability
        返回状态和偏好信息
        """
        # 默认值（未设置状态时）
        availability = {
            'status': 'unknown',
            'social_preference': 'neutral',
            'study_preference': 'neutral'
        }
        
        if user_id not in self.statuses:
            return availability
        
        # 获取手动状态
        manual_status = self.statuses[user_id].get('manualStatus', 'free')
        availability['status'] = manual_status
        
        # 解释状态为偏好
        # 社交偏好高
        if manual_status in ['social', 'want to hang out']:
            availability['social_preference'] = 'high'
            availability['study_preference'] = 'low'
        # 社交偏好低
        elif manual_status in ['tired', 'busy']:
            availability['social_preference'] = 'low'
            availability['study_preference'] = 'low'
        # 学习偏好高
        elif manual_status in ['studying', 'help']:
            availability['study_preference'] = 'high'
            availability['social_preference'] = 'low'
        # 空闲状态
        elif manual_status == 'free':
            availability['social_preference'] = 'neutral'
            availability['study_preference'] = 'neutral'
            
        return availability

# ==================== 时间工具函数 ====================
def time_to_minutes(time_str: str) -> int:
    """
    Convert HH:MM time to minutes since midnight
    错误时返回0（防御式编程）
    """
    try:
        if ':' not in time_str:
            return 0
        parts = time_str.split(':')
        if len(parts) != 2:
            return 0
        hours = int(parts[0])
        minutes = int(parts[1])
        if 0 <= hours <= 23 and 0 <= minutes <= 59:
            return hours * 60 + minutes
        return 0
    except (ValueError, AttributeError):
        return 0

def is_time_between(current: str, start: str, end: str) -> bool:
    """
    Check if current time is between start and end
    使用闭区间判断（包含端点）
    """
    current_min = time_to_minutes(current)
    start_min = time_to_minutes(start)
    end_min = time_to_minutes(end)
    
    # 处理跨天的情况（如果需要）
    if end_min < start_min:  # 跨天
        return current_min >= start_min or current_min <= end_min
    
    return start_min <= current_min <= end_min

# ==================== 用户状态判断函数 ====================
def get_current_class_for_user(user_id: str, now: Optional[datetime] = None) -> str:
    """
    Get user's current class
    支持时间注入用于demo
    """
    if user_id not in engine.schedules:
        return "Free"
    
    # 使用注入的时间或当前时间
    if now is None:
        now = datetime.now()
    
    current_day = now.strftime('%A').lower()
    current_time = now.strftime('%H:%M')
    
    # 获取用户课表
    user_schedule = engine.schedules.get(user_id, {}).get('schedule', [])
    
    # 检查当前是否在上课
    for class_info in user_schedule:
        if class_info.get('day') == current_day:
            start_time = class_info.get('startTime', '')
            end_time = class_info.get('endTime', '')
            if start_time and end_time:
                if is_time_between(current_time, start_time, end_time):
                    course_code = class_info.get('courseCode', 'Unknown')
                    return f"In {course_code}"
    
    return "Free"

def get_next_class_for_user(user_id: str, now: Optional[datetime] = None) -> Optional[Dict]:
    """
    Get user's next class today
    返回今天下一节课的信息
    """
    if user_id not in engine.schedules:
        return None
    
    # 使用注入的时间或当前时间
    if now is None:
        now = datetime.now()
    
    current_day = now.strftime('%A').lower()
    current_time = now.strftime('%H:%M')
    current_minutes = time_to_minutes(current_time)
    
    # 获取用户课表
    user_schedule = engine.schedules.get(user_id, {}).get('schedule', [])
    next_classes = []
    
    # 找出今天所有未开始的课
    for class_info in user_schedule:
        if class_info.get('day') == current_day:
            start_time = class_info.get('startTime', '')
            if start_time:
                start_minutes = time_to_minutes(start_time)
                if start_minutes > current_minutes:
                    next_classes.append({
                        'courseCode': class_info.get('courseCode', 'Unknown'),
                        'courseName': class_info.get('courseName', ''),
                        'startTime': start_time,
                        'endTime': class_info.get('endTime', ''),
                        'location': class_info.get('location', ''),
                        'start_minutes': start_minutes
                    })
    
    # 返回最早的下一节课
    if next_classes:
        next_classes.sort(key=lambda x: x['start_minutes'])
        del next_classes[0]['start_minutes']  # 移除内部使用的字段
        return next_classes[0]
    
    return None

def get_recent_class_for_user(user_id: str, now: Optional[datetime] = None) -> Optional[Dict]:
    """
    Get user's recently finished class (within last hour)
    获取刚结束的课程（1小时内）
    """
    if user_id not in engine.schedules:
        return None
    
    # 使用注入的时间或当前时间
    if now is None:
        now = datetime.now()
    
    current_day = now.strftime('%A').lower()
    current_time = now.strftime('%H:%M')
    current_minutes = time_to_minutes(current_time)
    
    # 获取用户课表
    user_schedule = engine.schedules.get(user_id, {}).get('schedule', [])
    recent_class = None
    min_gap = 60  # 最多回溯60分钟
    
    for class_info in user_schedule:
        if class_info.get('day') == current_day:
            end_time = class_info.get('endTime', '')
            if end_time:
                end_minutes = time_to_minutes(end_time)
                gap = current_minutes - end_minutes
                if 0 < gap < min_gap:
                    min_gap = gap
                    recent_class = {
                        'courseCode': class_info.get('courseCode', 'Unknown'),
                        'courseName': class_info.get('courseName', ''),
                        'endedMinutesAgo': gap
                    }
    
    return recent_class

# ==================== 全局引擎实例 ====================
engine = RecommendationEngine()

# ==================== 创建测试数据 ====================
def create_sample_data():
    """Create sample users and schedules for demo purposes"""
    
    # 创建示例用户
    sample_users = {
        'alice': {
            'id': 'alice',
            'username': 'Alice Chen',
            'major': 'CS',
            'created_at': '2025-01-10T08:00:00'
        },
        'bob': {
            'id': 'bob',
            'username': 'Bob Smith',
            'major': 'CS',
            'created_at': '2025-01-10T08:30:00'
        },
        'carol': {
            'id': 'carol',
            'username': 'Carol Johnson',
            'major': 'MATH',
            'created_at': '2025-01-10T09:00:00'
        },
        'david': {
            'id': 'david',
            'username': 'David Wilson',
            'major': 'CS',
            'created_at': '2025-01-10T09:30:00'
        },
        'emma': {
            'id': 'emma',
            'username': 'Emma Davis',
            'major': 'PHYS',
            'created_at': '2025-01-10T10:00:00'
        }
    }
    
    # 创建示例课表（注意使用正确的星期格式）
    sample_schedules = {
        'alice': {
            'userId': 'alice',
            'schedule': [
                {'courseCode': 'CS 15-122', 'courseName': 'Principles of Imperative Computation', 
                 'day': 'friday', 'startTime': '09:00', 'endTime': '10:20', 'location': 'GHC 4401'},
                {'courseCode': 'CS 15-122', 'courseName': 'Principles of Imperative Computation', 
                 'day': 'monday', 'startTime': '09:00', 'endTime': '10:20', 'location': 'GHC 4401'},
                {'courseCode': 'MATH 21-127', 'courseName': 'Concepts of Mathematics', 
                 'day': 'tuesday', 'startTime': '11:30', 'endTime': '12:50', 'location': 'DH 2210'},
                {'courseCode': 'MATH 21-127', 'courseName': 'Concepts of Mathematics', 
                 'day': 'thursday', 'startTime': '11:30', 'endTime': '12:50', 'location': 'DH 2210'}
            ]
        },
        'bob': {
            'userId': 'bob',
            'schedule': [
                {'courseCode': 'CS 15-122', 'courseName': 'Principles of Imperative Computation', 
                 'day': 'friday', 'startTime': '09:00', 'endTime': '10:20', 'location': 'GHC 4401'},
                {'courseCode': 'CS 15-122', 'courseName': 'Principles of Imperative Computation', 
                 'day': 'monday', 'startTime': '09:00', 'endTime': '10:20', 'location': 'GHC 4401'},
                {'courseCode': 'CS 15-150', 'courseName': 'Principles of Functional Programming', 
                 'day': 'tuesday', 'startTime': '13:30', 'endTime': '14:50', 'location': 'GHC 4307'}
            ]
        },
        'carol': {
            'userId': 'carol',
            'schedule': [
                {'courseCode': 'MATH 21-127', 'courseName': 'Concepts of Mathematics', 
                 'day': 'tuesday', 'startTime': '11:30', 'endTime': '12:50', 'location': 'DH 2210'},
                {'courseCode': 'MATH 21-127', 'courseName': 'Concepts of Mathematics', 
                 'day': 'thursday', 'startTime': '11:30', 'endTime': '12:50', 'location': 'DH 2210'},
                {'courseCode': 'MATH 21-259', 'courseName': 'Calculus in Three Dimensions', 
                 'day': 'monday', 'startTime': '14:30', 'endTime': '15:50', 'location': 'DH 1211'}
            ]
        }
    }
    
    # 创建示例状态
    sample_statuses = {
        'alice': {'manualStatus': 'studying', 'lastUpdated': '2025-01-10T14:00:00'},
        'bob': {'manualStatus': 'free', 'lastUpdated': '2025-01-10T14:30:00'},
        'carol': {'manualStatus': 'social', 'lastUpdated': '2025-01-10T15:00:00'},
        'david': {'manualStatus': 'tired', 'lastUpdated': '2025-01-10T15:30:00'},
        'emma': {'manualStatus': 'help', 'lastUpdated': '2025-01-10T16:00:00'}
    }
    
    # 保存示例数据
    if save_json_file(USERS_FILE, sample_users):
        print(f"✓ Created {USERS_FILE}")
    if save_json_file(SCHEDULES_FILE, sample_schedules):
        print(f"✓ Created {SCHEDULES_FILE}")
    if save_json_file(STATUS_FILE, sample_statuses):
        print(f"✓ Created {STATUS_FILE}")
    
    print("Sample data created successfully!")
    return True

# ==================== 测试函数 ====================
def test_status_functions():
    """测试状态判断函数"""
    print("\n" + "="*50)
    print("Testing Status Functions")
    print("="*50)
    
    # 刷新数据
    engine.refresh_data()
    
    # 测试时间工具
    print("\n1. Testing time utilities:")
    print(f"   time_to_minutes('09:30') = {time_to_minutes('09:30')} (expected: 570)")
    print(f"   time_to_minutes('invalid') = {time_to_minutes('invalid')} (expected: 0)")
    print(f"   is_time_between('10:00', '09:00', '11:00') = {is_time_between('10:00', '09:00', '11:00')} (expected: True)")
    print(f"   is_time_between('08:00', '09:00', '11:00') = {is_time_between('08:00', '09:00', '11:00')} (expected: False)")
    
    # 测试用户可用性
    print("\n2. Testing user availability:")
    for user_id in ['alice', 'bob', 'carol']:
        availability = engine.get_user_availability(user_id)
        print(f"   {user_id}: status={availability['status']}, "
              f"social={availability['social_preference']}, "
              f"study={availability['study_preference']}")
    
    # 测试当前课程（使用固定时间）
    print("\n3. Testing current class (Friday 9:30):")
    test_time = datetime(2025, 1, 10, 9, 30)  # Friday 9:30
    for user_id in ['alice', 'bob', 'carol']:
        current = get_current_class_for_user(user_id, test_time)
        print(f"   {user_id}: {current}")
    
    # 测试下一节课
    print("\n4. Testing next class (Friday 10:30):")
    test_time = datetime(2025, 1, 10, 10, 30)  # Friday 10:30
    for user_id in ['alice', 'bob', 'carol']:
        next_class = get_next_class_for_user(user_id, test_time)
        if next_class:
            print(f"   {user_id}: {next_class['courseCode']} at {next_class['startTime']}")
        else:
            print(f"   {user_id}: No more classes today")
    
    # 测试共享课程
    print("\n5. Testing shared classes:")
    shared = engine.get_shared_classes('alice', 'bob')
    print(f"   alice & bob share: {shared}")
    shared = engine.get_shared_classes('alice', 'carol')
    print(f"   alice & carol share: {shared}")
    
    print("\n" + "="*50)
    print("Status functions test complete!")
    print("="*50)

# ==================== 主函数 ====================
def main():
    """Main function for testing"""
    print("Campus Status Algorithm - Initial Test")
    print("="*50)
    
    # 创建示例数据
    create_sample_data()
    
    # 运行测试
    test_status_functions()
    
    print("\n✓ Ready for integration with backend!")
    print("  - Data files created in ./data/")
    print("  - Core status functions working")
    print("  - Engine initialized and ready")

if __name__ == '__main__':
    main()