; NSIS installer script for Image-Mesh
; Custom installer configuration

; Modern UI
!include "MUI2.nsh"

; General
Name "Image-Mesh"
OutFile "Image-Mesh-Setup.exe"
InstallDir "$PROGRAMFILES\Image-Mesh"
InstallDirRegKey HKLM "Software\Image-Mesh" "InstallPath"
RequestExecutionLevel admin

; Variables
Var StartMenuFolder

; Interface Settings
!define MUI_ABORTWARNING
!define MUI_ICON "assets\icon.ico"
!define MUI_UNICON "assets\icon.ico"

; Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "LICENSE"
!insertmacro MUI_PAGE_COMPONENTS
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_STARTMENU Application $StartMenuFolder
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

; Languages
!insertmacro MUI_LANGUAGE "SimpChinese"
!insertmacro MUI_LANGUAGE "English"

; Installer Sections
Section "Main Application" SecMain
  SectionIn RO
  
  SetOutPath "$INSTDIR"
  File /r "dist-electron\*"
  File /r "dist\*"
  
  ; Store installation path
  WriteRegStr HKLM "Software\Image-Mesh" "InstallPath" "$INSTDIR"
  
  ; Create uninstaller
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  
  ; Add to Add/Remove Programs
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Image-Mesh" "DisplayName" "Image-Mesh"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Image-Mesh" "UninstallString" "$INSTDIR\Uninstall.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Image-Mesh" "DisplayVersion" "1.0.0"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Image-Mesh" "Publisher" "Crystallography Research Team"
  
  ; Create Start Menu shortcuts
  !insertmacro MUI_STARTMENU_WRITE_BEGIN Application
    CreateDirectory "$SMPROGRAMS\$StartMenuFolder"
    CreateShortCut "$SMPROGRAMS\$StartMenuFolder\Image-Mesh.lnk" "$INSTDIR\Image-Mesh.exe" "" "$INSTDIR\Image-Mesh.exe" 0
    CreateShortCut "$SMPROGRAMS\$StartMenuFolder\Uninstall.lnk" "$INSTDIR\Uninstall.exe"
  !insertmacro MUI_STARTMENU_WRITE_END
SectionEnd

Section "Desktop Shortcut" SecDesktop
  CreateShortCut "$DESKTOP\Image-Mesh.lnk" "$INSTDIR\Image-Mesh.exe" "" "$INSTDIR\Image-Mesh.exe" 0
SectionEnd

; Section Descriptions
LangString DESC_SecMain ${LANG_SIMPCHINESE} "安装 Image-Mesh 主程序"
LangString DESC_SecDesktop ${LANG_SIMPCHINESE} "在桌面创建快捷方式"

LangString DESC_SecMain ${LANG_ENGLISH} "Install Image-Mesh main application"
LangString DESC_SecDesktop ${LANG_ENGLISH} "Create desktop shortcut"

!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
  !insertmacro MUI_DESCRIPTION_TEXT ${SecMain} $(DESC_SecMain)
  !insertmacro MUI_DESCRIPTION_TEXT ${SecDesktop} $(DESC_SecDesktop)
!insertmacro MUI_FUNCTION_DESCRIPTION_END

; Uninstaller Section
Section "Uninstall"
  Delete "$INSTDIR\Uninstall.exe"
  RMDir /r "$INSTDIR"
  
  ; Remove Start Menu shortcuts
  !insertmacro MUI_STARTMENU_GETFOLDER Application $StartMenuFolder
  Delete "$SMPROGRAMS\$StartMenuFolder\Image-Mesh.lnk"
  Delete "$SMPROGRAMS\$StartMenuFolder\Uninstall.lnk"
  RMDir "$SMPROGRAMS\$StartMenuFolder"
  
  ; Remove desktop shortcut
  Delete "$DESKTOP\Image-Mesh.lnk"
  
  ; Remove registry entries
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Image-Mesh"
  DeleteRegKey HKLM "Software\Image-Mesh"
SectionEnd