#!/usr/bin/env python3
"""
instagram_poster.py — Playwright-based Instagram poster.
Called as subprocess by social_post_agent.py.

Usage:
    python instagram_poster.py --username USER --password PASS --image /path/img.jpg --caption "text"
    python instagram_poster.py --username USER --password PASS --login-only
"""

import argparse
import json
import os
import sys

COOKIES_DIR = os.path.dirname(os.path.abspath(__file__))


def cookies_path(username: str) -> str:
    return os.path.join(COOKIES_DIR, f"{username}_ig_cookies.json")


def is_logged_in(page) -> bool:
    return "instagram.com" in page.url and "accounts/login" not in page.url


def save_cookies(context, username: str):
    with open(cookies_path(username), "w") as f:
        json.dump(context.cookies(), f)
    print(f"[cookies saved] {cookies_path(username)}")


def load_cookies(context, username: str):
    path = cookies_path(username)
    if os.path.exists(path):
        with open(path) as f:
            context.add_cookies(json.load(f))
        return True
    return False


def login(page, username: str, password: str):
    """Navigate to instagram.com and log in only if needed."""
    print("[login] Navigating to instagram.com...")
    page.goto("https://www.instagram.com/", wait_until="load", timeout=30000)
    page.wait_for_timeout(4000)

    current_url = page.url
    print(f"[login] Landed on: {current_url}")

    # Not on login page → already authenticated
    if "accounts/login" not in current_url:
        print("[login] Already logged in — skipping form.")
        for popup_text in ["Not now", "Not Now", "Skip"]:
            try:
                page.click(f'text="{popup_text}"', timeout=2000)
            except Exception:
                pass
        return

    # Fill the login form
    print("[login] Filling login form...")
    page.fill('input[name="username"]', username)
    page.wait_for_timeout(500)
    page.fill('input[name="password"]', password)
    page.wait_for_timeout(500)
    page.click('button[type="submit"]')

    try:
        page.wait_for_url(lambda url: "accounts/login" not in url, timeout=20000)
    except Exception:
        pass

    page.wait_for_timeout(2000)
    print(f"[login] After submit, URL: {page.url}")

    for popup_text in ["Not now", "Not Now", "Skip", "Block"]:
        try:
            page.click(f'text="{popup_text}"', timeout=2000)
        except Exception:
            pass
    page.wait_for_timeout(1000)


def post_photo(page, image_path: str, caption: str):
    """Upload a photo and post it via the Instagram web UI."""
    page.goto("https://www.instagram.com/", wait_until="load", timeout=30000)
    page.wait_for_timeout(8000)  # extra time for SPA sidebar to render

    # ── Step 1: Click the Create button ─────────────────────────────────────
    print("[post] Clicking Create button...")
    create_selectors = [
        'a:has(svg[aria-label="New post"])',
        '[aria-label="New post"]',
        'text="Create"',
    ]
    clicked = False
    for sel in create_selectors:
        try:
            page.click(sel, timeout=6000)
            clicked = True
            print(f"[post] Create clicked via: {sel}")
            break
        except Exception:
            continue

    if not clicked:
        # JS fallback: search all links for the Create button
        print("[post] CSS selectors failed — trying JS fallback...")
        js_result = page.evaluate("""
            () => {
                const links = [...document.querySelectorAll('a[role="link"], a[href="#"]')];
                const btn = links.find(el =>
                    el.querySelector('svg[aria-label="New post"]') ||
                    el.textContent.trim() === 'Create'
                );
                if (btn) { btn.click(); return true; }
                return false;
            }
        """)
        if js_result:
            print("[post] Create clicked via JS.")
            clicked = True
        else:
            raise RuntimeError(
                "Could not find the Create (New Post) button on Instagram.\n"
                "Run: python setup_instagram.py --login-only  to refresh session, then try again."
            )

    page.wait_for_timeout(2000)

    # ── Step 2: Click "Post" in the sub-menu ────────────────────────────────
    print("[post] Clicking 'Post' in sub-menu...")
    for sel in ['text="Post"', 'role=link[name="Post"]', 'a:has-text("Post")']:
        try:
            page.click(sel, timeout=5000)
            print(f"[post] Post menu item clicked via: {sel}")
            break
        except Exception:
            continue
    page.wait_for_timeout(2000)

    # ── Step 3: File chooser ─────────────────────────────────────────────────
    print("[post] Opening file chooser...")
    with page.expect_file_chooser(timeout=12000) as fc_info:
        for sel in [
            'text="Select from computer"',
            'text="Select From Computer"',
            '[aria-label="Select from computer"]',
            'button:has-text("computer")',
        ]:
            try:
                page.click(sel, timeout=4000)
                break
            except Exception:
                continue
    fc_info.value.set_files(image_path)
    page.wait_for_timeout(3500)
    print(f"[post] Image selected: {image_path}")

    # ── Step 4: Crop → Next ──────────────────────────────────────────────────
    print("[post] Next (crop)...")
    page.get_by_role("button", name="Next").first.click(timeout=10000)
    page.wait_for_timeout(3000)

    # ── Step 5: Filter → Next ────────────────────────────────────────────────
    print("[post] Next (filter)...")
    page.get_by_role("button", name="Next").first.click(timeout=10000)
    page.wait_for_timeout(3000)

    # ── Step 6: Caption ──────────────────────────────────────────────────────
    print("[post] Entering caption...")
    caption_entered = False
    for sel in ['[aria-label="Write a caption..."]', '[aria-label="Write a caption"]', '[role="textbox"]']:
        try:
            box = page.locator(sel).first
            box.click(timeout=5000)
            page.wait_for_timeout(500)
            box.fill(caption)
            page.wait_for_timeout(500)
            print("[post] Caption entered.")
            caption_entered = True
            break
        except Exception:
            continue
    if not caption_entered:
        print("[post] WARNING: Could not enter caption. Continuing without it.")
    page.wait_for_timeout(2000)

    # ── Step 7: Share ────────────────────────────────────────────────────────
    print("[post] Clicking Share...")
    page.get_by_role("button", name="Share").first.click(timeout=10000)

    try:
        page.wait_for_selector('text="Your post has been shared."', timeout=20000)
        print("[posted] ✅ Instagram post shared successfully.")
    except Exception:
        page.wait_for_timeout(5000)
        print("[posted] Post submitted (verify on Instagram — confirmation text not detected).")


def run(username: str, password: str, image_path: str = None, caption: str = None, login_only: bool = False):
    from playwright.sync_api import sync_playwright

    # Always non-headless: Instagram renders sidebar differently in headless mode
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=50)
        context = browser.new_context(
            viewport={"width": 1280, "height": 900},
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
        )
        page = context.new_page()

        load_cookies(context, username)
        login(page, username, password)

        if not is_logged_in(page):
            print("❌ Login failed. Check your username/password.", file=sys.stderr)
            browser.close()
            sys.exit(1)

        save_cookies(context, username)
        print(f"[logged in] @{username}")

        if login_only:
            print("✅ Login successful. Session saved.")
            browser.close()
            return

        if image_path and caption is not None:
            post_photo(page, image_path, caption)

        browser.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--username", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--image", default=None)
    parser.add_argument("--caption", default="")
    parser.add_argument("--login-only", action="store_true")
    args = parser.parse_args()

    run(args.username, args.password, args.image, args.caption, args.login_only)
