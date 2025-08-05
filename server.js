const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');

console.log('=== URUCHAMIANIE SERWERA ===');
console.log('Wszystkie moduły załadowane pomyślnie');

const app = express();

// Konfiguracja sesji
app.use(session({
  secret: 'lucky-roleplay-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, 
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax'
  }
}));

// Baza danych z debugowaniem
const db = new sqlite3.Database('users.db', (err) => {
  if (err) {
    console.error('Błąd połączenia z bazą danych:', err);
  } else {
    console.log('Połączono z bazą danych SQLite');
  }
});

// Tworzenie tabel
db.serialize(() => {
  // Tabela użytkowników z rolą
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    discord TEXT,
    role TEXT DEFAULT 'user'
  )`, (err) => {
    if (err) {
      console.error('Błąd tworzenia tabeli users:', err);
    } else {
      console.log('Tabela users gotowa');
    }
  });

  // Tabela podań
  db.run(`CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    organization TEXT,
    discord_contact TEXT,
    answers TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`, (err) => {
    if (err) {
      console.error('Błąd tworzenia tabeli applications:', err);
    } else {
      console.log('Tabela applications gotowa');
      
      // Sprawdź czy tabela ma starą strukturę i zaktualizuj ją
      db.all("PRAGMA table_info(applications)", (err, columns) => {
        if (err) {
          console.error('Błąd sprawdzania struktury tabeli:', err);
          return;
        }
        
        const columnNames = columns.map(col => col.name);
        const hasOldStructure = columnNames.includes('full_name') || columnNames.includes('experience');
        
        if (hasOldStructure && !columnNames.includes('answers')) {
          console.log('Wykryto starą strukturę tabeli, dodawanie kolumny answers...');
          db.run("ALTER TABLE applications ADD COLUMN answers TEXT", (err) => {
            if (err && !err.message.includes('duplicate column name')) {
              console.error('Błąd dodawania kolumny answers:', err);
            } else {
              console.log('Kolumna answers dodana pomyślnie');
            }
          });
        }
      });
    }
  });

  // Tabela regulaminu
  db.run(`CREATE TABLE IF NOT EXISTS rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT,
    last_update DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER,
    FOREIGN KEY (updated_by) REFERENCES users (id)
  )`, (err) => {
    if (err) {
      console.error('Błąd tworzenia tabeli rules:', err);
    } else {
      console.log('Tabela rules gotowa');
    }
  });
});

// Funkcje pomocnicze do sprawdzania uprawnień
function hasAdminPermissions(user) {
  console.log('hasAdminPermissions sprawdza:', {
    user: user,
    userExists: !!user,
    userRole: user ? user.role : 'brak użytkownika',
    isAdmin: user && user.role === 'admin',
    isRecruiter: user && user.role && user.role.includes('recruiter'),
    result: user && user.role && (user.role === 'admin' || user.role.includes('recruiter'))
  });
  return user && user.role && (user.role === 'admin' || user.role.includes('recruiter'));
}

function hasOrganizationPermissions(user, organization) {
  console.log('hasOrganizationPermissions sprawdza:', {
    user: user,
    organization: organization,
    userRole: user ? user.role : 'brak użytkownika'
  });
  
  if (!user) return false;
  
  // Administrator ma dostęp do wszystkich organizacji
  if (user.role === 'admin') {
    console.log('Użytkownik jest adminem - dostęp przyznany');
    return true;
  }
  
  // Mapowanie ról rekrutantów do organizacji
  const roleToOrg = {
    'recruiter_lspd': 'LSPD',
    'recruiter_ems': 'EMS',
    'recruiter_skyline': 'Skyline', 
    'recruiter_burgershot': 'Burgershot',
    'recruiter_crime': 'Crime'
  };
  
  const userOrg = roleToOrg[user.role];
  console.log('Mapowanie roli na organizację:', {
    userRole: user.role,
    mappedOrg: userOrg,
    requestedOrg: organization,
    hasAccess: userOrg === organization
  });
  
  return userOrg === organization;
}

function hasUserManagementPermissions(user) {
  return user && user.role === 'admin';
}

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(__dirname));

console.log('Middleware załadowany');

// Middleware debugowania sesji
app.use((req, res, next) => {
  console.log(`\n=== ${req.method} ${req.url} ===`);
  console.log('Session ID:', req.sessionID);
  console.log('Session user:', req.session.user);
  console.log('Headers:', req.headers.cookie ? 'Cookies present' : 'No cookies');
  console.log('---');
  next();
});

// Sprawdzanie autoryzacji
app.get('/api/check-auth', (req, res) => {
  console.log('Check-auth - sesja użytkownika:', req.session.user);
  
  if (req.session.user) {
    res.json({ 
      loggedIn: true, 
      username: req.session.user.username,
      role: req.session.user.role 
    });
  } else {
    res.json({ loggedIn: false });
  }
});

// Logowanie
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, row) => {
    if (err) {
      console.error('Błąd logowania:', err);
      res.json({ success: false, message: 'Błąd serwera' });
    } else if (row) {
      req.session.user = { 
        id: row.id, 
        username: row.username, 
        role: row.role || 'user' 
      };
      res.json({ success: true, message: 'Zalogowano pomyślnie!' });
    } else {
      res.json({ success: false, message: 'Błędne dane logowania!' });
    }
  });
});

// Rejestracja
app.post('/api/register', (req, res) => {
  const { username, password, discord } = req.body;
  
  if (!username || !password || !discord) {
    return res.json({ success: false, message: 'Wszystkie pola są wymagane!' });
  }
  
  db.run('INSERT INTO users (username, password, discord, role) VALUES (?, ?, ?, ?)', 
    [username, password, discord, 'user'], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        res.json({ success: false, message: 'Użytkownik o tej nazwie już istnieje!' });
      } else {
        res.json({ success: false, message: `Błąd podczas rejestracji: ${err.message}` });
      }
    } else {
      res.json({ success: true, message: 'Konto zostało utworzone!' });
    }
  });
});

// Składanie podania z sprawdzaniem duplikatów
app.post('/api/submit-application', (req, res) => {
  if (!req.session.user) {
    return res.json({ success: false, message: 'Musisz być zalogowany' });
  }

  const {
    organization,
    discord_contact,
    answers
  } = req.body;

  console.log('Otrzymane dane podania:', { organization, discord_contact, answers });

  if (!organization || !discord_contact || !answers) {
    return res.json({ success: false, message: 'Brak wymaganych danych' });
  }

  // Najpierw sprawdź czy użytkownik już ma oczekujące lub zaakceptowane podanie dla tej organizacji
  db.get(`SELECT * FROM applications 
    WHERE user_id = ? AND organization = ? AND status IN ('pending', 'approved')`,
    [req.session.user.id, organization],
    (err, existingApplication) => {
      if (err) {
        console.error('Błąd sprawdzania istniejących podań:', err);
        return res.json({ success: false, message: 'Błąd podczas sprawdzania podań' });
      }

      if (existingApplication) {
        const statusText = existingApplication.status === 'pending' ? 'oczekujące' : 'zaakceptowane';
        return res.json({ 
          success: false, 
          message: `Masz już ${statusText} podanie dla tej organizacji. Możesz złożyć nowe podanie tylko po odrzuceniu poprzedniego.` 
        });
      }

      // Jeśli nie ma konfliktów, złóż nowe podanie
      const answersJson = JSON.stringify(answers);
      
      db.run(`INSERT INTO applications 
        (user_id, organization, discord_contact, answers) 
        VALUES (?, ?, ?, ?)`,
        [req.session.user.id, organization, discord_contact, answersJson],
        function(err) {
          if (err) {
            console.error('Błąd składania podania:', err);
            res.json({ success: false, message: 'Błąd podczas składania podania' });
          } else {
            console.log('Podanie złożone pomyślnie, ID:', this.lastID);
            res.json({ success: true, message: 'Podanie zostało złożone pomyślnie!' });
          }
        });
    });
});

// Pobieranie podań dla administratora/rekrutanta
app.get('/api/admin/applications/:organization', (req, res) => {
  console.log('\n=== REQUEST DO /api/admin/applications ===');
  console.log('Organization:', req.params.organization);
  console.log('Session ID:', req.sessionID);
  console.log('Session user:', req.session.user);

  const organization = req.params.organization;
  console.log('Sprawdzanie uprawnień organizacyjnych...');
  
  // Sprawdź czy użytkownik ma uprawnienia do tej organizacji (admin lub odpowiedni rekrutant)
  if (!hasOrganizationPermissions(req.session.user, organization)) {
    console.log('BŁĄD: Brak uprawnień do organizacji:', organization, 'dla użytkownika:', req.session.user);
    return res.json({ success: false, message: 'Brak uprawnień do tej organizacji' });
  }
  
  console.log('Uprawnienia OK, pobieranie podań...');
  
  db.all(`SELECT a.*, u.username 
    FROM applications a 
    JOIN users u ON a.user_id = u.id 
    WHERE a.organization = ? 
    ORDER BY a.created_at DESC`,
    [organization],
    (err, rows) => {
      if (err) {
        console.error('Błąd pobierania podań:', err);
        res.json({ success: false, message: 'Błąd pobierania podań' });
      } else {
        console.log('Znaleziono podań:', rows.length);
        // Parsuj answers z JSON dla każdego podania
        const applicationsWithParsedAnswers = rows.map(app => {
          try {
            app.answers = app.answers ? JSON.parse(app.answers) : {};
          } catch (e) {
            console.error('Błąd parsowania answers dla podania ID:', app.id);
            app.answers = {};
          }
          return app;
        });
        
        res.json({ success: true, applications: applicationsWithParsedAnswers });
      }
    });
});

// Endpoint do pobierania podań dla konkretnej organizacji
app.get('/api/applications/:organization', (req, res) => {
  const organization = req.params.organization;
  
  // Sprawdź czy użytkownik ma uprawnienia do tej organizacji
  if (!hasOrganizationPermissions(req.session.user, organization)) {
    return res.json({ success: false, message: 'Brak uprawnień do tej organizacji' });
  }
  
  // Sprawdź czy organizacja jest dozwolona
  const allowedOrgs = ['LSPD', 'EMS', 'Skyline', 'Burgershot', 'Crime', 'Admin'];
  if (!allowedOrgs.includes(organization)) {
    return res.json({ success: false, message: 'Nieprawidłowa organizacja' });
  }

  // Pobierz podania z bazy danych
  db.all(`SELECT a.*, u.username 
    FROM applications a 
    JOIN users u ON a.user_id = u.id 
    WHERE a.organization = ? 
    ORDER BY a.created_at DESC`,
    [organization],
    (err, rows) => {
      if (err) {
        console.error('Błąd pobierania podań:', err);
        return res.json({ success: false, message: 'Błąd bazy danych' });
      }

      // Parsuj answers z JSON dla każdego podania
      const applicationsWithParsedAnswers = rows.map(app => {
        try {
          app.answers = app.answers ? JSON.parse(app.answers) : {};
        } catch (e) {
          console.error('Błąd parsowania answers dla podania ID:', app.id);
          app.answers = {};
        }
        return app;
      });

      res.json({ success: true, applications: applicationsWithParsedAnswers });
    });
});

// Aktualizacja statusu podania
app.post('/api/admin/update-application-status', (req, res) => {
  const { applicationId, status } = req.body;

  if (!['pending', 'approved', 'rejected'].includes(status)) {
    return res.json({ success: false, message: 'Nieprawidłowy status' });
  }

  // Najpierw sprawdź organizację podania i uprawnienia użytkownika
  db.get('SELECT organization FROM applications WHERE id = ?', [applicationId], (err, row) => {
    if (err) {
      console.error('Błąd pobierania podania:', err);
      return res.json({ success: false, message: 'Błąd bazy danych' });
    }

    if (!row) {
      return res.json({ success: false, message: 'Podanie nie znalezione' });
    }

    // Sprawdź czy użytkownik ma uprawnienia do tej organizacji
    if (!hasOrganizationPermissions(req.session.user, row.organization)) {
      return res.json({ success: false, message: 'Brak uprawnień do tej organizacji' });
    }

    // Aktualizuj status
    db.run('UPDATE applications SET status = ? WHERE id = ?',
      [status, applicationId],
      function(err) {
        if (err) {
          console.error('Błąd aktualizacji statusu:', err);
          return res.json({ success: false, message: 'Błąd bazy danych' });
        }

        if (this.changes === 0) {
          return res.json({ success: false, message: 'Podanie nie znalezione' });
        }

        console.log(`Status podania ${applicationId} zmieniony na ${status}`);
        res.json({ success: true, message: 'Status zaktualizowany pomyślnie' });
      });
  });
});

// Pobieranie szczegółów pojedynczego podania
app.get('/api/admin/application-details/:applicationId', (req, res) => {
  const applicationId = req.params.applicationId;

  db.get(`SELECT a.*, u.username 
          FROM applications a 
          JOIN users u ON a.user_id = u.id 
          WHERE a.id = ?`,
    [applicationId],
    (err, row) => {
      if (err) {
        console.error('Błąd pobierania szczegółów podania:', err);
        return res.json({ success: false, message: 'Błąd bazy danych' });
      }

      if (!row) {
        return res.json({ success: false, message: 'Nie znaleziono podania' });
      }

      // Sprawdź czy użytkownik ma uprawnienia do tej organizacji
      if (!hasOrganizationPermissions(req.session.user, row.organization)) {
        return res.json({ success: false, message: 'Brak uprawnień do tej organizacji' });
      }

      // Parsuj odpowiedzi z JSON
      let questions_answers = null;
      if (row.answers) {
        try {
          questions_answers = row.answers;
        } catch (e) {
          console.error('Błąd parsowania odpowiedzi:', e);
        }
      }

      const application = {
        id: row.id,
        user_id: row.user_id,
        username: row.username,
        organization: row.organization,
        discord_contact: row.discord_contact,
        status: row.status,
        created_at: row.created_at,
        questions_answers: questions_answers
      };

      res.json({ success: true, application: application });
    });
});

// Wylogowanie
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Endpoint do pobierania informacji o użytkowniku
app.get('/api/user-info', (req, res) => {
  if (!req.session.user) {
    return res.json({ success: false, message: 'Użytkownik nie zalogowany' });
  }

  db.get('SELECT username, discord, role FROM users WHERE id = ?', [req.session.user.id], (err, row) => {
    if (err) {
      console.error('Błąd pobierania danych użytkownika:', err);
      res.json({ success: false, message: 'Błąd serwera' });
    } else if (row) {
      res.json({ 
        success: true, 
        username: row.username,
        discord: row.discord,
        role: row.role 
      });
    } else {
      res.json({ success: false, message: 'Użytkownik nie znaleziony' });
    }
  });
});

// Sprawdzanie dostępności składania podań dla użytkownika
app.get('/api/check-application-availability/:organization', (req, res) => {
  if (!req.session.user) {
    return res.json({ success: false, message: 'Musisz być zalogowany' });
  }

  const organization = req.params.organization;

  db.get(`SELECT status, created_at FROM applications 
    WHERE user_id = ? AND organization = ? AND status IN ('pending', 'approved')
    ORDER BY created_at DESC LIMIT 1`,
    [req.session.user.id, organization],
    (err, application) => {
      if (err) {
        console.error('Błąd sprawdzania dostępności:', err);
        return res.json({ success: false, message: 'Błąd serwera' });
      }

      if (application) {
        const statusText = application.status === 'pending' ? 'oczekujące' : 'zaakceptowane';
        res.json({ 
          canApply: false, 
          reason: `Masz już ${statusText} podanie dla tej organizacji`,
          existingStatus: application.status,
          appliedDate: application.created_at
        });
      } else {
        res.json({ canApply: true });
      }
    });
});

// Pobieranie podań użytkownika
app.get('/api/user-applications', (req, res) => {
  if (!req.session.user) {
    return res.json({ success: false, message: 'Musisz być zalogowany' });
  }

  db.all(`SELECT organization, status, created_at FROM applications 
    WHERE user_id = ? AND status IN ('pending', 'approved')
    ORDER BY created_at DESC`,
    [req.session.user.id],
    (err, rows) => {
      if (err) {
        console.error('Błąd pobierania podań użytkownika:', err);
        res.json({ success: false, message: 'Błąd serwera' });
      } else {
        res.json({ success: true, applications: rows });
      }
    });
});

// API dla regulaminu - pobieranie
app.get('/api/rules', (req, res) => {
  console.log('Żądanie pobrania regulaminu');
  db.get('SELECT content, last_update FROM rules ORDER BY last_update DESC LIMIT 1', (err, row) => {
    if (err) {
      console.error('Błąd pobierania regulaminu:', err);
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    } else if (row) {
      console.log('Znaleziono regulamin w bazie danych');
      res.json({ 
        success: true, 
        content: row.content,
        lastUpdate: row.last_update
      });
    } else {
      console.log('Brak regulaminu w bazie danych - używanie domyślnego');
      // Zwróć domyślny regulamin jeśli brak w bazie
      res.json({ 
        success: true, 
        content: null,
        lastUpdate: new Date().toISOString()
      });
    }
  });
});

// API dla regulaminu - zapisywanie (tylko admin)
app.post('/api/rules', (req, res) => {
  console.log('Otrzymano żądanie zapisania regulaminu');
  console.log('Sesja użytkownika:', req.session.user);
  console.log('Dane żądania:', req.body);

  if (!req.session.user || req.session.user.role !== 'admin') {
    console.log('Brak uprawnień administratora');
    return res.status(403).json({ success: false, message: 'Brak uprawnień administratora' });
  }

  const { content } = req.body;
  
  if (!content) {
    console.log('Brak treści regulaminu');
    return res.status(400).json({ success: false, message: 'Brak treści regulaminu' });
  }

  console.log('Zapisywanie regulaminu do bazy danych...');
  db.run('INSERT INTO rules (content, updated_by) VALUES (?, ?)',
    [content, req.session.user.id],
    function(err) {
      if (err) {
        console.error('Błąd zapisywania regulaminu:', err);
        res.status(500).json({ success: false, message: 'Błąd podczas zapisywania: ' + err.message });
      } else {
        console.log('Regulamin zaktualizowany przez:', req.session.user.username, 'ID:', this.lastID);
        res.json({ success: true, message: 'Regulamin został zaktualizowany' });
      }
    });
});

// ===== API LICZNIKÓW ORGANIZACJI =====

// Pobieranie liczby podań dla każdej organizacji
app.get('/api/admin/application-counts', (req, res) => {
  // Tylko administratorzy mogą pobierać liczniki dla wszystkich organizacji
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Brak uprawnień administratora' });
  }

  const countQuery = `
    SELECT organization, COUNT(*) as count 
    FROM applications 
    GROUP BY organization
  `;

  db.all(countQuery, [], (err, rows) => {
    if (err) {
      console.error('Błąd pobierania liczników:', err);
      return res.status(500).json({ success: false, message: 'Błąd serwera' });
    }

    const counts = {};
    rows.forEach(row => {
      counts[row.organization] = row.count;
    });

    res.json({
      success: true,
      counts: counts
    });
  });
});

// ===== API ZARZĄDZANIA UŻYTKOWNIKAMI =====

// Pobieranie listy użytkowników z statystykami
app.get('/api/admin/users', (req, res) => {
  if (!hasUserManagementPermissions(req.session.user)) {
    return res.status(403).json({ success: false, message: 'Brak uprawnień administratora' });
  }

  // Pobierz wszystkich użytkowników
  const getUsersQuery = `
    SELECT id, username, discord as discord_id, role 
    FROM users 
    ORDER BY username ASC
  `;

  // Pobierz statystyki
  const getStatsQuery = `
    SELECT 
      COUNT(*) as totalUsers,
      SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as totalAdmins,
      SUM(CASE WHEN role = 'banned' THEN 1 ELSE 0 END) as totalBanned
    FROM users
  `;

  db.all(getUsersQuery, [], (err, users) => {
    if (err) {
      console.error('Błąd pobierania użytkowników:', err);
      return res.status(500).json({ success: false, message: 'Błąd serwera' });
    }

    db.get(getStatsQuery, [], (err, stats) => {
      if (err) {
        console.error('Błąd pobierania statystyk:', err);
        return res.status(500).json({ success: false, message: 'Błąd serwera' });
      }

      res.json({
        success: true,
        users: users,
        stats: {
          totalUsers: stats.totalUsers || 0,
          totalAdmins: stats.totalAdmins || 0,
          totalBanned: stats.totalBanned || 0
        }
      });
    });
  });
});

// Aktualizacja danych użytkownika
app.post('/api/admin/users/update', (req, res) => {
  if (!hasUserManagementPermissions(req.session.user)) {
    return res.status(403).json({ success: false, message: 'Brak uprawnień administratora' });
  }

  const { userId, username, discordId, role } = req.body;

  if (!userId || !username || !discordId || !role) {
    return res.status(400).json({ success: false, message: 'Wszystkie pola są wymagane' });
  }

  // Sprawdź czy nazwa użytkownika nie jest zajęta przez innego użytkownika
  const checkUsernameQuery = 'SELECT id FROM users WHERE username = ? AND id != ?';
  db.get(checkUsernameQuery, [username, userId], (err, existingUser) => {
    if (err) {
      console.error('Błąd sprawdzania nazwy użytkownika:', err);
      return res.status(500).json({ success: false, message: 'Błąd serwera' });
    }

    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Ta nazwa użytkownika jest już zajęta' });
    }

    // Aktualizuj dane użytkownika
    const updateQuery = 'UPDATE users SET username = ?, discord = ?, role = ? WHERE id = ?';
    db.run(updateQuery, [username, discordId, role, userId], function(err) {
      if (err) {
        console.error('Błąd aktualizacji użytkownika:', err);
        return res.status(500).json({ success: false, message: 'Błąd podczas aktualizacji' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ success: false, message: 'Użytkownik nie został znaleziony' });
      }

      console.log(`Admin ${req.session.user.username} zaktualizował użytkownika ID: ${userId}`);
      res.json({ success: true, message: 'Dane użytkownika zostały zaktualizowane' });
    });
  });
});

// Usuwanie konta użytkownika
app.post('/api/admin/users/delete', (req, res) => {
  if (!hasUserManagementPermissions(req.session.user)) {
    return res.status(403).json({ success: false, message: 'Brak uprawnień administratora' });
  }

  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ success: false, message: 'ID użytkownika jest wymagane' });
  }

  // Sprawdź czy użytkownik nie próbuje usunąć samego siebie
  if (parseInt(userId) === req.session.user.id) {
    return res.status(400).json({ success: false, message: 'Nie możesz usunąć własnego konta' });
  }

  // Pobierz dane użytkownika przed usunięciem (do logowania)
  const getUserQuery = 'SELECT username FROM users WHERE id = ?';
  db.get(getUserQuery, [userId], (err, user) => {
    if (err) {
      console.error('Błąd pobierania danych użytkownika:', err);
      return res.status(500).json({ success: false, message: 'Błąd serwera' });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'Użytkownik nie został znaleziony' });
    }

    // Usuń podania użytkownika
    const deleteApplicationsQuery = 'DELETE FROM applications WHERE user_id = ?';
    db.run(deleteApplicationsQuery, [userId], (err) => {
      if (err) {
        console.error('Błąd usuwania podań użytkownika:', err);
        return res.status(500).json({ success: false, message: 'Błąd podczas usuwania podań' });
      }

      // Usuń użytkownika
      const deleteUserQuery = 'DELETE FROM users WHERE id = ?';
      db.run(deleteUserQuery, [userId], function(err) {
        if (err) {
          console.error('Błąd usuwania użytkownika:', err);
          return res.status(500).json({ success: false, message: 'Błąd podczas usuwania konta' });
        }

        console.log(`Admin ${req.session.user.username} usunął konto użytkownika: ${user.username} (ID: ${userId})`);
        res.json({ success: true, message: 'Konto użytkownika zostało usunięte' });
      });
    });
  });
});

// Banowanie użytkownika
app.post('/api/admin/users/ban', (req, res) => {
  if (!hasUserManagementPermissions(req.session.user)) {
    return res.status(403).json({ success: false, message: 'Brak uprawnień administratora' });
  }

  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ success: false, message: 'ID użytkownika jest wymagane' });
  }

  // Sprawdź czy użytkownik nie próbuje zbanować samego siebie
  if (parseInt(userId) === req.session.user.id) {
    return res.status(400).json({ success: false, message: 'Nie możesz zbanować własnego konta' });
  }

  // Pobierz dane użytkownika przed banovaniem (do logowania)
  const getUserQuery = 'SELECT username, role FROM users WHERE id = ?';
  db.get(getUserQuery, [userId], (err, user) => {
    if (err) {
      console.error('Błąd pobierania danych użytkownika:', err);
      return res.status(500).json({ success: false, message: 'Błąd serwera' });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'Użytkownik nie został znaleziony' });
    }

    if (user.role === 'banned') {
      return res.status(400).json({ success: false, message: 'Użytkownik jest już zbanowany' });
    }

    // Zmień rolę na 'banned'
    const banUserQuery = 'UPDATE users SET role = ? WHERE id = ?';
    db.run(banUserQuery, ['banned', userId], function(err) {
      if (err) {
        console.error('Błąd banowania użytkownika:', err);
        return res.status(500).json({ success: false, message: 'Błąd podczas banowania' });
      }

      console.log(`Admin ${req.session.user.username} zbanował użytkownika: ${user.username} (ID: ${userId})`);
      res.json({ success: true, message: 'Użytkownik został zbanowany' });
    });
  });
});

app.listen(3001, () => {
  console.log('Serwer działa na http://localhost:3001');
});