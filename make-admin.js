// make-admin.js
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('users.db');

// ZMIEŃ 'twoja_nazwa' na swoją rzeczywistą nazwę użytkownika!
const username = 'mojo'; // <-- ZMIEŃ TO!

console.log(`Nadawanie uprawnień administratora użytkownikowi: ${username}`);

db.run('UPDATE users SET role = ? WHERE username = ?', ['admin', username], function(err) {
  if (err) {
    console.error('❌ Błąd:', err);
  } else if (this.changes === 0) {
    console.log('❌ Użytkownik nie został znaleziony!');
    console.log('📝 Sprawdź czy nazwa użytkownika jest poprawna');
    
    // Pokaż wszystkich użytkowników
    db.all('SELECT username, role FROM users', (err, rows) => {
      if (rows) {
        console.log('\n📋 Dostępni użytkownicy:');
        rows.forEach(row => {
          console.log(`   - ${row.username} (${row.role})`);
        });
      }
      db.close();
    });
  } else {
    console.log(`✅ Użytkownik "${username}" został mianowany administratorem!`);
    
    // Sprawdź wynik
    db.get('SELECT username, role FROM users WHERE username = ?', [username], (err, row) => {
      if (row) {
        console.log(`🎉 Potwierdzenie - ${row.username}: ${row.role}`);
      }
      db.close();
    });
  }
});