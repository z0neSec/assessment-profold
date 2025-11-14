# 🚀 Render Deployment Guide - Step by Step

## What is Render?
Render is a modern cloud platform that makes deploying web services easy. It's free for small projects, supports automatic deployments from GitHub, and requires minimal configuration.

**Key Benefits:**
- ✅ Free tier available
- ✅ Automatic GitHub integration
- ✅ No credit card required (for free tier)
- ✅ Easy environment variables
- ✅ PostgreSQL optional (not needed for this project)
- ✅ Fast deployments (~2 minutes)

---

## STEP 1: Create a GitHub Repository

### 1a. Your code is already on GitHub! ✅

Your repository is already created and pushed:
```
https://github.com/z0neSec/assessment-profold
```

**Verify it's public:**
1. Go to https://github.com/z0neSec/assessment-profold
2. Look for "Public" label near the repo name
3. Check that all your code is visible

✅ **Status:** Ready to connect to Render

---

## STEP 2: Sign Up for Render

### 2a. Create Render account
1. Go to https://render.com
2. Click **"Get Started"** or **"Sign Up"**
3. Choose **"Sign up with GitHub"** ✅ (easiest option)
4. Authorize Render to access your GitHub account
5. Click **"Authorize render-oss"**

### 2b. Initial setup
- Render will ask to connect your GitHub account
- Click **"Authorize render"** to grant access
- You should see your dashboard

✅ **Check:** You're logged into Render dashboard (https://dashboard.render.com)

---

## STEP 3: Create a New Web Service

### 3a. Start new service
1. Go to https://dashboard.render.com
2. Click **"+ New +"** button (top right)
3. Click **"Web Service"**

### 3b. Connect your GitHub repository
1. Under **"Public Git repository"**, paste your GitHub URL:
   ```
   https://github.com/z0neSec/assessment-profold
   ```
   OR click **"Connect account"** and select from list
2. Click **"Connect"**

**Render will search for your repository. Select it from the list.**

✅ **Status:** Repository connected

---

## STEP 4: Configure Service Settings

### 4a. Service details

| Setting | Value |
|---------|-------|
| **Name** | `payment-parser` (or your choice) |
| **Environment** | `Node` |
| **Region** | `Oregon (US West)` or closest to you |
| **Branch** | `master` |
| **Build Command** | `npm install` |
| **Start Command** | `node app.js` |

### 4b. Enter settings in Render

1. **Name:** Enter `payment-parser`
2. **Environment:** Select `Node` from dropdown
3. **Region:** Select `Oregon (US West)` (or your preferred region)
4. **Branch:** Should be `master` (default)
5. **Build Command:** Use:
   ```
   npm install
   ```
6. **Start Command:** Clear field and enter:
   ```
   node app.js
   ```

✅ **These settings match your project needs**

**Note:** The package.json has been modified to skip Husky when the `HUSKY` environment variable is set. This allows the build to succeed on Render.

---

## STEP 5: Add Environment Variables (IMPORTANT for this project)

### 5a. Set HUSKY to skip git hooks (REQUIRED)
1. Scroll down to **"Environment"** section
2. Click **"Add Environment Variable"**
3. Enter:
   - **Key:** `HUSKY`
   - **Value:** `0`
4. Click **"Add"**

**Why:** This tells npm to skip git hooks (Husky) during the build, which is necessary because Render is not in a git repository context during npm install.

### 5b. Set NODE_ENV (recommended)
1. Click **"Add Environment Variable"** again
2. Enter:
   - **Key:** `NODE_ENV`
   - **Value:** `production`
3. Click **"Add"**

### 5c. Check if needed
For this assessment project, you typically don't need additional variables since:
- ✅ No database required
- ✅ No authentication required
- ✅ No API keys needed

**Your environment variables should now be:**
```
HUSKY = 0
NODE_ENV = production
```

---

## STEP 6: Review and Deploy

### 6a. Check all settings one more time

| Field | Value |
|-------|-------|
| Name | ✅ `payment-parser` |
| Environment | ✅ `Node` |
| Build Command | ✅ `npm install` |
| Start Command | ✅ `node app.js` |
| Region | ✅ Selected |
| Branch | ✅ `master` |

### 6b. Deploy!
1. Scroll down to bottom
2. Click **"Create Web Service"** button

**What happens:**
- Render clones your GitHub repository
- Runs `npm install`
- Starts your app with `node app.js`
- Assigns a URL automatically

✅ **Deployment started!**

---

## STEP 7: Monitor Deployment

### 7a. Watch the build logs
1. You should see a screen with **"Build in progress"**
2. Watch the logs stream in real-time
3. Look for these messages (in order):

```
Building your repository...
npm install
Successfully installed dependencies
Starting service...
Server running on port 3000
```

### 7b. Wait for completion
- First deployment takes 2-3 minutes
- You'll see: **"Your service is live"** ✅

### 7c. Check status
```
Status: Live
URL: https://your-service-name.onrender.com
```

✅ **If you see "Live", deployment successful!**

---

## STEP 8: Get Your Deployed URL

### 8a. Find your endpoint URL
1. On your Render dashboard, find your service
2. Look for **"URL"** section
3. It will be something like:
   ```
   https://payment-parser.onrender.com
   ```

### 8b. Your full endpoint
The payment-instructions endpoint will be:
```
https://payment-parser.onrender.com/payment-instructions
```

✅ **Save this URL for submission!**

---

## STEP 9: Test Your Deployment

### 9a. Test with curl

Replace `payment-parser` with your actual service name:

```bash
curl -X POST https://payment-parser.onrender.com/payment-instructions \
  -H "Content-Type: application/json" \
  -d '{
    "accounts": [
      {"id": "a", "balance": 1000, "currency": "USD"},
      {"id": "b", "balance": 500, "currency": "USD"}
    ],
    "instruction": "DEBIT 500 USD FROM ACCOUNT a FOR CREDIT TO ACCOUNT b"
  }'
```

### 9b. Expected response
```json
{
  "type": "DEBIT",
  "amount": 500,
  "currency": "USD",
  "debit_account": "a",
  "credit_account": "b",
  "execute_by": null,
  "status": "successful",
  "status_reason": "Transaction executed successfully",
  "status_code": "AP00",
  "accounts": [
    {
      "id": "a",
      "balance": 500,
      "balance_before": 1000,
      "currency": "USD"
    },
    {
      "id": "b",
      "balance": 1000,
      "balance_before": 500,
      "currency": "USD"
    }
  ]
}
```

✅ **If response looks like this, your deployment works!**

### 9c. Test error case
```bash
curl -X POST https://payment-parser.onrender.com/payment-instructions \
  -H "Content-Type: application/json" \
  -d '{
    "accounts": [
      {"id": "a", "balance": 100, "currency": "USD"}
    ],
    "instruction": "DEBIT 500 USD FROM ACCOUNT a FOR CREDIT TO ACCOUNT b"
  }'
```

**Expected response:** Should return error with status code (e.g., `AC03` for insufficient funds)

✅ **Both success and error cases working!**

---

## STEP 10: Enable Auto-Deploy (Optional)

### 10a. Automatic deployments from GitHub
1. Go to your Render service dashboard
2. Click **"Settings"** tab
3. Scroll to **"Deploys"** section
4. Set **"Auto-Deploy"** to **"Yes"**
5. Select branch: **"master"**

**Result:** Every time you push to GitHub, Render automatically deploys the latest version

✅ **No manual redeploy needed after code changes!**

---

## STEP 11: Ready for Submission

### You now have:
✅ GitHub repository URL: `https://github.com/z0neSec/assessment-profold`  
✅ Deployed endpoint URL: `https://payment-parser.onrender.com/payment-instructions`  
✅ Code is live and tested  
✅ All tests passing  

### Submit to Google Form:
1. Go to the submission form
2. Provide:
   - **GitHub repository link:** `https://github.com/z0neSec/assessment-profold`
   - **Deployed endpoint URL:** `https://your-service-name.onrender.com/payment-instructions`

---

## 🔧 Troubleshooting

### Issue: Service crashes after deployment
**Solution:**
1. Go to your service dashboard
2. Click **"Logs"** tab
3. Look for error messages
4. Common causes:
   - `Port not set` → Make sure app uses `process.env.PORT || 3000`
   - `Module not found` → Check `package.json` has all dependencies
   - `MONGO_URI` error → Remove or set to empty (not needed)

### Issue: "Build failed"
**Solution:**
1. Check the build logs
2. Verify `npm install` works locally: `npm install`
3. Verify `node app.js` starts server locally
4. Check for syntax errors: `npm test`

### Issue: Endpoint returns 404
**Solution:**
1. Check correct URL format: `https://service-name.onrender.com/payment-instructions`
2. Verify service status is "Live"
3. Check logs for server startup errors
4. Try redeploying: Click "Manual Deploy" on service

### Issue: Need to redeploy manually
**Steps:**
1. Go to your Render service
2. Click **"Manual Deploy"** button
3. Select **"Deploy latest commit"**
4. Watch the build logs

### Issue: Want to check if service is running
**Solution:**
```bash
# Visit the service URL in browser
# Or use curl to test endpoint
curl https://your-service-name.onrender.com/payment-instructions
```

### Issue: Delete service (if needed)
**Steps:**
1. Go to service settings
2. Scroll to bottom
3. Click **"Delete Web Service"**
4. Confirm deletion

---

## 📋 Render vs. Heroku Comparison

| Feature | Render | Heroku |
|---------|--------|--------|
| Free Tier | ✅ Yes | ❌ Paid only now |
| GitHub Integration | ✅ Easy | ✅ Easy |
| Auto-deploy | ✅ Yes | ✅ Yes |
| Startup speed | ⚡ ~2 min | ⚡ ~2 min |
| Cold starts | ⏸️ Pause after 15 min | ⏸️ Pause after 30 min |
| Setup difficulty | 🟢 Easy | 🟢 Easy |
| Speed | 🟢 Fast | 🟢 Fast |

**Why Render is better for this:**
- Currently free tier available
- No need to add credit card
- Same deployment speed as Heroku
- Very similar interface

---

## 🎯 Quick Deployment Checklist

- [ ] GitHub repository is public: https://github.com/z0neSec/assessment-profold
- [ ] All code pushed to `master` branch
- [ ] `npm install` works locally
- [ ] `npm test` passes (18/18 tests)
- [ ] `node app.js` starts server locally
- [ ] Render account created
- [ ] GitHub connected to Render
- [ ] Web Service created with correct settings
- [ ] Build command: `npm install`
- [ ] Start command: `node app.js`
- [ ] Deployment shows "Live" status
- [ ] Endpoint tested with curl
- [ ] Both success and error cases working

---

## 📍 Your Deployment URLs

**GitHub Repository:**
```
https://github.com/z0neSec/assessment-profold
```

**Render Endpoint (after deployment):**
```
https://payment-parser.onrender.com/payment-instructions
```

*(Replace "payment-parser" with your actual service name)*

---

## ⏱️ Timeline

- **Step 1-2:** 1 minute (account creation)
- **Step 3-6:** 5 minutes (setup)
- **Step 7-8:** 3 minutes (deployment + URL)
- **Step 9:** 2 minutes (testing)
- **Total:** ~11 minutes ✅

**Deadline:** November 18, 2025 (4 days remaining)

---

## 🎉 Success Indicators

When everything is working:
1. ✅ Render dashboard shows "Live" with no errors
2. ✅ Curl command returns valid JSON response
3. ✅ Endpoint responds with `200 OK` for valid instructions
4. ✅ Endpoint responds with `400 Bad Request` for invalid instructions
5. ✅ All response fields present (type, amount, currency, etc.)
6. ✅ GitHub repo is public and all code visible
7. ✅ Ready to submit both URLs

---

**Status: READY TO DEPLOY** 🚀
