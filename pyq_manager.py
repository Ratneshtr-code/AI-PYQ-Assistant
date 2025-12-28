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
        from manage_users import list_users, view_user_details, search_users
        from app.database import init_db
        
        # Initialize database
        init_db()
        
        while True:
            print(f"\n{Colors.BOLD}User Management Options:{Colors.ENDC}\n")
            print(f"  {Colors.CYAN}1.{Colors.ENDC} List all users")
            print(f"  {Colors.CYAN}2.{Colors.ENDC} View user details")
            print(f"  {Colors.CYAN}3.{Colors.ENDC} Search users")
            print(f"  {Colors.CYAN}0.{Colors.ENDC} Back to main menu")
            print()
            
            choice = input(f"{Colors.BOLD}Enter choice (0-3):{Colors.ENDC} ").strip()
            
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
        ("0", "Exit", "Exit the manager"),
    ]
    
    print(f"{Colors.BOLD}Available Operations:{Colors.ENDC}\n")
    for num, title, desc in menu_options:
        print(f"  {Colors.CYAN}{num}.{Colors.ENDC} {Colors.BOLD}{title}{Colors.ENDC}")
        print(f"     {Colors.YELLOW}→{Colors.ENDC} {desc}\n")
    
    print(f"{Colors.BOLD}Enter your choice (0-12):{Colors.ENDC} ", end="")


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
        help="Run operation directly by number (1-8) without menu"
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
        }
        
        if args.direct in operations:
            operations[args.direct]()
        else:
            print_error(f"Invalid operation number: {args.direct}")
            print_info("Valid numbers: 1-12")
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
            else:
                print_error(f"Invalid choice: {choice}")
                print_info("Please enter a number between 0-12")
            
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

