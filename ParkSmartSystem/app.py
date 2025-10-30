import os
import logging
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
from werkzeug.middleware.proxy_fix import ProxyFix
from flask_login import current_user, login_user, logout_user, login_required

from extensions import db, login_manager
from models import User, Vehicle, IndoorSlot, ParkingRecord

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# Initialize Flask app
app = Flask(__name__)
app.secret_key = "parkingsystem_secret_key"
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

# Configure SQLite database
db_path = os.path.join(os.path.dirname(__file__), 'mydatabase.db')
app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{db_path}"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Initialize extensions
db.init_app(app)
login_manager.init_app(app)
login_manager.login_view = 'login'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@app.context_processor
def inject_user():
    return dict(current_user=current_user)

# -------- Helper functions --------
def get_all_indoor_slots():
    return IndoorSlot.query.all()

def get_all_vehicles():
    return Vehicle.query.filter_by(user_id=current_user.id).all()

def lookup_vehicle_by_plate(plate):
    return Vehicle.query.filter_by(license_plate=plate).first()

# -------- Routes --------
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')

        if User.query.filter((User.username == username) | (User.email == email)).first():
            flash("Username or email already exists", "danger")
            return redirect(url_for('register'))

        new_user = User(username=username, email=email)
        new_user.set_password(password)
        db.session.add(new_user)
        db.session.commit()

        login_user(new_user)
        flash("Registration successful!", "success")
        return redirect(url_for('index'))

    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        user = User.query.filter_by(username=username).first()
        if user and user.check_password(password):
            login_user(user)
            return redirect(url_for('index'))
        flash('Invalid username or password', 'danger')
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    flash('Logged out successfully', 'info')
    return redirect(url_for('index'))

@app.route('/dashboard')
@login_required
def dashboard():
    vehicles = Vehicle.query.filter_by(user_id=current_user.id).all()
    vehicle_ids = [v.id for v in vehicles]

    active_parkings = ParkingRecord.query.filter(
        ParkingRecord.vehicle_id.in_(vehicle_ids),
        ParkingRecord.status == 'active'
    ).all()

    history_records = ParkingRecord.query.filter(
        ParkingRecord.vehicle_id.in_(vehicle_ids),
        ParkingRecord.status == 'completed'
    ).order_by(ParkingRecord.exit_time.desc()).limit(5).all()

    return render_template('dashboard.html',
                           vehicles=vehicles,
                           active_parkings=active_parkings,
                           parking_history=history_records)

@app.route('/indoor-parking', methods=['GET', 'POST'])
@login_required
def indoor_parking():
    indoor_slots = get_all_indoor_slots()
    vehicles = Vehicle.query.filter_by(user_id=current_user.id).all()

    vehicle_info = None
    if request.method == 'POST':
        plate = request.form.get('plate_number') or request.form.get('license-plate-input')
        vehicle_info = lookup_vehicle_by_plate(plate)

    return render_template('indoor_parking.html', indoor_slots=indoor_slots, vehicles=vehicles, vehicle=vehicle_info)

@app.route('/outdoor-parking')
@login_required
def outdoor_parking():
    return render_template('outdoor_parking.html')

@app.route('/digital-card')
@login_required
def digital_card():
    # Get the current user's vehicles
    vehicles = Vehicle.query.filter_by(user_id=current_user.id).all()

    # Get the most recent active or last parking record
    parking_records = ParkingRecord.query\
        .join(Vehicle)\
        .filter(Vehicle.user_id == current_user.id)\
        .order_by(ParkingRecord.entry_time.desc())\
        .limit(1).all()

    return render_template("digital_card.html", vehicles=vehicles, recent=parking_records[0] if parking_records else None)


@app.route('/add-vehicle', methods=['GET', 'POST'])
@login_required
def add_vehicle():
    if request.method == 'POST':
        license_plate = request.form.get('license_plate')
        make = request.form.get('make')
        model = request.form.get('model')
        color = request.form.get('color')

        new_vehicle = Vehicle(
            license_plate=license_plate,
            make=make,
            model=model,
            color=color,
            user_id=current_user.id
        )
        db.session.add(new_vehicle)
        db.session.commit()

        flash('Vehicle added successfully!', 'success')
        return redirect(url_for('dashboard'))

    return render_template('add_vehicle.html')

# -------- APIs --------
@app.route('/api/simulate-license-detection', methods=['POST'])
def simulate_license_detection():
    data = request.get_json()
    license_plate = data.get('license_plate') or data.get('plate')
    return jsonify({
        "success": True,
        "message": f"Simulated detection for plate {license_plate}",
        "vehicle_info": {
            "license_plate": license_plate,
            "make": "Toyota",
            "model": "Camry",
            "color": "Black"
        },
        "slot_id": 101,
        "slot_number": "A1",
        "slot_area": "Level 1",
        "level": "1",
        "vehicle_id": 1
    })

@app.route('/api/parking-entry', methods=['POST'])
@login_required
def parking_entry():
    data = request.get_json()
    vehicle_id = data.get('vehicle_id')
    slot_id = data.get('slot_id')
    parking_type = data.get('parking_type')

    if not vehicle_id or not slot_id or not parking_type:
        return jsonify({"success": False, "message": "Missing data"}), 400

    slot = IndoorSlot.query.get(slot_id)
    if not slot:
        return jsonify({"success": False, "message": "Invalid slot ID"}), 404

    slot.status = 'occupied'
    db.session.commit()

    return jsonify({"success": True, "message": f"Vehicle parked successfully in slot {slot.slot_number}"})

@app.route('/api/parking-slots')
@login_required
def get_parking_slots():
    location = request.args.get('location')
    if location == 'indoor':
        slots = IndoorSlot.query.all()
        return jsonify([{
            "id": slot.id,
            "number": slot.slot_number,
            "status": slot.status,
            "level": slot.level
        } for slot in slots])
    return jsonify({"error": "Invalid location"}), 400

# -------- Bootstrap the DB --------
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        if not IndoorSlot.query.first():
            slots = [
                IndoorSlot(id=101, slot_number='A1', status='available', level='1', area='Level 1'),
                IndoorSlot(id=102, slot_number='A2', status='available', level='1', area='Level 1'),
                IndoorSlot(id=103, slot_number='A3', status='available', level='1', area='Level 1'),
                IndoorSlot(id=104, slot_number='B1', status='available', level='2', area='Level 2'),
                IndoorSlot(id=105, slot_number='B2', status='available', level='2', area='Level 2'),
                IndoorSlot(id=106, slot_number='B3', status='available', level='2', area='Level 2'),
                IndoorSlot(id=107, slot_number='C1', status='available', level='3', area='Level 3'),
                IndoorSlot(id=108, slot_number='C2', status='available', level='3', area='Level 3'),
                IndoorSlot(id=109, slot_number='C3', status='available', level='3', area='Level 3'),
                IndoorSlot(id=110, slot_number='VIP1', status='available', level='G', area='VIP Section'),
            ]
            db.session.bulk_save_objects(slots)
            db.session.commit()
            print("Seeded 10 parking slots.")

    app.run(debug=True)
