@echo off
cd /d C:\Users\sahba\OneDrive\Desktop\TESTAI\web2apk

echo === Добавляем все изменения ===
git add .

echo === v9.6.0: ===
set /p msg=Commit message: 

git commit -m "%msg%"

echo === Синхронизируем с GitHub ===
git pull --rebase origin master

echo === Пушим ===
git push

echo.
echo === ГОТОВО! Жди ~2 минуты и скачивай APK из Actions ===
pause
