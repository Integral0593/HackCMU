import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from collections import defaultdict
import re

from models import (
    User, Schedule, UserStatus, StudyPartner, StatusType, DayType,
    CurrentStatusResponse, StatusBoardUser
)

class ScheduleService:
    def __init__(self):
        self.users: Dict[str, User] = {}
        self.schedules: Dict[str, Schedule] = {}
        self.user_schedules: Dict[str, List[str]] = defaultdict(list)
    
    def create_or_get_user(self, username: str, major: str) -> User:
        # Check if user already exists
        for user in self.users.values():
            if user.username == username and user.major == major:
                return user
        
        # Create new user
        user = User(
            id=str(uuid.uuid4()),
            username=username,
            major=major
        )
        self.users[user.id] = user
        return user
    
    def get_user(self, user_id: str) -> Optional[User]:
        return self.users.get(user_id)
    
    def add_schedule(self, schedule: Schedule):
        self.schedules[schedule.id] = schedule
        self.user_schedules[schedule.user_id].append(schedule.id)
    
    def remove_schedule(self, schedule_id: str, user_id: str):
        if schedule_id in self.schedules:
            schedule = self.schedules[schedule_id]
            if schedule.user_id == user_id:
                del self.schedules[schedule_id]
                self.user_schedules[user_id] = [
                    sid for sid in self.user_schedules[user_id] 
                    if sid != schedule_id
                ]
            else:
                raise ValueError("Not authorized to remove this schedule")
        else:
            raise ValueError("Schedule not found")
    
    def get_user_schedules(self, user_id: str) -> List[Schedule]:
        schedule_ids = self.user_schedules.get(user_id, [])
        return [self.schedules[sid] for sid in schedule_ids if sid in self.schedules]
    
    def get_all_schedules(self) -> List[Schedule]:
        return list(self.schedules.values())

class StatusService:
    def __init__(self):
        self.user_statuses: Dict[str, UserStatus] = {}
    
    def update_user_status(self, user_id: str, status: StatusType):
        status_obj = UserStatus(
            id=str(uuid.uuid4()),
            user_id=user_id,
            manual_status=status,
            last_updated=datetime.now()
        )
        self.user_statuses[user_id] = status_obj
    
    def get_user_status(self, user_id: str) -> Optional[StatusType]:
        status = self.user_statuses.get(user_id)
        return status.manual_status if status else StatusType.FREE
    
    def get_current_status(self) -> CurrentStatusResponse:
        from app import schedule_service  # Avoid circular import
        
        now = datetime.now()
        current_day = DayType(now.strftime('%A').lower())
        current_time = now.strftime('%H:%M')
        
        in_class = []
        free = []
        
        # Get all users and their schedules
        for user_id, user in schedule_service.users.items():
            user_status = self.get_user_status(user_id)
            schedules = schedule_service.get_user_schedules(user_id)
            
            # Check if user is currently in class
            current_class = None
            next_class = None
            
            for schedule in schedules:
                if schedule.day == current_day:
                    if schedule.start_time <= current_time <= schedule.end_time:
                        current_class = f"{schedule.course_code}"
                        break
            
            # Find next class today
            today_schedules = [s for s in schedules if s.day == current_day]
            future_schedules = [s for s in today_schedules if s.start_time > current_time]
            if future_schedules:
                next_schedule = min(future_schedules, key=lambda x: x.start_time)
                next_class = f"{next_schedule.course_code} @ {self._format_time(next_schedule.start_time)}"
            
            status_user = StatusBoardUser(
                id=user.id,
                username=user.username,
                major=user.major,
                avatar=user.avatar,
                manual_status=user_status.value if user_status else StatusType.FREE.value,
                current_class=current_class,
                next_class=next_class
            )
            
            if current_class:
                in_class.append(status_user)
            else:
                free.append(status_user)
        
        return CurrentStatusResponse(
            now=now.isoformat(),
            in_class=in_class,
            free=free
        )
    
    def _format_time(self, time_str: str) -> str:
        """Format HH:MM to 12-hour format"""
        hour, minute = map(int, time_str.split(':'))
        ampm = 'AM' if hour < 12 else 'PM'
        display_hour = hour if hour <= 12 else hour - 12
        if display_hour == 0:
            display_hour = 12
        return f"{display_hour}:{minute:02d} {ampm}"

class RecommendationService:
    def __init__(self):
        pass
    
    def get_recommendations(self, user_id: str) -> List[StudyPartner]:
        from app import schedule_service, status_service  # Avoid circular import
        
        user = schedule_service.get_user(user_id)
        if not user:
            return []
        
        user_schedules = schedule_service.get_user_schedules(user_id)
        user_courses = set(s.course_code for s in user_schedules)
        
        recommendations = []
        
        # Find potential study partners
        for other_user_id, other_user in schedule_service.users.items():
            if other_user_id == user_id:
                continue
            
            other_schedules = schedule_service.get_user_schedules(other_user_id)
            other_courses = set(s.course_code for s in other_schedules)
            
            shared_classes = list(user_courses.intersection(other_courses))
            
            if not shared_classes:
                continue
            
            # Calculate compatibility score
            score = len(shared_classes) * 20  # Base score for shared classes
            
            # Same major bonus
            if user.major == other_user.major:
                score += 15
            
            # Status compatibility bonus
            other_status = status_service.get_user_status(other_user_id)
            if other_status in [StatusType.STUDYING, StatusType.HELP, StatusType.FREE]:
                score += 10
            
            # Generate reason
            reason = f"Shares {len(shared_classes)} class{'es' if len(shared_classes) > 1 else ''} with you"
            if user.major == other_user.major:
                reason += f"; Same major ({user.major})"
            if other_status == StatusType.HELP:
                reason += "; Available to help"
            elif other_status == StatusType.STUDYING:
                reason += "; Currently studying"
            
            # Find current/next class for other user
            now = datetime.now()
            current_day = DayType(now.strftime('%A').lower())
            current_time = now.strftime('%H:%M')
            
            current_class = None
            next_class = None
            
            for schedule in other_schedules:
                if schedule.day == current_day:
                    if schedule.start_time <= current_time <= schedule.end_time:
                        current_class = f"{schedule.course_code}"
                        break
            
            if not current_class:
                today_schedules = [s for s in other_schedules if s.day == current_day]
                future_schedules = [s for s in today_schedules if s.start_time > current_time]
                if future_schedules:
                    next_schedule = min(future_schedules, key=lambda x: x.start_time)
                    next_class = f"{next_schedule.course_code} @ {status_service._format_time(next_schedule.start_time)}"
            
            partner = StudyPartner(
                id=other_user.id,
                username=other_user.username,
                major=other_user.major,
                avatar=other_user.avatar,
                score=score,
                shared_classes=shared_classes,
                current_class=current_class,
                next_class=next_class,
                reason=reason
            )
            
            recommendations.append(partner)
        
        # Sort by score (highest first) and return top 5
        recommendations.sort(key=lambda x: x.score, reverse=True)
        return recommendations[:5]

class ICSParser:
    def __init__(self):
        pass
    
    def parse_ics_file(self, file, user_id: str) -> List[Schedule]:
        """Parse uploaded .ics file and extract weekly schedules"""
        try:
            from icalendar import Calendar
            import pytz
            
            # Read file content
            file_content = file.read()
            if isinstance(file_content, bytes):
                file_content = file_content.decode('utf-8', errors='ignore')
            
            # Parse calendar
            cal = Calendar.from_ical(file_content)
            schedules = []
            
            for component in cal.walk():
                if component.name == "VEVENT":
                    # Extract event details
                    summary = str(component.get('summary', ''))
                    dtstart = component.get('dtstart')
                    dtend = component.get('dtend')
                    location = str(component.get('location', ''))
                    rrule = component.get('rrule')
                    
                    if not dtstart or not dtend:
                        continue
                    
                    # Convert to local timezone if needed
                    start_dt = dtstart.dt
                    end_dt = dtend.dt
                    
                    # Handle both datetime and date objects
                    if hasattr(start_dt, 'hour'):
                        start_time = start_dt.strftime('%H:%M')
                        end_time = end_dt.strftime('%H:%M')
                        initial_day_name = start_dt.strftime('%A').lower()
                    else:
                        # All-day event, skip
                        continue
                    
                    # Extract course code and name from summary
                    course_code, course_name = self._parse_course_summary(summary)
                    
                    # Check for recurring pattern (RRULE)
                    recurring_days = []
                    if rrule:
                        # Parse RRULE to extract BYDAY values
                        recurring_days = self._parse_rrule_days(rrule)
                    
                    # If no RRULE or no BYDAY found, use the initial day
                    if not recurring_days:
                        try:
                            day = DayType(initial_day_name)
                            schedule = Schedule(
                                id=str(uuid.uuid4()),
                                user_id=user_id,
                                course_code=course_code,
                                course_name=course_name,
                                day=day,
                                start_time=start_time,
                                end_time=end_time,
                                location=location
                            )
                            schedules.append(schedule)
                        except ValueError:
                            continue  # Skip invalid days
                    else:
                        # Create schedule for each recurring day
                        for day_name in recurring_days:
                            try:
                                day = DayType(day_name)
                                schedule = Schedule(
                                    id=str(uuid.uuid4()),
                                    user_id=user_id,
                                    course_code=course_code,
                                    course_name=course_name,
                                    day=day,
                                    start_time=start_time,
                                    end_time=end_time,
                                    location=location
                                )
                                schedules.append(schedule)
                            except ValueError:
                                continue  # Skip invalid days
            
            return schedules
            
        except Exception as e:
            raise ValueError(f"Failed to parse calendar file: {str(e)}")
    
    def _parse_course_summary(self, summary: str) -> tuple[str, str]:
        """Extract course code and name from event summary"""
        if not summary:
            return "UNKNOWN", "Unknown Course"
        
        # Normalize full-width colons to ASCII colons
        normalized_summary = summary.replace('：：', '::').replace('：', ':')
        
        # Try to match patterns with double colons and 5-digit codes: "Course Name :: 12345 1"
        match = re.search(r'^(.+?)\s*::\s*(\d{5})', normalized_summary.strip())
        if match:
            name = match.group(1).strip()
            code = match.group(2).strip()
            return code, name
        
        # Try to match patterns like "Course Name :: CODE123 D" (:: separator format)
        match = re.match(r'^(.+?)\s*::\s*(.+)$', normalized_summary.strip())
        if match:
            name = match.group(1).strip()
            code = match.group(2).strip()
            return code, name
        
        # Try to match patterns like "CS 151 - Introduction to Computer Science"
        match = re.match(r'^([A-Z]{2,4}\s*\d{3})\s*[-:]?\s*(.*)$', summary, re.IGNORECASE)
        if match:
            code = match.group(1).upper()
            name = match.group(2).strip() or code
            return code, name
        
        # Try to match patterns like "Introduction to Computer Science (CS151)"
        match = re.search(r'\(([A-Z]{2,4}\s*\d{3})\)', summary, re.IGNORECASE)
        if match:
            code = match.group(1).upper()
            name = summary.replace(f"({match.group(1)})", "").strip()
            return code, name
        
        # Default: use first few words as code, full summary as name
        words = summary.split()
        if len(words) >= 2:
            potential_code = f"{words[0]} {words[1]}".upper()
            if re.match(r'^[A-Z]{2,4}\s+\d{3}$', potential_code):
                return potential_code, summary
        
        return summary[:10].upper(), summary
    
    def _parse_rrule_days(self, rrule) -> List[str]:
        """Parse RRULE to extract BYDAY values and return list of day names"""
        if not rrule:
            return []
        
        # Mapping of ICS BYDAY abbreviations to full day names
        day_mapping = {
            'MO': 'monday',
            'TU': 'tuesday', 
            'WE': 'wednesday',
            'TH': 'thursday',
            'FR': 'friday',
            'SA': 'saturday',
            'SU': 'sunday'
        }
        
        days = []
        
        try:
            # Handle different possible RRULE formats
            if hasattr(rrule, 'get'):
                # rrule is a dict-like object
                byday = rrule.get('BYDAY')
            elif hasattr(rrule, 'to_ical'):
                # rrule is an icalendar object, convert to string and parse
                rrule_str = rrule.to_ical().decode('utf-8') if hasattr(rrule.to_ical(), 'decode') else str(rrule.to_ical())
                byday = self._extract_byday_from_string(rrule_str)
            else:
                # rrule is already a string
                rrule_str = str(rrule)
                byday = self._extract_byday_from_string(rrule_str)
            
            if byday:
                # Handle both single values and lists
                if isinstance(byday, list):
                    for day_code in byday:
                        day_code = str(day_code).strip().upper()
                        # Remove any numeric prefixes (like "1MO" -> "MO")
                        day_code = re.sub(r'^\d+', '', day_code)
                        if day_code in day_mapping:
                            days.append(day_mapping[day_code])
                else:
                    # Single value or comma-separated string
                    day_codes = str(byday).split(',')
                    for day_code in day_codes:
                        day_code = day_code.strip().upper()
                        # Remove any numeric prefixes (like "1MO" -> "MO")
                        day_code = re.sub(r'^\d+', '', day_code)
                        if day_code in day_mapping:
                            days.append(day_mapping[day_code])
            
        except Exception as e:
            # If parsing fails, return empty list to fall back to initial day
            pass
        
        return days
    
    def _extract_byday_from_string(self, rrule_str: str) -> Optional[str]:
        """Extract BYDAY value from RRULE string"""
        # Look for BYDAY=... pattern
        match = re.search(r'BYDAY=([^;]+)', rrule_str.upper())
        return match.group(1) if match else None