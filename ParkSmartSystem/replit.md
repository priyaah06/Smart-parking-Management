# Smart Parking System

## Overview

This is a web-based Smart Parking System built with Flask that allows users to manage indoor and outdoor parking spaces. The application enables users to register, log in, add vehicles, find available parking slots, and track parking history.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Backend
- **Python Flask**: The core backend framework handling routing, request processing, and view rendering.
- **SQLAlchemy ORM**: Used for database operations through the Flask-SQLAlchemy extension.
- **Flask-Login**: Manages user authentication and session handling.

### Frontend
- **HTML/CSS/JavaScript**: Standard web technologies for the user interface.
- **Bootstrap**: CSS framework using the Replit dark theme for responsive design.
- **Font Awesome**: Provides icons across the application.

### Database
- **SQLite**: Currently used for development with a file-based database (`parking_system.db`).
- **PostgreSQL**: Configuration ready in `.replit` for potential deployment with Postgres.

### Authentication
- **Session-based authentication**: Implemented with Flask-Login for user management.
- **Salted password hashing**: Uses Werkzeug's security utilities for password protection.

## Key Components

### Database Models
- **User**: Stores user credentials and profile information.
- **Vehicle**: Contains details about user-registered vehicles.
- **ParkingSlot**: Represents parking spaces with their status and location.
- **ParkingRecord**: Tracks parking sessions, including entry and exit times.

### Routes and Views
- **Authentication**: Login, logout, and registration endpoints.
- **Dashboard**: Overview of user parking activities.
- **Indoor Parking**: Management of indoor parking spaces.
- **Outdoor Parking**: Management of outdoor parking spaces with map integration.
- **Digital Card**: Digital representation of a parking card with usage history.

### Frontend Features
- **Responsive UI**: Adapts to different screen sizes.
- **Interactive Parking Map**: Visual representation of available and occupied spaces.
- **License Plate Detection**: Simulated detection feature for quickly finding slots.
- **Maps Integration**: For outdoor parking navigation.

## Data Flow

1. **User Registration/Login**:
   - Users register with username, email, and password.
   - Passwords are hashed before storage in the database.
   - Upon login, Flask-Login manages user sessions.

2. **Vehicle Management**:
   - Authenticated users can add/manage vehicles in their account.
   - Vehicle data is stored in the database with a relation to the user.

3. **Parking Operations**:
   - Users can view available parking slots (indoor or outdoor).
   - When a user selects a parking slot, a new parking record is created.
   - Upon exit, the parking record is updated with exit time and fee calculations.

4. **History and Analytics**:
   - Parking history is stored in the database.
   - Users can view their past parking records through the digital card interface.

## External Dependencies

### Python Packages
- **flask**: Web framework
- **flask-sqlalchemy**: ORM for database operations
- **flask-login**: User session management
- **werkzeug**: Security utilities for password hashing
- **gunicorn**: WSGI HTTP server for deployment
- **psycopg2-binary**: PostgreSQL adapter
- **email-validator**: Email validation
- **flask-dance**: OAuth integration (prepared but not fully implemented)
- **oauthlib**: OAuth implementation
- **pyjwt**: JSON Web Token implementation

### Frontend Libraries
- **Bootstrap**: CSS framework for responsive design
- **Font Awesome**: Icon library
- **Google Maps API**: For outdoor parking map visualization (referenced in outdoor_parking.js)

## Deployment Strategy

The application is configured for deployment on Replit with the following characteristics:

1. **Runtime Environment**:
   - Python 3.11 with necessary dependencies
   - openssl and postgresql packages in the Nix environment

2. **Database**:
   - Development: SQLite (file-based database)
   - Production: Ready for PostgreSQL with environment variable configuration

3. **Server**:
   - Gunicorn as the WSGI HTTP server
   - Binding to 0.0.0.0:5000

4. **Workflow Configuration**:
   - Configured with run button to start the application
   - Parallel execution mode
   - Auto-reloading enabled for development convenience

5. **Scaling**:
   - Set up for autoscaling deployment target
   - ProxyFix middleware to handle proper URL generation behind proxies

## Development Guidelines

1. **Database Changes**:
   - Models are defined in `models.py`
   - When adding new models or modifying existing ones, remember to update the imports in `app.py`
   - Database is automatically created on first run

2. **Adding New Features**:
   - Add new routes in `routes.py`
   - Create new templates in the `templates` directory
   - Add static assets (JS, CSS) in the `static` directory

3. **Authentication**:
   - User authentication is handled by Flask-Login
   - Protect routes that require authentication with the `@login_required` decorator

4. **Environment Variables**:
   - `DATABASE_URL`: Database connection string (defaults to SQLite)
   - `SESSION_SECRET`: Secret key for Flask sessions (defaults to "parkingsystem_secret_key")