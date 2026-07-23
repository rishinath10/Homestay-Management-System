import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);

async function run() {
  console.log('Updating Admin & Owner emails in Firestore...');
  
  // Set auth_config
  await setDoc(doc(db, 'settings', 'auth_config'), {
    superAdminEmail: 'rishinathsai@gmail.com',
    superAdminPassword: 'admin123',
    ownerEmail: 'pdholidayvillas@gmail.com',
    ownerPassword: 'jeff123',
    ownerName: 'Jeff'
  }, { merge: true });

  // Reset system config to false so next reload seeds the correct default items
  await setDoc(doc(db, 'settings', 'system_config'), { seeded: false });

  console.log('Update successful!');
  process.exit(0);
}

run().catch(err => {
  console.error('Failed to update config:', err);
  process.exit(1);
});
