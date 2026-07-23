import 'package:flutter/material.dart';
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
                        subtitle: Text('Date: ${b.bookingDate} | Check-in: ${b.checkinTime}'),
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
