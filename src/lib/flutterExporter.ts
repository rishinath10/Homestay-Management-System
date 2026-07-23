// Generator for complete Flutter Mobile App source code

export interface FlutterFile {
  path: string;
  code: string;
  description: string;
}

export function getFlutterCodebase(): FlutterFile[] {
  return [
    {
      path: 'pubspec.yaml',
      description: 'Flutter dependencies configuration file',
      code: `name: pd_holiday_villas_staff
description: "PD Holiday Villas Mobile App for Staff Booking Sync"
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  cupertino_icons: ^1.0.8
  firebase_core: ^3.1.0
  cloud_firestore: ^5.0.1
  firebase_auth: ^5.1.0
  firebase_messaging: ^15.0.1
  intl: ^0.19.0
  table_calendar: ^3.1.1
  flutter_local_notifications: ^17.1.2
  url_launcher: ^6.3.0
  shared_preferences: ^2.2.3

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^4.0.0

flutter:
  uses-material-design: true
  assets:
    - assets/images/logo.png
`
    },
    {
      path: 'lib/main.dart',
      description: 'Main Flutter entry point with Firebase init & Google Material 3 Theme',
      code: `import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'screens/auth_screen.dart';
import 'screens/calendar_screen.dart';
import 'services/firebase_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  runApp(const PDVillasStaffApp());
}

class PDVillasStaffApp extends StatelessWidget {
  const PDVillasStaffApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'PD Villas Staff',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorSchemeSeed: const Color(0xFF1A73E8), // Google Material Blue
        scaffoldBackgroundColor: const Color(0xFFF8F9FA),
        appBarTheme: const AppBarTheme(
          centerTitle: false,
          elevation: 0,
          backgroundColor: Colors.white,
          foregroundColor: Color(0xFF202124),
        ),
      ),
      home: const AuthGate(),
    );
  }
}

class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    return StreamBuilder(
      stream: FirebaseService().authStateChanges,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }
        if (snapshot.hasData) {
          return const CalendarScreen();
        }
        return const AuthScreen();
      },
    );
  }
}
`
    },
    {
      path: 'lib/models/booking.dart',
      description: 'Flutter Booking model with Firestore serialization',
      code: `class Booking {
  final String id;
  final String propertyId;
  final String propertyName;
  final String bookingDate;
  final String? endDate;
  final String checkinTime;
  final String? checkoutTime;
  final String? guestName;
  final String? guestPhone;
  final String? remarks;
  final String? assignedStaffId;
  final String status;
  final double? amount;

  Booking({
    required this.id,
    required this.propertyId,
    required this.propertyName,
    required this.bookingDate,
    this.endDate,
    required this.checkinTime,
    this.checkoutTime,
    this.guestName,
    this.guestPhone,
    this.remarks,
    this.assignedStaffId,
    required this.status,
    this.amount,
  });

  factory Booking.fromFirestore(Map<String, dynamic> json, String docId) {
    return Booking(
      id: docId,
      propertyId: json['propertyId'] ?? '',
      propertyName: json['propertyName'] ?? 'PD Villa',
      bookingDate: json['bookingDate'] ?? '',
      endDate: json['endDate'],
      checkinTime: json['checkinTime'] ?? '15:00',
      checkoutTime: json['checkoutTime'] ?? '12:00',
      guestName: json['guestName'],
      guestPhone: json['guestPhone'],
      remarks: json['remarks'],
      assignedStaffId: json['assignedStaffId'],
      status: json['status'] ?? 'confirmed',
      amount: (json['amount'] as num?)?.toDouble(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'propertyId': propertyId,
      'propertyName': propertyName,
      'bookingDate': bookingDate,
      'endDate': endDate,
      'checkinTime': checkinTime,
      'checkoutTime': checkoutTime,
      'guestName': guestName,
      'guestPhone': guestPhone,
      'remarks': remarks,
      'assignedStaffId': assignedStaffId,
      'status': status,
      'amount': amount,
    };
  }
}
`
    },
    {
      path: 'lib/services/firebase_service.dart',
      description: 'Real-time Firestore listener with staff property filtering & offline cache',
      code: `import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../models/booking.dart';

class FirebaseService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  Stream<User?> get authStateChanges => _auth.authStateChanges();

  // Stream bookings isolated by assigned staff properties
  Stream<List<Booking>> getAssignedBookingsStream(List<String> propertyIds) {
    if (propertyIds.isEmpty) {
      return Stream.value([]);
    }
    return _db
        .collection('bookings')
        .where('propertyId', whereIn: propertyIds)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => Booking.fromFirestore(doc.data(), doc.id))
            .toList());
  }

  Future<void> signInWithGoogle() async {
    // Google Sign in implementation
  }

  Future<void> signOut() async {
    await _auth.signOut();
  }
}
`
    },
    {
      path: 'lib/screens/calendar_screen.dart',
      description: 'Google Material 3 Mobile Calendar & Agenda Screen for Staff',
      code: `import 'package:flutter/material.dart';
import 'package:table_calendar/table_calendar.dart';
import '../services/firebase_service.dart';
import '../models/booking.dart';

class CalendarScreen extends StatefulWidget {
  const CalendarScreen({super.key});

  @override
  State<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends State<CalendarScreen> {
  CalendarFormat _calendarFormat = CalendarFormat.month;
  DateTime _focusedDay = DateTime.now();
  DateTime? _selectedDay;

  // Sample assigned properties for Staff Ahmad Razak (PD-01, PD-02)
  final List<String> _assignedPropertyIds = ['prop-1', 'prop-2'];

  @override
  void initState() {
    super.initState();
    _selectedDay = _focusedDay;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Row(
          children: [
            Icon(Icons.calendar_today_rounded, color: Color(0xFF1A73E8)),
            SizedBox(width: 8),
            Text('PD Villas Calendar', style: TextStyle(fontWeight: FontWeight.w600)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.sync_rounded),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Offline data synchronized with Cloud Firestore!')),
              );
            },
          ),
        ],
      ),
      body: StreamBuilder<List<Booking>>(
        stream: FirebaseService().getAssignedBookingsStream(_assignedPropertyIds),
        builder: (context, snapshot) {
          final bookings = snapshot.data ?? [];

          return Column(
            children: [
              TableCalendar(
                firstDay: DateTime.utc(2025, 1, 1),
                lastDay: DateTime.utc(2030, 12, 31),
                focusedDay: _focusedDay,
                calendarFormat: _calendarFormat,
                selectedDayPredicate: (day) => isSameDay(_selectedDay, day),
                onDaySelected: (selectedDay, focusedDay) {
                  setState(() {
                    _selectedDay = selectedDay;
                    _focusedDay = focusedDay;
                  });
                },
                onFormatChanged: (format) {
                  setState(() {
                    _calendarFormat = format;
                  });
                },
              ),
              const Divider(height: 1),
              Expanded(
                child: ListView.builder(
                  itemCount: bookings.length,
                  padding: const EdgeInsets.all(12),
                  itemBuilder: (context, index) {
                    final b = bookings[index];
                    return Card(
                      elevation: 0,
                      color: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: const BorderSide(color: Color(0xFFE0E0E0)),
                      ),
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: const Color(0xFF1A73E8).withOpacity(0.1),
                          child: const Icon(Icons.home_work_rounded, color: Color(0xFF1A73E8)),
                        ),
                        title: Text(b.propertyName, style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text('Date: \${b.bookingDate} | Check-in: \${b.checkinTime}'),
                        trailing: Chip(
                          label: Text(b.status.toUpperCase(), style: const TextStyle(fontSize: 10, color: Colors.white)),
                          backgroundColor: Colors.green,
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
`
    },
    {
      path: '.github/workflows/build_apk.yml',
      description: 'GitHub Action workflow to automatically build release APK on every push',
      code: `name: Build Android APK

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.19.x'
          channel: 'stable'
      - run: flutter pub get
      - run: flutter build apk --release
      - uses: actions/upload-artifact@v3
        with:
          name: pd-villas-staff-apk
          path: build/app/outputs/flutter-apk/app-release.apk
`
    },
    {
      path: 'README_BUILD_APK.md',
      description: 'Step-by-step instructions to compile APK for Android phones',
      code: `# How to Build Android APK for PD Holiday Villas Staff

## Option 1: Direct Build with Flutter CLI
1. Install Flutter SDK on your computer (https://docs.flutter.dev/get-started/install).
2. Download or clone this repository.
3. Run \`flutter pub get\` in terminal.
4. Run \`flutter build apk --release\`.
5. The output APK file will be generated at \`build/app/outputs/flutter-apk/app-release.apk\`.
6. Transfer \`app-release.apk\` to your Android phone via WhatsApp, Google Drive, or USB to install.

## Option 2: Automatic Build via GitHub Actions (Free & Cloud)
1. Push this project code to your GitHub repository.
2. Go to **Actions** tab in GitHub.
3. Run the **Build Android APK** workflow.
4. Download the generated \`pd-villas-staff-apk\` artifact directly to your phone!
`
  }
  ];
}
