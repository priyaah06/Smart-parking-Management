# Smart Parking System

A web-based smart parking system that allows you to manage indoor and outdoor parking spaces with vehicle management, simulated license plate recognition, and payment tracking.

## Features

- **User Authentication**: Register and login to access the system
- **Vehicle Management**: Add and track multiple vehicles
- **Indoor Parking**: Visual grid display of available slots
- **Outdoor Parking**: Map integration with GPS for finding parking slots
- **Digital Parking Card**: Track parking history and payments
- **License Plate Recognition**: Simulated detection for quick parking

## Setup Instructions

### Requirements

- Python 3.6 or higher
- SQLite (included in Python)

### Local Installation

1. Clone this repository
2. Run the setup script:
   ```
   python setup_local.py
   ```
   This will install all required dependencies.

3. Run the application:
   ```
   python main.py
   ```

4. Open your browser and go to:
   ```
   http://localhost:5000
   ```

### Manual Setup

If you prefer to set up manually:

1. Install dependencies:
   ```
   pip install flask flask-login flask-sqlalchemy sqlalchemy werkzeug email-validator gunicorn
   ```

2. Run the application:
   ```
   python main.py
   ```

## Usage Guide

1. **Register/Login**: Create an account or login to access the system
2. **Add Vehicles**: Register your vehicles in the system
3. **Find Parking**: Choose between indoor or outdoor parking options
4. **Park Vehicle**: Select an available slot and park your vehicle
5. **Exit Parking**: Use the digital card to exit and calculate payment

## Database

The application uses SQLite for simplicity. The database file (`mydatabase.db`) will be created automatically in the project directory when you start the application.

## Development

- Built with Flask (Python)
- Uses SQLite for database
- Bootstrap for responsive UI
- JavaScript for interactive features