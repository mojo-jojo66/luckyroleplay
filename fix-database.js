// fix-database.js
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('users.db');

console.log('🔧 Naprawianie struktury bazy danych...');

db.serialize(() => {
  // Sprawdź czy kolumna role już istnieje
  db.all("PRAGMA table_info(users)", (err, columns) => {
    if (err) {
      console.error('❌ Błąd sprawdzania struktury:', err);
      return;
    }
    
    console.log('📋 Aktualne kolumny w tabeli users:');
    columns.forEach(col => {
      console.log(`   - ${col.name} (${col.type})`);
    });
    
    const hasRole = columns.some(col => col.name === 'role');
    
    if (!hasRole) {
      console.log('\n🔨 Dodawanie kolumny role...');
      
      // Dodaj kolumnę role
      db.run("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'", (err) => {
        if (err) {
          console.error('❌ Błąd dodawania kolumny role:', err);
        } else {
          console.log('✅ Kolumna role została dodana');
          
          // Teraz nadaj uprawnienia administratora
          const username = 'mojo';
          db.run('UPDATE users SET role = ? WHERE username = ?', ['admin', username], function(err) {
            if (err) {
              console.error('❌ Błąd nadawania uprawnień:', err);
            } else if (this.changes === 0) {
              console.log('❌ Użytkownik nie został znaleziony!');
              
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
        }
      });
    } else {
      console.log('✅ Kolumna role już istnieje');
      
      // Nadaj uprawnienia administratora
      const username = 'mojo';
      db.run('UPDATE users SET role = ? WHERE username = ?', ['admin', username], function(err) {
        if (err) {
          console.error('❌ Błąd nadawania uprawnień:', err);
        } else if (this.changes === 0) {
          console.log('❌ Użytkownik nie został znaleziony!');
          
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
    }
  });
});