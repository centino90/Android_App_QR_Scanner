#!/bin/sh

# C:/Users/antho/AppData/Local/Android/Sdk/emulator/emulator -avd Pixel_6_API_34 -wipe-data &

# sleep 200;

C:/Users/antho/AppData/Local/Android/Sdk/platform-tools/adb reverse tcp:8081 tcp:8081;
C:/Users/antho/AppData/Local/Android/Sdk/platform-tools/adb reverse tcp:5000 tcp:5000;

cd frontend;
npm install;
npm run android;