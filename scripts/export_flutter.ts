import { getFlutterCodebase } from '../src/lib/flutterExporter';
import * as fs from 'fs';
import * as path from 'path';

const projectRoot = process.cwd();
const flutterDir = path.resolve(projectRoot, 'flutter_app');

console.log('Generating Flutter mobile app at:', flutterDir);

if (!fs.existsSync(flutterDir)) {
  fs.mkdirSync(flutterDir, { recursive: true });
}

const files = getFlutterCodebase();

for (const file of files) {
  const filePath = path.join(flutterDir, file.path);
  const dirPath = path.dirname(filePath);

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  fs.writeFileSync(filePath, file.code, 'utf8');
  console.log(`- Created ${file.path} (${file.description})`);
}

console.log('\nFlutter app generated successfully!');
