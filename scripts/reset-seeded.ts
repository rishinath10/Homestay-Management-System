import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);

async function run() {
  console.log('Resetting seeded flag to false...');
  await setDoc(doc(db, 'settings', 'system_config'), { seeded: false });
  console.log('Reset complete!');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
