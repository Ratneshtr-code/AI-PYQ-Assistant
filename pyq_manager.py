#!/usr/bin/env python3
"""
AI PYQ Manager - Unified CLI Tool for All Project Operations

A single command-line tool to manage all aspects of the AI PYQ project:
- Build FAISS index
- Start backend server
- Start frontend
- Manage testing cache
- Review prompts
- Analyze dataset
- Manage users and subscriptions
- View LLM token usage
- And more...

Usage:
    python pyq_manager.py
    python pyq_manager.py --help
"""

import argparse
import subprocess
import sys
import os
from pathlib import Path
from typing import Optional, List


class Colors:
    """ANSI color codes for terminal output"""
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'


def print_header(text: str):
    """Print formatted header"""
    print(f"\n{Colors.BOLD}{Colors.CYAN}{'='*70}{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.CYAN}{text.center(70)}{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.CYAN}{'='*70}{Colors.ENDC}\n")


def print_success(text: str):
    """Print success message"""
    print(f"{Colors.GREEN}✅ {text}{Colors.ENDC}")


def print_error(text: str):
    """Print error message"""
    print(f"{Colors.RED}❌ {text}{Colors.ENDC}")


def print_info(text: str):
    """Print info message"""
    print(f"{Colors.BLUE}ℹ️  {text}{Colors.ENDC}")


def print_warning(text: str):
    """Print warning message"""
    print(f"{Colors.YELLOW}⚠️  {text}{Colors.ENDC}")


def check_file_exists(filepath: str) -> bool:
    """Check if a file exists"""
    return Path(filepath).exists()


def get_project_root() -> Path:
    """Get project root directory"""
    return Path(__file__).parent


def find_venv() -> Optional[Path]:
    """Find virtual environment directory"""
    project_root = get_project_root()
    
    # Common venv names
    venv_names = ["venv310", "venv", ".venv", "env"]
    
    for venv_name in venv_names:
        venv_path = project_root / venv_name
        if venv_path.exists() and venv_path.is_dir():
            # Check if it's a valid venv (has Scripts/bin directory)
            if (venv_path / "Scripts").exists() or (venv_path / "bin").exists():
                return venv_path
    
    return None


def get_python_executable() -> str:
    """Get Python executable, preferring venv if available"""
    # Check if we're already in a venv
    if hasattr(sys, 'real_prefix') or (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix):
        # Already in a venv
        return sys.executable
    
    # Try to find and use venv
    venv_path = find_venv()
    if venv_path:
        # Windows
        venv_python = venv_path / "Scripts" / "python.exe"
        if venv_python.exists():
            print_info(f"Using virtual environment: {venv_path.name}")
            return str(venv_python)
        
        # Linux/Mac
        venv_python = venv_path / "bin" / "python"
        if venv_python.exists():
            print_info(f"Using virtual environment: {venv_path.name}")
            return str(venv_python)
    
    # Fall back to system Python
    print_warning("No virtual environment found. Using system Python.")
    return sys.executable


def get_venv_activate_command() -> Optional[List[str]]:
    """Get command to activate venv in subprocess (for shell commands)"""
    venv_path = find_venv()
    if not venv_path:
        return None
    
    # Windows
    if os.name == 'nt':
        activate_script = venv_path / "Scripts" / "activate.bat"
        if activate_script.exists():
            return ["cmd", "/c", str(activate_script)]
        activate_ps1 = venv_path / "Scripts" / "Activate.ps1"
        if activate_ps1.exists():
            return ["powershell", "-ExecutionPolicy", "Bypass", "-File", str(activate_ps1)]
    
    # Linux/Mac
    activate_script = venv_path / "bin" / "activate"
    if activate_script.exists():
        return ["bash", "-c", f"source {activate_script} && exec $SHELL"]
    
    return None


def run_python_script(script_path: Path, *args, **kwargs) -> subprocess.CompletedProcess:
    """Run a Python script using the appropriate Python executable"""
    python_exe = get_python_executable()
    cmd = [python_exe, str(script_path)] + list(args)
    
    # Update kwargs with default cwd
    if 'cwd' not in kwargs:
        kwargs['cwd'] = get_project_root()
    
    return subprocess.run(cmd, **kwargs)


def build_faiss_index():
    """Build FAISS index from dataset"""
    print_header("Building FAISS Index")
    
    # Check both locations
    script_path = get_project_root() / "build_faiss_index.py"
    if not script_path.exists():
        script_path = get_project_root() / "app" / "build_faiss_index.py"
    
    if not script_path.exists():
        print_error(f"Script not found: {script_path}")
        return False
    
    print_info("Starting FAISS index build...")
    print_info("This may take a few minutes depending on dataset size.")
    print()
    
    try:
        result = run_python_script(script_path, check=True)
        print_success("FAISS index built successfully!")
        return True
    except subprocess.CalledProcessError as e:
        print_error(f"Failed to build FAISS index: {e}")
        return False
    except KeyboardInterrupt:
        print_warning("FAISS index build cancelled by user.")
        return False


def start_backend():
    """Start FastAPI backend server"""
    print_header("Starting Backend Server")
    
    script_path = get_project_root() / "app" / "search_api.py"
    if not script_path.exists():
        print_error(f"Backend script not found: {script_path}")
        return False
    
    print_info("Starting FastAPI backend server on http://127.0.0.1:8000")
    print_info("Press Ctrl+C to stop the server")
    print()
    
    python_exe = get_python_executable()
    
    try:
        # Use uvicorn to run FastAPI
        subprocess.run(
            [python_exe, "-m", "uvicorn", "app.search_api:app", "--host", "127.0.0.1", "--port", "8000", "--reload"],
            cwd=get_project_root(),
            check=True
        )
    except subprocess.CalledProcessError as e:
        print_error(f"Failed to start backend: {e}")
        print_info("Make sure uvicorn is installed: pip install uvicorn")
        return False
    except KeyboardInterrupt:
        print_warning("Backend server stopped by user.")
        return True
    except FileNotFoundError:
        print_error("uvicorn not found. Install it with: pip install uvicorn")
        return False


def start_frontend():
    """Start React frontend development server"""
    print_header("Starting Frontend Server")
    
    frontend_dir = get_project_root() / "ai_pyq_ui"
    if not frontend_dir.exists():
        print_error(f"Frontend directory not found: {frontend_dir}")
        return False
    
    package_json = frontend_dir / "package.json"
    if not package_json.exists():
        print_error("package.json not found. Is this a valid React project?")
        return False
    
    print_info("Starting React frontend development server...")
    print_info("Frontend will be available at http://localhost:5173 (or similar)")
    print_info("Press Ctrl+C to stop the server")
    print()
    
    try:
        # Check if node_modules exists
        if not (frontend_dir / "node_modules").exists():
            print_warning("node_modules not found. Installing dependencies...")
            subprocess.run(["npm", "install"], cwd=frontend_dir, check=True)
        
        # Start dev server
        subprocess.run(["npm", "run", "dev"], cwd=frontend_dir, check=True)
    except subprocess.CalledProcessError as e:
        print_error(f"Failed to start frontend: {e}")
        return False
    except KeyboardInterrupt:
        print_warning("Frontend server stopped by user.")
        return True
    except FileNotFoundError:
        print_error("npm not found. Please install Node.js and npm.")
        return False


def manage_testing_cache():
    """Manage testing cache"""
    print_header("Testing Cache Management")
    
    script_path = get_project_root() / "manage_testing_cache.py"
    if not script_path.exists():
        print_error(f"Script not found: {script_path}")
        return False
    
    print_info("Opening testing cache manager...")
    print()
    
    try:
        run_python_script(script_path, check=True)
        return True
    except subprocess.CalledProcessError as e:
        print_error(f"Failed to run cache manager: {e}")
        return False
    except KeyboardInterrupt:
        return True


def review_prompts():
    """Review LLM prompts and responses"""
    print_header("Prompt Review")
    
    script_path = get_project_root() / "review_prompts.py"
    if not script_path.exists():
        print_error(f"Script not found: {script_path}")
        return False
    
    print_info("Opening prompt review tool...")
    print()
    
    try:
        run_python_script(script_path, check=True)
        return True
    except subprocess.CalledProcessError as e:
        print_error(f"Failed to run prompt review: {e}")
        return False
    except KeyboardInterrupt:
        return True


def analyze_dataset():
    """Analyze dataset"""
    print_header("Dataset Analysis")
    
    # Check both locations
    script_path = get_project_root() / "analyze_dataset.py"
    if not script_path.exists():
        script_path = get_project_root() / "app" / "analyze_dataset.py"
    
    if not script_path.exists():
        print_error(f"Script not found: {script_path}")
        print_info("Creating analyze_dataset.py is recommended for dataset insights.")
        return False
    
    print_info("Starting dataset analysis...")
    print()
    
    try:
        run_python_script(script_path, check=True)
        return True
    except subprocess.CalledProcessError as e:
        print_error(f"Failed to analyze dataset: {e}")
        return False
    except KeyboardInterrupt:
        return True


def list_gemini_models():
    """List available Gemini models"""
    print_header("Listing Gemini Models")
    
    script_path = get_project_root() / "list_gemini_models.py"
    if not script_path.exists():
        print_error(f"Script not found: {script_path}")
        return False
    
    print_info("Fetching available Gemini models...")
    print()
    
    try:
        run_python_script(script_path, check=True)
        return True
    except subprocess.CalledProcessError as e:
        print_error(f"Failed to list models: {e}")
        return False
    except KeyboardInterrupt:
        return True


def manage_users():
    """Manage users and view subscription information"""
    print_header("User Management")
    
    # Import user management functions
    try:
        from manage_users import list_users, view_user_details, search_users, show_user_attempts
        from app.database import init_db
        
        # Initialize database
        init_db()
        
        while True:
            print(f"\n{Colors.BOLD}User Management Options:{Colors.ENDC}\n")
            print(f"  {Colors.CYAN}1.{Colors.ENDC} List all users")
            print(f"  {Colors.CYAN}2.{Colors.ENDC} View user details")
            print(f"  {Colors.CYAN}3.{Colors.ENDC} Search users")
            print(f"  {Colors.CYAN}4.{Colors.ENDC} Show user attempts (My Attempts)")
            print(f"  {Colors.CYAN}0.{Colors.ENDC} Back to main menu")
            print()
            
            choice = input(f"{Colors.BOLD}Enter choice (0-4):{Colors.ENDC} ").strip()
            
            if choice == "0":
                break
            elif choice == "1":
                list_users()
            elif choice == "2":
                try:
                    user_id = int(input("Enter user ID: ").strip())
                    view_user_details(user_id)
                except ValueError:
                    print_error("Invalid user ID")
            elif choice == "3":
                query = input("Enter search query (username or email): ").strip()
                if query:
                    search_users(query)
                else:
                    print_error("Query cannot be empty")
            elif choice == "4":
                show_user_attempts()
            else:
                print_error(f"Invalid choice: {choice}")
            
            if choice != "0":
                input(f"\n{Colors.YELLOW}Press Enter to continue...{Colors.ENDC}")
        
        return True
    except ImportError as e:
        print_error(f"Failed to import user management functions: {e}")
        print_info("Make sure manage_users.py exists in the project root")
        return False
    except KeyboardInterrupt:
        return True


def manage_token_usage():
    """Manage and view LLM token usage"""
    print_header("Token Usage Management")
    
    # Import token usage functions
    try:
        from manage_token_usage import user_token_summary, user_detailed_usage, top_users_by_usage
        from app.database import init_db
        
        # Initialize database
        init_db()
        
        while True:
            print(f"\n{Colors.BOLD}Token Usage Options:{Colors.ENDC}\n")
            print(f"  {Colors.CYAN}1.{Colors.ENDC} Token usage summary (all users)")
            print(f"  {Colors.CYAN}2.{Colors.ENDC} Token usage summary (last N days)")
            print(f"  {Colors.CYAN}3.{Colors.ENDC} Detailed usage for a user")
            print(f"  {Colors.CYAN}4.{Colors.ENDC} Top users by token usage")
            print(f"  {Colors.CYAN}0.{Colors.ENDC} Back to main menu")
            print()
            
            choice = input(f"{Colors.BOLD}Enter choice (0-4):{Colors.ENDC} ").strip()
            
            if choice == "0":
                break
            elif choice == "1":
                user_token_summary()
            elif choice == "2":
                try:
                    days = int(input("Enter number of days: ").strip())
                    user_token_summary(days=days)
                except ValueError:
                    print_error("Invalid number of days")
            elif choice == "3":
                try:
                    user_id = int(input("Enter user ID: ").strip())
                    days_input = input("Enter number of days (default 30): ").strip()
                    days = int(days_input) if days_input else 30
                    user_detailed_usage(user_id, days)
                except ValueError:
                    print_error("Invalid user ID or days")
            elif choice == "4":
                try:
                    limit_input = input("Enter number of users to show (default 10): ").strip()
                    limit = int(limit_input) if limit_input else 10
                    days_input = input("Enter number of days (leave empty for all time): ").strip()
                    days = int(days_input) if days_input else None
                    top_users_by_usage(limit, days)
                except ValueError:
                    print_error("Invalid number")
            else:
                print_error(f"Invalid choice: {choice}")
            
            if choice != "0":
                input(f"\n{Colors.YELLOW}Press Enter to continue...{Colors.ENDC}")
        
        return True
    except ImportError as e:
        print_error(f"Failed to import token usage functions: {e}")
        print_info("Make sure manage_token_usage.py exists in the project root")
        return False
    except KeyboardInterrupt:
        return True


def manage_production_cache():
    """Manage production cache (similar to testing cache)"""
    print_header("Production Cache Management")
    
    script_path = get_project_root() / "manage_production_cache.py"
    if not script_path.exists():
        print_error(f"Script not found: {script_path}")
        return False
    
    print_info("Opening production cache manager...")
    print()
    
    try:
        run_python_script(script_path, check=True)
        return True
    except subprocess.CalledProcessError as e:
        print_error(f"Failed to run production cache manager: {e}")
        return False
    except KeyboardInterrupt:
        return True


def show_overall_summary():
    """Show overall system summary"""
    print_header("Overall System Summary")
    
    script_path = get_project_root() / "overall_summary.py"
    if not script_path.exists():
        print_error(f"Script not found: {script_path}")
        return False
    
    print_info("Generating overall summary...")
    print()
    
    try:
        run_python_script(script_path, check=True)
        return True
    except subprocess.CalledProcessError as e:
        print_error(f"Failed to generate summary: {e}")
        return False
    except KeyboardInterrupt:
        return True


def migrate_plan_template_id():
    """Migrate: Sync subscription plan template ID from payment_orders to users table"""
    print_header("Database Migration: Plan Template ID Sync")
    
    script_path = get_project_root() / "migrate_add_plan_template_id.py"
    if not script_path.exists():
        print_error(f"Migration script not found: {script_path}")
        return False
    
    print_info("This migration syncs data between:")
    print_info("  • payment_orders table (source: subscription_plan_id)")
    print_info("  • users table (target: current_subscription_plan_template_id)")
    print()
    print_warning("⚠️  This script is ONLY needed for EXISTING databases")
    print_info("   For NEW databases and NEW users, this happens automatically!")
    print()
    
    confirm = input(f"{Colors.YELLOW}Do you want to proceed? (yes/no): {Colors.ENDC}").strip().lower()
    if confirm not in ['yes', 'y']:
        print_info("Migration cancelled.")
        return False
    
    print()
    print_info("Running migration...")
    print()
    
    try:
        run_python_script(script_path, check=True)
        print_success("Migration completed!")
        return True
    except subprocess.CalledProcessError as e:
        print_error(f"Migration failed: {e}")
        return False
    except KeyboardInterrupt:
        print_warning("Migration cancelled by user.")
        return False


def migrate_auth_features():
    """Migrate: Add authentication features (email verification, password reset)"""
    print_header("Database Migration: Authentication Features")
    
    script_path = get_project_root() / "migrate_add_auth_features.py"
    if not script_path.exists():
        print_error(f"Migration script not found: {script_path}")
        return False
    
    print_info("This migration adds authentication features:")
    print_info("  • email_verified column to users table")
    print_info("  • email_verification_sent_at column to users table")
    print_info("  • email_verifications table (for OTP codes)")
    print_info("  • password_reset_tokens table (for password reset)")
    print()
    print_warning("⚠️  This script is ONLY needed for EXISTING databases")
    print_info("   For NEW databases, tables are created automatically!")
    print()
    print_info("Existing users will be marked as email_verified=True (grandfathering)")
    print()
    
    confirm = input(f"{Colors.YELLOW}Do you want to proceed? (yes/no): {Colors.ENDC}").strip().lower()
    if confirm not in ['yes', 'y']:
        print_info("Migration cancelled.")
        return False
    
    print()
    print_info("Running migration...")
    print()
    
    try:
        run_python_script(script_path, check=True)
        print_success("Migration completed!")
        print()
        print_info("Next steps:")
        print_info("  1. Set up environment variables (see AUTHENTICATION_SETUP.md)")
        print_info("  2. Configure Google OAuth credentials")
        print_info("  3. Configure Gmail SMTP settings")
        return True
    except subprocess.CalledProcessError as e:
        print_error(f"Migration failed: {e}")
        return False
    except KeyboardInterrupt:
        print_warning("Migration cancelled by user.")
        return False


def merge_json_to_csv():
    """Interactive menu for merging JSON files and managing exam set metrics"""
    print_header("Merge/Update Dataset")
    
    # Import database functions
    try:
        from app.database import SessionLocal, ExamSet, init_db
        init_db()
    except ImportError as e:
        print_error(f"Failed to import database modules: {e}")
        return False
    
    # Find merge script
    project_root = get_project_root()
    script_path = project_root.parent / "dataset_creation" / "data_extractor" / "merge_json_to_csv.py"
    
    # Store settings
    input_dir = "output"
    output_path = "../../ai_pyq/data/questions.csv"
    append_mode = False
    
    while True:
        print(f"\n{Colors.BOLD}Dataset Management Options:{Colors.ENDC}\n")
        print(f"  {Colors.CYAN}1.{Colors.ENDC} Set input directory (default: output/)")
        print(f"  {Colors.CYAN}2.{Colors.ENDC} Set output CSV path (default: ../../ai_pyq/data/questions.csv)")
        print(f"  {Colors.CYAN}3.{Colors.ENDC} Append to existing CSV")
        print(f"  {Colors.CYAN}4.{Colors.ENDC} Manage exam set metrics")
        print(f"  {Colors.CYAN}5.{Colors.ENDC} List all exams")
        print(f"  {Colors.CYAN}6.{Colors.ENDC} Create mock test")
        print(f"  {Colors.CYAN}7.{Colors.ENDC} Run merge process")
        print(f"  {Colors.CYAN}8.{Colors.ENDC} Update exam sets from CSV")
        print(f"  {Colors.CYAN}0.{Colors.ENDC} Back to main menu")
        print()
        
        choice = input(f"{Colors.BOLD}Enter choice (0-8):{Colors.ENDC} ").strip()
        
        if choice == "0":
            break
        elif choice == "1":
            new_input = input(f"{Colors.BOLD}Input directory (current: {input_dir}): {Colors.ENDC}").strip()
            if new_input:
                input_dir = new_input
            print_success(f"Input directory set to: {input_dir}")
        elif choice == "2":
            new_output = input(f"{Colors.BOLD}Output CSV path (current: {output_path}): {Colors.ENDC}").strip()
            if new_output:
                output_path = new_output
            print_success(f"Output path set to: {output_path}")
        elif choice == "3":
            append_choice = input(f"{Colors.BOLD}Append to existing CSV? (y/n, current: {'Yes' if append_mode else 'No'}): {Colors.ENDC}").strip().lower()
            if append_choice:
                append_mode = append_choice in ['y', 'yes']
            print_success(f"Append mode: {'Enabled' if append_mode else 'Disabled'}")
        elif choice == "4":
            manage_exam_metrics()
        elif choice == "5":
            list_all_exams()
        elif choice == "6":
            create_mock_test()
        elif choice == "7":
            if not script_path.exists():
                print_error(f"Merge script not found: {script_path}")
                print_info("Expected location: dataset_creation/data_extractor/merge_json_to_csv.py")
                continue
            
            # Show current settings
            print(f"\n{Colors.BOLD}Current Settings:{Colors.ENDC}")
            print(f"  Input directory: {input_dir}")
            print(f"  Output path: {output_path}")
            print(f"  Append mode: {'Yes' if append_mode else 'No'}")
            print()
            
            confirm = input(f"{Colors.YELLOW}Proceed with merge? (yes/no): {Colors.ENDC}").strip().lower()
            if confirm not in ['yes', 'y']:
                print_warning("Merge cancelled")
                continue
            
            print()
            print_info("Starting merge process...")
            print()
            
            # Build command arguments
            cmd_args = [
                "--input-dir", input_dir,
                "--output", output_path,
            ]
            
            if append_mode:
                cmd_args.append("--append")
            
            try:
                script_dir = script_path.parent
                python_exe = get_python_executable()
                
                result = subprocess.run(
                    [python_exe, str(script_path)] + cmd_args,
                    cwd=script_dir,
                    check=True
                )
                
                print_success("Merge completed successfully!")
                
                # Ask if user wants to update exam sets
                print()
                update_choice = input(f"{Colors.YELLOW}Update exam sets from CSV? (yes/no): {Colors.ENDC}").strip().lower()
                if update_choice in ['yes', 'y']:
                    update_exam_sets_from_csv()
                    
            except subprocess.CalledProcessError as e:
                print_error(f"Merge failed: {e}")
            except KeyboardInterrupt:
                print_warning("Merge cancelled by user.")
        elif choice == "8":
            update_exam_sets_from_csv()
        else:
            print_error(f"Invalid choice: {choice}")
        
        if choice != "0":
            input(f"\n{Colors.YELLOW}Press Enter to continue...{Colors.ENDC}")
    
    return True


def update_exam_sets_from_csv():
    """Update exam sets from CSV by running seed_exam_sets.py"""
    print_header("Update Exam Sets from CSV")
    
    # Find seed_exam_sets.py
    script_path = Path(__file__).parent / "seed_exam_sets.py"
    
    if not script_path.exists():
        print_error(f"seed_exam_sets.py not found: {script_path}")
        print_info("Expected location: ai_pyq/seed_exam_sets.py")
        return
    
    print_info("This will create/update exam sets based on questions in questions.csv")
    print_info("It will create:")
    print_info("  - Full paper exam sets for each exam-year combination")
    print_info("  - Subject-wise exam sets for each exam-year-subject combination")
    print()
    
    confirm = input(f"{Colors.YELLOW}Proceed with updating exam sets? (yes/no): {Colors.ENDC}").strip().lower()
    if confirm not in ['yes', 'y']:
        print_warning("Update cancelled")
        return
    
    print()
    print_info("Updating exam sets...")
    print()
    
    try:
        python_exe = get_python_executable()
        
        result = subprocess.run(
            [python_exe, str(script_path)],
            cwd=script_path.parent,
            check=True
        )
        
        print_success("Exam sets updated successfully!")
        print_info("You can now view exam sets in the Exam Mode page")
        
    except subprocess.CalledProcessError as e:
        print_error(f"Update failed: {e}")
    except KeyboardInterrupt:
        print_warning("Update cancelled by user.")
    except Exception as e:
        print_error(f"Unexpected error: {e}")


def manage_exam_metrics():
    """Interactive menu to manage exam set metrics (duration, marks, negative marking)"""
    print_header("Manage Exam Set Metrics")
    
    try:
        from app.database import SessionLocal, ExamSet, init_db
        init_db()
        db = SessionLocal()
        
        # Get unique exam names
        exams = db.query(ExamSet.exam_name).distinct().filter(
            ExamSet.exam_name.isnot(None),
            ExamSet.subject.is_(None)  # Only full papers, not subject-wise
        ).all()
        
        if not exams:
            print_warning("No exams found in database")
            db.close()
            return
        
        exam_names = [e[0] for e in exams if e[0]]
        
        # Group exam sets by exam_name and get default values (use most common or first)
        exam_defaults = {}
        for exam_name in exam_names:
            exam_sets = db.query(ExamSet).filter(
                ExamSet.exam_name == exam_name,
                ExamSet.subject.is_(None)
            ).all()
            
            if exam_sets:
                # Use the first exam set's values as default
                first_set = exam_sets[0]
                exam_defaults[exam_name] = {
                    'duration_minutes': first_set.duration_minutes,
                    'marks_per_question': first_set.marks_per_question,
                    'negative_marking': first_set.negative_marking,
                    'has_negative': first_set.negative_marking > 0
                }
        
        # Display exams with their defaults
        print(f"\n{Colors.BOLD}Available Exams:{Colors.ENDC}\n")
        for idx, exam_name in enumerate(exam_names, 1):
            defaults = exam_defaults.get(exam_name, {})
            duration = defaults.get('duration_minutes', 120)
            marks = defaults.get('marks_per_question', 2.0)
            has_neg = defaults.get('has_negative', True)
            neg_marks = defaults.get('negative_marking', 0.5)
            
            neg_str = f"Yes, -{neg_marks}" if has_neg else "No"
            print(f"  {Colors.CYAN}{idx}.{Colors.ENDC} {exam_name}")
            print(f"     Default: Duration: {duration} min, Marks: {marks}, Negative Marking: {neg_str}")
        
        print()
        exam_choice = input(f"{Colors.BOLD}Select exam to edit (1-{len(exam_names)}) or 0 to cancel: {Colors.ENDC}").strip()
        
        try:
            exam_idx = int(exam_choice) - 1
            if exam_idx < 0 or exam_idx >= len(exam_names):
                print_warning("Cancelled or invalid selection")
                db.close()
                return
            
            selected_exam = exam_names[exam_idx]
            defaults = exam_defaults.get(selected_exam, {
                'duration_minutes': 120,
                'marks_per_question': 2.0,
                'negative_marking': 0.5,
                'has_negative': True
            })
            
            # Edit metrics
            current_values = defaults.copy()
            
            while True:
                print(f"\n{Colors.BOLD}Editing metrics for: {selected_exam}{Colors.ENDC}\n")
                print(f"  {Colors.CYAN}1.{Colors.ENDC} Duration (minutes): {current_values['duration_minutes']}")
                print(f"  {Colors.CYAN}2.{Colors.ENDC} Marks per question: {current_values['marks_per_question']}")
                print(f"  {Colors.CYAN}3.{Colors.ENDC} Has negative marking: {'Yes' if current_values['has_negative'] else 'No'}")
                print(f"  {Colors.CYAN}4.{Colors.ENDC} Negative marking value: {current_values['negative_marking']}")
                print(f"  {Colors.CYAN}5.{Colors.ENDC} Save changes")
                print(f"  {Colors.CYAN}0.{Colors.ENDC} Cancel")
                print()
                
                metric_choice = input(f"{Colors.BOLD}Select metric to edit (0-5): {Colors.ENDC}").strip()
                
                if metric_choice == "0":
                    print_warning("Cancelled")
                    break
                elif metric_choice == "1":
                    new_duration = input(f"{Colors.BOLD}Enter duration in minutes (current: {current_values['duration_minutes']}): {Colors.ENDC}").strip()
                    if new_duration:
                        try:
                            current_values['duration_minutes'] = int(new_duration)
                            print_success(f"Duration updated to {current_values['duration_minutes']} minutes")
                        except ValueError:
                            print_error("Invalid duration. Must be a number.")
                elif metric_choice == "2":
                    new_marks = input(f"{Colors.BOLD}Enter marks per question (current: {current_values['marks_per_question']}): {Colors.ENDC}").strip()
                    if new_marks:
                        try:
                            current_values['marks_per_question'] = float(new_marks)
                            print_success(f"Marks per question updated to {current_values['marks_per_question']}")
                        except ValueError:
                            print_error("Invalid marks. Must be a number.")
                elif metric_choice == "3":
                    neg_choice = input(f"{Colors.BOLD}Has negative marking? (y/n, current: {'Yes' if current_values['has_negative'] else 'No'}): {Colors.ENDC}").strip().lower()
                    if neg_choice:
                        current_values['has_negative'] = neg_choice in ['y', 'yes']
                        if not current_values['has_negative']:
                            current_values['negative_marking'] = 0.0
                        print_success(f"Negative marking: {'Enabled' if current_values['has_negative'] else 'Disabled'}")
                elif metric_choice == "4":
                    if not current_values['has_negative']:
                        print_warning("Negative marking is disabled. Enable it first (option 3).")
                    else:
                        new_neg = input(f"{Colors.BOLD}Enter negative marking value (current: {current_values['negative_marking']}): {Colors.ENDC}").strip()
                        if new_neg:
                            try:
                                current_values['negative_marking'] = float(new_neg)
                                print_success(f"Negative marking updated to {current_values['negative_marking']}")
                            except ValueError:
                                print_error("Invalid negative marking. Must be a number.")
                elif metric_choice == "5":
                    # Confirm and update
                    print(f"\n{Colors.BOLD}Summary of changes for {selected_exam}:{Colors.ENDC}")
                    print(f"  Duration: {current_values['duration_minutes']} minutes")
                    print(f"  Marks per question: {current_values['marks_per_question']}")
                    print(f"  Negative marking: {'Yes, -' + str(current_values['negative_marking']) if current_values['has_negative'] else 'No'}")
                    print()
                    
                    confirm = input(f"{Colors.YELLOW}Confirm update? (yes/no): {Colors.ENDC}").strip().lower()
                    if confirm in ['yes', 'y']:
                        # Update all exam sets for this exam_name (full papers only)
                        exam_sets = db.query(ExamSet).filter(
                            ExamSet.exam_name == selected_exam,
                            ExamSet.subject.is_(None)
                        ).all()
                        
                        updated_count = 0
                        for exam_set in exam_sets:
                            exam_set.duration_minutes = current_values['duration_minutes']
                            exam_set.marks_per_question = current_values['marks_per_question']
                            exam_set.negative_marking = current_values['negative_marking'] if current_values['has_negative'] else 0.0
                            updated_count += 1
                        
                        db.commit()
                        print_success(f"Updated {updated_count} exam set(s) for {selected_exam}")
                        break
                    else:
                        print_warning("Update cancelled")
                else:
                    print_error("Invalid choice")
        
        except ValueError:
            print_error("Invalid selection")
        finally:
            db.close()
            
    except Exception as e:
        print_error(f"Error managing exam metrics: {e}")
        import traceback
        traceback.print_exc()


def list_all_exams():
    """List all exams with their current metrics"""
    print_header("List All Exams")
    
    try:
        from app.database import SessionLocal, ExamSet, init_db
        init_db()
        db = SessionLocal()
        
        # Get all exam sets (full papers only)
        exam_sets = db.query(ExamSet).filter(
            ExamSet.subject.is_(None)
        ).order_by(ExamSet.exam_name, ExamSet.year_from).all()
        
        if not exam_sets:
            print_warning("No exam sets found")
            db.close()
            return
        
        print(f"\n{Colors.BOLD}Exam Sets:{Colors.ENDC}\n")
        print(f"{'Exam Name':<20} {'Year':<10} {'Duration':<12} {'Marks/Q':<10} {'Neg Marking':<15} {'Questions':<12}")
        print("=" * 90)
        
        for exam_set in exam_sets:
            neg_str = f"-{exam_set.negative_marking}" if exam_set.negative_marking > 0 else "No"
            year_str = str(exam_set.year_from) if exam_set.year_from else "N/A"
            print(f"{exam_set.exam_name or 'N/A':<20} {year_str:<10} {exam_set.duration_minutes} min{'':<6} {exam_set.marks_per_question:<10} {neg_str:<15} {exam_set.total_questions:<12}")
        
        print("=" * 90)
        print(f"\nTotal exam sets: {len(exam_sets)}")
        
        db.close()
        
    except Exception as e:
        print_error(f"Error listing exams: {e}")
        import traceback
        traceback.print_exc()


def create_mock_test():
    """Create a mock test with random 20 questions from selected exam/topics"""
    print_header("Create Mock Test")
    
    try:
        from app.database import SessionLocal, ExamSet, init_db
        from utils.config_loader import load_config
        import pandas as pd
        import random
        from pathlib import Path
        
        init_db()
        db = SessionLocal()
        
        # Load CSV data
        cfg = load_config()
        csv_path = Path(cfg["paths"]["data_csv"])
        
        if not csv_path.exists():
            print_error(f"CSV file not found: {csv_path}")
            db.close()
            return
        
        print_info("Loading question data...")
        df = pd.read_csv(csv_path, keep_default_na=False)
        df = df.replace('', pd.NA)
        
        if len(df) == 0:
            print_error("CSV file is empty")
            db.close()
            return
        
        # Get unique exam names
        exams = df["exam"].dropna().unique().tolist()
        if not exams:
            print_error("No exams found in dataset")
            db.close()
            return
        
        # Select exam
        print(f"\n{Colors.BOLD}Available Exams:{Colors.ENDC}\n")
        for idx, exam_name in enumerate(exams, 1):
            print(f"  {Colors.CYAN}{idx}.{Colors.ENDC} {exam_name}")
        
        print()
        exam_choice = input(f"{Colors.BOLD}Select exam (1-{len(exams)}): {Colors.ENDC}").strip()
        
        try:
            exam_idx = int(exam_choice) - 1
            if exam_idx < 0 or exam_idx >= len(exams):
                print_error("Invalid selection")
                db.close()
                return
            selected_exam = exams[exam_idx]
        except ValueError:
            print_error("Invalid selection")
            db.close()
            return
        
        # Filter by exam
        exam_df = df[df["exam"] == selected_exam].copy()
        
        # Get available years for this exam
        years = sorted(exam_df["year"].dropna().unique().tolist())
        if not years:
            print_error("No years found for this exam")
            db.close()
            return
        
        # Select year range
        print(f"\n{Colors.BOLD}Available Years for {selected_exam}:{Colors.ENDC}\n")
        for idx, year in enumerate(years, 1):
            print(f"  {Colors.CYAN}{idx}.{Colors.ENDC} {int(year)}")
        print(f"  {Colors.CYAN}0.{Colors.ENDC} All years")
        print()
        
        year_choice = input(f"{Colors.BOLD}Select year range (comma-separated numbers like '1,5' for range, or 0 for all): {Colors.ENDC}").strip()
        
        year_from = None
        year_to = None
        
        if year_choice == "0":
            # Use all years
            year_from = int(min(years))
            year_to = int(max(years))
            print_info(f"Using all years: {year_from} to {year_to}")
        else:
            try:
                year_indices = [int(x.strip()) - 1 for x in year_choice.split(",")]
                if len(year_indices) == 1:
                    # Single year selected
                    year_idx = year_indices[0]
                    if 0 <= year_idx < len(years):
                        selected_year = int(years[year_idx])
                        year_from = selected_year
                        year_to = selected_year
                        print_info(f"Using year: {selected_year}")
                    else:
                        print_warning("Invalid year selection, using all years")
                        year_from = int(min(years))
                        year_to = int(max(years))
                elif len(year_indices) == 2:
                    # Year range selected
                    start_idx, end_idx = year_indices[0], year_indices[1]
                    if 0 <= start_idx < len(years) and 0 <= end_idx < len(years):
                        year_from = int(years[min(start_idx, end_idx)])
                        year_to = int(years[max(start_idx, end_idx)])
                        print_info(f"Using year range: {year_from} to {year_to}")
                    else:
                        print_warning("Invalid year range, using all years")
                        year_from = int(min(years))
                        year_to = int(max(years))
                else:
                    print_warning("Invalid year selection format, using all years")
                    year_from = int(min(years))
                    year_to = int(max(years))
            except ValueError:
                print_warning("Invalid year selection, using all years")
                year_from = int(min(years))
                year_to = int(max(years))
        
        # Filter by year range
        if year_from is not None and year_to is not None:
            exam_df = exam_df[(exam_df["year"] >= year_from) & (exam_df["year"] <= year_to)].copy()
        
        if len(exam_df) == 0:
            print_error("No questions found for selected year range")
            db.close()
            return
        
        # Get subjects for this exam (after year filtering)
        subjects = exam_df["subject"].dropna().unique().tolist()
        
        selected_subject = None
        if subjects:
            print(f"\n{Colors.BOLD}Available Subjects for {selected_exam}:{Colors.ENDC}\n")
            for idx, subject in enumerate(subjects, 1):
                print(f"  {Colors.CYAN}{idx}.{Colors.ENDC} {subject}")
            print(f"  {Colors.CYAN}0.{Colors.ENDC} All subjects (exam-wise mock test)")
            print()
            
            subject_choice = input(f"{Colors.BOLD}Select subject (number, or 0 for exam-wise): {Colors.ENDC}").strip()
            
            if subject_choice == "0":
                selected_subject = None
                print_info("Creating exam-wise mock test (all subjects)")
            else:
                try:
                    subject_idx = int(subject_choice) - 1
                    if 0 <= subject_idx < len(subjects):
                        selected_subject = subjects[subject_idx]
                        print_info(f"Creating subject-wise mock test for: {selected_subject}")
                    else:
                        print_warning("Invalid subject selection, creating exam-wise mock test")
                        selected_subject = None
                except ValueError:
                    print_warning("Invalid subject selection, creating exam-wise mock test")
                    selected_subject = None
        else:
            print_info("No subjects found, creating exam-wise mock test")
            selected_subject = None
        
        # Filter by subject if selected
        if selected_subject:
            filtered_df = exam_df[exam_df["subject"] == selected_subject].copy()
        else:
            filtered_df = exam_df.copy()
        
        if len(filtered_df) == 0:
            print_error("No questions found matching the criteria")
            db.close()
            return
        
        # Get mock test name
        print()
        mock_name = input(f"{Colors.BOLD}Enter mock test name (e.g., 'UPSC Mock Test 1'): {Colors.ENDC}").strip()
        if not mock_name:
            print_error("Mock test name is required")
            db.close()
            return
        
        # Randomly select questions (max 20)
        num_questions = min(20, len(filtered_df))
        selected_questions = filtered_df.sample(n=num_questions, random_state=None).copy()
        
        print_info(f"Selected {num_questions} random questions from {len(filtered_df)} available questions")
        
        # Get exam set defaults for this exam
        exam_set_defaults = db.query(ExamSet).filter(
            ExamSet.exam_name == selected_exam,
            ExamSet.subject.is_(None)
        ).first()
        
        duration = exam_set_defaults.duration_minutes if exam_set_defaults else 120
        marks_per_q = exam_set_defaults.marks_per_question if exam_set_defaults else 2.0
        neg_marking = exam_set_defaults.negative_marking if exam_set_defaults else 0.5
        
        # Calculate duration (approximately 1 minute per question, minimum 30 minutes)
        mock_duration = max(30, int(num_questions * 1.0))
        
        # Create exam set
        description = f"Mock test with {num_questions} random questions from {selected_exam}"
        if selected_subject:
            description += f" - {selected_subject}"
        if year_from and year_to:
            if year_from == year_to:
                description += f" ({year_from})"
            else:
                description += f" ({year_from}-{year_to})"
        
        mock_exam_set = ExamSet(
            name=mock_name,
            description=description,
            exam_type="mock_test",
            exam_name=selected_exam,
            subject=selected_subject,  # Set subject if selected, None for exam-wise
            topic=None,
            year_from=year_from,
            year_to=year_to,
            total_questions=num_questions,
            duration_minutes=mock_duration,
            marks_per_question=marks_per_q,
            negative_marking=neg_marking,
            is_active=True
        )
        
        # Check if name already exists
        existing = db.query(ExamSet).filter(ExamSet.name == mock_name).first()
        if existing:
            print_warning(f"Exam set with name '{mock_name}' already exists")
            overwrite = input(f"{Colors.YELLOW}Overwrite? (yes/no): {Colors.ENDC}").strip().lower()
            if overwrite not in ['yes', 'y']:
                print_warning("Cancelled")
                db.close()
                return
            # Update existing
            existing.description = mock_exam_set.description
            existing.exam_name = mock_exam_set.exam_name
            existing.subject = mock_exam_set.subject
            existing.year_from = mock_exam_set.year_from
            existing.year_to = mock_exam_set.year_to
            existing.total_questions = mock_exam_set.total_questions
            existing.duration_minutes = mock_exam_set.duration_minutes
            existing.marks_per_question = mock_exam_set.marks_per_question
            existing.negative_marking = mock_exam_set.negative_marking
            db.commit()
            print_success(f"Updated mock test: {mock_name}")
        else:
            db.add(mock_exam_set)
            db.commit()
            print_success(f"Created mock test: {mock_name}")
        
        print_info(f"  Questions: {num_questions}")
        print_info(f"  Duration: {mock_duration} minutes")
        print_info(f"  Marks per question: {marks_per_q}")
        print_info(f"  Negative marking: -{neg_marking}")
        
        # Note: The actual questions are selected dynamically when user starts the exam
        # We just create the exam set configuration here
        
        db.close()
        
    except Exception as e:
        print_error(f"Error creating mock test: {e}")
        import traceback
        traceback.print_exc()
        if 'db' in locals():
            db.rollback()
            db.close()


def show_project_status():
    """Show project status and configuration"""
    print_header("Project Status")
    
    project_root = get_project_root()
    
    # Check virtual environment status
    print(f"{Colors.BOLD}Virtual Environment Status:{Colors.ENDC}\n")
    venv_path = find_venv()
    if venv_path:
        is_activated = hasattr(sys, 'real_prefix') or (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix)
        if is_activated:
            print_success(f"Virtual environment: {venv_path.name} (ACTIVATED)")
            print_info(f"Python: {sys.executable}")
        else:
            print_warning(f"Virtual environment: {venv_path.name} (FOUND but NOT ACTIVATED)")
            print_info(f"Will use: {get_python_executable()}")
    else:
        print_warning("No virtual environment found")
        print_info(f"Using system Python: {sys.executable}")
    print()
    
    # Check important files
    files_to_check = {
        "FAISS Index": "embeddings/faiss_index.bin",
        "Dataset": "data/questions.csv",
        "Config": "config.yaml",
        "Backend": "app/search_api.py",
        "Frontend": "ai_pyq_ui/package.json",
        "Prompts": "prompts/concept_explanation_prompt.txt",
    }
    
    print(f"{Colors.BOLD}File Status:{Colors.ENDC}\n")
    for name, path in files_to_check.items():
        filepath = project_root / path
        if filepath.exists():
            size = filepath.stat().st_size if filepath.is_file() else 0
            size_str = f"({size:,} bytes)" if size > 0 else ""
            print_success(f"{name}: {path} {size_str}")
        else:
            print_error(f"{name}: {path} (NOT FOUND)")
    
    # Check directories
    dirs_to_check = {
        "Testing Cache": "data/testing_cache",
        "Prompt Dumps": "data/prompt_dumps",
        "Prompts": "prompts",
    }
    
    print(f"\n{Colors.BOLD}Directory Status:{Colors.ENDC}\n")
    for name, path in dirs_to_check.items():
        dirpath = project_root / path
        if dirpath.exists():
            file_count = len(list(dirpath.glob("*"))) if dirpath.is_dir() else 0
            print_success(f"{name}: {path} ({file_count} items)")
        else:
            print_warning(f"{name}: {path} (NOT FOUND - will be created when needed)")
    
    print()


def show_main_menu():
    """Display main menu"""
    print_header("AI PYQ Manager - Main Menu")
    
    menu_options = [
        ("1", "Build FAISS Index", "Build/rebuild FAISS index from dataset"),
        ("2", "Start Backend Server", "Start FastAPI backend (http://127.0.0.1:8000)"),
        ("3", "Start Frontend Server", "Start React frontend (http://localhost:5173)"),
        ("4", "Manage Testing Cache", "View/clear testing cache"),
        ("5", "Review Prompts", "Review LLM prompts and responses"),
        ("6", "Analyze Dataset", "Analyze dataset statistics"),
        ("7", "List Gemini Models", "List available Gemini models"),
        ("8", "Project Status", "Show project file/directory status"),
        ("9", "Manage Users", "View users and subscription information"),
        ("10", "Manage Token Usage", "View LLM token usage per user"),
        ("11", "Manage Production Cache", "View/manage production cache entries"),
        ("12", "Overall Summary", "Show overall system configuration and status"),
        ("13", "Migrate Plan Template ID", "Sync subscription plan template ID (payment_orders → users)"),
        ("14", "Migrate Auth Features", "Add email verification and password reset tables/columns"),
        ("15", "Merge/Update Dataset", "Merge JSON files and manage exam set metrics"),
        ("0", "Exit", "Exit the manager"),
    ]
    
    print(f"{Colors.BOLD}Available Operations:{Colors.ENDC}\n")
    for num, title, desc in menu_options:
        print(f"  {Colors.CYAN}{num}.{Colors.ENDC} {Colors.BOLD}{title}{Colors.ENDC}")
        print(f"     {Colors.YELLOW}→{Colors.ENDC} {desc}\n")
    
    print(f"{Colors.BOLD}Enter your choice (0-15):{Colors.ENDC} ", end="")


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="AI PYQ Manager - Unified CLI Tool",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    parser.add_argument(
        "--direct",
        type=int,
        metavar="N",
        help="Run operation directly by number (1-15) without menu"
    )
    args = parser.parse_args()
    
    # Direct mode (for automation)
    if args.direct:
        operations = {
            1: build_faiss_index,
            2: start_backend,
            3: start_frontend,
            4: manage_testing_cache,
            5: review_prompts,
            6: analyze_dataset,
            7: list_gemini_models,
            8: show_project_status,
            9: manage_users,
            10: manage_token_usage,
            11: manage_production_cache,
            12: show_overall_summary,
            13: migrate_plan_template_id,
            14: migrate_auth_features,
            15: merge_json_to_csv,
        }
        
        if args.direct in operations:
            operations[args.direct]()
        else:
            print_error(f"Invalid operation number: {args.direct}")
            print_info("Valid numbers: 1-15")
            sys.exit(1)
        return
    
    # Interactive mode
    while True:
        try:
            show_main_menu()
            choice = input().strip()
            
            if choice == "0":
                print_success("Goodbye! 👋")
                break
            elif choice == "1":
                build_faiss_index()
            elif choice == "2":
                start_backend()
            elif choice == "3":
                start_frontend()
            elif choice == "4":
                manage_testing_cache()
            elif choice == "5":
                review_prompts()
            elif choice == "6":
                analyze_dataset()
            elif choice == "7":
                list_gemini_models()
            elif choice == "8":
                show_project_status()
            elif choice == "9":
                manage_users()
            elif choice == "10":
                manage_token_usage()
            elif choice == "11":
                manage_production_cache()
            elif choice == "12":
                show_overall_summary()
            elif choice == "13":
                migrate_plan_template_id()
            elif choice == "14":
                migrate_auth_features()
            elif choice == "15":
                merge_json_to_csv()
            else:
                print_error(f"Invalid choice: {choice}")
                print_info("Please enter a number between 0-15")
            
            if choice != "0":
                input(f"\n{Colors.YELLOW}Press Enter to continue...{Colors.ENDC}")
        
        except KeyboardInterrupt:
            print(f"\n\n{Colors.YELLOW}Interrupted by user.{Colors.ENDC}")
            break
        except EOFError:
            print(f"\n\n{Colors.YELLOW}Exiting...{Colors.ENDC}")
            break


if __name__ == "__main__":
    main()

