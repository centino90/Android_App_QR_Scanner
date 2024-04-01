#!/bin/sh

cd frontend;
C:/Users/antho/AppData/Local/Android/Sdk/platform-tools/adb reverse tcp:8081 tcp:8081;
C:/Users/antho/AppData/Local/Android/Sdk/platform-tools/adb reverse tcp:5000 tcp:5000;
npm run android;