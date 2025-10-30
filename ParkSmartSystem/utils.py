import random
import logging
from models import ParkingSlot, db

def init_parking_slots():
    """Initialize parking slots if they don't exist"""
    # Check if slots already exist
    if ParkingSlot.query.first():
        return
    
    logging.info("Initializing parking slots")
    
    # Create indoor parking slots
    indoor_areas = ['Level 1', 'Level 2', 'Level 3']
    for area in indoor_areas:
        area_code = area.replace(" ", "")  # Remove spaces: "Level 1" -> "Level1"
        
        for i in range(1, 11):  # 10 slots per level
            # Create unique slot numbers: L101, L102, L201, etc.
            slot_number = f"{area_code[0]}{area_code[-1]}{i:02d}"
            
            # Create new slot object and add to session
            new_slot = ParkingSlot()
            new_slot.slot_number = slot_number
            new_slot.location = 'indoor'
            new_slot.area = area
            new_slot.is_occupied = random.random() < 0.3  # 30% chance to be occupied
            db.session.add(new_slot)
    
    # Create outdoor parking slots
    outdoor_areas = ['North Lot', 'East Lot', 'West Lot']
    base_coords = {
        'North Lot': (40.7128, -74.0060),  # Random coordinates
        'East Lot': (40.7138, -74.0050),
        'West Lot': (40.7118, -74.0070)
    }
    
    for area in outdoor_areas:
        area_code = area.split()[0]  # "North Lot" -> "North"
        base_lat, base_lng = base_coords[area]
        
        for i in range(1, 16):  # 15 slots per lot
            # Create unique slot numbers: N01, N02, E01, etc.
            slot_number = f"{area_code[0]}{i:02d}"
            
            # Generate nearby coordinates
            lat = base_lat + (random.randint(-10, 10) / 1000)
            lng = base_lng + (random.randint(-10, 10) / 1000)
            
            # Create new slot object and add to session
            new_slot = ParkingSlot()
            new_slot.slot_number = slot_number
            new_slot.location = 'outdoor'
            new_slot.area = area
            new_slot.is_occupied = random.random() < 0.3  # 30% chance to be occupied
            new_slot.coordinates = f"{lat},{lng}"
            db.session.add(new_slot)
    
    db.session.commit()
    logging.info(f"Created {ParkingSlot.query.count()} parking slots")

def get_available_slots(location='indoor'):
    """Get available parking slots for a given location"""
    return ParkingSlot.query.filter_by(location=location, is_occupied=False).all()

def calculate_parking_fee(duration_minutes):
    """Calculate parking fee based on duration in minutes"""
    # Simple fee calculation: $2 per hour, minimum 1 hour
    hours = max(1, duration_minutes / 60)
    return round(hours * 2, 2)
