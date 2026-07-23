class Booking {
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
