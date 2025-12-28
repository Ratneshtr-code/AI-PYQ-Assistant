# list_gemini_models.py
"""
Script to list all available Gemini models
"""
import os
import sys
from pathlib import Path

# Load environment variables
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent / '.env'
    if env_path.exists():
        load_dotenv(env_path)
except ImportError:
    pass

import google.generativeai as genai

# Get API key
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("❌ GEMINI_API_KEY not found in environment variables or .env file")
    print("   Please set it in .env file: GEMINI_API_KEY=your-key-here")
    sys.exit(1)

# Configure Gemini
genai.configure(api_key=api_key)

print("🔍 Fetching available Gemini models...\n")

try:
    # List all models
    models = genai.list_models()
    
    print("=" * 80)
    print("AVAILABLE GEMINI MODELS:")
    print("=" * 80)
    
    generate_content_models = []
    
    for model in models:
        # Check if model supports generateContent
        if 'generateContent' in model.supported_generation_methods:
            generate_content_models.append(model.name)
            print(f"\n✅ {model.name}")
            print(f"   Display Name: {model.display_name}")
            print(f"   Description: {model.description}")
            print(f"   Supported Methods: {', '.join(model.supported_generation_methods)}")
            if hasattr(model, 'input_token_limit'):
                print(f"   Input Token Limit: {model.input_token_limit:,}")
            if hasattr(model, 'output_token_limit'):
                print(f"   Output Token Limit: {model.output_token_limit:,}")
    
    print("\n" + "=" * 80)
    print("RECOMMENDED MODELS FOR GENERATECONTENT:")
    print("=" * 80)
    
    # Filter and show recommended models
    recommended = [
        name for name in generate_content_models 
        if 'flash' in name.lower() or 'pro' in name.lower() or 'gemini' in name.lower()
    ]
    
    for model_name in recommended:
        print(f"  • {model_name}")
    
    if recommended:
        print(f"\n💡 Recommended: {recommended[0]}")
        print(f"   Use this in config.yaml: model: \"{recommended[0].split('/')[-1]}\"")
    
    print("\n" + "=" * 80)
    print("ALL MODELS (Full Names):")
    print("=" * 80)
    for model_name in generate_content_models:
        print(f"  {model_name}")
    
except Exception as e:
    print(f"❌ Error listing models: {e}")
    print("\nTrying alternative method...")
    
    # Try alternative method
    try:
        import google.generativeai as genai
        # Try to get model directly
        test_model = genai.GenerativeModel('gemini-pro')
        print("✅ 'gemini-pro' model is available")
    except Exception as e2:
        print(f"❌ Error: {e2}")

