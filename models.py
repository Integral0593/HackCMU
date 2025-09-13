from dataclasses import dataclass, asdict
from datetime import datetime
from enum import Enum
from typing import Optional, List

class StatusType(Enum):
    STUDYING = "studying"
    FREE = "free"
    HELP = "help"
    BUSY = "busy"
    TIRED = "tired"
    SOCIAL = "social"

class DayType(Enum):
    MONDAY = "monday"
    TUESDAY = "tuesday"
    WEDNESDAY = "wednesday"
    THURSDAY = "thursday"
    FRIDAY = "friday"
    SATURDAY = "saturday"
    SUNDAY = "sunday"

@dataclass
class User:
    id: str
    username: str
    major: str
    avatar: Optional[str] = None
    
    def to_dict(self):
        return asdict(self)

@dataclass
class Schedule:
    id: str
    user_id: str
    course_code: str
    course_name: str
    day: DayType
    start_time: str  # HH:MM format
    end_time: str    # HH:MM format
    location: Optional[str] = None
    
    def to_dict(self):
        result = asdict(self)
        result['day'] = self.day.value
        return result

@dataclass
class UserStatus:
    id: str
    user_id: str
    manual_status: StatusType
    last_updated: datetime
    
    def to_dict(self):
        result = asdict(self)
        result['manual_status'] = self.manual_status.value
        result['last_updated'] = self.last_updated.isoformat()
        return result

@dataclass
class StudyPartner:
    id: str
    username: str
    major: str
    avatar: Optional[str]
    score: int
    shared_classes: List[str]
    current_class: Optional[str]
    next_class: Optional[str]
    reason: str
    
    def to_dict(self):
        return asdict(self)

@dataclass
class StatusBoardUser:
    id: str
    username: str
    major: str
    avatar: Optional[str]
    manual_status: str
    current_class: Optional[str] = None
    next_class: Optional[str] = None
    
    def to_dict(self):
        return asdict(self)

@dataclass
class CurrentStatusResponse:
    now: str
    in_class: List[StatusBoardUser]
    free: List[StatusBoardUser]
    
    def to_dict(self):
        return {
            'now': self.now,
            'in_class': [user.to_dict() for user in self.in_class],
            'free': [user.to_dict() for user in self.free]
        }