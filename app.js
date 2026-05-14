const STORAGE_KEY = "ritmo-diario-state";
const XP_PER_LEVEL = 100;
const MAX_TASK_XP = 30;
const DEMO_MODE = ["127.0.0.1", "localhost"].includes(window.location.hostname);
const GENERIC_SUGGESTIONS = [
  { title: "Tomar agua", xp: 5 },
  { title: "Caminar 15 minutos", xp: 15 },
  { title: "Leer 10 minutos", xp: 15 },
  { title: "Ordenar un espacio", xp: 10 },
  { title: "Planear el dia", xp: 10 },
  { title: "Hacer ejercicio", xp: 25 },
];
const REWARD_SUGGESTIONS = [
  "Cafe rico",
  "Merienda favorita",
  "30 minutos de serie",
  "Comprar algo chico",
  "Noche de juego",
  "Pedir comida rica",
  "Salida a caminar",
  "Descanso sin culpa",
];
const EXPENSE_CATEGORIES = [
  { id: "food", label: "Comida" },
  { id: "transport", label: "Transporte" },
  { id: "services", label: "Servicios" },
  { id: "home", label: "Casa" },
  { id: "fun", label: "Ocio" },
  { id: "other", label: "Otros" },
];
const ACHIEVEMENTS = [
  {
    id: "first-task",
    title: "Primer paso",
    description: "Completa tu primera tarea.",
    difficulty: "copper",
    xp: 10,
    isUnlocked: () => getCompletedTasks().length >= 1,
  },
  {
    id: "five-active-days",
    title: "Cinco dias en ritmo",
    description: "Haz al menos 1 tarea durante 5 dias distintos.",
    difficulty: "silver",
    xp: 25,
    isUnlocked: () => getCompletedDayCount() >= 5,
  },
  {
    id: "perfect-day",
    title: "Dia perfecto",
    description: "Haz todas las tareas de un dia.",
    difficulty: "silver",
    xp: 25,
    isUnlocked: () => hasPerfectDay(),
  },
  {
    id: "three-perfect-days",
    title: "Tres dias impecables",
    description: "Completa todas las tareas en 3 dias distintos.",
    difficulty: "silver",
    xp: 25,
    isUnlocked: () => getPerfectDayCount() >= 3,
  },
  {
    id: "ten-perfect-days",
    title: "Agenda dorada",
    description: "Completa todas las tareas en 10 dias distintos.",
    difficulty: "platinum",
    xp: 50,
    isUnlocked: () => getPerfectDayCount() >= 10,
  },
  {
    id: "ten-tasks",
    title: "Motor encendido",
    description: "Completa 10 tareas.",
    difficulty: "copper",
    xp: 10,
    isUnlocked: () => getCompletedTasks().length >= 10,
  },
  {
    id: "fifty-tasks",
    title: "Ritmo firme",
    description: "Completa 50 tareas.",
    difficulty: "silver",
    xp: 25,
    isUnlocked: () => getCompletedTasks().length >= 50,
  },
  {
    id: "thirty-active-days",
    title: "Constancia total",
    description: "Haz tareas durante 30 dias distintos.",
    difficulty: "platinum",
    xp: 50,
    isUnlocked: () => getCompletedDayCount() >= 30,
  },
  {
    id: "hundred-tasks",
    title: "Modo imparable",
    description: "Completa 100 tareas.",
    difficulty: "platinum",
    xp: 50,
    isUnlocked: () => getCompletedTasks().length >= 100,
  },
  {
    id: "first-reward",
    title: "Premio preparado",
    description: "Crea tu primer premio.",
    difficulty: "copper",
    xp: 10,
    isUnlocked: () => state.rewards.length >= 1,
  },
  {
    id: "five-rewards",
    title: "Escalera de premios",
    description: "Crea 5 premios distintos.",
    difficulty: "silver",
    xp: 25,
    isUnlocked: () => state.rewards.length >= 5,
  },
  {
    id: "first-expense",
    title: "Gasto registrado",
    description: "Carga tu primer gasto.",
    difficulty: "copper",
    xp: 10,
    isUnlocked: () => state.expenses.length >= 1,
  },
  {
    id: "expense-categories",
    title: "Mapa del dinero",
    description: "Usa 3 categorias de gastos distintas.",
    difficulty: "silver",
    xp: 25,
    isUnlocked: () => getUsedExpenseCategoryCount() >= 3,
  },
  {
    id: "first-budget",
    title: "Limite claro",
    description: "Define tu primer presupuesto mensual.",
    difficulty: "copper",
    xp: 10,
    isUnlocked: () => Object.values(state.monthlyBudgets).some((amount) => amount > 0),
  },
  {
    id: "first-savings-goal",
    title: "Ahorro en marcha",
    description: "Define tu primera meta de ahorro.",
    difficulty: "copper",
    xp: 10,
    isUnlocked: () => Object.values(state.monthlySavingsGoals).some((amount) => amount > 0),
  },
  {
    id: "savings-goal-hit",
    title: "Meta cumplida",
    description: "Cumple una meta de ahorro mensual.",
    difficulty: "platinum",
    xp: 50,
    isUnlocked: () => hasReachedSavingsGoal(),
  },
];

const state = loadState();
let currentUser = null;
let cloudReady = false;
let cloudClient = null;
let cloudSaveTimer = null;
let reminderTimer = null;
let toastTimer = null;
let isLoadingCloudState = false;
let authMode = "signin";
let lastRenderedLevel = null;
let selectedDate = toDateKey(new Date());
let visibleMonth = new Date();
let selectedExpenseMonth = getMonthKey(new Date());
let activeView = "tasks";
let editingTaskId = null;
let editingExpenseId = null;

const authScreen = document.querySelector("#authScreen");
const appScreen = document.querySelector("#appScreen");
const authTitle = document.querySelector("#authTitle");
const calendarOverlay = document.querySelector("#calendarOverlay");
const calendarGrid = document.querySelector("#calendarGrid");
const monthTitle = document.querySelector("#monthTitle");
const selectedDateTitle = document.querySelector("#selectedDateTitle");
const weekStrip = document.querySelector("#weekStrip");
const weekTitle = document.querySelector("#weekTitle");
const pageCalendarGrid = document.querySelector("#pageCalendarGrid");
const pageMonthTitle = document.querySelector("#pageMonthTitle");
const taskForm = document.querySelector("#taskForm");
const taskTitle = document.querySelector("#taskTitle");
const taskXp = document.querySelector("#taskXp");
const taskRepeat = document.querySelector("#taskRepeat");
const taskSubmitButton = taskForm.querySelector("button[type='submit']");
const taskList = document.querySelector("#taskList");
const emptyState = document.querySelector("#emptyState");
const taskDateText = document.querySelector("#taskDateText");
const suggestionList = document.querySelector("#suggestionList");
const rewardForm = document.querySelector("#rewardForm");
const rewardLevel = document.querySelector("#rewardLevel");
const rewardTitle = document.querySelector("#rewardTitle");
const rewardList = document.querySelector("#rewardList");
const rewardSuggestionList = document.querySelector("#rewardSuggestionList");
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
const appToast = document.querySelector("#appToast");
const toastTitle = document.querySelector("#toastTitle");
const toastBody = document.querySelector("#toastBody");
const themeToggleButton = document.querySelector("#themeToggleButton");
const themeIcon = document.querySelector("#themeIcon");
const menuToggleButton = document.querySelector("#menuToggleButton");
const closeMenuButton = document.querySelector("#closeMenuButton");
const sideMenuOverlay = document.querySelector("#sideMenuOverlay");
const achievementCount = document.querySelector("#achievementCount");
const achievementList = document.querySelector("#achievementList");
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
const menuItems = document.querySelectorAll("[data-view]");
const tasksView = document.querySelector("#tasksView");
const calendarView = document.querySelector("#calendarView");
const statsView = document.querySelector("#statsView");
const profileView = document.querySelector("#profileView");
const profileNameTitle = document.querySelector("#profileNameTitle");
const editNameButton = document.querySelector("#editNameButton");
const statsPeriod = document.querySelector("#statsPeriod");
const statsTitle = document.querySelector("#statsTitle");
const statsDone = document.querySelector("#statsDone");
const statsStreak = document.querySelector("#statsStreak");
const statsCompletion = document.querySelector("#statsCompletion");
const statsChart = document.querySelector("#statsChart");
const topDoneList = document.querySelector("#topDoneList");
const topMissedList = document.querySelector("#topMissedList");
const expensesView = document.querySelector("#expensesView");
const expensesTitle = document.querySelector("#expensesTitle");
const expenseMonth = document.querySelector("#expenseMonth");
const salaryForm = document.querySelector("#salaryForm");
const salaryInput = document.querySelector("#salaryInput");
const resetIncomeButton = document.querySelector("#resetIncomeButton");
const budgetForm = document.querySelector("#budgetForm");
const budgetInput = document.querySelector("#budgetInput");
const savingsGoalForm = document.querySelector("#savingsGoalForm");
const savingsGoalInput = document.querySelector("#savingsGoalInput");
const savingsGoalStatus = document.querySelector("#savingsGoalStatus");
const savingsGoalPercent = document.querySelector("#savingsGoalPercent");
const savingsGoalBar = document.querySelector("#savingsGoalBar");
const salaryTotal = document.querySelector("#salaryTotal");
const spentTotal = document.querySelector("#spentTotal");
const savedTotal = document.querySelector("#savedTotal");
const budgetLeftTotal = document.querySelector("#budgetLeftTotal");
const budgetStatusText = document.querySelector("#budgetStatusText");
const budgetHintText = document.querySelector("#budgetHintText");
const budgetBar = document.querySelector("#budgetBar");
const expenseForm = document.querySelector("#expenseForm");
const expenseTitle = document.querySelector("#expenseTitle");
const expenseCategory = document.querySelector("#expenseCategory");
const expenseAmount = document.querySelector("#expenseAmount");
const expenseSubmitButton = expenseForm.querySelector("button[type='submit']");
const expenseList = document.querySelector("#expenseList");
const expenseEmptyState = document.querySelector("#expenseEmptyState");
const categoryChart = document.querySelector("#categoryChart");
const topExpenseCategory = document.querySelector("#topExpenseCategory");
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

document.querySelector("#prevPageMonth").addEventListener("click", () => {
  visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
  render();
});

document.querySelector("#nextPageMonth").addEventListener("click", () => {
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

const openCalendarButton = document.querySelector("#openCalendar");
if (openCalendarButton) {
  openCalendarButton.addEventListener("click", () => {
    calendarOverlay.hidden = false;
  });
}

document.querySelector("#closeCalendar").addEventListener("click", () => {
  calendarOverlay.hidden = true;
});

calendarOverlay.addEventListener("click", (event) => {
  if (event.target === calendarOverlay) calendarOverlay.hidden = true;
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    calendarOverlay.hidden = true;
    closeSideMenu();
  }
});

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = taskTitle.value.trim();
  const xp = clamp(Number(taskXp.value), 5, MAX_TASK_XP);

  if (!title) return;

  if (editingTaskId) {
    const task = state.tasks.find((item) => item.id === editingTaskId);
    if (task) {
      task.title = title;
      task.xp = xp;
    }
    editingTaskId = null;
  } else {
    const dates = getRepeatDates(taskRepeat.value);
    for (const date of dates) addTask({ date, title, xp });
  }

  taskForm.reset();
  taskXp.value = "20";
  taskRepeat.value = "day";
  taskRepeat.disabled = false;
  taskTitle.focus();
  saveState();
  render();
});

rewardForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const level = Number(rewardLevel.value);
  const title = rewardTitle.value.trim();

  if (!title) return;

  saveReward(level, title);
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
menuItems.forEach((item) => {
  item.addEventListener("click", () => {
    setActiveView(item.dataset.view);
    if (item.classList.contains("menu-item")) closeSideMenu();
  });
});
menuToggleButton.addEventListener("click", () => openSideMenu());
closeMenuButton.addEventListener("click", () => closeSideMenu());
sideMenuOverlay.addEventListener("click", (event) => {
  if (event.target === sideMenuOverlay) closeSideMenu();
});
statsPeriod.addEventListener("change", () => renderStats());
expenseMonth.addEventListener("change", () => {
  selectedExpenseMonth = expenseMonth.value || getMonthKey(new Date());
  renderExpenses();
});
salaryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const income = parseMoneyInput(salaryInput.value);
  if (income <= 0) return;

  state.monthlyIncome[selectedExpenseMonth] = (state.monthlyIncome[selectedExpenseMonth] || 0) + income;
  salaryForm.reset();
  salaryInput.focus();
  saveState();
  renderExpenses();
});
resetIncomeButton.addEventListener("click", () => {
  state.monthlyIncome[selectedExpenseMonth] = 0;
  salaryForm.reset();
  saveState();
  renderExpenses();
});
budgetForm.addEventListener("submit", (event) => {
  event.preventDefault();
  state.monthlyBudgets[selectedExpenseMonth] = parseMoneyInput(budgetInput.value);
  budgetForm.reset();
  saveState();
  renderExpenses();
});
savingsGoalForm.addEventListener("submit", (event) => {
  event.preventDefault();
  state.monthlySavingsGoals[selectedExpenseMonth] = parseMoneyInput(savingsGoalInput.value);
  savingsGoalForm.reset();
  saveState();
  renderExpenses();
});
expenseForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = expenseTitle.value.trim();
  const amount = parseMoneyInput(expenseAmount.value);
  if (!title || amount <= 0) return;

  if (editingExpenseId) {
    const expense = state.expenses.find((item) => item.id === editingExpenseId);
    if (expense) {
      expense.title = title;
      expense.amount = amount;
      expense.category = expenseCategory.value || "other";
    }
    editingExpenseId = null;
  } else {
    state.expenses.push({
      id: createId(),
      month: selectedExpenseMonth,
      title,
      amount,
      category: expenseCategory.value || "other",
      createdAt: Date.now(),
    });
  }

  expenseForm.reset();
  expenseTitle.focus();
  saveState();
  renderExpenses();
});
editNameButton.addEventListener("click", () => {
  profileOverlay.hidden = false;
  profileName.value = state.settings.displayName || "";
  profileName.focus();
});
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
    achievements: [],
    expenses: [],
    monthlyIncome: {},
    monthlyBudgets: {},
    monthlySavingsGoals: {},
    settings: getDefaultSettings(),
  };
}

function normalizeState(saved) {
  return {
    tasks: saved.tasks.map((task) => ({
      ...task,
      xp: clamp(Number(task.xp), 5, MAX_TASK_XP),
      reminder: Boolean(task.reminder),
    })),
    rewards: Array.isArray(saved.rewards)
      ? saved.rewards
          .filter((reward) => Number(reward.level) >= 2)
          .map((reward) => ({ level: Number(reward.level), title: String(reward.title || "") }))
      : [],
    achievements: Array.isArray(saved.achievements) ? saved.achievements.map(String) : [],
    expenses: Array.isArray(saved.expenses)
      ? saved.expenses
          .filter((expense) => expense && expense.month && Number(expense.amount) > 0)
          .map((expense) => ({
            id: String(expense.id || createId()),
            month: String(expense.month).slice(0, 7),
            title: String(expense.title || "Gasto"),
            amount: Math.max(0, Number(expense.amount) || 0),
            category: getExpenseCategory(expense.category).id,
            createdAt: Number(expense.createdAt) || Date.now(),
          }))
      : [],
    monthlyIncome: normalizeMonthlyIncome(saved.monthlyIncome),
    monthlyBudgets: normalizeMonthlyIncome(saved.monthlyBudgets),
    monthlySavingsGoals: normalizeMonthlyIncome(saved.monthlySavingsGoals),
    settings: {
      ...getDefaultSettings(),
      ...(saved.settings || {}),
      displayName: String(saved.settings?.displayName || "").trim(),
    },
  };
}

function normalizeMonthlyIncome(monthlyIncome) {
  if (!monthlyIncome || typeof monthlyIncome !== "object" || Array.isArray(monthlyIncome)) return {};

  return Object.fromEntries(
    Object.entries(monthlyIncome)
      .filter(([month]) => /^\d{4}-\d{2}$/.test(month))
      .map(([month, amount]) => [month, Math.max(0, Number(amount) || 0)]),
  );
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
  renderPageCalendar();
  renderTasks();
  renderSuggestions();
  updateAchievements();
  renderAchievements();
  renderProgress();
  renderRewards();
  renderNotifications();
  renderExpenseCategories();
  renderExpenses();
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
  notificationsEnabled.disabled = false;
  testNotificationButton.disabled = false;

  if (!("Notification" in window)) {
    notificationStatus.textContent = state.settings.notificationsEnabled ? "En la app" : "Apagados";
    scheduleReminderCheck();
    return;
  }

  if (!state.settings.notificationsEnabled) {
    notificationStatus.textContent = "Apagados";
  } else if (Notification.permission === "granted") {
    notificationStatus.textContent = `Cada ${formatInterval(state.settings.notificationIntervalMinutes)}`;
  } else if (Notification.permission === "denied") {
    notificationStatus.textContent = "En la app";
  } else {
    notificationStatus.textContent = "Pedir permiso";
  }

  scheduleReminderCheck();
}

function renderHeader() {
  const name = state.settings.displayName || "vos";
  const titles = {
    tasks: `Hola ${name}, que hacemos hoy?`,
    stats: "Estadisticas",
    expenses: "Gastos del mes",
    profile: "Perfil",
    calendar: "Calendario",
  };
  selectedDateTitle.textContent = titles[activeView] || titles.tasks;
  profileNameTitle.textContent = name;
  taskDateText.textContent = formatSelectedDate(selectedDate);
  monthTitle.textContent = visibleMonth.toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });
  pageMonthTitle.textContent = monthTitle.textContent;
}

function renderView() {
  tasksView.hidden = activeView !== "tasks";
  calendarView.hidden = activeView !== "calendar";
  statsView.hidden = activeView !== "stats";
  expensesView.hidden = activeView !== "expenses";
  profileView.hidden = activeView !== "profile";
  menuItems.forEach((item) => {
    item.classList.toggle("active", item.dataset.view === activeView);
  });
}

function openSideMenu() {
  sideMenuOverlay.hidden = false;
}

function closeSideMenu() {
  sideMenuOverlay.hidden = true;
}

function setActiveView(view) {
  activeView = view;
  renderHeader();
  renderView();
  if (view === "stats") renderStats();
  if (view === "expenses") renderExpenses();
  if (view === "calendar") renderPageCalendar();
}

function renderProfilePrompt() {
  if (DEMO_MODE) {
    profileOverlay.hidden = true;
    return;
  }

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

function renderPageCalendar() {
  pageCalendarGrid.innerHTML = "";
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
      setActiveView("tasks");
    });

    pageCalendarGrid.appendChild(button);
  }
}

function renderTasks() {
  const tasks = getSelectedTasks();
  taskList.innerHTML = "";
  emptyState.classList.toggle("hidden", tasks.length > 0);
  taskSubmitButton.textContent = editingTaskId ? "Guardar" : "Agregar";

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

    const reminderButton = document.createElement("button");
    reminderButton.type = "button";
    reminderButton.className = `reminder-button${task.reminder ? " active" : ""}`;
    reminderButton.title = task.reminder ? "Quitar recordatorio" : "Recordar esta tarea";
    reminderButton.setAttribute("aria-label", reminderButton.title);
    reminderButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 21h4M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/></svg>';
    reminderButton.addEventListener("click", () => toggleTaskReminder(task));

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "edit-button";
    editButton.title = "Editar";
    editButton.setAttribute("aria-label", "Editar tarea");
    editButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"/></svg>';
    editButton.addEventListener("click", () => startEditTask(task));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-button";
    deleteButton.title = "Eliminar";
    deleteButton.setAttribute("aria-label", "Eliminar tarea");
    deleteButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M10 11v6M14 11v6M6 6l1 15h10l1-15"/></svg>';
    deleteButton.addEventListener("click", () => {
      const index = state.tasks.findIndex((itemToFind) => itemToFind.id === task.id);
      if (index >= 0) state.tasks.splice(index, 1);
      if (editingTaskId === task.id) editingTaskId = null;
      saveState();
      render();
    });

    item.append(checkButton, title, xp, reminderButton, editButton, deleteButton);
    taskList.appendChild(item);
  }

  const completed = tasks.filter((task) => task.completed);
  completedCount.textContent = completed.length;
  pendingCount.textContent = tasks.length - completed.length;
  dayXp.textContent = completed.reduce((total, task) => total + task.xp, 0);
}

function renderSuggestions() {
  suggestionList.innerHTML = "";
  const suggestions = getTaskSuggestions();

  for (const suggestion of suggestions) {
    const item = document.createElement("li");
    item.className = "suggestion-item";

    const text = document.createElement("span");
    text.textContent = suggestion.title;

    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "add-suggestion-button";
    addButton.title = "Agregar tarea";
    addButton.setAttribute("aria-label", `Agregar ${suggestion.title}`);
    addButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
    addButton.addEventListener("click", () => {
      addTask({ date: selectedDate, title: suggestion.title, xp: suggestion.xp });
      saveState();
      render();
    });

    item.append(text, addButton);
    suggestionList.appendChild(item);
  }
}

function startEditTask(task) {
  editingTaskId = task.id;
  taskTitle.value = task.title;
  taskXp.value = String(task.xp);
  taskRepeat.value = "day";
  taskRepeat.disabled = true;
  taskSubmitButton.textContent = "Guardar";
  taskTitle.focus();
}

function startEditExpense(expense) {
  editingExpenseId = expense.id;
  expenseTitle.value = expense.title;
  expenseCategory.value = getExpenseCategory(expense.category).id;
  expenseAmount.value = String(expense.amount);
  expenseSubmitButton.textContent = "Guardar";
  expenseTitle.focus();
}

function updateAchievements() {
  let changed = false;
  const unlockedTitles = [];

  for (const achievement of ACHIEVEMENTS) {
    if (state.achievements.includes(achievement.id)) continue;
    if (!achievement.isUnlocked()) continue;
    state.achievements.push(achievement.id);
    unlockedTitles.push(`${achievement.title} (+${achievement.xp} XP)`);
    changed = true;
  }

  if (changed) {
    saveState();
    showToast("Logro desbloqueado", unlockedTitles.join(", "));
  }
}

function renderAchievements() {
  achievementList.innerHTML = "";
  achievementCount.textContent = `${state.achievements.length} / ${ACHIEVEMENTS.length}`;

  for (const achievement of ACHIEVEMENTS) {
    const unlocked = state.achievements.includes(achievement.id);
    const item = document.createElement("li");
    item.className = `achievement-item ${achievement.difficulty}${unlocked ? " unlocked" : ""}`;

    item.innerHTML = `
      <span class="achievement-trophy" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M8 4h8v3a4 4 0 0 1-8 0V4Z"/><path d="M8 6H5a2 2 0 0 0 2 5h1M16 6h3a2 2 0 0 1-2 5h-1M12 11v5M9 20h6M10 16h4"/></svg>
      </span>
      <div>
        <strong>${achievement.title}</strong>
        <small>${achievement.description}</small>
      </div>
      <b>${achievement.xp} XP</b>
    `;
    achievementList.appendChild(item);
  }
}

function renderStats() {
  const range = getStatsRange(statsPeriod.value);
  const todayKey = toDateKey(new Date());
  const rangeTasks = state.tasks.filter((task) => task.date >= range.startKey && task.date <= range.endKey);
  const countedTasks = rangeTasks.filter((task) => task.completed || task.date < todayKey);
  const completed = countedTasks.filter((task) => task.completed);
  const missed = countedTasks.filter((task) => !task.completed);
  const wonXp = completed.reduce((total, task) => total + task.xp, 0);
  const lostXp = missed.reduce((total, task) => total + task.xp, 0);
  const totalCountable = completed.length + missed.length;
  const completionRate = totalCountable > 0 ? Math.round((completed.length / totalCountable) * 100) : 0;

  statsTitle.textContent = statsPeriod.value === "30" ? "Ultimos 30 dias" : "Ultimos 7 dias";
  statsDone.textContent = completed.length;
  statsStreak.textContent = getCurrentStreak();
  statsCompletion.textContent = `${completionRate}%`;
  renderXpChart(wonXp, lostXp);

  const groups = getTaskStats(countedTasks);
  renderTaskInsightList(topDoneList, groups.filter((item) => item.done > 0), "done");
  renderTaskInsightList(topMissedList, groups.filter((item) => item.missed > 0), "missed");
}

function renderXpChart(wonXp, lostXp) {
  const maxXp = Math.max(wonXp, lostXp, 1);
  statsChart.innerHTML = "";

  for (const item of [
    { label: "XP ganada", value: wonXp, type: "won" },
    { label: "XP perdida", value: lostXp, type: "lost" },
  ]) {
    const row = document.createElement("div");
    row.className = `xp-chart-row ${item.type}`;
    row.innerHTML = `
      <div class="xp-chart-meta">
        <span>${item.label}</span>
        <strong>${item.value}</strong>
      </div>
      <div class="xp-chart-track">
        <div class="xp-chart-fill" style="width: ${(item.value / maxXp) * 100}%"></div>
      </div>
    `;
    statsChart.appendChild(row);
  }
}

function renderTaskInsightList(list, items, type) {
  list.innerHTML = "";
  const sortedItems = [...items]
    .sort((first, second) => second[type] - first[type] || first.title.localeCompare(second.title, "es"))
    .slice(0, 5);

  if (sortedItems.length === 0) {
    const empty = document.createElement("li");
    empty.className = "stats-empty";
    empty.textContent = "Todavia no hay datos.";
    list.appendChild(empty);
    return;
  }

  for (const item of sortedItems) {
    const row = document.createElement("li");
    row.className = "stats-item simple";
    row.innerHTML = `<strong>${item.title}</strong><span>${item[type]} veces</span>`;
    list.appendChild(row);
  }
}

function renderExpenses() {
  expenseMonth.value = selectedExpenseMonth;
  expensesTitle.textContent = formatMonthLabel(selectedExpenseMonth);
  expenseSubmitButton.textContent = editingExpenseId ? "Guardar" : "Agregar gasto";

  const monthlyExpenses = getMonthlyExpenses();
  const salary = state.monthlyIncome[selectedExpenseMonth] || 0;
  const budget = state.monthlyBudgets[selectedExpenseMonth] || 0;
  const savingsGoal = state.monthlySavingsGoals[selectedExpenseMonth] || 0;
  const spent = monthlyExpenses.reduce((total, expense) => total + expense.amount, 0);
  const saved = salary - spent;
  const budgetLeft = budget - spent;

  renderSavingsGoal(savingsGoal, saved);
  budgetInput.placeholder = budget ? `Actual: ${formatMoney(budget)}` : "Ej: 300000";
  salaryTotal.textContent = formatMoney(salary);
  spentTotal.textContent = formatMoney(spent);
  savedTotal.textContent = formatMoney(saved);
  savedTotal.classList.toggle("negative", saved < 0);
  budgetLeftTotal.textContent = budget ? formatMoney(budgetLeft) : "Sin limite";
  budgetLeftTotal.classList.toggle("negative", budget > 0 && budgetLeft < 0);
  renderBudgetStatus(budget, spent);
  renderCategoryChart(monthlyExpenses, spent);

  expenseList.innerHTML = "";
  expenseEmptyState.classList.toggle("hidden", monthlyExpenses.length > 0);

  for (const expense of monthlyExpenses) {
    const item = document.createElement("li");
    item.className = "expense-item";

    const content = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = expense.title;
    const meta = document.createElement("small");
    meta.textContent = `${getExpenseCategory(expense.category).label} · ${formatExpenseDate(expense.createdAt)}`;
    content.append(title, meta);

    const amount = document.createElement("span");
    amount.textContent = formatMoney(expense.amount);

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "edit-button compact";
    editButton.setAttribute("aria-label", `Editar ${expense.title}`);
    editButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"/></svg>';
    editButton.addEventListener("click", () => startEditExpense(expense));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-button compact";
    deleteButton.setAttribute("aria-label", `Eliminar ${expense.title}`);
    deleteButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M10 11v6M14 11v6M6 6l1 15h10l1-15"/></svg>';
    deleteButton.addEventListener("click", () => {
      const index = state.expenses.findIndex((itemToFind) => itemToFind.id === expense.id);
      if (index >= 0) state.expenses.splice(index, 1);
      if (editingExpenseId === expense.id) editingExpenseId = null;
      saveState();
      renderExpenses();
    });

    item.append(content, amount, editButton, deleteButton);
    expenseList.appendChild(item);
  }
}

function renderSavingsGoal(goal, saved) {
  savingsGoalInput.placeholder = goal ? `Actual: ${formatMoney(goal)}` : "Ej: 100000";

  if (!goal) {
    savingsGoalStatus.textContent = "Sin meta definida";
    savingsGoalPercent.textContent = "0%";
    savingsGoalBar.style.width = "0%";
    savingsGoalBar.classList.remove("warning", "danger");
    return;
  }

  const percentage = Math.max(0, Math.round((saved / goal) * 100));
  savingsGoalPercent.textContent = `${percentage}%`;
  savingsGoalStatus.textContent =
    saved >= goal ? `Meta cumplida: ${formatMoney(saved)}` : `Ahorrado: ${formatMoney(Math.max(saved, 0))} de ${formatMoney(goal)}`;
  savingsGoalBar.style.width = `${clamp(percentage, 0, 100)}%`;
  savingsGoalBar.classList.toggle("warning", percentage >= 75 && percentage < 100);
  savingsGoalBar.classList.toggle("danger", saved < 0);
}

function renderExpenseCategories() {
  const currentValue = expenseCategory.value || "other";
  expenseCategory.innerHTML = "";

  for (const category of EXPENSE_CATEGORIES) {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = category.label;
    expenseCategory.appendChild(option);
  }

  expenseCategory.value = getExpenseCategory(currentValue).id;
}

function renderBudgetStatus(budget, spent) {
  if (!budget) {
    budgetStatusText.textContent = "Sin presupuesto definido";
    budgetHintText.textContent = "Agrega un limite para controlar mejor tus gastos.";
    budgetBar.style.width = "0%";
    budgetBar.classList.remove("warning", "danger");
    return;
  }

  const percentage = Math.round((spent / budget) * 100);
  const capped = clamp(percentage, 0, 100);
  budgetBar.style.width = `${capped}%`;
  budgetBar.classList.toggle("warning", percentage >= 75 && percentage < 100);
  budgetBar.classList.toggle("danger", percentage >= 100);
  budgetStatusText.textContent = `Usaste ${percentage}% del presupuesto`;
  budgetHintText.textContent =
    spent <= budget
      ? `Todavia podes gastar ${formatMoney(budget - spent)}.`
      : `Te pasaste por ${formatMoney(spent - budget)}.`;
}

function renderCategoryChart(expenses, spent) {
  categoryChart.innerHTML = "";

  if (expenses.length === 0 || spent <= 0) {
    topExpenseCategory.textContent = "Sin gastos";
    const empty = document.createElement("p");
    empty.className = "stats-empty";
    empty.textContent = "Todavia no hay categorias para mostrar.";
    categoryChart.appendChild(empty);
    return;
  }

  const totals = EXPENSE_CATEGORIES.map((category) => ({
    ...category,
    total: expenses
      .filter((expense) => getExpenseCategory(expense.category).id === category.id)
      .reduce((total, expense) => total + expense.amount, 0),
  })).filter((category) => category.total > 0);

  totals.sort((first, second) => second.total - first.total);
  topExpenseCategory.textContent = totals[0].label;

  for (const category of totals) {
    const percentage = Math.round((category.total / spent) * 100);
    const row = document.createElement("div");
    row.className = "category-row";
    row.innerHTML = `
      <div class="category-meta">
        <strong>${category.label}</strong>
        <span>${formatMoney(category.total)} · ${percentage}%</span>
      </div>
      <div class="category-track"><div class="category-fill" style="width: ${percentage}%"></div></div>
    `;
    categoryChart.appendChild(row);
  }
}

function renderProgress() {
  const level = getCurrentLevel();
  const totalXp = getTotalXp();
  const levelXp = totalXp % XP_PER_LEVEL;

  levelLabel.textContent = `Nivel ${level}`;
  xpLabel.textContent = `${levelXp} / ${XP_PER_LEVEL} XP`;
  xpBar.style.width = `${levelXp}%`;
  nextRewardText.textContent = getNextRewardText(level);
  maybeShowLevelUp(level);
}

function renderRewards() {
  const currentLevel = getCurrentLevel();
  rewardLevel.innerHTML = "";
  for (let level = Math.max(2, currentLevel + 1); level <= 100; level += 1) {
    const option = document.createElement("option");
    option.value = level;
    option.textContent = `Nivel ${level}`;
    rewardLevel.appendChild(option);
  }

  rewardList.innerHTML = "";
  rewardSuggestionList.innerHTML = "";
  renderRewardSuggestions();
  const rewards = [...state.rewards]
    .filter((reward) => reward.level > currentLevel)
    .sort((first, second) => first.level - second.level);

  if (rewards.length === 0) {
    const empty = document.createElement("li");
    empty.className = "reward-empty";
    empty.textContent = "No hay premios pendientes.";
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

function renderRewardSuggestions() {
  const usedRewards = new Set(state.rewards.map((reward) => reward.title.trim().toLowerCase()));

  for (const suggestion of REWARD_SUGGESTIONS.filter((item) => !usedRewards.has(item.toLowerCase()))) {
    const item = document.createElement("li");
    item.className = "suggestion-item";

    const text = document.createElement("span");
    text.textContent = suggestion;

    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "add-suggestion-button";
    addButton.title = "Agregar premio";
    addButton.setAttribute("aria-label", `Agregar ${suggestion}`);
    addButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
    addButton.addEventListener("click", () => {
      saveReward(Number(rewardLevel.value), suggestion);
      rewardTitle.value = "";
      saveState();
      render();
    });

    item.append(text, addButton);
    rewardSuggestionList.appendChild(item);
  }
}

function saveReward(level, title) {
  const existingReward = state.rewards.find((reward) => reward.level === level);
  if (existingReward) {
    existingReward.title = title;
  } else {
    state.rewards.push({ level, title });
  }
}

function getSelectedTasks() {
  return state.tasks
    .filter((task) => task.date === selectedDate)
    .sort((first, second) => first.createdAt - second.createdAt);
}

function getTaskSuggestions() {
  const selectedTitles = new Set(getSelectedTasks().map((task) => normalizeTaskTitle(task.title)));
  const suggestions = new Map();

  for (const suggestion of GENERIC_SUGGESTIONS) {
    suggestions.set(normalizeTaskTitle(suggestion.title), suggestion);
  }

  const previousTasks = [...state.tasks]
    .filter((task) => task.date < selectedDate)
    .sort((first, second) => second.createdAt - first.createdAt);

  for (const task of previousTasks) {
    const key = normalizeTaskTitle(task.title);
    if (!key || suggestions.has(key)) continue;
    suggestions.set(key, { title: task.title, xp: task.xp });
  }

  return [...suggestions.values()]
    .filter((suggestion) => !selectedTitles.has(normalizeTaskTitle(suggestion.title)))
    .slice(0, 8);
}

function normalizeTaskTitle(title) {
  return String(title || "").trim().toLowerCase();
}

async function toggleTaskReminder(task) {
  task.reminder = !task.reminder;

  if (task.reminder) {
    state.settings.notificationsEnabled = true;
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  }

  saveState();
  render();
}

function getCompletedTasks() {
  return state.tasks.filter((task) => task.completed);
}

function getTaskXp() {
  return getCompletedTasks().reduce((total, task) => total + task.xp, 0);
}

function getAchievementXp() {
  return ACHIEVEMENTS.filter((achievement) => state.achievements.includes(achievement.id)).reduce(
    (total, achievement) => total + achievement.xp,
    0,
  );
}

function getTotalXp() {
  return getTaskXp() + getAchievementXp();
}

function getCurrentLevel() {
  return Math.floor(getTotalXp() / XP_PER_LEVEL) + 1;
}

function getCompletedDayCount() {
  return new Set(getCompletedTasks().map((task) => task.date)).size;
}

function getCurrentStreak() {
  const completedDays = new Set(getCompletedTasks().map((task) => task.date));
  let streak = 0;
  const date = new Date();

  while (completedDays.has(toDateKey(date))) {
    streak += 1;
    date.setDate(date.getDate() - 1);
  }

  return streak;
}

function hasPerfectDay() {
  return getPerfectDayCount() > 0;
}

function getPerfectDayCount() {
  const tasksByDate = new Map();

  for (const task of state.tasks) {
    if (!tasksByDate.has(task.date)) tasksByDate.set(task.date, []);
    tasksByDate.get(task.date).push(task);
  }

  return [...tasksByDate.values()].filter((tasks) => tasks.length > 0 && tasks.every((task) => task.completed)).length;
}

function getUsedExpenseCategoryCount() {
  return new Set(state.expenses.map((expense) => getExpenseCategory(expense.category).id)).size;
}

function hasReachedSavingsGoal() {
  return Object.entries(state.monthlySavingsGoals).some(([month, goal]) => {
    if (!goal) return false;
    const income = state.monthlyIncome[month] || 0;
    const spent = state.expenses
      .filter((expense) => expense.month === month)
      .reduce((total, expense) => total + expense.amount, 0);
    return income - spent >= goal;
  });
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
    reminder: false,
    createdAt: Date.now() + state.tasks.length,
  });
}

function seedDemoData() {
  if (!DEMO_MODE || state.settings.demoSeeded) return;

  const today = new Date();
  const demoTasks = [
    ["Tomar agua", 5, [0, 1, 2, 3, 4, 5, 6], [0, 1, 2, 3, 5, 6]],
    ["Leer 10 minutos", 15, [0, 1, 2, 4, 6], [0, 2, 4]],
    ["Caminar 15 minutos", 15, [0, 1, 3, 5], [1, 3]],
    ["Ordenar un espacio", 10, [0, 2, 5], [0, 5]],
  ];

  for (const [title, xp, days, completedDays] of demoTasks) {
    for (const offset of days) {
      const date = new Date(today);
      date.setDate(today.getDate() - offset);
      const key = toDateKey(date);
      const completed = completedDays.includes(offset);
      const alreadyExists = state.tasks.some((task) => task.date === key && normalizeTaskTitle(task.title) === normalizeTaskTitle(title));
      if (alreadyExists) continue;
      state.tasks.push({
        id: createId(),
        date: key,
        title,
        xp,
        completed,
        reminder: offset === 0 && !completed,
        createdAt: Date.now() - offset * 86400000 + state.tasks.length,
      });
    }
  }

  state.rewards = state.rewards.length
    ? state.rewards
    : [
        { level: 2, title: "Cafe rico" },
        { level: 3, title: "Capitulo de serie" },
      ];
  state.settings.demoSeeded = true;
}

function getRepeatDates(mode) {
  if (mode === "week") return getCurrentWeekKeys();
  if (mode === "30days") return getNextDaysKeys(30);
  return [selectedDate];
}

function getStatsRange(period) {
  const days = period === "30" ? 30 : 7;
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));
  return { startKey: toDateKey(start), endKey: toDateKey(end) };
}

function getMonthlyExpenses() {
  return state.expenses
    .filter((expense) => expense.month === selectedExpenseMonth)
    .sort((first, second) => second.createdAt - first.createdAt);
}

function getExpenseCategory(id) {
  return EXPENSE_CATEGORIES.find((category) => category.id === id) || EXPENSE_CATEGORIES.at(-1);
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

function getMonthKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function parseDateKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function parseMonthKey(key) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1);
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

function formatMonthLabel(key) {
  return parseMonthKey(key).toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });
}

function formatExpenseDate(timestamp) {
  return new Date(timestamp).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
  });
}

function formatMoney(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function parseMoneyInput(value) {
  const normalized = String(value || "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  return Math.max(0, Number(normalized) || 0);
}

function clamp(value, min, max) {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function initCloudSync() {
  if (DEMO_MODE) {
    currentUser = { id: "demo-local", email: "demo@ritmo.local" };
    cloudReady = false;
    if (!state.settings.displayName) state.settings.displayName = "Demo";
    seedDemoData();
    saveState();
    render();
    showToast("Modo prueba", "Estas viendo la app sin iniciar sesion.");
    return;
  }

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
  if (DEMO_MODE) {
    showToast("Modo prueba", "En esta vista local no hace falta cerrar sesion.");
    return;
  }

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
    state.achievements = cloudState.achievements;
    state.expenses = cloudState.expenses;
    state.monthlyIncome = cloudState.monthlyIncome;
    state.monthlyBudgets = cloudState.monthlyBudgets;
    state.monthlySavingsGoals = cloudState.monthlySavingsGoals;
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
      achievements: state.achievements,
      expenses: state.expenses,
      monthlyIncome: state.monthlyIncome,
      monthlyBudgets: state.monthlyBudgets,
      monthlySavingsGoals: state.monthlySavingsGoals,
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
  if (!state.settings.notificationsEnabled) return;

  reminderTimer = setInterval(() => {
    showPendingTaskNotification(false);
  }, 60 * 1000);
}

function showPendingTaskNotification(force) {
  const pendingTasks = state.tasks.filter(
    (task) => task.date === toDateKey(new Date()) && !task.completed && task.reminder,
  );
  if (pendingTasks.length === 0) {
    if (force) {
      sendReminder("Ritmo Diario", "No tienes tareas con campanita activa para hoy.");
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
  sendReminder("Tareas pendientes", `${nextTask.title}${extra}.`);
}

async function testNotification() {
  if ("Notification" in window && Notification.permission === "default") {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      showToast("Recordatorios en la app", "El navegador no habilito notificaciones del sistema.");
    }
  } else if (!("Notification" in window)) {
    showToast("Recordatorios en la app", "Este navegador no permite notificaciones del sistema.");
  }

  showPendingTaskNotification(true);

  renderNotifications();
}

function sendReminder(title, body) {
  let browserNotificationShown = false;

  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(title, {
        body,
        tag: "ritmo-diario-reminder",
        renotify: true,
      });
      browserNotificationShown = true;
    } catch {
      browserNotificationShown = false;
    }
  }

  showToast(browserNotificationShown ? "Recordatorio enviado" : title, browserNotificationShown ? body : body);
}

function showToast(title, body) {
  clearTimeout(toastTimer);
  toastTitle.textContent = title;
  toastBody.textContent = body;
  appToast.hidden = false;
  toastTimer = setTimeout(() => {
    appToast.hidden = true;
  }, 5200);
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
