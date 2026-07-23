import 'package:cloud_firestore/cloud_firestore.dart';
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

  Future<UserCredential> signInWithEmail(String email, String password) async {
    return await _auth.signInWithEmailAndPassword(email: email, password: password);
  }

  Future<void> signInWithGoogle() async {
    // Google Sign in implementation
  }

  Future<void> signOut() async {
    await _auth.signOut();
  }
}
