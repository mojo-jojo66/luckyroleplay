const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('users.db', (err) => {
  if (err) {
    console.error('Błąd połączenia z bazą danych:', err);
  } else {
    console.log('Połączono z bazą danych SQLite');
  }
});

console.log('=== SPRAWDZENIE UŻYTKOWNIKÓW ===');

db.all(`SELECT id, username, role FROM users ORDER BY id`, [], (err, rows) => {
  if (err) {
    console.error('Błąd pobierania użytkowników:', err);
  } else {
    console.log('Wszyscy użytkownicy:');
    console.table(rows);
    
    console.log('\n=== REKRUTANCI ===');
    const recruiters = rows.filter(user => user.role.includes('recruiter'));
    console.table(recruiters);
    
    console.log('\n=== ADMINISTRATORZY ===');
    const admins = rows.filter(user => user.role === 'admin');
    console.table(admins);
  }
  
  db.close();
});
