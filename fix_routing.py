#!/usr/bin/env python3
"""
Quick fix script voor CRM routing problemen
Run dit vanuit de project root: C:\Users\Vulpe\Ai\Final-CRM
"""

import os
from pathlib import Path

def fix_frontend_api_calls():
    """Fix frontend API calls to match backend routes"""
    api_file = Path("frontend/src/services/api.js")
    
    with open(api_file, 'r') as f:
        content = f.read()
    
    # Fix work-orders to work_orders
    replacements = [
        ('"/work-orders"', '"/work_orders"'),
        ('"/work-orders/', '"/work_orders/'),
        ('`/work-orders/', '`/work_orders/'),
    ]
    
    for old, new in replacements:
        content = content.replace(old, new)
    
    with open(api_file, 'w') as f:
        f.write(content)
    print("✅ Fixed frontend API calls")

def check_app_initialization():
    """Check if app.py properly calls register_routes"""
    app_files = [
        Path("backend/src/app.py"),
        Path("backend/app.py"),
        Path("backend/main.py"),
        Path("backend/src/main.py")
    ]
    
    for app_file in app_files:
        if app_file.exists():
            with open(app_file, 'r') as f:
                content = f.read()
            
            if 'register_routes' not in content:
                print(f"⚠️  {app_file} does not call register_routes()")
                print("   Add this line after creating the Flask app:")
                print("   from src.routes import register_routes")
                print("   register_routes(app)")
            else:
                print(f"✅ {app_file} properly registers routes")
            break

def main():
    """Run all fixes"""
    print("🔧 Fixing CRM routing issues...\n")
    
    # Check current directory
    if not Path("backend").exists() or not Path("frontend").exists():
        print("❌ Error: Run this script from the project root directory")
        print(f"   Current directory: {os.getcwd()}")
        print("   Expected: C:\\Users\\Vulpe\\Ai\\Final-CRM")
        return
    
    # Apply fixes
    print("✅ Routes __init__.py already fixed")
    fix_frontend_api_calls()
    check_app_initialization()
    
    print("\n✨ Fixes applied!")
    print("\n📋 Next steps:")
    print("1. Check if your backend app.py calls register_routes(app)")
    print("2. Restart both backend and frontend servers")
    print("3. Test the routes in your browser")

if __name__ == "__main__":
    main()
