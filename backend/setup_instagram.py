#!/usr/bin/env python3
"""
setup_instagram.py — Run this ONCE from your terminal to log in to Instagram
and save a session file. The main app will reuse this session automatically.

Usage:
    python setup_instagram.py
"""

import os
import sys

try:
    from instagrapi import Client
except ImportError:
    print("Installing instagrapi...")
    os.system(f"{sys.executable} -m pip install instagrapi -q")
    from instagrapi import Client

# ── Get credentials ──────────────────────────────────────────────
try:
    from dotenv import load_dotenv
    load_dotenv(override=True)
except ImportError:
    pass

username = os.getenv("INSTAGRAM_USERNAME") or input("Instagram username: ").strip()
password = os.getenv("INSTAGRAM_PASSWORD") or input("Instagram password: ").strip()

session_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), f"{username}_session.json")

# ── Login ────────────────────────────────────────────────────────
print(f"\nLogging in as @{username} ...")

cl = Client()
cl.set_locale("en_US")
cl.set_timezone_offset(19800)  # IST +5:30

# If session already exists, try to reuse it first
if os.path.exists(session_path):
    print("Found existing session — trying to reuse...")
    try:
        cl.load_settings(session_path)
        cl.login(username, password)
        cl.dump_settings(session_path)
        print(f"\n✅ Session still valid. Saved to: {session_path}")
        print("You can now use the Streamlit app to post without verification.")
        sys.exit(0)
    except Exception as e:
        print(f"Session expired ({e}), doing fresh login...")

# Fresh login — instagrapi will call input() for 2FA/challenge codes automatically
try:
    cl.login(username, password)
    cl.dump_settings(session_path)
    print(f"\n✅ Login success! Session saved to: {session_path}")
    print("You can now use the Streamlit app to post to Instagram.")
except Exception as e:
    error = str(e)
    if "challenge" in error.lower() or "verification" in error.lower():
        print("\n📲 Instagram requires verification.")
        print("A code has been sent to your email or phone.")
        code = input("Enter verification code: ").strip()
        try:
            cl.challenge_resolve(cl.last_json, code)
            cl.dump_settings(session_path)
            print(f"\n✅ Verified! Session saved to: {session_path}")
            print("You can now use the Streamlit app to post to Instagram.")
        except Exception as e2:
            print(f"\n❌ Verification failed: {e2}")
            sys.exit(1)
    elif "two_factor" in error.lower() or "totp" in error.lower():
        print("\n🔐 Two-factor authentication is enabled on your account.")
        totp = input("Enter your 2FA/authenticator code: ").strip()
        try:
            cl.login(username, password, verification_code=totp)
            cl.dump_settings(session_path)
            print(f"\n✅ 2FA login success! Session saved to: {session_path}")
        except Exception as e2:
            print(f"\n❌ 2FA login failed: {e2}")
            sys.exit(1)
    else:
        print(f"\n❌ Login failed: {e}")
        print("\nTips:")
        print("  - Make sure your username/password are correct")
        print("  - Try logging into instagram.com in your browser first (same network)")
        print("  - If you use 2FA, enter the code when prompted")
        sys.exit(1)
