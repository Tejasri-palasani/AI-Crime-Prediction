# 📚 How to Push Your Crime Prediction Project to GitHub

Since Git installation needs to be completed manually, here's a step-by-step guide:

## Step 1: Install Git
1. Visit: https://git-scm.com/download/win
2. Download the latest Git installer for Windows
3. Run the installer and follow the default settings
4. Restart PowerShell or your terminal after installation

## Step 2: Verify Git Installation
Open PowerShell and run:
```powershell
git --version
```

## Step 3: Configure Git (First Time Only)
```powershell
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## Step 4: Initialize Local Repository
```powershell
cd "c:\Users\gkbha\OneDrive\Desktop\impact project\crime_prediction_29"
git init
git add .
git commit -m "Initial commit: Crime prediction project with TRINETRA dashboard"
```

## Step 5: Create GitHub Repository
1. Go to https://github.com/new
2. Repository name: `AI-Crime-Prediction`
3. Description: "AI Crime Prediction Map with TRINETRA Dashboard"
4. Choose Public or Private
5. **DO NOT** initialize with README, .gitignore, or license
6. Click "Create repository"

## Step 6: Connect to GitHub and Push
Copy these commands from GitHub and run them:

```powershell
git branch -M main
git remote add origin https://github.com/ssaisanthosh96/AI-Crime-Prediction.git
git push -u origin main
```

**GitHub will ask for authentication:**
- Use a **Personal Access Token** (recommended):
  1. Go to https://github.com/settings/tokens
  2. Click "Generate new token"
  3. Select "repo" scope
  4. Copy the token
  5. Paste it when prompted for password

**Or use GitHub CLI:**
```powershell
gh auth login
```

## Your Project Information
- **Username**: ssaisanthosh96
- **Repository**: AI-Crime-Prediction
- **URL after push**: https://github.com/ssaisanthosh96/AI-Crime-Prediction

## Troubleshooting

### Git not found after installation?
Restart PowerShell or close and reopen the terminal.

### Authentication fails?
1. Use a Personal Access Token instead of password
2. Visit: https://github.com/settings/tokens

### Want to use SSH?
1. Generate SSH key: `ssh-keygen -t rsa -b 4096`
2. Add to GitHub: https://github.com/settings/ssh/new
3. Use SSH URL: `git@github.com:ssaisanthosh96/AI-Crime-Prediction.git`

---

## Quick Commands Summary
```powershell
# After Git is installed and configured:
cd "c:\Users\gkbha\OneDrive\Desktop\impact project\crime_prediction_29"
git init
git add .
git commit -m "Initial commit: Crime prediction project with TRINETRA dashboard"
git branch -M main
git remote add origin https://github.com/ssaisanthosh96/AI-Crime-Prediction.git
git push -u origin main
```

Good luck! 🚀
