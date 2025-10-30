from extensions import db
from flask_login import UserMixin
from datetime import datetime

class User(UserMixin, db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(100), nullable=False)
    
    # ADDED: Relationship to vehicles for easy querying
    vehicles = db.relationship('Vehicle', backref='owner', lazy='dynamic') 

    def set_password(self, raw_password):
        self.password = raw_password  # In production, use a secure hash
    
    def check_password(self, input_password):
        return self.password == input_password


class Vehicle(db.Model):
    __tablename__ = 'vehicles'
    id = db.Column(db.Integer, primary_key=True)
    license_plate = db.Column(db.String(20), unique=True, nullable=False)
    make = db.Column(db.String(50))
    model = db.Column(db.String(50))
    color = db.Column(db.String(30))
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)


class IndoorSlot(db.Model):
    __tablename__ = 'indoor_slot'
    id = db.Column(db.Integer, primary_key=True)
    slot_number = db.Column(db.String(10), unique=True, nullable=False)
    status = db.Column(db.String(20), default='available')
    level = db.Column(db.String(10))
    area = db.Column(db.String(50))


class ParkingRecord(db.Model):
    __tablename__ = 'parking_records'
    id = db.Column(db.Integer, primary_key=True)
    vehicle_id = db.Column(db.Integer, db.ForeignKey('vehicles.id'), nullable=False)
    slot_id = db.Column(db.Integer, db.ForeignKey('indoor_slot.id'), nullable=False)
    entry_time = db.Column(db.DateTime, default=datetime.utcnow)
    exit_time = db.Column(db.DateTime, nullable=True)
    parking_type = db.Column(db.String(20))
    fee = db.Column(db.Float, default=0.0)
    # This column aligns with your SQLite schema and is crucial for tracking active records.
    status = db.Column(db.String(20), default='active')  

    vehicle = db.relationship('Vehicle', backref='parkings')
    slot = db.relationship('IndoorSlot', backref='parkings')

    @property
    def duration(self):
        if self.exit_time:
            return int((self.exit_time - self.entry_time).total_seconds() // 60)
        return None