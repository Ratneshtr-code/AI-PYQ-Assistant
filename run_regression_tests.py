import subprocess
import os
import sys

def run_command(command, cwd=None):
    """Run a shell command and print live output."""
    print(f"\n🚀 Running: {command}\n{'='*60}")
    process = subprocess.Popen(
        command,
        cwd=cwd,
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True
    )
    for line in process.stdout:
        print(line, end='')
    process.wait()
    return process.returncode

def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(root_dir, "app")
    frontend_dir = os.path.join(root_dir, "ai_pyq_ui")

    print("🧪 Starting full regression suite...\n")

    # Run backend tests
    backend_status = run_command("pytest -v", cwd=root_dir)

    # Run frontend tests
    frontend_status = run_command("npm test", cwd=frontend_dir)

    if backend_status == 0 and frontend_status == 0:
        print("\n✅ ALL TESTS PASSED SUCCESSFULLY!")
        sys.exit(0)
    else:
        print("\n❌ Some tests failed.")
        if backend_status != 0:
            print("   ↳ Backend tests failed.")
        if frontend_status != 0:
            print("   ↳ Frontend tests failed.")
        sys.exit(1)

if __name__ == "__main__":
    main()
