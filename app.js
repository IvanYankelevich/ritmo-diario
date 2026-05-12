const STORAGE_KEY = "ritmo-diario-state";
const XP_PER_LEVEL = 100;
const MAX_TASK_XP = 30;

const state = loadState();
let currentUser = null;
let cloudReady = false;
let cloudClient = null;
let cloudSaveTimer = null;
let reminderTimer = null;
let isLoadingCloudState = false;
let authMode = "signin";
let lastRenderedLevel = null;
let selectedDate = toDateKey(new Date());
let visibleMonth = new Date();
let activeView = "tasks";

const authScreen = document.querySelector("#authScreen");
const appScreen = document.querySelector("#appScreen");
const authTitle = document.querySelector("#authTitle");
const calendarOverlay = document.querySelector("#calendarOverlay");
const calendarGrid = document.querySelector("#calendarGrid");
const monthTitle = document.querySelector("#monthTitle");
const selectedDateTitle = document.querySelector("#selectedDateTitle");
const weekStrip = document.querySelector("#weekStrip");
const weekTitle = document.querySelector("#weekTitle");
const taskForm = document.querySelector("#taskForm");
const taskTitle = document.querySelector("#taskTitle");
const taskXp = document.querySelector("#taskXp");
const taskRepeat = document.querySelector("#taskRepeat");
const taskList = document.querySelector("#taskList");
const emptyState = document.querySelector("#emptyState");
const taskDateText = document.querySelector("#taskDateText");
const rewardForm = document.querySelector("#rewardForm");
const rewardLevel = document.querySelector("#rewardLevel");
const rewardTitle = document.querySelector("#rewardTitle");
const rewardList = document.querySelector("#rewardList");
const authEmail = document.querySelector("#authEmail");
const authPassword = document.querySelector("#authPassword");
const signInButton = document.querySelector("#signInButton");
const signUpButton = document.querySelector("#signUpButton");
const signOutButton = document.querySelector("#signOutButton");
const showSignUpButton = document.querySelector("#showSignUpButton");
const showSignInButton = document.querySelector("#showSignInButton");
const signUpPrompt = document.querySelector("#signUpPrompt");
const signInPrompt = document.querySelector("#signInPrompt");
const togglePasswordButton = document.querySelector("#togglePasswordButton");
const authStatus = document.querySelector("#authStatus");
const notificationsEnabled = document.querySelector("#notificationsEnabled");
const notificationInterval = document.querySelector("#notificationInterval");
const notificationStatus = document.querySelector("#notificationStatus");
const testNotificationButton = document.querySelector("#testNotificationButton");
const themeToggleButton = document.querySelector("#themeToggleButton");
const themeIcon = document.querySelector("#themeIcon");
const levelUpOverlay = document.querySelector("#levelUpOverlay");
const levelUpTitle = document.querySelector("#levelUpTitle");
const levelUpReward = document.querySelector("#levelUpReward");
const closeLevelUpButton = document.querySelector("#closeLevelUpButton");
const levelLabel = document.querySelector("#levelLabel");
const xpLabel = document.querySelector("#xpLabel");
const xpBar = document.querySelector("#xpBar");
const nextRewardText = document.querySelector("#nextRewardText");
const completedCount = document.querySelector("#completedCount");
const pendingCount = document.querySelector("#pendingCount");
const dayXp = document.querySelector("#dayXp");
const tasksTab = document.querySelector("#tasksTab");
const statsTab = document.querySelector("#statsTab");
const tasksView = document.querySelector("#tasksView");
const statsView = document.querySelector("#statsView");
const statsPeriod = document.querySelector("#statsPeriod");
const statsTitle = document.querySelector("#statsTitle");
const statsDone = document.querySelector("#statsDone");
const statsWonXp = document.querySelector("#statsWonXp");
const statsLostXp = document.querySelector("#statsLostXp");
const statsList = document.querySelector("#statsList");
const profileOverlay = document.querySelector("#profileOverlay");
const profileForm = document.querySelector("#profileForm");
const profileName = document.querySelector("#profileName");

document.querySelector("#prevMonth").addEventListener("click", () => {
  visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
  render();
});

document.querySelector("#nextMonth").addEventListener("click", () => {
  visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
  render();
});

document.querySelector("#prevWeek").addEventListener("click", () => {
  const date = parseDateKey(selectedDate);
  date.setDate(date.getDate() - 7);
  selectDate(toDateKey(date));
});

document.querySelector("#nextWeek").addEventListener("click", () => {
  const date = parseDateKey(selectedDate);
  date.setDate(date.getDate() + 7);
  selectDate(toDateKey(date));
});

document.querySelector("#openCalendar").addEventListener("click", () => {
  calendarOverlay.hidden = false;
});

document.querySelector("#closeCalendar").addEventListener("click", () => {
  calendarOverlay.hidden = true;
});

calendarOverlay.addEventListener("click", (event) => {
  if (event.target === calendarOverlay) calendarOverlay.hidden = true;
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") calendarOverlay.hidden = true;
});

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = taskTitle.value.trim();
  const xp = clamp(Number(taskXp.value), 5, MAX_TASK_XP);

  if (!title) return;

  const dates = getRepeatDates(taskRepeat.value);
  for (const date of dates) addTask({ date, title, xp });

  taskForm.reset();
  taskXp.value = "20";
  taskRepeat.value = "day";
  taskTitle.focus();
  saveState();
  render();
});

rewardForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const level = Number(rewardLevel.value);
  const title = rewardTitle.value.trim();

  if (!title) return;

  const existingReward = state.rewards.find((reward) => reward.level === level);
  if (existingReward) {
    existingReward.title = title;
  } else {
    state.rewards.push({ level, title });
  }

  rewardTitle.value = "";
  saveState();
  render();
});

signInButton.addEventListener("click", () => signIn());
signUpButton.addEventListener("click", () => signUp());
signOutButton.addEventListener("click", () => signOut());
showSignUpButton.addEventListener("click", () => setAuthMode("signup"));
showSignInButton.addEventListener("click", () => setAuthMode("signin"));
togglePasswordButton.addEventListener("click", () => togglePasswordVisibility());
notificationsEnabled.addEventListener("change", () => updateNotificationSettings());
notificationInterval.addEventListener("change", () => updateNotificationSettings());
testNotificationButton.addEventListener("click", () => testNotification());
themeToggleButton.addEventListener("click", () => toggleTheme());
tasksTab.addEventListener("click", () => setActiveView("tasks"));
statsTab.addEventListener("click", () => setActiveView("stats"));
statsPeriod.addEventListener("change", () => renderStats());
profileForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = profileName.value.trim();
  if (!name) return;
  state.settings.displayName = name;
  saveState();
  render();
});
closeLevelUpButton.addEventListener("click", () => {
  levelUpOverlay.hidden = true;
});

initCloudSync();

function selectDate(key) {
  selectedDate = key;
  const date = parseDateKey(key);
  visibleMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  render();
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.tasks)) return normalizeState(saved);
  } catch {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Continue with fresh state when browser storage is unavailable.
    }
  }

  return {
    tasks: [
      {
        id: createId(),
        date: toDateKey(new Date()),
        title: "Planear el dia",
        xp: 15,
        completed: false,
        createdAt: Date.now(),
      },
      {
        id: createId(),
        date: toDateKey(new Date()),
        title: "Terminar una tarea importante",
        xp: 30,
        completed: false,
        createdAt: Date.now() + 1,
      },
    ],
    rewards: [],
    settings: getDefaultSettings(),
  };
}

function normalizeState(saved) {
  return {
    tasks: saved.tasks.map((task) => ({
      ...task,
      xp: clamp(Number(task.xp), 5, MAX_TASK_XP),
    })),
    rewards: Array.isArray(saved.rewards)
      ? saved.rewards
          .filter((reward) => Number(reward.level) >= 2)
          .map((reward) => ({ level: Number(reward.level), title: String(reward.title || "") }))
      : [],
    settings: {
      ...getDefaultSettings(),
      ...(saved.settings || {}),
      displayName: String(saved.settings?.displayName || "").trim(),
    },
  };
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // The app still works during the session if browser storage is blocked.
  }

  queueCloudSave();
}

function render() {
  renderAuth();
  renderTheme();
  if (!currentUser) return;
  renderHeader();
  renderWeek();
  renderCalendar();
  renderTasks();
  renderProgress();
  renderRewards();
  renderNotifications();
  renderView();
  renderProfilePrompt();
  renderStats();
}

function renderAuth() {
  const configured = Boolean(cloudClient);
  authScreen.hidden = Boolean(currentUser);
  appScreen.hidden = !currentUser;
  signInButton.disabled = !configured || authMode !== "signin";
  signUpButton.disabled = !configured || authMode !== "signup";
  signOutButton.hidden = !currentUser;
  signInButton.hidden = authMode !== "signin";
  signUpButton.hidden = authMode !== "signup";
  signUpPrompt.hidden = authMode !== "signin";
  signInPrompt.hidden = authMode !== "signup";
  authTitle.textContent = authMode === "signin" ? "Entrar" : "Registrarme";
  authPassword.autocomplete = authMode === "signin" ? "current-password" : "new-password";

  if (!configured) {
    authStatus.textContent = "Falta configurar Supabase para usar la app.";
  } else if (currentUser) {
    authStatus.textContent = "Sesion iniciada.";
  } else if (authMode === "signup") {
    authStatus.textContent = "Crea tu cuenta para empezar a sincronizar.";
  } else {
    authStatus.textContent = "Inicia sesion para sincronizar tus tareas.";
  }
}

function renderNotifications() {
  notificationsEnabled.checked = Boolean(state.settings.notificationsEnabled);
  notificationInterval.value = String(state.settings.notificationIntervalMinutes);

  if (!("Notification" in window)) {
    notificationStatus.textContent = "No disponible";
    notificationsEnabled.disabled = true;
    testNotificationButton.disabled = true;
    return;
  }

  if (!state.settings.notificationsEnabled) {
    notificationStatus.textContent = "Apagados";
  } else if (Notification.permission === "granted") {
    notificationStatus.textContent = `Cada ${formatInterval(state.settings.notificationIntervalMinutes)}`;
  } else if (Notification.permission === "denied") {
    notificationStatus.textContent = "Bloqueados";
  } else {
    notificationStatus.textContent = "Pedir permiso";
  }

  scheduleReminderCheck();
}

function renderHeader() {
  const name = state.settings.displayName || "vos";
  selectedDateTitle.textContent = `Hola ${name}, que hacemos hoy?`;
  taskDateText.textContent = formatSelectedDate(selectedDate);
  monthTitle.textContent = visibleMonth.toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });
}

function renderView() {
  const showingStats = activeView === "stats";
  tasksView.hidden = showingStats;
  statsView.hidden = !showingStats;
  tasksTab.classList.toggle("active", !showingStats);
  statsTab.classList.toggle("active", showingStats);
}

function setActiveView(view) {
  activeView = view;
  renderView();
  if (view === "stats") renderStats();
}

function renderProfilePrompt() {
  const hasName = Boolean(state.settings.displayName);
  profileOverlay.hidden = hasName;
  if (!hasName) profileName.focus();
}

function renderWeek() {
  weekStrip.innerHTML = "";
  const start = getWeekStart(parseDateKey(selectedDate));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  weekTitle.textContent = formatWeekRange(start, end);

  for (let index = 0; index < 7; index += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = toDateKey(date);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "week-day-button";
    button.setAttribute("aria-label", formatSelectedDate(key));
    button.innerHTML = `<span>${getDayLetter(index)}</span><strong>${date.getDate()}</strong>`;

    if (key === toDateKey(new Date())) button.classList.add("today");
    if (key === selectedDate) button.classList.add("selected");
    if (state.tasks.some((task) => task.date === key)) button.classList.add("has-tasks");

    button.addEventListener("click", () => selectDate(key));
    weekStrip.appendChild(button);
  }
}

function renderCalendar() {
  calendarGrid.innerHTML = "";
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - startOffset);

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const key = toDateKey(date);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "day-button";
    button.textContent = date.getDate();
    button.setAttribute("aria-label", formatSelectedDate(key));

    if (date.getMonth() === month) button.classList.add("current-month");
    if (key === toDateKey(new Date())) button.classList.add("today");
    if (key === selectedDate) button.classList.add("selected");
    if (state.tasks.some((task) => task.date === key)) button.classList.add("has-tasks");

    button.addEventListener("click", () => {
      selectDate(key);
      calendarOverlay.hidden = true;
    });

    calendarGrid.appendChild(button);
  }
}

function renderTasks() {
  const tasks = getSelectedTasks();
  taskList.innerHTML = "";
  emptyState.classList.toggle("hidden", tasks.length > 0);

  for (const task of tasks) {
    const item = document.createElement("li");
    item.className = `task-item${task.completed ? " done" : ""}`;

    const checkButton = document.createElement("button");
    checkButton.type = "button";
    checkButton.className = `check-button${task.completed ? " checked" : ""}`;
    checkButton.title = task.completed ? "Marcar pendiente" : "Completar";
    checkButton.setAttribute("aria-label", checkButton.title);
    checkButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>';
    checkButton.addEventListener("click", () => {
      task.completed = !task.completed;
      saveState();
      render();
    });

    const title = document.createElement("span");
    title.className = "task-title";
    title.textContent = task.title;

    const xp = document.createElement("span");
    xp.className = "xp-pill";
    xp.textContent = `${task.xp} XP`;

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-button";
    deleteButton.title = "Eliminar";
    deleteButton.setAttribute("aria-label", "Eliminar tarea");
    deleteButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M10 11v6M14 11v6M6 6l1 15h10l1-15"/></svg>';
    deleteButton.addEventListener("click", () => {
      const index = state.tasks.findIndex((itemToFind) => itemToFind.id === task.id);
      if (index >= 0) state.tasks.splice(index, 1);
      saveState();
      render();
    });

    item.append(checkButton, title, xp, deleteButton);
    taskList.appendChild(item);
  }

  const completed = tasks.filter((task) => task.completed);
  completedCount.textContent = completed.length;
  pendingCount.textContent = tasks.length - completed.length;
  dayXp.textContent = completed.reduce((total, task) => total + task.xp, 0);
}

function renderStats() {
  const range = getStatsRange(statsPeriod.value);
  const todayKey = toDateKey(new Date());
  const rangeTasks = state.tasks.filter((task) => task.date >= range.startKey && task.date <= range.endKey);
  const countedTasks = rangeTasks.filter((task) => task.completed || task.date <= todayKey);
  const completed = countedTasks.filter((task) => task.completed);
  const missed = countedTasks.filter((task) => !task.completed);
  const wonXp = completed.reduce((total, task) => total + task.xp, 0);
  const lostXp = missed.reduce((total, task) => total + task.xp, 0);

  statsTitle.textContent = statsPeriod.value === "week" ? "Semana seleccionada" : "Mes seleccionado";
  statsDone.textContent = completed.length;
  statsWonXp.textContent = wonXp;
  statsLostXp.textContent = lostXp;
  statsList.innerHTML = "";

  const groups = getTaskStats(countedTasks);
  if (groups.length === 0) {
    const empty = document.createElement("li");
    empty.className = "stats-empty";
    empty.textContent = "Todavia no hay datos para este periodo.";
    statsList.appendChild(empty);
    return;
  }

  for (const item of groups) {
    const row = document.createElement("li");
    row.className = "stats-item";

    const title = document.createElement("strong");
    title.textContent = item.title;

    const meta = document.createElement("div");
    meta.className = "stats-item-grid";
    meta.innerHTML = `
      <span><b>${item.done}</b><small>hechas</small></span>
      <span><b>${item.wonXp}</b><small>XP ganada</small></span>
      <span><b>${item.missed}</b><small>no hechas</small></span>
      <span><b>${item.lostXp}</b><small>XP perdida</small></span>
    `;

    row.append(title, meta);
    statsList.appendChild(row);
  }
}

function renderProgress() {
  const totalXp = state.tasks
    .filter((task) => task.completed)
    .reduce((total, task) => total + task.xp, 0);
  const level = Math.floor(totalXp / XP_PER_LEVEL) + 1;
  const levelXp = totalXp % XP_PER_LEVEL;

  levelLabel.textContent = `Nivel ${level}`;
  xpLabel.textContent = `${levelXp} / ${XP_PER_LEVEL} XP`;
  xpBar.style.width = `${levelXp}%`;
  nextRewardText.textContent = getNextRewardText(level);
  maybeShowLevelUp(level);
}

function renderRewards() {
  rewardLevel.innerHTML = "";
  for (let level = 2; level <= 100; level += 1) {
    const option = document.createElement("option");
    option.value = level;
    option.textContent = `Nivel ${level}`;
    rewardLevel.appendChild(option);
  }

  rewardList.innerHTML = "";
  const rewards = [...state.rewards].sort((first, second) => first.level - second.level);

  if (rewards.length === 0) {
    const empty = document.createElement("li");
    empty.className = "reward-empty";
    empty.textContent = "Todavia no hay premios cargados.";
    rewardList.appendChild(empty);
    return;
  }

  for (const reward of rewards) {
    const item = document.createElement("li");
    item.className = "reward-item";

    const meta = document.createElement("span");
    meta.textContent = `Nivel ${reward.level}`;

    const title = document.createElement("strong");
    title.textContent = reward.title;

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-button compact";
    deleteButton.title = "Eliminar premio";
    deleteButton.setAttribute("aria-label", "Eliminar premio");
    deleteButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M10 11v6M14 11v6M6 6l1 15h10l1-15"/></svg>';
    deleteButton.addEventListener("click", () => {
      state.rewards = state.rewards.filter((itemToFind) => itemToFind.level !== reward.level);
      saveState();
      render();
    });

    item.append(meta, title, deleteButton);
    rewardList.appendChild(item);
  }
}

function getSelectedTasks() {
  return state.tasks
    .filter((task) => task.date === selectedDate)
    .sort((first, second) => first.createdAt - second.createdAt);
}

function getNextRewardText(level) {
  const nextRewardLevel = level + 1;
  const reward = state.rewards.find((item) => item.level === nextRewardLevel);
  if (reward) return `Proximo premio: nivel ${nextRewardLevel} - ${reward.title}`;
  return `Proximo premio: nivel ${nextRewardLevel}`;
}

function addTask({ date, title, xp }) {
  state.tasks.push({
    id: createId(),
    date,
    title,
    xp: clamp(Number(xp), 5, MAX_TASK_XP),
    completed: false,
    createdAt: Date.now() + state.tasks.length,
  });
}

function getRepeatDates(mode) {
  if (mode === "week") return getCurrentWeekKeys();
  if (mode === "30days") return getNextDaysKeys(30);
  return [selectedDate];
}

function getStatsRange(period) {
  const base = parseDateKey(selectedDate);
  if (period === "month") {
    const start = new Date(base.getFullYear(), base.getMonth(), 1);
    const end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
    return { startKey: toDateKey(start), endKey: toDateKey(end) };
  }

  const start = getWeekStart(base);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { startKey: toDateKey(start), endKey: toDateKey(end) };
}

function getTaskStats(tasks) {
  const groups = new Map();

  for (const task of tasks) {
    const key = task.title.trim().toLowerCase();
    if (!groups.has(key)) {
      groups.set(key, {
        title: task.title,
        done: 0,
        missed: 0,
        wonXp: 0,
        lostXp: 0,
      });
    }

    const group = groups.get(key);
    if (task.completed) {
      group.done += 1;
      group.wonXp += task.xp;
    } else {
      group.missed += 1;
      group.lostXp += task.xp;
    }
  }

  return [...groups.values()].sort((first, second) => {
    const impact = second.wonXp + second.lostXp - (first.wonXp + first.lostXp);
    if (impact !== 0) return impact;
    return first.title.localeCompare(second.title, "es");
  });
}

function getCurrentWeekKeys() {
  const start = getWeekStart(parseDateKey(selectedDate));
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return toDateKey(date);
  });
}

function getNextDaysKeys(count) {
  return Array.from({ length: count }, (_, index) => {
    const date = parseDateKey(selectedDate);
    date.setDate(date.getDate() + index);
    return toDateKey(date);
  });
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function getWeekStart(date) {
  const start = new Date(date);
  const offset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - offset);
  return start;
}

function getDayLetter(index) {
  return ["L", "M", "M", "J", "V", "S", "D"][index];
}

function formatWeekRange(start, end) {
  const startText = start.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
  const endText = end.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
  return `${startText} - ${endText}`;
}

function formatSelectedDate(key) {
  const date = parseDateKey(key);
  const today = toDateKey(new Date());
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);

  if (key === today) return "Hoy";
  if (key === toDateKey(tomorrowDate)) return "Manana";

  return date.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function clamp(value, min, max) {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function initCloudSync() {
  const config = window.RITMO_SUPABASE || {};
  const hasConfig = Boolean(config.url && config.anonKey && window.supabase);

  if (!hasConfig) {
    render();
    return;
  }

  cloudReady = true;
  cloudClient = window.supabase.createClient(config.url, config.anonKey);
  cloudClient.auth.getSession().then(({ data }) => {
    currentUser = data.session?.user || null;
    if (currentUser) loadCloudState();
    render();
  });

  cloudClient.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user || null;
    if (currentUser) loadCloudState();
    render();
  });
}

async function signIn() {
  if (!cloudReady) return;
  setSyncStatus("Entrando...");
  const { error } = await cloudClient.auth.signInWithPassword({
    email: authEmail.value.trim(),
    password: authPassword.value,
  });

  if (error) {
    setSyncStatus(getAuthErrorMessage(error));
    return;
  }

  authPassword.value = "";
}

async function signUp() {
  if (!cloudReady) return;
  setSyncStatus("Creando cuenta...");
  const { data, error } = await cloudClient.auth.signUp({
    email: authEmail.value.trim(),
    password: authPassword.value,
  });

  if (error) {
    setSyncStatus(getAuthErrorMessage(error));
    return;
  }

  authPassword.value = "";
  if (data.session) {
    setSyncStatus("Cuenta creada. Entrando...");
  } else {
    setAuthMode("signin", false);
    setSyncStatus("Cuenta creada. Ahora podes entrar.");
  }
}

async function signOut() {
  if (!cloudReady) return;
  await cloudClient.auth.signOut();
  currentUser = null;
  setSyncStatus("Sesion cerrada");
  render();
}

async function loadCloudState() {
  if (!currentUser || isLoadingCloudState) return;
  isLoadingCloudState = true;
  setSyncStatus("Sincronizando...");

  const { data, error } = await cloudClient
    .from("ritmo_data")
    .select("data")
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (error) {
    setSyncStatus("Error de nube");
    isLoadingCloudState = false;
    return;
  }

  if (data?.data) {
    const cloudState = normalizeState(data.data);
    state.tasks = cloudState.tasks;
    state.rewards = cloudState.rewards;
    state.settings = cloudState.settings;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } else {
    await saveCloudState();
  }

  isLoadingCloudState = false;
  setSyncStatus("Sincronizado");
  render();
}

function queueCloudSave() {
  if (!cloudReady || !currentUser || isLoadingCloudState) return;
  clearTimeout(cloudSaveTimer);
  cloudSaveTimer = setTimeout(() => {
    saveCloudState();
  }, 500);
}

async function saveCloudState() {
  if (!cloudReady || !currentUser) return;
  setSyncStatus("Guardando...");

  const { error } = await cloudClient.from("ritmo_data").upsert({
    user_id: currentUser.id,
    data: {
      tasks: state.tasks,
      rewards: state.rewards,
      settings: state.settings,
    },
    updated_at: new Date().toISOString(),
  });

  setSyncStatus(error ? "Error de nube" : "Sincronizado");
}

function setSyncStatus(message) {
  authStatus.textContent = message;
}

function setAuthMode(mode, resetStatus = true) {
  authMode = mode;
  authPassword.value = "";
  authPassword.type = "password";
  togglePasswordButton.textContent = "Ver";
  togglePasswordButton.setAttribute("aria-label", "Mostrar contrasena");
  renderAuth();

  if (!resetStatus) return;
  authStatus.textContent =
    authMode === "signin"
      ? "Inicia sesion para sincronizar tus tareas."
      : "Crea tu cuenta para empezar a sincronizar.";
}

function togglePasswordVisibility() {
  const isVisible = authPassword.type === "text";
  authPassword.type = isVisible ? "password" : "text";
  togglePasswordButton.textContent = isVisible ? "Ver" : "Ocultar";
  togglePasswordButton.setAttribute("aria-label", isVisible ? "Mostrar contrasena" : "Ocultar contrasena");
}

function getAuthErrorMessage(error) {
  const message = String(error?.message || "").toLowerCase();

  if (message.includes("invalid login credentials")) {
    return "Email o contrasena incorrectos.";
  }

  if (message.includes("email not confirmed")) {
    return "Falta confirmar el email.";
  }

  if (message.includes("password")) {
    return "La contrasena debe tener al menos 6 caracteres.";
  }

  if (message.includes("already registered") || message.includes("already been registered")) {
    return "Ese email ya tiene cuenta. Usa Entrar.";
  }

  if (message.includes("rate limit")) {
    return "Demasiados intentos. Espera un momento.";
  }

  return error?.message ? `Error: ${error.message}` : "No se pudo completar la accion.";
}

async function updateNotificationSettings() {
  state.settings.notificationsEnabled = notificationsEnabled.checked;
  state.settings.notificationIntervalMinutes = Number(notificationInterval.value);

  if (state.settings.notificationsEnabled && "Notification" in window && Notification.permission === "default") {
    await Notification.requestPermission();
  }

  saveState();
  renderNotifications();
}

function scheduleReminderCheck() {
  clearInterval(reminderTimer);
  if (!state.settings.notificationsEnabled || !("Notification" in window) || Notification.permission !== "granted") return;

  reminderTimer = setInterval(() => {
    showPendingTaskNotification(false);
  }, 60 * 1000);
}

function showPendingTaskNotification(force) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const pendingTasks = state.tasks.filter((task) => task.date === toDateKey(new Date()) && !task.completed);
  if (pendingTasks.length === 0) {
    if (force) {
      new Notification("Ritmo Diario", {
        body: "No tienes tareas pendientes para hoy.",
      });
    }
    return;
  }

  const now = Date.now();
  const intervalMs = state.settings.notificationIntervalMinutes * 60 * 1000;
  if (!force && now - state.settings.lastNotificationAt < intervalMs) return;

  state.settings.lastNotificationAt = now;
  saveState();

  const nextTask = pendingTasks[0];
  const extra = pendingTasks.length > 1 ? ` y ${pendingTasks.length - 1} mas` : "";
  new Notification("Tareas pendientes", {
    body: `${nextTask.title}${extra}.`,
  });
}

async function testNotification() {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    await Notification.requestPermission();
  }

  if (Notification.permission === "granted") {
    showPendingTaskNotification(true);
  }

  renderNotifications();
}

function getDefaultSettings() {
  return {
    notificationsEnabled: false,
    notificationIntervalMinutes: 120,
    lastNotificationAt: 0,
    theme: "light",
    highestLevelCelebrated: 1,
    displayName: "",
  };
}

function formatInterval(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  return `${hours} h`;
}

function maybeShowLevelUp(level) {
  if (lastRenderedLevel === null) {
    lastRenderedLevel = level;
    state.settings.highestLevelCelebrated = Math.max(state.settings.highestLevelCelebrated || 1, level);
    return;
  }

  if (level <= lastRenderedLevel || level <= (state.settings.highestLevelCelebrated || 1)) {
    lastRenderedLevel = level;
    return;
  }

  lastRenderedLevel = level;
  state.settings.highestLevelCelebrated = level;
  saveState();
  showLevelUp(level);
}

function showLevelUp(level) {
  const reward = state.rewards.find((item) => item.level === level);
  levelUpTitle.textContent = `Nivel ${level}`;
  levelUpReward.textContent = reward
    ? `Ganaste: ${reward.title}`
    : "No cargaste recompensa para este nivel, pero igual subiste.";
  levelUpOverlay.hidden = false;
}

function renderTheme() {
  document.body.dataset.theme = state.settings.theme;
  themeIcon.innerHTML = state.settings.theme === "dark" ? "&#9728;" : "&#9790;";
  themeToggleButton.title = state.settings.theme === "dark" ? "Tema claro" : "Tema oscuro";
}

function setTheme(theme) {
  state.settings.theme = theme;
  saveState();
  renderTheme();
}

function toggleTheme() {
  setTheme(state.settings.theme === "dark" ? "light" : "dark");
}

render();
