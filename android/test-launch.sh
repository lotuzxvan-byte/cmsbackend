#!/usr/bin/env bash
set -euo pipefail
package=com.lotuzxvan.sampoerna.sandbox
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb logcat -c
adb shell am start -W -n "$package/.MainActivity"
sleep 5
adb shell pidof "$package"
adb shell input keyevent KEYCODE_BACK
adb shell am start -W -n "$package/.MainActivity"
sleep 3
adb shell pidof "$package"
adb logcat -d -b crash > /tmp/sampoerna-crash.log
if grep -q "$package" /tmp/sampoerna-crash.log; then
  cat /tmp/sampoerna-crash.log
  exit 1
fi
