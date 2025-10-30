import os
import json
import logging
from datetime import datetime, timedelta
from random import choice, randint
from flask import render_template, redirect, url_for, request, flash, jsonify, session
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash

from app import app, db
from models import User, Vehicle, ParkingSlot, ParkingRecord
from utils import init_parking_slots, get_available_slots

# Initialize Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Make sure data directory exists
os.makedirs('data', exist_ok=True)

# Initialize parking slots if necessary
with app.app_context():
    init_parking_slots()

# Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
        
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        user = User.query.filter_by(username=username).first()
        if user and user.check_password(password):
            login_user(user)
            next_page = request.args.get('next')
            return redirect(next_page or url_for('dashboard'))
        else:
            flash('Invalid username or password', 'danger')
    
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
        
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        
        # Check if username or email already exists
        if User.query.filter_by(username=username).first():
            flash('Username already exists', 'danger')
            return render_template('register.html')
            
        if User.query.filter_by(email=email).first():
            flash('Email already exists', 'danger')
            return render_template('register.html')
        
        # Create new user
        user = User(username=username, email=email)
        user.set_password(password)
        
        db.session.add(user)
        db.session.commit()
        
        flash('Registration successful! Please log in.', 'success')
        return redirect(url_for('login'))
    
    return render_template('register.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))

@app.route('/dashboard')
@login_required
def dashboard():
    # Get user's vehicles
    vehicles = Vehicle.query.filter_by(user_id=current_user.id).all()
    
    # Get active parking records (where exit_time is None)
    active_parkings = ParkingRecord.query.filter_by(
        user_id=current_user.id, 
        exit_time=None
    ).all()
    
    # Get parking history
    parking_history = ParkingRecord.query.filter_by(
        user_id=current_user.id
    ).filter(ParkingRecord.exit_time != None).order_by(
        ParkingRecord.exit_time.desc()
    ).limit(5).all()
    
    return render_template(
        'dashboard.html', 
        vehicles=vehicles, 
        active_parkings=active_parkings,
        parking_history=parking_history
    )

@app.route('/indoor-parking')
@login_required
def indoor_parking():
    # Get all indoor parking slots
    indoor_slots = ParkingSlot.query.filter_by(location='indoor').all()
    
    # Get user's vehicles
    vehicles = Vehicle.query.filter_by(user_id=current_user.id).all()
    
    return render_template(
        'indoor_parking.html', 
        indoor_slots=indoor_slots,
        vehicles=vehicles
    )

@app.route('/outdoor-parking')
@login_required
def outdoor_parking():
    # Get all outdoor parking slots
    outdoor_slots = ParkingSlot.query.filter_by(location='outdoor').all()
    
    # Get user's vehicles
    vehicles = Vehicle.query.filter_by(user_id=current_user.id).all()
    
    return render_template(
        'outdoor_parking.html', 
        outdoor_slots=outdoor_slots,
        vehicles=vehicles
    )

@app.route('/digital-card')
@login_required
def digital_card():
    # Get user's vehicles
    vehicles = Vehicle.query.filter_by(user_id=current_user.id).all()
    
    # Get parking history
    parking_history = ParkingRecord.query.filter_by(
        user_id=current_user.id
    ).order_by(
        ParkingRecord.entry_time.desc()
    ).all()
    
    return render_template(
        'digital_card.html', 
        vehicles=vehicles,
        parking_history=parking_history
    )

@app.route('/add-vehicle', methods=['POST'])
@login_required
def add_vehicle():
    license_plate = request.form.get('license_plate')
    make = request.form.get('make')
    model = request.form.get('model')
    color = request.form.get('color')
    
    # Check if vehicle already exists
    existing_vehicle = Vehicle.query.filter_by(
        license_plate=license_plate, 
        user_id=current_user.id
    ).first()
    
    if existing_vehicle:
        flash('Vehicle with this license plate already registered', 'danger')
        return redirect(url_for('dashboard'))
    
    # Create new vehicle
    vehicle = Vehicle(
        license_plate=license_plate,
        make=make,
        model=model,
        color=color,
        user_id=current_user.id
    )
    
    db.session.add(vehicle)
    db.session.commit()
    
    flash('Vehicle added successfully', 'success')
    return redirect(url_for('dashboard'))

@app.route('/api/parking-slots')
@login_required
def get_parking_slots():
    location = request.args.get('location', 'indoor')
    slots = ParkingSlot.query.filter_by(location=location).all()
    
    slots_data = [{
        'id': slot.id, 
        'slot_number': slot.slot_number,
        'location': slot.location,
        'area': slot.area,
        'is_occupied': slot.is_occupied,
        'coordinates': slot.coordinates
    } for slot in slots]
    
    return jsonify(slots_data)

@app.route('/api/parking-entry', methods=['POST'])
@login_required
def parking_entry():
    data = request.get_json()
    vehicle_id = data.get('vehicle_id')
    slot_id = data.get('slot_id')
    parking_type = data.get('parking_type', 'Indoor')
    
    # Validate data
    if not vehicle_id or not slot_id:
        return jsonify({'success': False, 'message': 'Missing required data'}), 400
    
    # Check if vehicle exists and belongs to current user
    vehicle = Vehicle.query.filter_by(id=vehicle_id, user_id=current_user.id).first()
    if not vehicle:
        return jsonify({'success': False, 'message': 'Vehicle not found'}), 404
    
    # Check if slot exists and is available
    slot = ParkingSlot.query.filter_by(id=slot_id).first()
    if not slot:
        return jsonify({'success': False, 'message': 'Parking slot not found'}), 404
    
    if slot.is_occupied:
        return jsonify({'success': False, 'message': 'Parking slot is already occupied'}), 400
    
    # Create parking record
    parking_record = ParkingRecord(
        user_id=current_user.id,
        vehicle_id=vehicle_id,
        slot_id=slot_id,
        parking_type=parking_type
    )
    
    # Update slot status
    slot.is_occupied = True
    
    # Save to database
    db.session.add(parking_record)
    db.session.commit()
    
    return jsonify({
        'success': True, 
        'message': f'Vehicle {vehicle.license_plate} parked successfully in slot {slot.slot_number}',
        'record_id': parking_record.id
    })

@app.route('/api/parking-exit', methods=['POST'])
@login_required
def parking_exit():
    data = request.get_json()
    record_id = data.get('record_id')
    
    # Validate data
    if not record_id:
        return jsonify({'success': False, 'message': 'Missing record ID'}), 400
    
    # Find the parking record
    record = ParkingRecord.query.filter_by(id=record_id, user_id=current_user.id).first()
    if not record:
        return jsonify({'success': False, 'message': 'Parking record not found'}), 404
    
    # Check if already exited
    if record.exit_time:
        return jsonify({'success': False, 'message': 'Vehicle has already exited'}), 400
    
    # Update parking record
    record.exit_time = datetime.utcnow()
    record.calculate_fee()
    record.payment_status = 'Paid'  # Simulating payment
    
    # Free up the slot
    slot = ParkingSlot.query.get(record.slot_id)
    if slot:
        slot.is_occupied = False
    
    # Save to database
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Vehicle exit processed successfully',
        'duration': record.duration,
        'fee': record.fee
    })

@app.route('/api/simulate-license-detection', methods=['POST'])
@login_required
def simulate_license_detection():
    data = request.get_json()
    license_plate = data.get('license_plate')
    parking_type = data.get('parking_type', 'Indoor')
    
    # Find vehicle with this license plate
    vehicle = Vehicle.query.filter_by(license_plate=license_plate).first()
    
    if not vehicle:
        return jsonify({
            'success': False,
            'message': f'Vehicle with license plate {license_plate} not found in system'
        }), 404
    
    # Find available slot based on parking type
    available_slots = get_available_slots(parking_type.lower())
    
    if not available_slots:
        return jsonify({
            'success': False,
            'message': f'No available {parking_type} parking slots'
        }), 400
    
    # Randomly assign a slot
    selected_slot = choice(available_slots)
    
    return jsonify({
        'success': True,
        'message': f'License plate {license_plate} detected',
        'vehicle_id': vehicle.id,
        'vehicle_info': {
            'license_plate': vehicle.license_plate,
            'make': vehicle.make,
            'model': vehicle.model,
            'color': vehicle.color
        },
        'slot_id': selected_slot.id,
        'slot_number': selected_slot.slot_number,
        'slot_area': selected_slot.area
    })

@app.route('/api/nearest-outdoor-slot', methods=['POST'])
@login_required
def find_nearest_outdoor_slot():
    data = request.get_json()
    user_lat = data.get('latitude')
    user_lng = data.get('longitude')
    
    # Get available outdoor slots
    outdoor_slots = get_available_slots('outdoor')
    
    if not outdoor_slots:
        return jsonify({
            'success': False,
            'message': 'No available outdoor parking slots'
        }), 400
    
    # In a real app, we would calculate the actual closest slot
    # For this demo, we'll randomly select an available slot
    selected_slot = choice(outdoor_slots)
    
    # Parse coordinates (in a real app, these would be actual GPS coordinates)
    # Format: "latitude,longitude"
    if selected_slot.coordinates:
        coords = selected_slot.coordinates.split(',')
        slot_lat = float(coords[0])
        slot_lng = float(coords[1])
    else:
        # Generate random nearby coordinates if none are stored
        slot_lat = float(user_lat) + (randint(-10, 10) / 1000)
        slot_lng = float(user_lng) + (randint(-10, 10) / 1000)
    
    return jsonify({
        'success': True,
        'slot_id': selected_slot.id,
        'slot_number': selected_slot.slot_number,
        'coordinates': {
            'latitude': slot_lat,
            'longitude': slot_lng
        },
        'distance': randint(50, 500),  # Simulated distance in meters
        'estimated_time': randint(1, 5)  # Simulated walking time in minutes
    })
