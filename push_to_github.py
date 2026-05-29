#!/usr/bin/env python3
"""
Script to push the crime prediction project to GitHub
"""
import os
from git import Repo
from git.exc import GitCommandError

# Configuration
PROJECT_PATH = r"c:\Users\gkbha\OneDrive\Desktop\impact project\crime_prediction_29"
GITHUB_USERNAME = "ssaisanthosh96"
REPO_NAME = "AI-Crime-Prediction"
GITHUB_URL = f"https://github.com/{GITHUB_USERNAME}/{REPO_NAME}.git"

print(f"🚀 Pushing project to GitHub...")
print(f"📦 Project path: {PROJECT_PATH}")
print(f"🔗 GitHub URL: {GITHUB_URL}\n")

try:
    # Check if git repo exists
    if os.path.exists(os.path.join(PROJECT_PATH, ".git")):
        print("✅ Git repository already initialized")
        repo = Repo(PROJECT_PATH)
    else:
        print("📝 Initializing git repository...")
        repo = Repo.init(PROJECT_PATH)
        print("✅ Git repository initialized\n")
    
    # Configure git user (if not already configured)
    try:
        repo.config_reader().get_value("user", "name")
    except:
        print("⚙️  Configuring git user...")
        repo.config_writer().set_value("user", "name", "GitHub User").release()
        repo.config_writer().set_value("user", "email", "user@example.com").release()
        print("✅ Git user configured\n")
    
    # Add all files
    print("📂 Adding files to staging area...")
    repo.index.add([item for item in repo.untracked_files] + [item.a_path for item in repo.index.diff(None)])
    repo.index.commit("Initial commit: Crime prediction project with TRINETRA dashboard")
    print("✅ Files committed\n")
    
    # Set remote URL
    print("🔗 Setting GitHub remote URL...")
    if "origin" in [remote.name for remote in repo.remotes]:
        origin = repo.remote("origin")
        origin.set_url(GITHUB_URL)
    else:
        origin = repo.create_remote("origin", GITHUB_URL)
    print(f"✅ Remote URL set to: {GITHUB_URL}\n")
    
    # Push to GitHub
    print("⬆️  Pushing to GitHub (main branch)...")
    try:
        origin.push("main")
        print("✅ Successfully pushed to GitHub!\n")
    except GitCommandError as e:
        if "main" in str(e):
            print("⚠️  Main branch doesn't exist. Creating and pushing...")
            repo.create_head("main")
            repo.heads.main.checkout()
            origin.push("main", set_upstream=True)
            print("✅ Successfully created and pushed main branch!\n")
        else:
            raise
    
    print("=" * 60)
    print("✨ SUCCESS! Your project has been pushed to GitHub")
    print("=" * 60)
    print(f"\n📍 Repository URL: {GITHUB_URL}")
    print(f"👤 Username: {GITHUB_USERNAME}")
    print(f"📦 Repository: {REPO_NAME}")
    print("\n🎉 You can now access your project at:")
    print(f"   https://github.com/{GITHUB_USERNAME}/{REPO_NAME}\n")

except GitCommandError as e:
    print(f"❌ Git command error: {e}")
    print("\n💡 TIP: Make sure you have authenticated with GitHub:")
    print("   - For HTTPS: Use a Personal Access Token (PAT)")
    print("   - For SSH: Set up SSH keys")
    print("   - Visit: https://github.com/settings/tokens\n")

except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
