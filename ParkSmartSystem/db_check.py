"""
Database check script for the Car Parking System
This script will check if the SQLite database exists and can be accessed.
"""
import os
import sqlite3
import sys

def check_database():
    print("Checking SQLite database for Car Parking System...")
    
    # Check if the database file exists
    db_path = os.path.join(os.path.dirname(__file__), 'mydatabase.db')
    
    if not os.path.exists(db_path):
        print(f"Database file not found at: {db_path}")
        print("The database will be created when you run the application.")
        return False
    
    # Try to connect to the database
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if tables exist
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        
        if not tables:
            print("Database exists but contains no tables.")
            print("Tables will be created when you run the application.")
            return False
        
        print(f"Database found with {len(tables)} tables:")
        for table in tables:
            print(f"- {table[0]}")
        
        conn.close()
        return True
    
    except sqlite3.Error as e:
        print(f"Error connecting to database: {e}")
        return False

if __name__ == "__main__":
    check_database()