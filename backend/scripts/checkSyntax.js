import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

function checkDir(dir) {
  let count = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git') {
      count += checkDir(full);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      try {
        execSync(`node --check "${full}"`);
        count++;
      } catch (err) {
        console.error('❌ Syntax error in file:', full);
        process.exit(1);
      }
    }
  }
  return count;
}

console.log('🔍 Checking all backend JavaScript files for syntax & compile errors...');
const total = checkDir('.');
console.log(`✅ All ${total} backend JavaScript files passed syntax verification cleanly!`);
