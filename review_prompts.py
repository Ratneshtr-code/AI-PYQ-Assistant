#!/usr/bin/env python3
"""
Review Prompts - Easy way to view and review LLM prompts and responses

Usage:
    python review_prompts.py                    # List all prompt dumps
    python review_prompts.py --latest            # Show latest prompt dump
    python review_prompts.py --type concept      # Show latest concept prompt
    python review_prompts.py --type correct       # Show latest correct option prompt
    python review_prompts.py --type wrong         # Show latest wrong option prompt
    python review_prompts.py --file <filename>   # Show specific file
    python review_prompts.py --list              # List all files with details
"""

import argparse
import json
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict
from utils.config_loader import load_config


def get_prompt_dump_dir() -> Path:
    """Get prompt dump directory from config"""
    cfg = load_config()
    dump_dir = cfg.get("llm", {}).get("prompt_dump", {}).get("dump_dir", "./data/prompt_dumps")
    return Path(dump_dir)


def list_prompt_files(dump_dir: Path, explanation_type: Optional[str] = None) -> List[Path]:
    """List all prompt dump files, optionally filtered by type"""
    if not dump_dir.exists():
        return []
    
    files = list(dump_dir.glob("*.json"))
    
    if explanation_type:
        # Filter by type
        type_map = {
            "concept": "concept",
            "correct": "correct_option",
            "wrong": "wrong_option"
        }
        filter_type = type_map.get(explanation_type.lower(), explanation_type.lower())
        files = [f for f in files if filter_type in f.name]
    
    # Sort by modification time (newest first)
    files.sort(key=lambda f: f.stat().st_mtime, reverse=True)
    return files


def load_prompt_file(filepath: Path) -> Dict:
    """Load and parse a prompt dump file"""
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


def format_prompt_display(data: Dict, show_full: bool = True) -> str:
    """Format prompt data for display"""
    output = []
    output.append("=" * 80)
    output.append(f"📝 PROMPT DUMP: {data.get('timestamp', 'Unknown')}")
    output.append("=" * 80)
    output.append("")
    
    # Metadata
    output.append("📊 METADATA:")
    output.append(f"  Question ID: {data.get('question_id', 'N/A')}")
    output.append(f"  Explanation Type: {data.get('explanation_type', 'N/A')}")
    output.append(f"  Model: {data.get('model', 'N/A')}")
    if 'cache_key' in data:
        output.append(f"  Cache Key: {data.get('cache_key', 'N/A')}")
    if 'input_tokens_estimate' in data:
        output.append(f"  Input Tokens (Estimate): {data.get('input_tokens_estimate', 'N/A')}")
    if 'output_tokens_estimate' in data:
        output.append(f"  Output Tokens (Estimate): {data.get('output_tokens_estimate', 'N/A')}")
    output.append("")
    
    # System Instruction
    if 'system_instruction' in data and data['system_instruction']:
        output.append("=" * 80)
        output.append("🎯 SYSTEM INSTRUCTION:")
        output.append("=" * 80)
        output.append(data['system_instruction'])
        output.append("")
    
    # Prompt
    if 'prompt' in data:
        output.append("=" * 80)
        output.append("💬 PROMPT:")
        output.append("=" * 80)
        output.append(data['prompt'])
        output.append("")
    
    # Full Prompt (if requested)
    if show_full and 'full_prompt' in data:
        output.append("=" * 80)
        output.append("📋 FULL PROMPT (System + Prompt):")
        output.append("=" * 80)
        output.append(data['full_prompt'])
        output.append("")
    
    # Response (if present)
    if 'response' in data:
        output.append("=" * 80)
        output.append("🤖 LLM RESPONSE:")
        output.append("=" * 80)
        output.append(data['response'])
        output.append("")
    
    output.append("=" * 80)
    return "\n".join(output)


def show_interactive_menu():
    """Show interactive menu for prompt review"""
    dump_dir = get_prompt_dump_dir()
    
    if not dump_dir.exists():
        print("❌ Prompt dump directory not found: {dump_dir}")
        print("💡 Enable prompt dumping in config.yaml: llm.prompt_dump.enabled = true")
        return
    
    while True:
        print("\n" + "=" * 70)
        print(" " * 20 + "PROMPT REVIEW MENU")
        print("=" * 70)
        print("\nOptions:")
        print("  1. Show Latest Prompt (any type)")
        print("  2. Show Latest Response (any type)")
        print("  3. Show Latest Concept Prompt")
        print("  4. Show Latest Correct Option Prompt")
        print("  5. Show Latest Wrong Option Prompt")
        print("  6. List All Prompt Files")
        print("  7. Show Specific File")
        print("  8. Show Latest Concept Response")
        print("  9. Show Latest Correct Option Response")
        print("  10. Show Latest Wrong Option Response")
        print("  0. Back to Main Menu")
        print("=" * 70)
        
        choice = input("\nEnter your choice (0-10): ").strip()
        
        if choice == "0":
            print("\n👋 Returning to main menu...")
            break
        elif choice == "1":
            show_latest_prompt()
        elif choice == "2":
            show_latest_response()
        elif choice == "3":
            show_latest_by_type("concept", is_response=False)
        elif choice == "4":
            show_latest_by_type("correct", is_response=False)
        elif choice == "5":
            show_latest_by_type("wrong", is_response=False)
        elif choice == "6":
            list_all_files()
        elif choice == "7":
            show_specific_file()
        elif choice == "8":
            show_latest_by_type("concept", is_response=True)
        elif choice == "9":
            show_latest_by_type("correct", is_response=True)
        elif choice == "10":
            show_latest_by_type("wrong", is_response=True)
        else:
            print("❌ Invalid choice. Please enter 0-10.")
        
        if choice != "0":
            input("\nPress Enter to continue...")


def show_latest_prompt():
    """Show latest prompt file"""
    dump_dir = get_prompt_dump_dir()
    files = [f for f in list_prompt_files(dump_dir) if "_response" not in f.name]
    if files:
        data = load_prompt_file(files[0])
        print(format_prompt_display(data))
    else:
        print("No prompt files found.")


def show_latest_response():
    """Show latest response file"""
    dump_dir = get_prompt_dump_dir()
    files = [f for f in list_prompt_files(dump_dir) if "_response" in f.name]
    if files:
        data = load_prompt_file(files[0])
        print(f"\n📄 File: {files[0].name}\n")
        print(format_prompt_display(data))
    else:
        print("❌ No response files found.")


def show_latest_by_type(explanation_type: str, is_response: bool = False):
    """Show latest file by type"""
    dump_dir = get_prompt_dump_dir()
    files = list_prompt_files(dump_dir, explanation_type)
    
    if is_response:
        files = [f for f in files if "_response" in f.name]
    else:
        files = [f for f in files if "_response" not in f.name]
    
    if files:
        data = load_prompt_file(files[0])
        print(format_prompt_display(data))
    else:
        print(f"No {'response' if is_response else 'prompt'} files found for type: {explanation_type}")


def list_all_files():
    """List all prompt dump files"""
    dump_dir = get_prompt_dump_dir()
    files = list_prompt_files(dump_dir)
    if not files:
        print("No prompt dump files found.")
        return
    
    print(f"\n📁 Found {len(files)} prompt dump file(s):\n")
    for i, filepath in enumerate(files, 1):
        try:
            data = load_prompt_file(filepath)
            is_response = "_response" in filepath.name
            file_type = "Response" if is_response else "Prompt"
            print(f"{i}. {filepath.name}")
            print(f"   Type: {data.get('explanation_type', 'N/A')} ({file_type})")
            print(f"   QID: {data.get('question_id', 'N/A')}")
            print()
        except Exception as e:
            print(f"{i}. {filepath.name} (Error loading: {e})")


def show_specific_file():
    """Show specific file by name"""
    dump_dir = get_prompt_dump_dir()
    files = list_prompt_files(dump_dir)
    
    if not files:
        print("No prompt dump files found.")
        return
    
    print("\nAvailable files:")
    for i, filepath in enumerate(files[:20], 1):  # Show first 20
        print(f"  {i}. {filepath.name}")
    
    if len(files) > 20:
        print(f"  ... and {len(files) - 20} more files")
    
    choice = input("\nEnter file number or filename: ").strip()
    
    try:
        # Try as number
        file_num = int(choice)
        if 1 <= file_num <= len(files):
            filepath = files[file_num - 1]
        else:
            print("❌ Invalid file number.")
            return
    except ValueError:
        # Try as filename
        filepath = dump_dir / choice
        if not filepath.exists():
            print(f"❌ File not found: {filepath}")
            return
    
    try:
        data = load_prompt_file(filepath)
        print(f"\n📄 File: {filepath.name}\n")
        print(format_prompt_display(data))
    except Exception as e:
        print(f"❌ Error loading file: {e}")


def main():
    parser = argparse.ArgumentParser(
        description="Review LLM prompts and responses",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    parser.add_argument("--latest", action="store_true", help="Show latest prompt dump")
    parser.add_argument("--type", choices=["concept", "correct", "wrong"], help="Filter by explanation type")
    parser.add_argument("--file", help="Show specific file (filename or path)")
    parser.add_argument("--list", action="store_true", help="List all prompt dump files")
    parser.add_argument("--response-only", action="store_true", help="Show only response (for response files)")
    parser.add_argument("--interactive", "-i", action="store_true", help="Show interactive menu")
    args = parser.parse_args()
    
    # If no arguments provided or --interactive flag, show interactive menu
    has_args = any([args.latest, args.type, args.file, args.list, args.response_only])
    if not has_args or args.interactive:
        show_interactive_menu()
        return
    
    dump_dir = get_prompt_dump_dir()
    
    if not dump_dir.exists():
        print(f"❌ Prompt dump directory not found: {dump_dir}")
        print(f"💡 Enable prompt dumping in config.yaml: llm.prompt_dump.enabled = true")
        return
    
    # List files
    if args.list:
        files = list_prompt_files(dump_dir, args.type)
        if not files:
            print("No prompt dump files found.")
            return
        
        print(f"\n📁 Found {len(files)} prompt dump file(s):\n")
        for i, filepath in enumerate(files, 1):
            try:
                data = load_prompt_file(filepath)
                mod_time = datetime.fromtimestamp(filepath.stat().st_mtime)
                print(f"{i}. {filepath.name}")
                print(f"   Type: {data.get('explanation_type', 'N/A')}")
                print(f"   QID: {data.get('question_id', 'N/A')}")
                print(f"   Time: {mod_time.strftime('%Y-%m-%d %H:%M:%S')}")
                if 'response' in data:
                    print(f"   📄 Response file")
                else:
                    print(f"   📝 Prompt file")
                print()
            except Exception as e:
                print(f"{i}. {filepath.name} (Error loading: {e})")
        return
    
    # Show specific file
    if args.file:
        filepath = Path(args.file)
        if not filepath.is_absolute():
            filepath = dump_dir / args.file
        
        if not filepath.exists():
            print(f"❌ File not found: {filepath}")
            return
        
        try:
            data = load_prompt_file(filepath)
            if args.response_only and 'response' in data:
                print(data['response'])
            else:
                print(format_prompt_display(data))
        except Exception as e:
            print(f"❌ Error loading file: {e}")
        return
    
    # Show latest
    files = list_prompt_files(dump_dir, args.type)
    if not files:
        print("No prompt dump files found.")
        print(f"💡 Enable prompt dumping in config.yaml: llm.prompt_dump.enabled = true")
        return
    
    latest_file = files[0]
    try:
        data = load_prompt_file(latest_file)
        print(f"\n📄 File: {latest_file.name}\n")
        if args.response_only and 'response' in data:
            print(data['response'])
        else:
            print(format_prompt_display(data))
    except Exception as e:
        print(f"❌ Error loading file: {e}")


if __name__ == "__main__":
    main()

