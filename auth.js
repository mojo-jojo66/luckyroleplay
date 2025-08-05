// auth.js - Wspólna logika autoryzacji z obsługą ról

// Sprawdź status logowania użytkownika
async function checkAuthStatus() {
  try {
    const response = await fetch('/api/check-auth');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Błąd sprawdzania autoryzacji:', error);
    return { loggedIn: false };
  }
}

// Aktualizuj menu użytkownika na podstawie statusu logowania
async function updateUserMenu() {
  const dropdown = document.getElementById('userDropdown');
  const modernDropdown = document.getElementById('modernUserDropdown');
  
  const authData = await checkAuthStatus();
  
  if (authData.loggedIn) {
    let adminButton = '';
    let modernAdminButton = '';
    
    // Sprawdź czy użytkownik ma uprawnienia do panelu (admin lub rekrutant)
    const hasAdminPanelAccess = authData.role === 'admin' || authData.role.includes('recruiter');
    
    if (hasAdminPanelAccess) {
      const panelName = authData.role === 'admin' ? 'Panel Admina' : 'Panel Rekrutanta';
      
      adminButton = `
        <button onclick="window.location.href='admin.html'" style="width: 100%; padding: 12px 16px; background: rgba(255, 149, 0, 0.1); border: 1px solid #ff9500; color: #ff9500; border-radius: 10px; font-weight: 600; cursor: pointer; margin-bottom: 8px; transition: all 0.3s ease; display: flex; align-items: center; gap: 8px; justify-content: center;">
          <i class="fas fa-cog"></i> ${panelName}
        </button>
      `;
      
      modernAdminButton = `
        <button onclick="window.location.href='admin.html'" style="width: 100%; padding: 12px 16px; background: rgba(255, 149, 0, 0.1); border: 1px solid #ff9500; color: #ff9500; border-radius: 10px; font-weight: 600; cursor: pointer; margin-bottom: 8px; transition: all 0.3s ease; display: flex; align-items: center; gap: 8px; justify-content: center; font-family: 'Inter', sans-serif;">
          <i class="fas fa-cog"></i> ${panelName}
        </button>
      `;
    }
    
    // Mapowanie ról na czytelne nazwy
    const getRoleDisplay = (role) => {
      const roleNames = {
        'admin': '<div style="color: #ff9500; font-weight: bold; margin-top: 4px;"><i class="fas fa-crown"></i> Administrator</div>',
        'recruiter_lspd': '<div style="color: #007bff; font-weight: bold; margin-top: 4px;"><i class="fas fa-shield-alt"></i> Rekrutant LSPD</div>',
        'recruiter_ems': '<div style="color: #dc3545; font-weight: bold; margin-top: 4px;"><i class="fas fa-ambulance"></i> Rekrutant EMS</div>',
        'recruiter_skyline': '<div style="color: #ffc107; font-weight: bold; margin-top: 4px;"><i class="fas fa-wrench"></i> Rekrutant Skyline</div>',
        'recruiter_burgershot': '<div style="color: #ffc107; font-weight: bold; margin-top: 4px;"><i class="fas fa-hamburger"></i> Rekrutant Burgershot</div>',
        'recruiter_crime': '<div style="color: #6c757d; font-weight: bold; margin-top: 4px;"><i class="fas fa-mask"></i> Rekrutant Crime</div>'
      };
      return roleNames[role] || '';
    };
    
    // Stary dropdown
    if (dropdown) {
      dropdown.innerHTML = `
        <div style="padding: 12px; color: white; font-size: 14px; border-bottom: 1px solid rgba(255,255,255,0.1); text-align: center; margin-bottom: 12px; border-radius: 8px; background: rgba(0, 212, 255, 0.1);">
          <div style="font-weight: 600;">Witaj, <strong>${authData.username}</strong>!</div>
          ${getRoleDisplay(authData.role)}
        </div>
        ${adminButton}
        <button onclick="logout()" style="width: 100%; padding: 12px 16px; background: rgba(255, 68, 68, 0.1); border: 1px solid #ff4444; color: #ff4444; border-radius: 10px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; display: flex; align-items: center; gap: 8px; justify-content: center;">
          <i class="fas fa-sign-out-alt"></i> Wyloguj się
        </button>
      `;
    }
    
    // Nowoczesny dropdown
    if (modernDropdown) {
      modernDropdown.innerHTML = `
        <div style="padding: 12px; color: white; font-size: 14px; border-bottom: 1px solid rgba(255,255,255,0.1); text-align: center; margin-bottom: 12px; border-radius: 8px; background: rgba(0, 212, 255, 0.1); font-family: 'Inter', sans-serif;">
          <div style="font-weight: 600;">Witaj, <strong>${authData.username}</strong>!</div>
          ${getRoleDisplay(authData.role)}
        </div>
        ${modernAdminButton}
        <button onclick="logout()" style="width: 100%; padding: 12px 16px; background: rgba(255, 68, 68, 0.1); border: 1px solid #ff4444; color: #ff4444; border-radius: 10px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; display: flex; align-items: center; gap: 8px; justify-content: center; font-family: 'Inter', sans-serif;">
          <i class="fas fa-sign-out-alt"></i> Wyloguj się
        </button>
      `;
    }
  } else {
    // Stary dropdown
    if (dropdown) {
      dropdown.innerHTML = `
        <button onclick="window.location.href='login.html'" style="width: 100%; padding: 12px 16px; background: rgba(0, 212, 255, 0.1); border: 1px solid #00d4ff; color: #00d4ff; border-radius: 10px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; display: flex; align-items: center; gap: 8px; justify-content: center;">
          <i class="fas fa-sign-in-alt"></i> Zaloguj się
        </button>
      `;
    }
    
    // Nowoczesny dropdown
    if (modernDropdown) {
      modernDropdown.innerHTML = `
        <button onclick="window.location.href='login.html'" style="width: 100%; padding: 12px 16px; background: rgba(0, 212, 255, 0.1); border: 1px solid #00d4ff; color: #00d4ff; border-radius: 10px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; display: flex; align-items: center; gap: 8px; justify-content: center; font-family: 'Inter', sans-serif;">
          <i class="fas fa-sign-in-alt"></i> Zaloguj się
        </button>
      `;
    }
  }
}

// Funkcja wylogowania
async function logout() {
  try {
    const response = await fetch('/api/logout', { method: 'POST' });
    const data = await response.json();
    
    if (data.success) {
      window.location.href = 'index.html';
    } else {
      alert('Błąd podczas wylogowania');
    }
  } catch (error) {
    alert('Błąd połączenia podczas wylogowania');
  }
}

// Konfiguracja menu użytkownika (rozwijanie/zwijanie)
function setupUserMenu() {
  // Stary system menu
  const menu = document.querySelector('.user-menu');
  const avatar = document.getElementById('userAvatar');
  
  if (avatar && menu) {
    // Kliknięcie na awatar - toggle menu
    avatar.onclick = function(e) {
      e.stopPropagation();
      menu.classList.toggle('open');
    };
    
    // Kliknięcie poza menu - zamknij menu
    document.addEventListener('click', function(e) {
      if (!menu.contains(e.target)) {
        menu.classList.remove('open');
      }
    });
  }
  
  // Nowoczesny system menu
  const modernMenu = document.querySelector('.modern-user-menu');
  const modernAvatar = document.getElementById('modernUserAvatar');
  
  if (modernAvatar && modernMenu) {
    // Kliknięcie na awatar - toggle menu
    modernAvatar.onclick = function(e) {
      e.stopPropagation();
      modernMenu.classList.toggle('open');
    };
    
    // Kliknięcie poza menu - zamknij menu
    document.addEventListener('click', function(e) {
      if (!modernMenu.contains(e.target)) {
        modernMenu.classList.remove('open');
      }
    });
  }
  
  // Mobile menu toggle
  const mobileToggle = document.getElementById('mobileMenuToggle');
  const navLinks = document.querySelector('.nav-links');
  
  if (mobileToggle && navLinks) {
    mobileToggle.onclick = function() {
      mobileToggle.classList.toggle('active');
      navLinks.classList.toggle('mobile-active');
    };
  }
}

// Sprawdź czy użytkownik jest już zalogowany (dla stron login/register)
async function redirectIfLoggedIn() {
  const authData = await checkAuthStatus();
  
  if (authData.loggedIn) {
    window.location.href = 'index.html';
    return true;
  }
  return false;
}

// Funkcja logowania (dla formularza)
async function loginUser(username, password) {
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    return { success: false, message: 'Błąd połączenia z serwerem' };
  }
}

// Funkcja rejestracji (dla formularza)
async function registerUser(username, password, discord) {
  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password, discord })
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    return { success: false, message: 'Błąd połączenia z serwerem' };
  }
}

// Funkcja sprawdzająca logowanie przed złożeniem podania
async function checkLoginBeforeApplication(organizacja) {
  const authData = await checkAuthStatus();
  
  if (authData.loggedIn) {
    // Bezpośrednie przekierowanie bez żadnych komunikatów
    window.location.href = `application-form.html?org=${organizacja}`;
  } else {
    showLoginModal();
  }
}

function showLoginModal() {
  const modal = document.getElementById('loginModal');
  if (modal) {
    modal.style.display = 'flex';
    modal.style.opacity = '0';
    setTimeout(() => {
      modal.style.opacity = '1';
    }, 10);
  } else {
    // Fallback - jeśli nie ma modala, użyj confirm
    const choice = confirm("Aby złożyć podanie, musisz być zalogowany. Czy chcesz się teraz zalogować?");
    if (choice) {
      window.location.href = 'login.html';
    }
  }
}

function closeLoginModal() {
  const modal = document.getElementById('loginModal');
  if (modal) {
    modal.style.opacity = '0';
    setTimeout(() => {
      modal.style.display = 'none';
      modal.style.opacity = '1';
    }, 300);
  }
}

// Zamknij modal po kliknięciu poza nim
window.onclick = function(event) {
  const modal = document.getElementById('loginModal');
  if (modal && event.target === modal) {
    closeLoginModal();
  }
}

// Dodaj do auth.js - funkcja sprawdzająca status podań użytkownika
async function checkUserApplications() {
  try {
    const response = await fetch('/api/user-applications');
    const data = await response.json();
    
    if (data.success) {
      return data.applications;
    }
    return [];
  } catch (error) {
    return [];
  }
}

// Główna inicjalizacja przy ładowaniu strony
document.addEventListener('DOMContentLoaded', async function() {
  setTimeout(async () => {
    await updateUserMenu();
    setupUserMenu();
  }, 100);
});