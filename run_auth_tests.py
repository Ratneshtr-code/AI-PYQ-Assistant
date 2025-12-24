#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Run all authentication/login/logout tests
Usage: python run_auth_tests.py
"""
import subprocess
import sys
import os
from pathlib import Path

# Fix Windows console encoding for emojis
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def check_dependencies():
    """Check if required dependencies are installed"""
    try:
        import pytest
        import sqlalchemy
        import fastapi
        return True
    except ImportError as e:
        print("=" * 70)
        print("ERROR: Missing required dependencies")
        print("=" * 70)
        print()
        print(f"Missing module: {e.name}")
        print()
        print("Please install dependencies:")
        print("  1. Activate your virtual environment:")
        print("     Windows: venv310\\Scripts\\activate")
        print("     Linux/Mac: source venv310/bin/activate")
        print()
        print("  2. Install requirements:")
        print("     pip install -r requirements.txt")
        print()
        return False


def run_tests():
    """Run authentication tests"""
    # Check dependencies first
    if not check_dependencies():
        return 1
    
    # Get project root directory
    script_dir = Path(__file__).parent.absolute()
    project_root = script_dir
    
    print("=" * 70)
    print("Running Authentication & Login/Logout Tests")
    print("=" * 70)
    print()
    
    # Run pytest with verbose output
    cmd = [
        sys.executable, "-m", "pytest",
        "tests/test_auth_api.py",
        "-v",  # Verbose
        "--tb=short",  # Short traceback format
        "--color=yes",  # Colored output
        "-s"  # Show print statements
    ]
    
    print(f"Working directory: {project_root}")
    print(f"Command: {' '.join(cmd)}")
    print()
    print("-" * 70)
    
    try:
        result = subprocess.run(
            cmd,
            cwd=project_root,
            check=False
        )
        
        print()
        print("-" * 70)
        
        if result.returncode == 0:
            print("SUCCESS: ALL AUTHENTICATION TESTS PASSED!")
            print()
            print("Summary:")
            print("  [OK] Login tests")
            print("  [OK] Logout tests")
            print("  [OK] Signup tests")
            print("  [OK] Token refresh tests")
            print("  [OK] Edge cases")
            return 0
        else:
            print("FAILED: SOME TESTS FAILED")
            print(f"   Exit code: {result.returncode}")
            return result.returncode
            
    except KeyboardInterrupt:
        print("\n\nWARNING: Tests interrupted by user")
        return 130
    except Exception as e:
        print(f"\n\nERROR: Error running tests: {e}")
        return 1


if __name__ == "__main__":
    exit_code = run_tests()
    sys.exit(exit_code)

