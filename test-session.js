// Test sesji - sprawdź czy jesteś zalogowany
fetch('/api/check-auth')
  .then(response => response.json())
  .then(data => {
    console.log('=== TEST SESJI ===');
    console.log('Dane sesji:', data);
    
    if (data.loggedIn) {
      console.log('✅ Jesteś zalogowany jako:', data.username);
      console.log('✅ Twoja rola:', data.role);
      
      // Test hasAdminPermissions
      const isAdmin = data.role === 'admin' || (data.role && data.role.includes('recruiter'));
      console.log('✅ hasAdminPermissions should return:', isAdmin);
      
      // Test requestu do EMS
      return fetch('/api/admin/applications/EMS');
    } else {
      console.log('❌ Nie jesteś zalogowany!');
    }
  })
  .then(response => {
    if (response) {
      console.log('=== TEST REQUEST EMS ===');
      console.log('Status:', response.status);
      return response.json();
    }
  })
  .then(data => {
    if (data) {
      console.log('Odpowiedź:', data);
    }
  })
  .catch(error => {
    console.error('Błąd testu:', error);
  });
