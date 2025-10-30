"""
Local setup script for the Car Parking System
This script will create a SQLite database and install required dependencies.
"""
import os
import subprocess
import sys

def setup_local_environment():
    print("Setting up local environment for Car Parking System...")
    
    # Create directory for the database if it doesn't exist
    os.makedirs('data', exist_ok=True)
    
    # Check if Python is installed
    print("Checking Python installation...")
    if sys.version_info < (3, 6):
        print("Error: Python 3.6 or higher is required.")
        sys.exit(1)
    
    # List of required packages
    required_packages = [
        "flask==2.3.3",
        "flask-login==0.6.2",
        "flask-sqlalchemy==3.1.1",
        "sqlalchemy==2.0.25",
        "werkzeug==2.3.7",
        "email-validator==2.1.0",
        "gunicorn==23.0.0",
    ]
    
    # Install required packages
    print("\nInstalling required packages...")
    for package in required_packages:
        print(f"Installing {package}...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", package])
        except subprocess.CalledProcessError:
            print(f"Error installing {package}. Please install it manually.")
    
    print("\nSetup complete! You can now run the application with:")
    print("  python main.py")
    print("\nOr with Flask directly:")
    print("  flask run")

if __name__ == "__main__":
    setup_local_environment()