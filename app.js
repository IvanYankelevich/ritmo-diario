const STORAGE_KEY = "ritmo-diario-state";
const XP_PER_LEVEL = 100;
const MAX_TASK_XP = 30;

const state = loadState();
let selectedDate = toDateKey(new Date());
let visibleMonth = new Date();

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
const levelLabel = document.querySelector("#levelLabel");
const xpLabel = document.querySelector("#xpLabel");
const xpBar = document.querySelector("#xpBar");
const nextRewardText = document.querySelector("#nextRewardText");
const completedCount = document.querySelector("#completedCount");
const pendingCount = document.querySelector("#pendingCount");
const dayXp = document.querySelector("#dayXp");

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
          .filter((reward) => Number(reward.level) % 5 === 0)
          .map((reward) => ({ level: Number(reward.level), title: String(reward.title || "") }))
      : [],
  };
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // The app still works during the session if browser storage is blocked.
  }
}

function render() {
  renderHeader();
  renderWeek();
  renderCalendar();
  renderTasks();
  renderProgress();
  renderRewards();
}

function renderHeader() {
  selectedDateTitle.textContent = formatSelectedDate(selectedDate);
  taskDateText.textContent = formatSelectedDate(selectedDate);
  monthTitle.textContent = visibleMonth.toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });
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
}

function renderRewards() {
  rewardLevel.innerHTML = "";
  for (let level = 5; level <= 100; level += 5) {
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
  const nextRewardLevel = Math.ceil((level + 1) / 5) * 5;
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

render();
