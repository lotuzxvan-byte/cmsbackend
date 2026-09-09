#!/usr/bin/env bash
set -euo pipefail
package=com.lotuzxvan.sampoerna.sandbox
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb logcat -c
adb shell am start -W -n "$package/.MainActivity"
sleep 20
adb shell pidof "$package"
adb shell input keyevent KEYCODE_BACK
adb shell am start -W -n "$package/.MainActivity"
sleep 8
adb shell pidof "$package"
adb logcat -d -b crash > /tmp/sampoerna-crash.log
if grep -q "$package" /tmp/sampoerna-crash.log; then
  cat /tmp/sampoerna-crash.log
  exit 1
fi

# Banking and login must remain in the installed app, not a browser task.
adb shell dumpsys activity activities > /tmp/sampoerna-activities.log
grep -E 'mResumedActivity|topResumedActivity' /tmp/sampoerna-activities.log | grep "$package"
for attempt in 1 2 3 4 5 6; do
  adb shell uiautomator dump /sdcard/banking-ui.xml
  adb pull /sdcard/banking-ui.xml /tmp/banking-ui.xml
  if grep -q 'Email address' /tmp/banking-ui.xml && grep -q 'Password' /tmp/banking-ui.xml; then
    echo 'Embedded email/password login verified'
    exit 0
  fi
  sleep 5
done
cat /tmp/banking-ui.xml
exit 1
