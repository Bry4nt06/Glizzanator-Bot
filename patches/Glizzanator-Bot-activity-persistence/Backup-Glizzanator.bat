@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM =========================
REM CONFIG
REM =========================
set "PROJECT=D:\Discord\Glizzanator-Bot"
set "LOCAL_BACKUP_ROOT=E:\Discord Bot\Backups"
set "GOOGLE_DRIVE_FOLDER=G:\My Drive\Zipped Bot Reference"
set "REMOTE_URL=https://github.com/Bry4nt06/Glizzanator-Bot.git"

REM =========================
REM MOVE TO PROJECT
REM =========================
cd /d "%PROJECT%"
if errorlevel 1 (
    echo ERROR: Could not find project folder:
    echo %PROJECT%
    pause
    exit /b 1
)

echo.
echo =====================================
echo  Glizzanator Bot Backup Sequence
echo =====================================
echo.

REM =========================
REM MAKE SURE GITIGNORE EXISTS
REM =========================
if not exist ".gitignore" (
    type nul > ".gitignore"
)

findstr /x /c:"node_modules/" ".gitignore" >nul || echo node_modules/>>".gitignore"
findstr /x /c:".env" ".gitignore" >nul || echo .env>>".gitignore"
findstr /x /c:"*.log" ".gitignore" >nul || echo *.log>>".gitignore"
findstr /x /c:"*.zip" ".gitignore" >nul || echo *.zip>>".gitignore"
findstr /x /c:"Backups/" ".gitignore" >nul || echo Backups/>>".gitignore"
findstr /x /c:"GoogleDrive Uploads/" ".gitignore" >nul || echo GoogleDrive Uploads/>>".gitignore"

REM Stop tracking .env if it was ever accidentally added
git rm --cached .env >nul 2>nul

REM =========================
REM INIT GIT IF NEEDED
REM =========================
if not exist ".git" (
    echo Initializing Git...
    git init
)

git config --global --add safe.directory "E:/Discord Bot/Glizzanator-Bot" >nul 2>nul

REM =========================
REM CREATE .ENV.EXAMPLE IF MISSING
REM =========================
if not exist ".env.example" (
    echo Creating .env.example...
    (
        echo DISCORD_TOKEN=your_discord_bot_token_here
        echo CLIENT_ID=your_client_id_here
        echo GUILD_ID=your_guild_id_here
        echo RAWG_API_KEY=your_rawg_api_key_here
    ) > ".env.example"
)

REM =========================
REM TIMESTAMP
REM =========================
for /f %%I in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HH-mm-ss"') do set "STAMP=%%I"

set "BACKUP_NAME=Glizzanator-Bot-Backup_%STAMP%"
set "STAGING_FOLDER=%LOCAL_BACKUP_ROOT%\%BACKUP_NAME%"
set "LOCAL_ZIP=%LOCAL_BACKUP_ROOT%\%BACKUP_NAME%.zip"
set "GOOGLE_DRIVE_ZIP=%GOOGLE_DRIVE_FOLDER%\%BACKUP_NAME%-GoogleDrive.zip"
set "FILELIST=%TEMP%\glizzanator_backup_files_%STAMP%.txt"

REM =========================
REM CREATE BACKUP FOLDERS
REM =========================
if not exist "%LOCAL_BACKUP_ROOT%" mkdir "%LOCAL_BACKUP_ROOT%"
if not exist "%STAGING_FOLDER%" mkdir "%STAGING_FOLDER%"
if not exist "%GOOGLE_DRIVE_FOLDER%" mkdir "%GOOGLE_DRIVE_FOLDER%"

REM =========================
REM COPY FILES USING .GITIGNORE RULES
REM =========================
echo Creating clean backup file list...
git ls-files --cached --others --exclude-standard > "%FILELIST%"

echo Copying project files into staging backup...
for /f "usebackq delims=" %%F in ("%FILELIST%") do (
    set "SRC=%PROJECT%\%%F"
    set "DEST=%STAGING_FOLDER%\%%F"

    for %%D in ("!DEST!") do (
        if not exist "%%~dpD" mkdir "%%~dpD"
    )

    if exist "!SRC!" (
        copy /Y "!SRC!" "!DEST!" >nul
    )
)

REM =========================
REM COMPRESS LOCAL BACKUP
REM =========================
echo Compressing local backup...
powershell -NoProfile -Command "Compress-Archive -Path '%STAGING_FOLDER%\*' -DestinationPath '%LOCAL_ZIP%' -Force"

if not exist "%LOCAL_ZIP%" (
    echo ERROR: Local zip was not created.
    pause
    exit /b 1
)

echo.
echo Local backup created:
echo %LOCAL_ZIP%

REM =========================
REM COPY TO GOOGLE DRIVE FOLDER
REM =========================
echo.
echo Copying backup to Google Drive folder...
copy /Y "%LOCAL_ZIP%" "%GOOGLE_DRIVE_ZIP%" >nul

echo Google Drive backup created:
echo %GOOGLE_DRIVE_ZIP%

REM =========================
REM GITHUB COMMIT + PUSH
REM =========================
echo.
echo Preparing GitHub commit...

git add .

git diff --cached --quiet
if errorlevel 1 (
    git commit -m "Backup progress %STAMP%"
) else (
    echo No Git changes to commit.
)

git remote get-url origin >nul 2>nul
if errorlevel 1 (
    git remote add origin "%REMOTE_URL%"
) else (
    git remote set-url origin "%REMOTE_URL%"
)

git branch -M main

echo.
echo Pushing to GitHub...
git push -u origin main

echo.
echo =====================================
echo  Backup sequence complete
echo =====================================
echo.
echo Local backup:
echo %LOCAL_ZIP%
echo.
echo Google Drive backup:
echo %GOOGLE_DRIVE_ZIP%
echo.
pause