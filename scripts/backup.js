const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../dev.db');
const backupDir = path.join(__dirname, '../backups');

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(backupDir, `dev_${timestamp}.db`);

if (fs.existsSync(dbPath)) {
  fs.copyFileSync(dbPath, backupPath);
  console.log(`✅ 백업 완료: ${backupPath}`);
} else {
  console.log('⚠️ dev.db 파일을 찾을 수 없습니다.');
}
