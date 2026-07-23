# How to Build Android APK for PD Holiday Villas Staff

## Option 1: Direct Build with Flutter CLI
1. Install Flutter SDK on your computer (https://docs.flutter.dev/get-started/install).
2. Download or clone this repository.
3. Run `flutter pub get` in terminal.
4. Run `flutter build apk --release`.
5. The output APK file will be generated at `build/app/outputs/flutter-apk/app-release.apk`.
6. Transfer `app-release.apk` to your Android phone via WhatsApp, Google Drive, or USB to install.

## Option 2: Automatic Build via GitHub Actions (Free & Cloud)
1. Push this project code to your GitHub repository.
2. Go to **Actions** tab in GitHub.
3. Run the **Build Android APK** workflow.
4. Download the generated `pd-villas-staff-apk` artifact directly to your phone!
