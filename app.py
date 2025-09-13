from flask import Flask, render_template, request, redirect, url_for, session, jsonify, flash
from werkzeug.utils import secure_filename
import os
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import json

from models import User, Schedule, UserStatus, StatusType, DayType
from services import ScheduleService, StatusService, RecommendationService, ICSParser

app = Flask(__name__)
app.secret_key = os.environ.get('SESSION_SECRET', 'your-secret-key-here')
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024  # 5MB max file size

# Create upload folder if it doesn't exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Initialize services
schedule_service = ScheduleService()
status_service = StatusService()
recommendation_service = RecommendationService()
ics_parser = ICSParser()

# Template filters
@app.template_filter('format_time')
def format_time_filter(time_str):
    """Format HH:MM to 12-hour format"""
    if not time_str:
        return ''
    try:
        hour, minute = map(int, time_str.split(':'))
        ampm = 'AM' if hour < 12 else 'PM'
        display_hour = hour if hour <= 12 else hour - 12
        if display_hour == 0:
            display_hour = 12
        return f"{display_hour}:{minute:02d} {ampm}"
    except:
        return time_str

@app.route('/')
def dashboard():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    user = schedule_service.get_user(session['user_id'])
    if not user:
        return redirect(url_for('login'))
    
    # Get current status data
    status_data = status_service.get_current_status()
    
    # Get user's current status
    user_status = status_service.get_user_status(user.id)
    
    return render_template('dashboard.html', 
                         user=user, 
                         status_data=status_data, 
                         user_status=user_status)

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        major = request.form.get('major', '').strip()
        
        if not username or not major:
            flash('Please fill in all fields', 'error')
            return render_template('login.html')
        
        # Create or get user
        user = schedule_service.create_or_get_user(username, major)
        session['user_id'] = user.id
        
        flash(f'Welcome, {username}!', 'success')
        return redirect(url_for('dashboard'))
    
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    flash('Logged out successfully', 'info')
    return redirect(url_for('login'))

@app.route('/status', methods=['GET', 'POST'])
def status():
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in'}), 401
    
    if request.method == 'POST':
        new_status = None
        if request.form:
            new_status = request.form.get('status')
        elif request.json:
            new_status = request.json.get('status')
        
        if new_status not in [s.value for s in StatusType]:
            return jsonify({'error': 'Invalid status'}), 400
        
        status_service.update_user_status(session['user_id'], StatusType(new_status))
        
        if request.is_json:
            return jsonify({'success': True, 'status': new_status})
        else:
            flash('Status updated!', 'success')
            return redirect(url_for('dashboard'))
    
    # GET request - return current status
    user_status = status_service.get_user_status(session['user_id'])
    return jsonify({'status': user_status.value if user_status else 'free'})

@app.route('/schedule')
def schedule_page():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    user = schedule_service.get_user(session['user_id'])
    schedules = schedule_service.get_user_schedules(session['user_id'])
    
    return render_template('schedule.html', user=user, schedules=schedules)

@app.route('/schedule', methods=['POST'])
def add_schedule():
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in'}), 401
    
    data = request.form.to_dict() if request.form else request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    try:
        schedule = Schedule(
            id=str(uuid.uuid4()),
            user_id=session['user_id'],
            course_code=data['course_code'],
            course_name=data['course_name'],
            day=DayType(data['day']),
            start_time=data['start_time'],
            end_time=data['end_time'],
            location=data.get('location', '')
        )
        
        schedule_service.add_schedule(schedule)
        
        if request.is_json:
            return jsonify({'success': True, 'schedule': schedule.to_dict()})
        else:
            flash('Course added successfully!', 'success')
            return redirect(url_for('schedule_page'))
            
    except Exception as e:
        if request.is_json:
            return jsonify({'error': str(e)}), 400
        else:
            flash(f'Error adding course: {str(e)}', 'error')
            return redirect(url_for('schedule_page'))

@app.route('/schedule/<schedule_id>', methods=['DELETE'])
def remove_schedule(schedule_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in'}), 401
    
    try:
        schedule_service.remove_schedule(schedule_id, session['user_id'])
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/upload-ics', methods=['POST'])
def upload_ics():
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in'}), 401
    
    if 'ics_file' not in request.files:
        flash('No file uploaded', 'error')
        return redirect(url_for('schedule_page'))
    
    file = request.files['ics_file']
    
    if file.filename == '':
        flash('No file selected', 'error')
        return redirect(url_for('schedule_page'))
    
    if not file.filename or not file.filename.lower().endswith('.ics'):
        flash('Please upload a .ics file', 'error')
        return redirect(url_for('schedule_page'))
    
    try:
        # Parse ICS file
        schedules = ics_parser.parse_ics_file(file, session['user_id'])
        
        # Add schedules to database
        for schedule in schedules:
            schedule_service.add_schedule(schedule)
        
        flash(f'Successfully imported {len(schedules)} courses from calendar!', 'success')
        
    except Exception as e:
        flash(f'Error parsing calendar file: {str(e)}', 'error')
    
    return redirect(url_for('schedule_page'))

@app.route('/partners')
def partners():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    user = schedule_service.get_user(session['user_id'])
    recommendations = recommendation_service.get_recommendations(session['user_id'])
    
    return render_template('partners.html', user=user, recommendations=recommendations)

@app.route('/api/status-board')
def api_status_board():
    """API endpoint for status board updates"""
    status_data = status_service.get_current_status()
    return jsonify(status_data.to_dict())

@app.route('/api/recommendations')
def api_recommendations():
    """API endpoint for study partner recommendations"""
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in'}), 401
    
    recommendations = recommendation_service.get_recommendations(session['user_id'])
    return jsonify([rec.to_dict() for rec in recommendations])

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)