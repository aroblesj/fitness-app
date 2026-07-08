document.addEventListener('DOMContentLoaded', () => {
  
  // ==========================================
  // STATE MANAGEMENT & CONFIGS
  // ==========================================
  const USER_ID = 1;
  const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:8000' : 'http://127.0.0.1:8000';

  const initialDate = new Date();
  let currentYear = initialDate.getFullYear();
  let currentMonth = initialDate.getMonth(); // Dynamically show current month/year
  let activeGoal = 'cut';
  let activeUnit = 'imperial';
  let activeMuscleGroup = 'Quads';
  let strengthCurveChart = null;
  let isLoggedIn = true;
  let logoutTimeout = null;

  const themeColors = {
    blue: {
      primary: '#2563eb',
      light: '#eff6ff',
      border: '#bfdbfe',
      bgPrimary: '#f0f4ff',
      borderLight: '#dbeafe'
    },
    emerald: {
      primary: '#059669',
      light: '#ecfdf5',
      border: '#a7f3d0',
      bgPrimary: '#f0fdf4',
      borderLight: '#d1fae5'
    },
    violet: {
      primary: '#7c3aed',
      light: '#f5f3ff',
      border: '#ddd6fe',
      bgPrimary: '#f5f3ff',
      borderLight: '#ede9fe'
    },
    teal: {
      primary: '#0d9488',
      light: '#f0fdfa',
      border: '#99f6e4',
      bgPrimary: '#f0fdfa',
      borderLight: '#ccfbf1'
    },
    rose: {
      primary: '#be123c',
      light: '#fff1f2',
      border: '#fecdd3',
      bgPrimary: '#fff1f2',
      borderLight: '#ffe4e6'
    },
    steel: {
      primary: '#4b5563',
      light: '#f9fafb',
      border: '#e5e7eb',
      bgPrimary: '#f3f4f6',
      borderLight: '#e5e7eb'
    }
  };

  let activeTheme = localStorage.getItem('recomped_selected_theme') || 'blue';

  function applyTheme(themeName) {
    const theme = themeColors[themeName] || themeColors.blue;
    document.documentElement.style.setProperty('--accent-emerald', theme.primary);
    document.documentElement.style.setProperty('--accent-emerald-light', theme.light);
    document.documentElement.style.setProperty('--accent-emerald-border', theme.border);
    document.documentElement.style.setProperty('--bg-primary', theme.bgPrimary);
    document.documentElement.style.setProperty('--border-light', theme.borderLight);
    localStorage.setItem('recomped_selected_theme', themeName);
  }

  applyTheme(activeTheme);

  // To-Do List State
  let todoItems = [];
  let isReorderMode = false;
  let draggedIndex = null;

  // Cache original HTML structures to restore them upon logging back in (defined as a getter function so it reads the DOM dynamically)
  const getOriginalCardContents = () => ({
    calendarBody: originalCardContentsCache?.calendarBody || document.querySelector('.calendar-body').innerHTML,
    calendarLegend: originalCardContentsCache?.calendarLegend || document.querySelector('.calendar-legend').innerHTML,
    agendaContent: originalCardContentsCache?.agendaContent || document.querySelector('.agenda-content').innerHTML,
    biometricsCard: originalCardContentsCache?.biometricsCard || document.querySelector('.biometrics-card').innerHTML,
    nutritionCard: originalCardContentsCache?.nutritionCard || document.querySelector('.nutrition-card').innerHTML,
    strengthForm: originalCardContentsCache?.strengthForm || document.querySelector('.inputs-col-1rm').innerHTML,
    strengthResults: originalCardContentsCache?.strengthResults || document.querySelector('.one-rep-max-results').innerHTML,
    strengthCurveCard: originalCardContentsCache?.strengthCurveCard || document.querySelector('.strength-curve-card').innerHTML
  });

  const originalCardContentsCache = {
    calendarBody: document.querySelector('.calendar-body').innerHTML,
    calendarLegend: document.querySelector('.calendar-legend').innerHTML,
    agendaContent: document.querySelector('.agenda-content').innerHTML,
    biometricsCard: document.querySelector('.biometrics-card').innerHTML,
    nutritionCard: document.querySelector('.nutrition-card').innerHTML,
    strengthForm: document.querySelector('.inputs-col-1rm').innerHTML,
    strengthResults: document.querySelector('.one-rep-max-results').innerHTML,
    strengthCurveCard: document.querySelector('.strength-curve-card').innerHTML
  };

  // Static workout schedule to populate dots in June 2026
  const trainingSchedule = {
    strengthDays: [1, 3, 5],
    nutritionDays: [1, 2, 3, 5, 6],
    restDays: [0, 4]
  };

  // Exercise definitions for anatomy hover
  const muscleExercises = {
    'Chest': { exercise: 'Barbell Bench Press', muscle: 'Pectoralis Major' },
    'Quads': { exercise: 'Barbell Back Squat', muscle: 'Quadriceps Femoris' },
    'Lats': { exercise: 'Barbell Conventional Deadlift', muscle: 'Latissimus Dorsi' },
    'Shoulders': { exercise: 'Barbell Overhead Press', muscle: 'Deltoids' },
    'Abs': { exercise: 'Hanging Knee Raise', muscle: 'Rectus Abdominis' },
    'Glutes': { exercise: 'Barbell Hip Thrust', muscle: 'Gluteus Maximus' },
    'Calves': { exercise: 'Standing Calf Raise', muscle: 'Gastrocnemius' },
    'Neck': { exercise: 'Neck Flexion', muscle: 'Trapezius' }
  };

  const ACTIVITY_MULTIPLIERS = {
    sedentary: 1.200,
    lightly_active: 1.375,
    moderate_active: 1.550,
    highly_active: 1.725,
    extreme_active: 1.900
  };

  // Local Resource Hub Data Store (designed to match GET /resources/)
  const localResourceDatabase = [
    {
      id: 1,
      type: 'video',
      category: 'strength',
      title: 'Mastering the Low-Bar Squat: Biomechanics & Hip Drive',
      author: 'Sarah Davis, CSCS',
      duration: '8:45',
      thumbnail: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=500&q=80',
      bookmarked: false
    },
    {
      id: 2,
      type: 'article',
      category: 'strength',
      title: 'The Science of Hypertrophy: Optimal Rep Ranges Explained',
      author: 'Dr. Michael Chen',
      readTime: '5 min read',
      bookmarked: false
    },
    {
      id: 3,
      type: 'article',
      category: 'nutrition',
      title: 'Anabolic Window: Fact vs. Fiction in Nutrient Timing',
      author: 'Alan Aragon, MS',
      readTime: '4 min read',
      bookmarked: true
    },
    {
      id: 4,
      type: 'article',
      category: 'recovery',
      title: 'Sleep Deprivation and Muscle Growth: The Cortisol Link',
      author: 'Brad Schoenfeld, PhD',
      readTime: '6 min read',
      bookmarked: false
    }
  ];

  // ==========================================
  // PROFILE MENU INTERACTION & GUEST TOGGLES
  // ==========================================
  const userProfileBtn = document.getElementById('user-profile-btn');
  const profileDropdown = document.getElementById('profile-dropdown');
  const profilePic = document.getElementById('profile-pic');
  const profileName = document.getElementById('profile-name');
  const profileRole = document.getElementById('profile-role');
  const logoutToast = document.getElementById('logout-toast');
  const closeToastBtn = document.getElementById('close-toast-btn');

  userProfileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    userProfileBtn.classList.toggle('active');
    profileDropdown.classList.toggle('show');
  });

  document.addEventListener('click', () => {
    userProfileBtn.classList.remove('active');
    profileDropdown.classList.remove('show');
    document.querySelectorAll('.kebab-dropdown').forEach(d => d.classList.remove('show'));
  });

  function setupProfileDropdown() {
    if (isLoggedIn) {
      profileDropdown.innerHTML = `
        <a href="#" class="dropdown-item" id="settings-btn">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          Settings
        </a>
        <hr class="dropdown-divider">
        <a href="#" class="dropdown-item logout" id="logout-btn">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          Logout
        </a>
      `;
      document.getElementById('logout-btn').addEventListener('click', handleLogout);
      document.getElementById('settings-btn').addEventListener('click', handleSettings);
    } else {
      profileDropdown.innerHTML = `
        <a href="#" class="dropdown-item login" id="login-btn">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
          Login
        </a>
      `;
      document.getElementById('login-btn').addEventListener('click', handleLogin);
    }
  }

  function handleLogout(e) {
    e.preventDefault();
    e.stopPropagation();
    isLoggedIn = false;
    userProfileBtn.classList.remove('active');
    profileDropdown.classList.remove('show');

    // Trigger Success Toast
    if (logoutToast) {
      logoutToast.querySelector('.toast-message').textContent = 'You have successfully logged out.';
      logoutToast.classList.add('show');
      
      if (logoutTimeout) clearTimeout(logoutTimeout);
      logoutTimeout = setTimeout(() => {
        logoutToast.classList.remove('show');
      }, 5000);
    }

    // Refresh profile details to reflect guest mode
    if (profilePic) {
      profilePic.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2394a3b8"><circle cx="12" cy="8" r="4"/><path d="M12 14c-6.1 0-8 4-8 4v2h16v-2s-1.9-4-8-4z"/></svg>';
    }
    if (profileName) {
      profileName.textContent = 'Guest User';
    }
    if (profileRole) {
      profileRole.textContent = 'Signed Out';
    }

    setupProfileDropdown();
    applyGuestLockedState();
  }

  function handleLogin(e) {
    e.preventDefault();
    e.stopPropagation();
    isLoggedIn = true;
    userProfileBtn.classList.remove('active');
    profileDropdown.classList.remove('show');

    // Show Success Toast
    if (logoutToast) {
      logoutToast.querySelector('.toast-message').textContent = 'You have successfully logged in.';
      logoutToast.classList.add('show');
      
      if (logoutTimeout) clearTimeout(logoutTimeout);
      logoutTimeout = setTimeout(() => {
        logoutToast.classList.remove('show');
      }, 5000);
    }

    // Restore profile details
    if (profilePic) {
      profilePic.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2394a3b8"><circle cx="12" cy="8" r="4"/><path d="M12 14c-6.1 0-8 4-8 4v2h16v-2s-1.9-4-8-4z"/></svg>';
    }
    if (profileName) {
      profileName.textContent = 'arobles';
    }
    if (profileRole) {
      profileRole.textContent = '';
    }

    // Restore HTML containers
    const originalCardContents = getOriginalCardContents();
    document.querySelector('.calendar-body').innerHTML = originalCardContents.calendarBody;
    document.querySelector('.calendar-legend').innerHTML = originalCardContents.calendarLegend;
    document.querySelector('.agenda-content').innerHTML = originalCardContents.agendaContent;
    document.querySelector('.biometrics-card').innerHTML = originalCardContents.biometricsCard;
    document.querySelector('.nutrition-card').innerHTML = originalCardContents.nutritionCard;
    document.querySelector('.inputs-col-1rm').innerHTML = originalCardContents.strengthForm;
    document.querySelector('.one-rep-max-results').innerHTML = originalCardContents.strengthResults;
    document.querySelector('.strength-curve-card').innerHTML = originalCardContents.strengthCurveCard;

    strengthCurveChart = null;

    setupProfileDropdown();
    setupDashboardListeners();
    initializeData();
  }

  function handleSettings(e) {
    e.preventDefault();
    e.stopPropagation();
    userProfileBtn.classList.remove('active');
    profileDropdown.classList.remove('show');

    const modal = document.getElementById('settings-modal');
    const usernameInput = document.getElementById('settings-username');
    const btnCancel = document.getElementById('btn-settings-cancel');
    const btnSave = document.getElementById('btn-settings-save');
    const btnTriggerPassword = document.getElementById('btn-trigger-password-modal');

    // Prepopulate username
    usernameInput.value = profileName ? profileName.textContent : 'arobles';

    modal.classList.add('active');

    // Toggle Dropdown Options
    const toggleBtn = document.getElementById('btn-toggle-avatar-selector');
    const dropdown = document.getElementById('avatar-selector-dropdown');
    const previewContainer = document.getElementById('settings-current-avatar-preview');
    const chevron = toggleBtn.querySelector('.chevron-down-avatar');
    
    // Read current selected icon from header avatar
    const headerAvatar = document.getElementById('header-profile-avatar');
    const currentIconEl = headerAvatar.querySelector('i');
    let selectedIconClass = currentIconEl ? Array.from(currentIconEl.classList).find(c => c.startsWith('fa-')) : 'fa-dumbbell';

    // Synchronize preview
    previewContainer.innerHTML = `<i class="fa-solid ${selectedIconClass}"></i>`;

    const toggleDropdown = (e) => {
      e.stopPropagation();
      const isVisible = dropdown.style.display === 'grid';
      dropdown.style.display = isVisible ? 'none' : 'grid';
      chevron.style.transform = isVisible ? 'rotate(0deg)' : 'rotate(180deg)';
    };

    toggleBtn.addEventListener('click', toggleDropdown);

    // Option Clicking
    const options = dropdown.querySelectorAll('.avatar-option');
    const handleAvatarOptionClick = (e) => {
      e.stopPropagation();
      selectedIconClass = e.currentTarget.getAttribute('data-icon');
      previewContainer.innerHTML = `<i class="fa-solid ${selectedIconClass}"></i>`;
    };
    options.forEach(opt => {
      opt.addEventListener('click', handleAvatarOptionClick);
    });

    // Theme options setup
    const themeOptions = modal.querySelectorAll('.theme-option');
    let selectedTheme = activeTheme;

    // Highlight current active theme
    themeOptions.forEach(opt => {
      if (opt.getAttribute('data-theme') === selectedTheme) {
        opt.classList.add('active');
      } else {
        opt.classList.remove('active');
      }
    });

    const handleThemeOptionClick = (e) => {
      e.stopPropagation();
      themeOptions.forEach(o => o.classList.remove('active'));
      e.currentTarget.classList.add('active');
      selectedTheme = e.currentTarget.getAttribute('data-theme');
      applyTheme(selectedTheme); // Real-time preview!
    };

    themeOptions.forEach(opt => {
      opt.addEventListener('click', handleThemeOptionClick);
    });

    // Close settings modal helper
    const closeSettings = () => {
      modal.classList.remove('active');
      dropdown.style.display = 'none';
      chevron.style.transform = 'rotate(0deg)';
      btnCancel.removeEventListener('click', closeSettings);
      btnSave.removeEventListener('click', saveSettings);
      toggleBtn.removeEventListener('click', toggleDropdown);
      btnTriggerPassword.removeEventListener('click', openPasswordModal);
      options.forEach(opt => opt.removeEventListener('click', handleAvatarOptionClick));
      themeOptions.forEach(opt => opt.removeEventListener('click', handleThemeOptionClick));
      
      // Revert theme color scheme to original activeTheme (if they canceled/closed without saving)
      applyTheme(activeTheme);
    };

    const saveSettings = async () => {
      const newUsername = usernameInput.value.trim();

      if (!newUsername) {
        alert('Username cannot be empty.');
        return;
      }

      // Lock down the selected theme as activeTheme
      activeTheme = selectedTheme;
      applyTheme(activeTheme);

      // Perform local updates immediately
      if (profileName) {
        profileName.textContent = newUsername;
      }
      
      // Update header avatar icon class
      if (headerAvatar) {
        headerAvatar.innerHTML = `<i class="fa-solid ${selectedIconClass}" style="font-size: 12px;"></i>`;
      }

      closeSettings();
    };

    // Password Modal Logic
    const passwordModal = document.getElementById('password-modal');
    const oldPasswordInput = document.getElementById('password-old-input');
    const newPasswordInput = document.getElementById('password-new-input');
    const btnPasswordCancel = document.getElementById('btn-password-cancel');
    const btnPasswordUpdate = document.getElementById('btn-password-update');

    const openPasswordModal = (e) => {
      e.preventDefault();
      e.stopPropagation();
      oldPasswordInput.value = '';
      newPasswordInput.value = '';
      passwordModal.classList.add('active');

      btnPasswordCancel.addEventListener('click', closePasswordModal);
      btnPasswordUpdate.addEventListener('click', updatePassword);
    };

    const closePasswordModal = () => {
      passwordModal.classList.remove('active');
      btnPasswordCancel.removeEventListener('click', closePasswordModal);
      btnPasswordUpdate.removeEventListener('click', updatePassword);
    };

    const updatePassword = async () => {
      const oldPassword = oldPasswordInput.value.trim();
      const newPassword = newPasswordInput.value.trim();

      if (!oldPassword || !newPassword) {
        await showCustomDialog('Please fill out all password fields.');
        return;
      }

      const correctOldPassword = 'admin123'; // Standard mock password
      if (oldPassword !== correctOldPassword) {
        await showCustomDialog('The "Current Password" is incorrect. Please try again.');
        return;
      }

      closePasswordModal();
      await showCustomDialog('Password updated successfully!');
    };

    btnTriggerPassword.addEventListener('click', openPasswordModal);
    btnCancel.addEventListener('click', closeSettings);
    btnSave.addEventListener('click', saveSettings);
  }

  if (closeToastBtn) {
    closeToastBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (logoutToast) logoutToast.classList.remove('show');
      if (logoutTimeout) clearTimeout(logoutTimeout);
    });
  }

  // ==========================================
  // GUEST LOCKED PANEL RENDERING
  // ==========================================
  function applyGuestLockedState() {
    const lockedHTML = `
      <div class="guest-locked-state">
        <svg viewBox="0 0 24 24" width="36" height="36" stroke="currentColor" stroke-width="2" fill="none">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
        <p>Log in or create an account to enable this.</p>
      </div>
    `;

    document.querySelector('.calendar-body').innerHTML = lockedHTML;
    document.querySelector('.calendar-legend').innerHTML = '';
    document.querySelector('.agenda-content').innerHTML = lockedHTML;
    document.querySelector('.biometrics-card').innerHTML = lockedHTML;
    document.querySelector('.nutrition-card').innerHTML = lockedHTML;
    document.querySelector('.inputs-col-1rm').innerHTML = lockedHTML;
    document.querySelector('.one-rep-max-results').innerHTML = lockedHTML;
    document.querySelector('.strength-curve-card').innerHTML = lockedHTML;

    if (strengthCurveChart) {
      strengthCurveChart.destroy();
      strengthCurveChart = null;
    }
  }

  // ==========================================
  // TO-DO LIST LOGIC & BACKEND INTEGRATION
  // ==========================================
  async function fetchTodosFromBackend() {
    try {
      const response = await fetch(`${API_BASE}/users/${USER_ID}/todo`);
      if (response.ok) {
        const data = await response.json();
        // Map backend schemas (title, completed) to UI fields (text, done)
        return data.map(item => ({
          id: item.id,
          text: item.title,
          done: item.completed,
          position: item.position
        }));
      }
    } catch (e) {
      console.error('Error fetching todos:', e);
    }
    return [];
  }

  async function saveTodoToBackend(todo) {
    try {
      const response = await fetch(`${API_BASE}/users/${USER_ID}/todo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: todo.text,
          completed: todo.done,
          position: todo.position
        })
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.error('Error saving todo:', e);
    }
    return null;
  }

  async function updateTodoOnBackend(todo) {
    try {
      const response = await fetch(`${API_BASE}/users/${USER_ID}/todo/${todo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: todo.text,
          completed: todo.done,
          position: todo.position
        })
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.error('Error updating todo:', e);
    }
    return null;
  }

  async function deleteTodoFromBackend(todoId) {
    try {
      const response = await fetch(`${API_BASE}/users/${USER_ID}/todo/${todoId}`, {
        method: 'DELETE'
      });
      return response.ok;
    } catch (e) {
      console.error('Error deleting todo:', e);
    }
    return false;
  }

  async function saveTodoOrderToBackend() {
    try {
      await Promise.all(todoItems.map((item, index) => {
        item.position = index;
        return fetch(`${API_BASE}/users/${USER_ID}/todo/${item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            position: index
          })
        });
      }));
    } catch (e) {
      console.error('Error saving todo order:', e);
    }
  }

  function renderTodos() {
    const container = document.getElementById('todo-list-container');
    const countDisplay = document.getElementById('todo-count');
    const reorderActions = document.getElementById('todo-reorder-actions');
    const addForm = document.getElementById('todo-add-form');

    if (!container) return;
    container.innerHTML = '';

    if (countDisplay) {
      countDisplay.textContent = `${todoItems.length} / 20 items`;
    }

    if (todoItems.length === 0) {
      container.innerHTML = `
        <li style="text-align: center; color: var(--text-light); font-size: 12px; padding: 24px 0;">
          No items on your To-Do list yet.
        </li>
      `;
      return;
    }

    todoItems.forEach((item, index) => {
      const li = document.createElement('li');
      li.className = `todo-item ${item.done ? 'done' : ''}`;
      li.id = `todo-item-${item.id}`;
      li.style.position = 'relative';

      if (isReorderMode) {
        // Render Reorder Style: Title left, Hamburger handle on the right (replaces arrows)
        li.innerHTML = `
          <div class="todo-item-left">
            <span class="todo-text">${item.text}</span>
          </div>
          <div class="reorder-handle" style="cursor: grab; font-size: 16px; padding: 4px; user-select: none; flex-shrink: 0; color: var(--text-light);">☰</div>
        `;

        // HTML5 drag and drop handlers
        li.draggable = true;

        li.addEventListener('dragstart', (e) => {
          draggedIndex = index;
          e.dataTransfer.effectAllowed = 'move';
          setTimeout(() => li.classList.add('dragging'), 0);
        });

        li.addEventListener('dragend', () => {
          draggedIndex = null;
          renderTodos();
        });

        li.addEventListener('dragover', (e) => {
          e.preventDefault();
          const targetIndex = index;
          if (draggedIndex !== null && draggedIndex !== targetIndex) {
            const movedItem = todoItems[draggedIndex];
            todoItems.splice(draggedIndex, 1);
            todoItems.splice(targetIndex, 0, movedItem);
            draggedIndex = targetIndex;
            renderTodos();
            const newDragging = document.getElementById(`todo-item-${movedItem.id}`);
            if (newDragging) newDragging.classList.add('dragging');
          }
        });

      } else {
        // Render Default Style: Text Left (clickable to toggle done), Kebab Menu Right
        li.innerHTML = `
          <div class="todo-item-left" style="cursor: pointer; padding: 4px 0;">
            <span class="todo-text">${item.text}</span>
          </div>
          <div class="kebab-menu-container">
            <button class="btn-kebab" id="kebab-btn-${item.id}">⋮</button>
            <div class="kebab-dropdown" id="kebab-dropdown-${item.id}">
              <button class="kebab-dropdown-item btn-rename" data-index="${index}" style="color: #f1f5f9;">Rename</button>
              <button class="kebab-dropdown-item btn-reorder" style="color: #f1f5f9;">Reorder</button>
              <button class="kebab-dropdown-item btn-delete" data-index="${index}" style="color: var(--accent-coral);">Remove</button>
            </div>
          </div>
        `;

        // Item Text Toggle
        li.querySelector('.todo-item-left').addEventListener('click', async () => {
          todoItems[index].done = !todoItems[index].done;
          await updateTodoOnBackend(todoItems[index]);
          renderTodos();
        });

        // Dropdown Toggle
        const kebabBtn = li.querySelector(`#kebab-btn-${item.id}`);
        const dropdown = li.querySelector(`#kebab-dropdown-${item.id}`);
        
        kebabBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          document.querySelectorAll('.kebab-dropdown').forEach(d => {
            if (d !== dropdown) d.classList.remove('show');
          });
          dropdown.classList.toggle('show');
          if (dropdown.classList.contains('show')) {
            const rect = kebabBtn.getBoundingClientRect();
            dropdown.style.top = `${rect.bottom + 4}px`;
            dropdown.style.left = `${rect.right - 90}px`;
          }
        });

        // Dropdown actions
        li.querySelector('.btn-rename').addEventListener('click', () => renameTodoInline(index));
        li.querySelector('.btn-delete').addEventListener('click', () => deleteTodo(index));
        li.querySelector('.btn-reorder').addEventListener('click', () => {
          isReorderMode = true;
          if (reorderActions) reorderActions.style.display = 'block';
          if (addForm) addForm.style.display = 'none';
          renderTodos();
        });
      }

      container.appendChild(li);
    });

    // Close any open kebab dropdowns when clicking outside
    document.addEventListener('click', () => {
      document.querySelectorAll('.kebab-dropdown').forEach(d => d.classList.remove('show'));
    });
  }

  async function addNewTodo() {
    const input = document.getElementById('todo-input');
    if (!input) return;
    const val = input.value.trim();

    if (!val) return;
    if (todoItems.length >= 20) {
      await showCustomDialog('To-Do list limit reached. Delete tasks to add new ones (Maximum 20).');
      return;
    }

    const tempTodo = {
      text: val,
      done: false,
      position: todoItems.length
    };

    const saved = await saveTodoToBackend(tempTodo);
    if (saved) {
      todoItems.push({
        id: saved.id,
        text: saved.title,
        done: saved.completed,
        position: saved.position
      });
      input.value = '';
      renderTodos();
    }
  }

  async function deleteTodo(index) {
    const item = todoItems[index];
    const success = await deleteTodoFromBackend(item.id);
    if (success) {
      todoItems.splice(index, 1);
      renderTodos();
    }
  }

  function renameTodoInline(index) {
    const li = document.getElementById(`todo-item-${todoItems[index].id}`);
    if (!li) return;

    const textSpan = li.querySelector('.todo-text');
    const originalText = todoItems[index].text;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'custom-input todo-rename-input';
    input.value = originalText;
    input.style.width = '100%';
    input.style.fontSize = '13px';
    input.style.padding = '2px 6px';
    input.style.border = '1px solid var(--border-light)';
    input.style.borderRadius = '4px';

    textSpan.replaceWith(input);
    input.focus();
    input.select();

    let isFinished = false;
    async function finishRename() {
      if (isFinished) return;
      isFinished = true;
      const newText = input.value.trim();
      if (newText && newText !== originalText) {
        todoItems[index].text = newText;
        await updateTodoOnBackend(todoItems[index]);
      }
      renderTodos();
    }

    input.addEventListener('blur', finishRename);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') finishRename();
      if (e.key === 'Escape') renderTodos();
    });
  }

  // ==========================================
  // DASHBOARD EVENT LISTENERS REGISTRATION
  // ==========================================
  function setupDashboardListeners() {
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    const updateBiometricsBtn = document.getElementById('btn-update-biometrics');
    const goalButtons = document.querySelectorAll('.goal-btn');
    const unitButtons = document.querySelectorAll('.unit-btn');
    const liftWeightInput = document.getElementById('input-lift-weight');
    const liftRepsInput = document.getElementById('input-lift-reps');
    const exerciseSelect = document.getElementById('select-exercise');
    const logLiftBtn = document.getElementById('btn-log-lift');

    // To-Do list additions
    const btnAddTodo = document.getElementById('btn-add-todo');
    const todoInput = document.getElementById('todo-input');
    const btnAcceptReorder = document.getElementById('btn-accept-reorder');

    if (btnAddTodo && todoInput) {
      btnAddTodo.addEventListener('click', addNewTodo);
      todoInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addNewTodo();
      });
    }

    if (btnAcceptReorder) {
      btnAcceptReorder.addEventListener('click', async () => {
        isReorderMode = false;
        const reorderActions = document.getElementById('todo-reorder-actions');
        const addForm = document.getElementById('todo-add-form');
        
        if (reorderActions) reorderActions.style.display = 'none';
        if (addForm) addForm.style.display = 'flex';
        
        await saveTodoOrderToBackend();
        renderTodos();
      });
    }

    // Global todo actions (Clear All)
    const btnGlobalKebab = document.getElementById('btn-global-todo-kebab');
    const globalDropdown = document.getElementById('global-todo-dropdown');
    const btnClearAll = document.getElementById('btn-clear-all-todos');

    if (btnGlobalKebab && globalDropdown) {
      btnGlobalKebab.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.kebab-dropdown').forEach(d => {
          if (d !== globalDropdown) d.classList.remove('show');
        });
        globalDropdown.classList.toggle('show');
        if (globalDropdown.classList.contains('show')) {
          const rect = btnGlobalKebab.getBoundingClientRect();
          // Position fixed above the button
          globalDropdown.style.top = `${rect.top - 40}px`;
          globalDropdown.style.left = `${rect.right - 90}px`;
        }
      });
    }

    // Exercise Kebab Dropdown
    const btnExerciseKebab = document.getElementById('btn-exercise-kebab');
    const exerciseDropdown = document.getElementById('exercise-kebab-dropdown');
    
    if (btnExerciseKebab && exerciseDropdown) {
      btnExerciseKebab.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.kebab-dropdown').forEach(d => {
          if (d !== exerciseDropdown) d.classList.remove('show');
        });
        exerciseDropdown.classList.toggle('show');
        if (exerciseDropdown.classList.contains('show')) {
          const rect = btnExerciseKebab.getBoundingClientRect();
          // Position fixed below the button
          exerciseDropdown.style.top = `${rect.bottom + 4}px`;
          exerciseDropdown.style.left = `${rect.right - 100}px`;
        }
      });
      
      // Close dropdown when items are clicked
      exerciseDropdown.querySelectorAll('.kebab-dropdown-item').forEach(item => {
        item.addEventListener('click', () => {
          exerciseDropdown.classList.remove('show');
        });
      });
    }

    if (btnClearAll) {
      btnClearAll.addEventListener('click', async () => {
        // Close the options menu dropdown immediately
        if (globalDropdown) globalDropdown.classList.remove('show');

        // Check if there are items to clear
        if (todoItems.length === 0) {
          await showCustomDialog("There is nothing to clear.");
          return;
        }

        const confirmed = await showCustomDialog('This action cannot be undone. Are you sure you want to clear all tasks?', true);
        if (!confirmed) return;
        try {
          await Promise.all(todoItems.map(item => deleteTodoFromBackend(item.id)));
          todoItems = [];
          renderTodos();
        } catch (e) {
          console.error('Error clearing all todos:', e);
        }
      });
    }

    // Calendar
    if (prevMonthBtn && nextMonthBtn) {
      prevMonthBtn.replaceWith(prevMonthBtn.cloneNode(true));
      nextMonthBtn.replaceWith(nextMonthBtn.cloneNode(true));

      document.getElementById('prev-month').addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) {
          currentMonth = 11;
          currentYear--;
        }
        updateCalendar(currentYear, currentMonth);
      });

      document.getElementById('next-month').addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) {
          currentMonth = 0;
          currentYear++;
        }
        updateCalendar(currentYear, currentMonth);
      });

      const monthYearLabel = document.getElementById('month-year-display');
      if (monthYearLabel) {
        monthYearLabel.addEventListener('click', async (e) => {
          e.stopPropagation();
          // Create a quick drop-down selection using simple overlay elements or HTML5 selectors
          const existingSelector = document.getElementById('calendar-quick-selector');
          if (existingSelector) {
            existingSelector.remove();
            return;
          }

          const selectorContainer = document.createElement('div');
          selectorContainer.id = 'calendar-quick-selector';
          selectorContainer.style.position = 'absolute';
          selectorContainer.style.background = 'var(--bg-card)';
          selectorContainer.style.border = '1px solid var(--border-light)';
          selectorContainer.style.borderRadius = '8px';
          selectorContainer.style.padding = '12px';
          selectorContainer.style.boxShadow = 'var(--shadow-lg)';
          selectorContainer.style.zIndex = '1000';
          selectorContainer.style.display = 'flex';
          selectorContainer.style.gap = '8px';
          selectorContainer.style.flexDirection = 'column';

          const rect = monthYearLabel.getBoundingClientRect();
          selectorContainer.style.top = `${rect.bottom + window.scrollY + 6}px`;
          selectorContainer.style.left = `${rect.left + window.scrollX - 40}px`;

          const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
          
          let monthHtml = '<select id="quick-month-select" class="custom-select" style="font-size: 13px; padding: 4px;">';
          months.forEach((m, idx) => {
            monthHtml += `<option value="${idx}" ${idx === currentMonth ? 'selected' : ''}>${m}</option>`;
          });
          monthHtml += '</select>';

          let yearHtml = '<select id="quick-year-select" class="custom-select" style="font-size: 13px; padding: 4px;">';
          for (let y = 2020; y <= 2035; y++) {
            yearHtml += `<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}</option>`;
          }
          yearHtml += '</select>';

          // Helper to get total days in selected month/year
          const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
          const totalDays = getDaysInMonth(currentYear, currentMonth);
          const todayDate = new Date().getDate();
          
          let dayHtml = '<select id="quick-day-select" class="custom-select" style="font-size: 13px; padding: 4px;">';
          for (let d = 1; d <= totalDays; d++) {
            dayHtml += `<option value="${d}" ${d === todayDate ? 'selected' : ''}>${d}</option>`;
          }
          dayHtml += '</select>';

          const now = new Date();
          const isTodayActive = (currentYear === now.getFullYear() && currentMonth === now.getMonth());

          let buttonsHtml = '';
          if (isTodayActive) {
            buttonsHtml = `<button id="btn-apply-quick-select" class="btn-primary" style="font-size: 12px; padding: 4px 8px; margin-top: 6px; width: 100%;">Go</button>`;
          } else {
            buttonsHtml = `
              <div style="display: flex; gap: 6px; margin-top: 6px;">
                <button id="btn-apply-quick-select" class="btn-primary" style="font-size: 12px; padding: 4px 8px; flex: 1;">Go</button>
                <button id="btn-quick-today" class="btn-primary" style="font-size: 12px; padding: 4px 8px; flex: 1; background: #64748b;">Today</button>
              </div>
            `;
          }

          selectorContainer.innerHTML = `
            <div style="display: flex; gap: 6px;">
              ${monthHtml}
              ${dayHtml}
              ${yearHtml}
            </div>
            ${buttonsHtml}
          `;

          document.body.appendChild(selectorContainer);

          const todayBtn = document.getElementById('btn-quick-today');
          if (todayBtn) {
            todayBtn.addEventListener('click', async () => {
              const nowToday = new Date();
              currentMonth = nowToday.getMonth();
              currentYear = nowToday.getFullYear();
              const todayDay = nowToday.getDate();

              await updateCalendar(currentYear, currentMonth);

              setTimeout(() => {
                const days = document.querySelectorAll('.calendar-day:not(.empty)');
                days.forEach(el => {
                  if (parseInt(el.childNodes[0].textContent) === todayDay) {
                    el.click();
                  }
                });
              }, 10);

              selectorContainer.remove();
            });
          }

          // Update day options when month/year changes
          const quickMonthSelect = document.getElementById('quick-month-select');
          const quickYearSelect = document.getElementById('quick-year-select');
          const quickDaySelect = document.getElementById('quick-day-select');

          const updateDayOptions = () => {
            const m = parseInt(quickMonthSelect.value);
            const y = parseInt(quickYearSelect.value);
            const currentSelectedDay = parseInt(quickDaySelect.value);
            const daysCount = getDaysInMonth(y, m);
            
            let dayOptions = '';
            for (let d = 1; d <= daysCount; d++) {
              dayOptions += `<option value="${d}" ${d === Math.min(currentSelectedDay, daysCount) ? 'selected' : ''}>${d}</option>`;
            }
            quickDaySelect.innerHTML = dayOptions;
          };

          quickMonthSelect.addEventListener('change', updateDayOptions);
          quickYearSelect.addEventListener('change', updateDayOptions);

          document.getElementById('btn-apply-quick-select').addEventListener('click', async () => {
            const selectedMonth = parseInt(quickMonthSelect.value);
            const selectedYear = parseInt(quickYearSelect.value);
            const selectedDay = parseInt(quickDaySelect.value);
            
            currentMonth = selectedMonth;
            currentYear = selectedYear;
            
            // Re-render calendar
            await updateCalendar(currentYear, currentMonth);
            
            // Find and click the selected day element to update log details automatically
            setTimeout(() => {
              const days = document.querySelectorAll('.calendar-day:not(.empty)');
              days.forEach(el => {
                if (parseInt(el.childNodes[0].textContent) === selectedDay) {
                  el.click();
                }
              });
            }, 10);

            selectorContainer.remove();
          });

          // Close quick selector on clicking outside
          const closeHandler = (event) => {
            if (!selectorContainer.contains(event.target) && event.target !== monthYearLabel) {
              selectorContainer.remove();
              document.removeEventListener('click', closeHandler);
            }
          };
          document.addEventListener('click', closeHandler);
        });
      }
    }

    // Biometrics & Nutrition
    if (updateBiometricsBtn) {
      updateBiometricsBtn.addEventListener('click', calculateNutrition);
    }

    goalButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        goalButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeGoal = btn.getAttribute('data-goal');
        calculateNutrition();
      });
    });

    unitButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const weightInput = document.getElementById('input-weight');
        const weightLabel = document.getElementById('weight-label');
        const heightLabel = document.getElementById('height-label');
        const heightImperialWrapper = document.getElementById('height-imperial-wrapper');
        const heightMetricWrapper = document.getElementById('height-metric-wrapper');
        const heightCmInput = document.getElementById('input-height-cm');
        const heightFtInput = document.getElementById('input-height-ft');
        const heightInInput = document.getElementById('input-height-in');

        const newUnit = btn.getAttribute('data-unit');
        if (newUnit === activeUnit) return;

        unitButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const currentVal = parseFloat(weightInput.value) || 0;

        if (newUnit === 'metric') {
          activeUnit = 'metric';
          weightLabel.textContent = 'Weight (kg)';
          weightInput.min = 36;
          weightInput.max = 181;
          if (currentVal) {
            weightInput.value = Math.round(currentVal / 2.20462);
          }

          const ft = parseFloat(heightFtInput.value) || 5;
          const inch = parseFloat(heightInInput.value) || 9;
          const cm = Math.round((ft * 12 + inch) * 2.54);
          heightCmInput.value = cm;

          heightLabel.textContent = 'Height (cm)';
          heightImperialWrapper.style.display = 'none';
          heightMetricWrapper.style.display = 'flex';
        } else {
          activeUnit = 'imperial';
          weightLabel.textContent = 'Weight (lbs)';
          weightInput.min = 80;
          weightInput.max = 400;
          if (currentVal) {
            weightInput.value = Math.round(currentVal * 2.20462);
          }

          const cm = parseFloat(heightCmInput.value) || 175;
          const totalInches = cm / 2.54;
          const ft = Math.floor(totalInches / 12);
          const inch = Math.round(totalInches % 12);
          heightFtInput.value = ft;
          heightInInput.value = inch;

          heightLabel.textContent = 'Height';
          heightImperialWrapper.style.display = 'flex';
          heightMetricWrapper.style.display = 'none';
        }

        calculateNutrition();
      });
    });

    // Strength
    if (logLiftBtn) {
      logLiftBtn.addEventListener('click', updateStrength1RM);
    }

    if (liftWeightInput && liftRepsInput) {
      liftWeightInput.addEventListener('input', updateStrength1RMLocal);
      liftWeightInput.addEventListener('change', updateStrength1RMLocal);
      liftRepsInput.addEventListener('change', updateStrength1RMLocal);
    }

    if (exerciseSelect) {
      exerciseSelect.addEventListener('change', () => {
        const ex = exerciseSelect.value;
        const liftWeightInput = document.getElementById('input-lift-weight');
        const liftRepsInput = document.getElementById('input-lift-reps');
        
        if (ex === 'back_squat') {
          liftWeightInput.value = 315;
          liftRepsInput.value = 6;
        } else if (ex === 'deadlift') {
          liftWeightInput.value = 405;
          liftRepsInput.value = 5;
        } else if (ex === 'overhead_press') {
          liftWeightInput.value = 135;
          liftRepsInput.value = 5;
        } else if (ex === 'bench_press') {
          liftWeightInput.value = 225;
          liftRepsInput.value = 5;
        }
        updateStrength1RMLocal();
      });
    }

    // Add custom exercise
    const btnAddExercise = document.getElementById('btn-add-exercise');
    if (btnAddExercise && exerciseSelect) {
      btnAddExercise.addEventListener('click', async (e) => {
        e.preventDefault();
        const inputName = prompt("Enter the name of the new exercise:");
        if (!inputName) return;
        const formattedName = inputName.trim();
        if (!formattedName) return;

        // Generate a value key from the string
        const valueKey = formattedName.toLowerCase().replace(/[^a-z0-9]+/g, '_');

        // Check duplicates
        let exists = false;
        Array.from(exerciseSelect.options).forEach(opt => {
          if (opt.value === valueKey) exists = true;
        });

        if (exists) {
          alert("An exercise with this name already exists.");
          return;
        }

        const newOption = document.createElement('option');
        newOption.value = valueKey;
        newOption.textContent = formattedName;
        exerciseSelect.appendChild(newOption);
        exerciseSelect.value = valueKey;

        // Reset default inputs
        document.getElementById('input-lift-weight').value = 135;
        document.getElementById('input-lift-reps').value = 5;
        updateStrength1RMLocal();
      });
    }

    // Rename exercise
    const btnRenameExercise = document.getElementById('btn-rename-exercise');
    if (btnRenameExercise && exerciseSelect) {
      btnRenameExercise.addEventListener('click', async (e) => {
        e.preventDefault();
        const selectedOpt = exerciseSelect.options[exerciseSelect.selectedIndex];
        if (!selectedOpt) return;

        const currentName = selectedOpt.textContent;
        const newName = prompt(`Rename "${currentName}" to:`, currentName);
        if (!newName) return;
        const formattedNewName = newName.trim();
        if (!formattedNewName || formattedNewName === currentName) return;

        selectedOpt.textContent = formattedNewName;
        // Optionally update backend values if needed, but local UI option updates immediately
        updateStrength1RMLocal();
      });
    }

    // Remove exercise
    const btnRemoveExercise = document.getElementById('btn-remove-exercise');
    if (btnRemoveExercise && exerciseSelect) {
      btnRemoveExercise.addEventListener('click', async (e) => {
        e.preventDefault();
        const selectedOpt = exerciseSelect.options[exerciseSelect.selectedIndex];
        if (!selectedOpt) return;

        const currentName = selectedOpt.textContent;
        const confirmed = await showCustomDialog('This action cannot be undone. Are you sure you want to delete this exercise?', true);
        if (!confirmed) return;

        selectedOpt.remove();
        // Trigger select change handler to reload first available exercise values
        const event = new Event('change');
        exerciseSelect.dispatchEvent(event);
      });
    }
  }

  // ==========================================
  // CALENDAR LOGIC
  // ==========================================
  async function fetchCalendarActivity(year, month) {
    try {
      const response = await fetch(`${API_BASE}/users/${USER_ID}/calendar/activity?year=${year}&month=${month + 1}`);
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.error('Error fetching calendar activity:', e);
    }
    return {};
  }

  async function updateCalendar(year, month) {
    const activityMap = await fetchCalendarActivity(year, month);
    renderCalendar(year, month, activityMap);
  }

  function renderCalendar(year, month, activityMap = {}) {
    const daysContainer = document.getElementById('calendar-days-container');
    if (!daysContainer) return;
    daysContainer.innerHTML = '';
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    const monthYearDisplay = document.getElementById('month-year-display');
    if (monthYearDisplay) {
      monthYearDisplay.textContent = `${months[month]} ${year}`;
    }

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDayIndex; i++) {
      const emptyDay = document.createElement('div');
      emptyDay.classList.add('calendar-day', 'empty');
      daysContainer.appendChild(emptyDay);
    }

    for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
      const dayEl = document.createElement('div');
      dayEl.classList.add('calendar-day');
      
      const numSpan = document.createElement('span');
      numSpan.classList.add('day-number');
      numSpan.textContent = dayNum;
      dayEl.appendChild(numSpan);

      // Construct YYYY-MM-DD date string (zero-pad month and day)
      const paddedMonth = String(month + 1).padStart(2, '0');
      const paddedDay = String(dayNum).padStart(2, '0');
      const dateString = `${year}-${paddedMonth}-${paddedDay}`;

      const dotWrapper = document.createElement('div');
      dotWrapper.classList.add('day-dots');

      const activity = activityMap[dateString];
      if (activity) {
        if (activity.lift) {
          const dot = document.createElement('span');
          dot.classList.add('mini-dot', 'strength');
          dotWrapper.appendChild(dot);
        }
        if (activity.biometrics) {
          const dot = document.createElement('span');
          dot.classList.add('mini-dot', 'nutrition');
          dotWrapper.appendChild(dot);
        }
      }

      dayEl.appendChild(dotWrapper);

      // Make today active if year and month match
      const today = new Date();
      if (year === today.getFullYear() && month === today.getMonth() && dayNum === today.getDate()) {
        dayEl.classList.add('active', 'today');
      }

      dayEl.addEventListener('click', async () => {
        document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('active'));
        dayEl.classList.add('active');

        // Fetch logs for this date
        const detailsContent = document.getElementById('details-content');
        if (!detailsContent) return;

        detailsContent.innerHTML = '<span style="font-style: italic;">Loading log details...</span>';

        try {
          const response = await fetch(`${API_BASE}/users/${USER_ID}/logs/date/${dateString}`);
          if (response.ok) {
            const data = await response.json();
            let html = '';

            if (data.biometrics && data.biometrics.length > 0) {
              html += '<div style="margin-bottom: 8px;"><strong>Biometrics Logs:</strong><ul style="margin: 4px 0 0 16px; padding: 0; text-align: left;">';
              data.biometrics.forEach(b => {
                const bf = b.body_fat !== null ? `, Body Fat: ${b.body_fat}%` : '';
                html += `<li>Weight: ${b.weight_lbs} lbs (${b.weight_kg} kg), Activity: ${b.activity_level}${bf}</li>`;
              });
              html += '</ul></div>';
            }

            if (data.lifts && data.lifts.length > 0) {
              html += '<div><strong>Strength Logs:</strong><ul style="margin: 4px 0 0 16px; padding: 0; text-align: left;">';
              data.lifts.forEach(l => {
                html += `<li>${l.exercise}: ${l.weight_lifted} lbs for ${l.reps} reps (Est. 1RM: ${l.estimated_1rm} lbs)</li>`;
              });
              html += '</ul></div>';
            }

            if (!html) {
              html = '<div style="font-style: italic;">No calculations logged on this day.</div>';
            }

            detailsContent.innerHTML = html;
          } else {
            detailsContent.innerHTML = '<span style="color: var(--accent-coral);">Failed to load logs.</span>';
          }
        } catch (err) {
          console.error('Error fetching logs for date:', err);
          detailsContent.innerHTML = '<span style="color: var(--accent-coral);">Error connecting to server.</span>';
        }
      });

      daysContainer.appendChild(dayEl);
    }
  }

  // ==========================================
  // NUTRITION & BIOMETRICS API INTEGRATION
  // ==========================================
  async function calculateNutrition() {
    if (!isLoggedIn) return;

    const weightInput = document.getElementById('input-weight');
    const heightFtInput = document.getElementById('input-height-ft');
    const heightInInput = document.getElementById('input-height-in');
    const heightCmInput = document.getElementById('input-height-cm');
    const fatInput = document.getElementById('input-fat');
    const sexSelect = document.getElementById('select-sex');
    const activitySelect = document.getElementById('select-activity');

    const bmrDisplay = document.getElementById('val-bmr');
    const tdeeDisplay = document.getElementById('val-tdee');
    const targetCaloriesDisplay = document.getElementById('num-calories');
    const proteinG = document.getElementById('val-protein-g');
    const proteinPct = document.getElementById('val-protein-pct');
    const carbsG = document.getElementById('val-carbs-g');
    const carbsPct = document.getElementById('val-carbs-pct');
    const fatsG = document.getElementById('val-fats-g');
    const fatsPct = document.getElementById('val-fats-pct');

    const barProtein = document.getElementById('bar-protein');
    const barCarbs = document.getElementById('bar-carbs');
    const barFats = document.getElementById('bar-fats');
    const calorieProgressBar = document.getElementById('calorie-progress-bar');

    const biometricsOverlay = document.getElementById('biometrics-loading-overlay');
    const nutritionOverlay = document.getElementById('nutrition-loading-overlay');

    let weightKg, heightCm, weightLbs;
    const sex = sexSelect.value;
    const activity = activitySelect.value;
    const age = 28;
    const bodyFatPercent = parseFloat(fatInput.value);
    const bodyFat = isNaN(bodyFatPercent) ? null : bodyFatPercent / 100;

    if (activeUnit === 'imperial') {
      const wLbs = parseFloat(weightInput.value) || 190;
      weightLbs = wLbs;
      weightKg = wLbs / 2.20462;

      const heightFt = parseFloat(heightFtInput.value) || 5;
      const heightIn = parseFloat(heightInInput.value) || 9;
      heightCm = (heightFt * 12 + heightIn) * 2.54;
    } else {
      const wKg = parseFloat(weightInput.value) || 86;
      weightKg = wKg;
      weightLbs = wKg * 2.20462;

      heightCm = parseFloat(heightCmInput.value) || 175;
    }

    if (biometricsOverlay) biometricsOverlay.classList.add('active');
    if (nutritionOverlay) nutritionOverlay.classList.add('active');

    try {
      const bioResponse = await fetch(`${API_BASE}/biometrics/?user_id=${USER_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weight_kg: weightKg,
          height_cm: heightCm,
          age: age,
          sex: sex,
          activity_level: activity,
          body_fat: bodyFat
        })
      });

      if (!bioResponse.ok) {
        const errorData = await bioResponse.json();
        throw new Error(errorData.detail || 'Failed to update biometrics');
      }

      const macroResponse = await fetch(`${API_BASE}/users/${USER_ID}/macros?goal=${activeGoal}`);
      if (!macroResponse.ok) {
        const errorData = await macroResponse.json();
        throw new Error(errorData.detail || 'Failed to fetch macros');
      }

      const macroData = await macroResponse.json();

      let bmr = 0;
      if (bodyFat && bodyFat > 0.05) {
        const leanMass = weightKg * (1 - bodyFat);
        bmr = 370 + (21.6 * leanMass);
      } else {
        bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
        if (sex === 'Male') {
          bmr += 5;
        } else {
          bmr -= 161;
        }
      }
      const tdee = bmr * (ACTIVITY_MULTIPLIERS[activity] || 1.375);

      const targetCalories = macroData.total_calories || tdee;
      const proteinGrams = Math.round(macroData.protein || weightLbs);
      const fatsGrams = Math.round(macroData.fat || 50);
      const carbsGrams = Math.round(macroData.carbs || 150);

      const totalKcalComputed = (proteinGrams * 4) + (carbsGrams * 4) + (fatsGrams * 9);
      const pPct = totalKcalComputed ? Math.round(((proteinGrams * 4) / totalKcalComputed) * 100) : 0;
      const cPct = totalKcalComputed ? Math.round(((carbsGrams * 4) / totalKcalComputed) * 100) : 0;
      const fPct = totalKcalComputed ? Math.round(((fatsGrams * 9) / totalKcalComputed) * 100) : 0;

      bmrDisplay.textContent = `${Math.round(bmr)} kcal`;
      tdeeDisplay.textContent = `${Math.round(tdee)} kcal`;
      targetCaloriesDisplay.textContent = Math.round(targetCalories).toLocaleString();

      proteinG.textContent = proteinGrams;
      proteinPct.textContent = pPct;
      carbsG.textContent = carbsGrams;
      carbsPct.textContent = cPct;
      fatsG.textContent = fatsGrams;
      fatsPct.textContent = fPct;

      barProtein.style.width = `${pPct}%`;
      barCarbs.style.width = `${cPct}%`;
      barFats.style.width = `${fPct}%`;

      const perimeter = 276.46;
      const consumed = 1100;
      const progressOffset = perimeter - Math.min((consumed / targetCalories) * perimeter, perimeter);
      calorieProgressBar.style.strokeDashoffset = progressOffset;

      // Update calendar to reflect new biometric compliance dot
      updateCalendar(currentYear, currentMonth);

    } catch (err) {
      console.error('API Error:', err);
      showCustomDialog(err.message || 'An error occurred during verification. Please try again.');
    } finally {
      if (biometricsOverlay) biometricsOverlay.classList.remove('active');
      if (nutritionOverlay) nutritionOverlay.classList.remove('active');
    }
  }

  function calculateNutritionLocal() {
    const weightInput = document.getElementById('input-weight');
    const heightFtInput = document.getElementById('input-height-ft');
    const heightInInput = document.getElementById('input-height-in');
    const heightCmInput = document.getElementById('input-height-cm');
    const fatInput = document.getElementById('input-fat');
    const sexSelect = document.getElementById('select-sex');
    const activitySelect = document.getElementById('select-activity');

    const bmrDisplay = document.getElementById('val-bmr');
    const tdeeDisplay = document.getElementById('val-tdee');
    const targetCaloriesDisplay = document.getElementById('num-calories');
    const proteinG = document.getElementById('val-protein-g');
    const proteinPct = document.getElementById('val-protein-pct');
    const carbsG = document.getElementById('val-carbs-g');
    const carbsPct = document.getElementById('val-carbs-pct');
    const fatsG = document.getElementById('val-fats-g');
    const fatsPct = document.getElementById('val-fats-pct');

    const barProtein = document.getElementById('bar-protein');
    const barCarbs = document.getElementById('bar-carbs');
    const barFats = document.getElementById('bar-fats');
    const calorieProgressBar = document.getElementById('calorie-progress-bar');

    let weightKg, heightCm, weightLbs;
    const sex = sexSelect.value;
    const activity = activitySelect.value;
    const age = 28;
    const bodyFatPercent = parseFloat(fatInput.value);
    const bodyFat = isNaN(bodyFatPercent) ? null : bodyFatPercent / 100;

    if (activeUnit === 'imperial') {
      const wLbs = parseFloat(weightInput.value) || 190;
      weightLbs = wLbs;
      weightKg = wLbs / 2.20462;

      const heightFt = parseFloat(heightFtInput.value) || 5;
      const heightIn = parseFloat(heightInInput.value) || 9;
      heightCm = (heightFt * 12 + heightIn) * 2.54;
    } else {
      const wKg = parseFloat(weightInput.value) || 86;
      weightKg = wKg;
      weightLbs = wKg * 2.20462;

      heightCm = parseFloat(heightCmInput.value) || 175;
    }

    let bmr = 0;
    if (bodyFat && bodyFat > 0.05) {
      const leanMass = weightKg * (1 - bodyFat);
      bmr = 370 + (21.6 * leanMass);
    } else {
      bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
      if (sex === 'Male') {
        bmr += 5;
      } else {
        bmr -= 161;
      }
    }

    const tdee = bmr * (ACTIVITY_MULTIPLIERS[activity] || 1.375);

    let targetCalories = tdee;
    let proteinPercent = 35;
    let carbsPercent = 40;
    let fatsPercent = 25;

    if (activeGoal === 'cut') {
      targetCalories = tdee - 500;
      proteinPercent = 40;
      carbsPercent = 35;
      fatsPercent = 25;
    } else if (activeGoal === 'bulk') {
      targetCalories = tdee + 350;
      proteinPercent = 30;
      carbsPercent = 45;
      fatsPercent = 25;
    } else {
      proteinPercent = 30;
      carbsPercent = 45;
      fatsPercent = 25;
    }

    const proteinGrams = Math.round(weightLbs * 1.0);
    const fatsGrams = Math.round((targetCalories * (fatsPercent / 100)) / 9);
    const carbsGrams = Math.round((targetCalories - (proteinGrams * 4 + fatsGrams * 9)) / 4);

    const totalKcalComputed = (proteinGrams * 4) + (carbsGrams * 4) + (fatsGrams * 9);
    const pPct = Math.round(((proteinGrams * 4) / totalKcalComputed) * 100) || 0;
    const cPct = Math.round(((carbsGrams * 4) / totalKcalComputed) * 100) || 0;
    const fPct = Math.round(((fatsGrams * 9) / totalKcalComputed) * 100) || 0;

    bmrDisplay.textContent = `${Math.round(bmr)} kcal`;
    tdeeDisplay.textContent = `${Math.round(tdee)} kcal`;
    targetCaloriesDisplay.textContent = Math.round(targetCalories).toLocaleString();

    proteinG.textContent = proteinGrams;
    proteinPct.textContent = pPct;
    carbsG.textContent = carbsGrams;
    carbsPct.textContent = cPct;
    fatsG.textContent = fatsGrams;
    fatsPct.textContent = fPct;

    barProtein.style.width = `${pPct}%`;
    barCarbs.style.width = `${cPct}%`;
    barFats.style.width = `${fPct}%`;

    const perimeter = 276.46;
    const consumed = 1100;
    const progressOffset = perimeter - Math.min((consumed / targetCalories) * perimeter, perimeter);
    calorieProgressBar.style.strokeDashoffset = progressOffset;
  }

  // ==========================================
  // STRENGTH LAB API INTEGRATION
  // ==========================================
  async function updateStrength1RM() {
    if (!isLoggedIn) return;

    const liftWeightInput = document.getElementById('input-lift-weight');
    const liftRepsInput = document.getElementById('input-lift-reps');
    const exerciseSelect = document.getElementById('select-exercise');
    const mean1rmDisplay = document.getElementById('val-mean-1rm');
    const strengthOverlay = document.getElementById('strength-loading-overlay');

    const weight = parseFloat(liftWeightInput.value);
    const reps = parseInt(liftRepsInput.value);
    const exercise = exerciseSelect.value;

    if (isNaN(weight) || isNaN(reps) || weight <= 0 || reps <= 0) return;

    if (strengthOverlay) strengthOverlay.classList.add('active');

    try {
      const response = await fetch(`${API_BASE}/strength/?user_id=${USER_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exercise: exercise,
          weight_lifted: weight,
          reps: reps
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update strength parameters');
      }

      const data = await response.json();
      
      mean1rmDisplay.innerHTML = `${data.estimated_1rm.toFixed(1)} <span class="calc-unit">lbs</span>`;

      const repsRange = Array.from({length: 12}, (_, i) => i + 1);
      const rawCurve = data.strength_curve;
      const curve = typeof rawCurve === 'string' ? JSON.parse(rawCurve) : rawCurve;
      
      let decayMultiplier = 0.033;
      if (exercise === 'overhead_press') {
        decayMultiplier = 0.039;
      } else if (exercise === 'deadlift') {
        decayMultiplier = 0.028;
      } else if (exercise === 'back_squat') {
        decayMultiplier = 0.031;
      }

      const predictedLoads = repsRange.map(r => {
        if (curve && curve[r] !== undefined) return curve[r];
        if (curve && curve[String(r)] !== undefined) return curve[String(r)];
        return data.estimated_1rm / (1 + (r - 1) * decayMultiplier);
      });

      updateChart(repsRange, predictedLoads);

      // Update calendar to reflect new strength compliance dot
      updateCalendar(currentYear, currentMonth);

    } catch (err) {
      console.error('Strength API Error:', err);
      showCustomDialog(err.message || 'An error occurred during verification. Please try again.');
    } finally {
      if (strengthOverlay) strengthOverlay.classList.remove('active');
    }
  }

  function updateStrength1RMLocal() {
    const liftWeightInput = document.getElementById('input-lift-weight');
    const liftRepsInput = document.getElementById('input-lift-reps');
    const exerciseSelect = document.getElementById('select-exercise');
    const mean1rmDisplay = document.getElementById('val-mean-1rm');

    const weight = parseFloat(liftWeightInput.value);
    const reps = parseInt(liftRepsInput.value);
    const errorMsg = document.getElementById('weight-error-msg');

    if (isNaN(weight) || isNaN(reps)) return;

    if (weight < 2 || weight > 500) {
      if (errorMsg) {
        errorMsg.style.display = 'block';
        liftWeightInput.style.borderColor = 'var(--accent-coral)';
      }
      return;
    } else {
      if (errorMsg) {
        errorMsg.style.display = 'none';
        liftWeightInput.style.borderColor = 'var(--border-light)';
      }
    }

    const epley = weight * (1 + (reps / 30));
    const brzycki = weight / (1.0278 - (0.0278 * reps));
    const lander = weight / (1.013 - (0.02671 * reps));
    const mean = (epley + brzycki + lander) / 3;

    mean1rmDisplay.innerHTML = `${mean.toFixed(1)} <span class="calc-unit">lbs</span>`;

    const repsRange = Array.from({length: 12}, (_, i) => i + 1);
    const exercise = exerciseSelect.value;
    
    let decayMultiplier = 0.033;
    if (exercise === 'overhead_press') {
      decayMultiplier = 0.039;
    } else if (exercise === 'deadlift') {
      decayMultiplier = 0.028;
    } else if (exercise === 'back_squat') {
      decayMultiplier = 0.031;
    }

    const predictedLoads = repsRange.map(r => {
      const baseLoad = mean / (1 + (r - 1) * decayMultiplier);
      const waveNoise = Math.sin(r * 0.9) * (mean * 0.007);
      return Math.max(0, baseLoad + waveNoise);
    });

    updateChart(repsRange, predictedLoads);
  }

  function updateChart(labels, data) {
    const headerRow = document.getElementById('strength-curve-header-row');
    const weightRow = document.getElementById('strength-curve-weight-row');
    if (!headerRow || !weightRow) return;

    // Reset back to initial headers
    headerRow.innerHTML = '<th style="padding: 10px 8px; font-weight: 600; text-align: left; background-color: #f8fafc; border-right: 1px solid var(--border-light); width: 70px;">Reps</th>';
    weightRow.innerHTML = '<td style="padding: 10px 8px; font-weight: 600; text-align: left; background-color: #f8fafc; border-right: 1px solid var(--border-light); width: 70px; color: var(--text-main);">Weight (lbs)</td>';

    labels.forEach((rep, idx) => {
      const load = data[idx];
      const isNotLast = idx < labels.length - 1;
      
      // Add rep header column
      const th = document.createElement('th');
      th.style.padding = '10px 4px';
      th.style.fontWeight = '700';
      th.style.color = 'var(--text-muted)';
      th.style.fontSize = '13px';
      th.style.textAlign = 'center';
      if (isNotLast) th.style.borderRight = '1px solid var(--border-light)';
      th.textContent = rep;
      headerRow.appendChild(th);

      // Add weight cell column
      const td = document.createElement('td');
      td.style.padding = '10px 4px';
      td.style.fontWeight = '700';
      td.style.color = 'var(--accent-emerald)';
      td.style.fontSize = '13px';
      td.style.textAlign = 'center';
      if (isNotLast) td.style.borderRight = '1px solid var(--border-light)';
      td.textContent = Math.round(load);
      weightRow.appendChild(td);
    });
  }

  // ==========================================
  // STATEFUL RESOURCE HUB RENDERING
  // ==========================================
  function renderResources(filter = 'all') {
    const scrollContainer = document.querySelector('.resources-scroll-container');
    if (!scrollContainer) return;
    scrollContainer.innerHTML = '';

    localResourceDatabase.forEach(item => {
      if (filter !== 'all' && item.category !== filter) return;

      const card = document.createElement('div');
      card.className = `resource-item-card ${item.type}-card`;
      card.setAttribute('data-category', item.category);

      if (item.type === 'video') {
        card.innerHTML = `
          <div class="video-thumbnail-container">
            <img src="${item.thumbnail}" alt="${item.title}" class="video-thumbnail">
            <div class="video-duration">${item.duration}</div>
            <div class="play-overlay-button" id="trigger-video-modal">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            </div>
          </div>
          <div class="resource-text">
            <span class="resource-tag tag-video">VIDEO GUIDE</span>
            <h3 class="resource-headline">${item.title}</h3>
            <p class="resource-author">by ${item.author}</p>
          </div>
        `;
        const playBtn = card.querySelector('#trigger-video-modal');
        if (playBtn) {
          playBtn.addEventListener('click', () => {
            videoModal.classList.add('active');
          });
        }
      } else {
        card.innerHTML = `
          <div class="article-details">
            <span class="resource-tag tag-article">ARTICLE</span>
            <h3 class="resource-headline">${item.title}</h3>
            <span class="article-meta">${item.readTime} • By ${item.author}</span>
          </div>
          <button class="bookmark-btn ${item.bookmarked ? 'bookmarked' : ''}">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="${item.bookmarked ? 'currentColor' : 'none'}"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
          </button>
        `;

        const bookmarkBtn = card.querySelector('.bookmark-btn');
        bookmarkBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          item.bookmarked = !item.bookmarked;
          bookmarkBtn.classList.toggle('bookmarked');
          const svg = bookmarkBtn.querySelector('svg');
          svg.setAttribute('fill', item.bookmarked ? 'currentColor' : 'none');
        });
      }

      scrollContainer.appendChild(card);
    });

    if (filter === 'all' || filter === 'strength') {
      const tipCard = document.createElement('div');
      tipCard.className = 'resource-item-card daily-tip-card';
      tipCard.style.cssText = 'background-color: #ffffff; border: 1px solid var(--border-light); border-radius: var(--radius-sm); padding: 12px; margin-bottom: 0px; width: 100%; box-sizing: border-box; flex: 1; display: flex; flex-direction: column;';
      tipCard.innerHTML = `
        <div class="tip-header" style="display: flex; align-items: center; gap: 8px; color: var(--accent-coral); font-weight: 700; margin-bottom: 8px; font-family: 'Outfit', sans-serif;">
          <img src="brain_icon.png?v=1" style="width: 18px; height: 18px; object-fit: contain;" alt="Brain">
          <h4 style="margin: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; font-family: 'Outfit', sans-serif; font-weight: 700;">Did You Know?</h4>
        </div>
        <p class="tip-body" style="font-size: 13px; color: var(--text-muted); line-height: 1.5; margin: 0; font-family: 'Inter', sans-serif; flex: 1;">Even a 2% drop in total body hydration can lead to a 10% decrease in peak muscular strength. Drink 500ml of water 30 minutes before your lower body workouts!</p>
      `;
      scrollContainer.appendChild(tipCard);
    }
  }

  // ==========================================
  // INITIALIZATION & AUTOSYNC FLOW
  // ==========================================
  async function initializeData() {
    if (!isLoggedIn) return;

    const weightInput = document.getElementById('input-weight');
    const heightFtInput = document.getElementById('input-height-ft');
    const heightInInput = document.getElementById('input-height-in');
    const fatInput = document.getElementById('input-fat');
    const sexSelect = document.getElementById('select-sex');
    const activitySelect = document.getElementById('select-activity');
    const exerciseSelect = document.getElementById('select-exercise');
    
    const bmrDisplay = document.getElementById('val-bmr');
    const tdeeDisplay = document.getElementById('val-tdee');
    const targetCaloriesDisplay = document.getElementById('num-calories');
    const proteinG = document.getElementById('val-protein-g');
    const proteinPct = document.getElementById('val-protein-pct');
    const carbsG = document.getElementById('val-carbs-g');
    const carbsPct = document.getElementById('val-carbs-pct');
    const fatsG = document.getElementById('val-fats-g');
    const fatsPct = document.getElementById('val-fats-pct');

    const barProtein = document.getElementById('bar-protein');
    const barCarbs = document.getElementById('bar-carbs');
    const barFats = document.getElementById('bar-fats');
    const calorieProgressBar = document.getElementById('calorie-progress-bar');
    const mean1rmDisplay = document.getElementById('val-mean-1rm');

    updateCalendar(currentYear, currentMonth);

    // Initial todo sync
    todoItems = await fetchTodosFromBackend();
    renderTodos();

    try {
      const response = await fetch(`${API_BASE}/users/${USER_ID}/macros?goal=${activeGoal}`);
      if (response.status === 404) {
        console.log('Registering default user profile on FastAPI backend...');
        await calculateNutrition();
      } else if (response.ok) {
        const data = await response.json();
        const weightLbs = parseFloat(weightInput.value) || 190;
        const heightFt = parseFloat(heightFtInput.value) || 5;
        const heightIn = parseFloat(heightInInput.value) || 9;
        const bodyFatPercent = parseFloat(fatInput.value) || 18;
        const bodyFat = bodyFatPercent / 100;
        const sex = sexSelect.value;
        const activity = activitySelect.value;
        const age = 28;

        const weightKg = weightLbs / 2.20462;
        const heightCm = (heightFt * 12 + heightIn) * 2.54;

        let bmr = 0;
        if (bodyFat && bodyFat > 0.05) {
          const leanMass = weightKg * (1 - bodyFat);
          bmr = 370 + (21.6 * leanMass);
        } else {
          bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
          if (sex === 'Male') {
            bmr += 5;
          } else {
            bmr -= 161;
          }
        }
        const tdee = bmr * (ACTIVITY_MULTIPLIERS[activity] || 1.375);

        const targetCalories = data.total_calories || tdee;
        const proteinGrams = Math.round(data.protein || weightLbs);
        const fatsGrams = Math.round(data.fat || 50);
        const carbsGrams = Math.round(data.carbs || 150);

        const totalKcalComputed = (proteinGrams * 4) + (carbsGrams * 4) + (fatsGrams * 9);
        const pPct = totalKcalComputed ? Math.round(((proteinGrams * 4) / totalKcalComputed) * 100) : 0;
        const cPct = totalKcalComputed ? Math.round(((carbsGrams * 4) / totalKcalComputed) * 100) : 0;
        const fPct = totalKcalComputed ? Math.round(((fatsGrams * 9) / totalKcalComputed) * 100) : 0;

        bmrDisplay.textContent = `${Math.round(bmr)} kcal`;
        tdeeDisplay.textContent = `${Math.round(tdee)} kcal`;
        targetCaloriesDisplay.textContent = Math.round(targetCalories).toLocaleString();

        proteinG.textContent = proteinGrams;
        proteinPct.textContent = pPct;
        carbsG.textContent = carbsGrams;
        carbsPct.textContent = cPct;
        fatsG.textContent = fatsGrams;
        fatsPct.textContent = fPct;

        barProtein.style.width = `${pPct}%`;
        barCarbs.style.width = `${cPct}%`;
        barFats.style.width = `${fPct}%`;

        const perimeter = 276.46;
        const consumed = 1100;
        const progressOffset = perimeter - Math.min((consumed / targetCalories) * perimeter, perimeter);
        calorieProgressBar.style.strokeDashoffset = progressOffset;
      }
    } catch (e) {
      console.warn('Backend sync failed, using offline mode:', e);
      calculateNutritionLocal();
    }

    try {
      const response = await fetch(`${API_BASE}/users/${USER_ID}/strengthm/${exerciseSelect.value}`);
      if (response.ok) {
        const data = await response.json();
        mean1rmDisplay.innerHTML = `${data.estimated.toFixed(1)} <span class="calc-unit">lbs</span>`;
        const repsRange = Array.from({length: 12}, (_, i) => i + 1);
        const rawCurve = data.strength_curve;
        const curve = typeof rawCurve === 'string' ? JSON.parse(rawCurve) : rawCurve;
        
        let decayMultiplier = 0.033;
        const ex = exerciseSelect.value;
        if (ex === 'overhead_press') {
          decayMultiplier = 0.039;
        } else if (ex === 'deadlift') {
          decayMultiplier = 0.028;
        } else if (ex === 'back_squat') {
          decayMultiplier = 0.031;
        }

        const predictedLoads = repsRange.map(r => {
          if (curve && curve[r] !== undefined) return curve[r];
          if (curve && curve[String(r)] !== undefined) return curve[String(r)];
          return data.estimated / (1 + (r - 1) * decayMultiplier);
        });

        updateChart(repsRange, predictedLoads);
      } else {
        updateStrength1RMLocal();
      }
    } catch (e) {
      console.warn('Strength baseline fetch failed, using offline mode:', e);
      updateStrength1RMLocal();
    }
  }

  function showCustomDialog(message, isConfirm = false) {
    return new Promise((resolve) => {
      const modal = document.getElementById('custom-dialog-modal');
      const msgEl = document.getElementById('custom-dialog-message');
      const titleEl = document.getElementById('custom-dialog-title');
      const btnOk = document.getElementById('btn-dialog-ok');
      const btnCancel = document.getElementById('btn-dialog-cancel');
      
      titleEl.textContent = isConfirm ? 'Confirm Action' : 'Notice';
      msgEl.textContent = message;
      btnCancel.style.display = isConfirm ? 'inline-block' : 'none';
      
      modal.classList.add('active');
      
      function cleanup() {
        modal.classList.remove('active');
        btnOk.removeEventListener('click', onOk);
        btnCancel.removeEventListener('click', onCancel);
      }
      
      function onOk() {
        cleanup();
        resolve(true);
      }
      
      function onCancel() {
        cleanup();
        resolve(false);
      }
      
      btnOk.addEventListener('click', onOk);
      btnCancel.addEventListener('click', onCancel);
    });
  }

  // Init routines
  setupProfileDropdown();
  setupDashboardListeners();
  renderResources('all');
  initializeData();

});
