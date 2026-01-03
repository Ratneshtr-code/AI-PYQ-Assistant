# Android App Setup Guide

## ✅ What's Been Completed

1. **Capacitor Installation**: Added Capacitor dependencies to `package.json`
2. **Configuration Files**: Created `capacitor.config.ts` with app settings
3. **API Configuration**: Created centralized `src/config/apiConfig.js` for mobile/web compatibility
4. **URL Updates**: Replaced all hardcoded `http://127.0.0.1:8000` URLs with dynamic API config
5. **Build Scripts**: Added Android npm scripts for easy development
6. **Vite Configuration**: Updated for Capacitor compatibility

## 📋 Next Steps to Enable Android App

### Step 1: Install Dependencies

```bash
cd ai_pyq_ui
npm install
```

This will install Capacitor packages that were added to `package.json`.

### Step 2: Configure Your Network IP

**IMPORTANT**: For mobile testing, your phone needs to connect to your backend server.

1. Find your computer's local network IP address:
   - **Windows**: Open Command Prompt and run `ipconfig`
     - Look for "IPv4 Address" under your active network adapter (usually WiFi or Ethernet)
     - Example: `192.168.1.100`
   - **Mac/Linux**: Run `ifconfig` or `ip addr`
     - Look for `inet` address (usually starts with `192.168.x.x` or `10.x.x.x`)

2. Update `src/config/apiConfig.js`:
   ```javascript
   const LOCAL_NETWORK_IP = '192.168.1.100'; // ← Change this to YOUR IP
   ```

3. **Ensure your backend server allows network connections**:
   - Make sure your Python backend is configured to accept connections from your network (not just localhost)
   - Check your backend's host binding (should be `0.0.0.0` or your network IP, not `127.0.0.1`)

### Step 3: Build the Web App

```bash
npm run build
```

This creates the `dist` folder with your compiled React app.

### Step 4: Initialize Android Platform

```bash
npx cap add android
```

This creates the `android/` folder with the Android project.

### Step 5: Sync Web Assets to Android

```bash
npm run android:sync
```

This copies your built web app into the Android project.

### Step 6: Open in Android Studio

```bash
npm run android:open
```

This opens the Android project in Android Studio.

**OR** manually:
- Open Android Studio
- File → Open → Select the `ai_pyq_ui/android` folder

### Step 7: Configure Android Permissions

The Android project will be created with basic permissions. Verify in `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

These should be automatically added, but verify they exist.

### Step 8: Build APK for Testing

**Option A: Using Android Studio (Recommended for first time)**
1. Open the project in Android Studio
2. Wait for Gradle sync to complete
3. Build → Build Bundle(s) / APK(s) → Build APK(s)
4. APK will be in `android/app/build/outputs/apk/debug/app-debug.apk`

**Option B: Using Command Line**
```bash
cd android
./gradlew assembleDebug
```
(On Windows: `gradlew.bat assembleDebug`)

The APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

### Step 9: Install on Your Phone

**Method 1: USB Debugging (Recommended)**
1. Enable Developer Options on your Android phone:
   - Settings → About Phone → Tap "Build Number" 7 times
2. Enable USB Debugging:
   - Settings → Developer Options → USB Debugging (ON)
3. Connect phone via USB
4. In Android Studio: Run → Run 'app' (or press Shift+F10)
   - Select your connected device
   - App will install and launch automatically

**Method 2: Transfer APK File**
1. Copy `app-debug.apk` to your phone (via USB, email, cloud storage, etc.)
2. On your phone: Settings → Security → Enable "Install from Unknown Sources"
3. Open the APK file on your phone and install

### Step 10: Test the App

1. **Ensure your backend is running** on your computer
2. **Ensure phone and computer are on the same WiFi network**
3. **Verify network connectivity**:
   - On your phone's browser, try accessing: `http://YOUR_IP:8000` (replace YOUR_IP)
   - If it doesn't load, check firewall settings on your computer
4. **Open the app** on your phone
5. **Test all features**: Login, Search, Dashboard, etc.

## 🔧 Troubleshooting

### App can't connect to backend
- **Check IP address**: Make sure `LOCAL_NETWORK_IP` in `apiConfig.js` matches your computer's current IP
- **Check WiFi**: Phone and computer must be on the same network
- **Check firewall**: Windows Firewall may be blocking port 8000
  - Add exception for port 8000 or temporarily disable firewall for testing
- **Check backend**: Ensure backend is running and accessible from network
  - Test in phone browser: `http://YOUR_IP:8000`

### Build errors in Android Studio
- **Gradle sync**: File → Sync Project with Gradle Files
- **Clean build**: Build → Clean Project, then Build → Rebuild Project
- **SDK issues**: Tools → SDK Manager → Install required SDK versions

### App crashes on launch
- Check Android Studio Logcat for error messages
- Verify all Capacitor dependencies are installed: `npm install`
- Re-sync: `npm run android:sync`

### Network IP changed
- Update `LOCAL_NETWORK_IP` in `src/config/apiConfig.js`
- Rebuild: `npm run build`
- Re-sync: `npm run android:sync`
- Rebuild APK in Android Studio

## 📱 Development Workflow

After making changes to your React app:

1. **Update code** in `src/` folder
2. **Rebuild**: `npm run build`
3. **Sync to Android**: `npm run android:sync`
4. **Run in Android Studio**: Click Run button (or Shift+F10)

## 🚀 Production Build (For Play Store)

When ready to publish:

1. **Generate signed APK/AAB**:
   - Build → Generate Signed Bundle / APK
   - Follow Android Studio wizard to create keystore
   - Keep keystore file safe! (add to `.gitignore`)

2. **Update API config for production**:
   - Set `PRODUCTION_API_URL` in `apiConfig.js` to your deployed backend URL
   - Rebuild and create release APK

3. **Test release build** thoroughly before publishing

## 📝 Quick Reference Commands

```bash
# Install dependencies
npm install

# Build web app
npm run build

# Sync to Android
npm run android:sync

# Open Android Studio
npm run android:open

# Build and sync in one command
npm run android:build
```

## ✅ Checklist Before Testing

- [ ] Dependencies installed (`npm install`)
- [ ] Network IP configured in `apiConfig.js`
- [ ] Backend server running and accessible from network
- [ ] Phone and computer on same WiFi
- [ ] Web app built (`npm run build`)
- [ ] Android platform added (`npx cap add android`)
- [ ] Assets synced (`npm run android:sync`)
- [ ] APK built and installed on phone
- [ ] Tested connectivity from phone browser first

## 🎯 Next Steps After Testing

Once you've tested and everything works:

1. **Optimize app icon and splash screen** (optional)
2. **Test on multiple devices** if possible
3. **Prepare for Play Store**:
   - Create signed release build
   - Prepare app screenshots
   - Write app description
   - Set up Google Play Developer account ($25 one-time fee)
   - Submit for review

Good luck! 🚀

