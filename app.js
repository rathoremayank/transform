(() => {
  "use strict";

  const STORAGE_KEY = "form-transform-tracker-v1";
  const THEME_STORAGE_KEY = "form-transform-theme-v1";
  const today = new Date();
  let selectedDate = new Date(today);
  const dateKey = (date) => {
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 10);
  };
  const todayKey = dateKey(today);
  let selectedDateKey = todayKey;
  const formatDate = (date, options) => new Intl.DateTimeFormat(undefined, options).format(date);
  const dateFromKey = (key) => new Date(`${key}T12:00:00`);
  const createId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const weeklyNutritionPlan = window.weeklyNutritionPlan;
  const weeklyRoutine = {
    0: {
      session: "Shoulders / Arms / Core",
      exercises: [
        ["Lateral Raises (heavy + drop set)", "4 x 12-20"],
        ["Rear Delt Fly", "3 x 15"],
        ["Barbell/EZ Curl", "3 x 8-10"],
        ["Overhead Triceps Extension", "3 x 10-12"],
        ["Hanging Knee Raise", "3 x 12"],
        ["Plank", "3 x 45 s"]
      ]
    },
    1: {
      session: "Push",
      exercises: [
        ["Flat Barbell/DB Bench Press", "4 x 6-8"],
        ["Incline (30°) Cable/DB Fly", "3 x 10-12"],
        ["Seated DB Shoulder Press", "3 x 8-10"],
        ["Lateral Raises", "4 x 12-15"],
        ["Triceps Pushdown", "3 x 10-12"]
      ]
    },
    2: {
      session: "Pull",
      exercises: [
        ["Lat Pulldown / Pull-ups", "4 x 6-10"],
        ["Barbell/Chest-Supported Row", "4 x 8-10"],
        ["Seated Cable Row", "3 x 10-12"],
        ["Face Pulls", "3 x 15"],
        ["Incline DB Curl", "3 x 10-12"]
      ]
    },
    3: { session: "Rest", exercises: [["Daily steps", "8-10k steps"]] },
    4: { session: "Rest", exercises: [["Daily steps", "8-10k steps"]] },
    5: { session: "Rest", exercises: [["Daily steps", "8-10k steps"]] },
    6: {
      session: "Legs",
      exercises: [
        ["Back Squat / Leg Press", "4 x 6-8"],
        ["Romanian Deadlift", "3 x 8-10"],
        ["Walking Lunges", "3 x 10/leg"],
        ["Leg Curl", "3 x 12"],
        ["Standing Calf Raise", "3 x 12-15"]
      ]
    }
  };

  function loadData() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object" && parsed.days && typeof parsed.days === "object") return parsed;
      }
    } catch (error) {
      console.error("Could not load saved progress.", error);
      showToast("Saved progress could not be loaded.");
    }

    return {
      days: {
        [todayKey]: {
          exercises: [],
          meals: [],
          log: {}
        }
      }
    };
  }

  let state = loadData();
  let activeList = "exercise";
  let toastTimer;
  const byId = (id) => document.getElementById(id);
  const logDialog = byId("log-dialog");
  const entryDialog = byId("entry-dialog");

  function getDay(key = selectedDateKey) {
    if (!state.days[key]) state.days[key] = { exercises: [], meals: [], log: {} };
    const day = state.days[key];
    if (!Array.isArray(day.exercises)) day.exercises = [];
    if (!Array.isArray(day.meals)) day.meals = [];
    if (!day.log || typeof day.log !== "object") day.log = {};

    if (!day.routineSeeded) {
      const routine = weeklyRoutine[dateFromKey(key).getDay()];
      routine.exercises.forEach(([name, detail], index) => {
        day.exercises.push({
          id: `${key}-routine-${index}`,
          name,
          detail,
          done: false,
          routine: true
        });
      });
      day.routineSeeded = true;
      saveData();
    }

    if (!day.mealsPlanSeeded) {
      const starterMeals = new Set([
        "Breakfast|A balanced start",
        "Lunch|A nourishing plate",
        "Dinner|Eat well, feel good"
      ]);
      day.meals = day.meals.filter((meal) => !starterMeals.has(`${meal.name}|${meal.detail}`));
      const nutrition = weeklyNutritionPlan[dateFromKey(key).getDay()];
      nutrition.meals.forEach(([name, detail, kcal, protein], index) => {
        day.meals.push({
          id: `${key}-nutrition-${index}`,
          name,
          detail,
          kcal,
          protein,
          done: false,
          nutritionPlan: true
        });
      });
      day.mealsPlanSeeded = true;
      saveData();
    }

    return day;
  }

  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (error) {
      console.error("Could not save progress.", error);
      showToast("Could not save. Check your browser storage settings.");
      return false;
    }
  }

  function showToast(message) {
    const toast = byId("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("visible"), 2600);
  }

  function renderDate() {
    const isToday = selectedDateKey === todayKey;
    byId("header-date").textContent = formatDate(selectedDate, { weekday: "short", month: "short", day: "numeric" });
    byId("today-date").textContent = formatDate(selectedDate, { month: "short", day: "numeric", year: "numeric" });
    byId("today-date").dateTime = selectedDateKey;
    byId("today-date").parentElement.setAttribute("aria-label", `Selected day: ${formatDate(selectedDate, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}`);
    byId("go-to-today").hidden = isToday;
    const routine = weeklyRoutine[selectedDate.getDay()];
    byId("workout-session").textContent = `${formatDate(selectedDate, { weekday: "long" })} · ${routine.session} · Repeats weekly`;
    const nutrition = weeklyNutritionPlan[selectedDate.getDay()];
    byId("nutrition-day-meta").textContent = `${nutrition.dayType} · ${nutrition.training}`;
    byId("nutrition-totals").textContent = `${nutrition.totalKcal.toLocaleString()} kcal · ${nutrition.totalProtein}g protein`;
    byId("nutrition-water").textContent = nutrition.water;
  }

  function changeSelectedDate(offset) {
    selectedDate = new Date(selectedDate);
    selectedDate.setDate(selectedDate.getDate() + offset);
    selectedDateKey = dateKey(selectedDate);
    render();
  }

  function setTheme(theme, persist = true) {
    const isDark = theme === "dark";
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
    const button = byId("theme-toggle");
    button.setAttribute("aria-label", `Switch to ${isDark ? "light" : "dark"} theme`);
    button.title = `Switch to ${isDark ? "light" : "dark"} theme`;
    button.innerHTML = `<span aria-hidden="true">${isDark ? "☀" : "☾"}</span>`;
    document.querySelector('meta[name="theme-color"]').content = isDark ? "#111b2a" : "#f4f6fa";
    if (persist) {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, isDark ? "dark" : "light");
      } catch (error) {
        console.error("Could not save theme preference.", error);
        showToast("Theme changed, but your preference could not be saved.");
      }
    }
  }

  setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light", false);

  function renderList(type) {
    const day = getDay();
    const items = day[type === "exercise" ? "exercises" : "meals"];
    const list = byId(type === "exercise" ? "exercise-list" : "meal-list");
    const label = type === "exercise" ? "Exercise" : "Meal";
    list.replaceChildren();

    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "empty-plan";
      empty.innerHTML = `<span>＋</span><div>No ${type === "exercise" ? "movement" : "meals"} planned yet.<br>Add something that feels good.</div>`;
      list.append(empty);
    } else {
      items.forEach((item) => {
        const row = document.createElement("div");
        row.className = `plan-item${item.done ? " task-complete" : ""}`;
        const checkbox = document.createElement("input");
        checkbox.className = "task-check";
        checkbox.type = "checkbox";
        checkbox.checked = Boolean(item.done);
        checkbox.setAttribute("aria-label", `${item.done ? "Mark incomplete" : "Complete"} ${label.toLowerCase()}: ${item.name}`);
        checkbox.addEventListener("change", () => {
          item.done = checkbox.checked;
          saveData();
          render();
        });

        const copy = document.createElement("div");
        copy.className = "task-copy";
        const name = document.createElement("strong");
        name.textContent = item.name;
        const detail = document.createElement("span");
        detail.textContent = item.detail || (type === "exercise" ? "Movement" : "Nourishment");
        copy.append(name, detail);

        row.append(checkbox, copy);
        if (type === "meal" && Number.isFinite(item.kcal) && Number.isFinite(item.protein)) {
          const macros = document.createElement("div");
          macros.className = "meal-macros";
          const calories = document.createElement("span");
          calories.textContent = `${item.kcal} kcal`;
          const protein = document.createElement("span");
          protein.textContent = `${item.protein}g protein`;
          macros.append(calories, protein);
          row.append(macros);
        }

        const remove = document.createElement("button");
        remove.className = "task-delete";
        remove.type = "button";
        remove.textContent = "×";
        remove.setAttribute("aria-label", `Remove ${label.toLowerCase()}: ${item.name}`);
        remove.addEventListener("click", () => {
          const index = items.findIndex((entry) => entry.id === item.id);
          if (index >= 0) items.splice(index, 1);
          saveData();
          render();
          showToast(`${label} removed from the selected day's plan.`);
        });
        row.append(remove);
        list.append(row);
      });
    }

    const done = items.filter((item) => item.done).length;
    byId(type === "exercise" ? "exercise-summary" : "meal-summary").textContent = `${done} of ${items.length} completed`;
  }

  function getRecentDays(count = 30) {
    const result = [];
    for (let offset = count - 1; offset >= 0; offset -= 1) {
      const date = new Date(today);
      date.setDate(today.getDate() - offset);
      const key = dateKey(date);
      result.push({ date, key, day: state.days[key] });
    }
    return result;
  }

  function numericLogValue(log, key) {
    const value = Number(log && log[key]);
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  function renderChart(entries) {
    const chart = byId("weight-chart");
    const values = entries.map((entry) => ({ date: entry.date, value: numericLogValue(entry.log, "weight") })).filter((point) => point.value !== null);
    if (!values.length) {
      chart.innerHTML = '<div class="empty-plan"><span>⌁</span><div>Your story is still unfolding.<br>Log a check-in to see your trend.</div></div>';
      byId("chart-latest").textContent = "—";
      byId("chart-range").textContent = "Waiting for your first check-in";
      return;
    }

    const width = 560;
    const height = 118;
    const left = 25;
    const right = 550;
    const top = 12;
    const bottom = 93;
    const rawMin = Math.min(...values.map((point) => point.value));
    const rawMax = Math.max(...values.map((point) => point.value));
    const padding = Math.max((rawMax - rawMin) * 0.25, 0.5);
    const min = rawMin - padding;
    const max = rawMax + padding;
    const points = values.map((point) => {
      const x = left + (dateFromKey(dateKey(point.date)).getTime() - dateFromKey(entries[0].key).getTime()) /
        (dateFromKey(entries[entries.length - 1].key).getTime() - dateFromKey(entries[0].key).getTime() || 1) * (right - left);
      const y = bottom - ((point.value - min) / (max - min)) * (bottom - top);
      return { x, y, value: point.value, date: point.date };
    });
    const line = points.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
    const area = `${line} L${points[points.length - 1].x.toFixed(1)},${bottom} L${points[0].x.toFixed(1)},${bottom} Z`;
    const grid = [0, 0.5, 1].map((fraction) => {
      const y = top + fraction * (bottom - top);
      return `<line class="chart-grid-line" x1="${left}" y1="${y}" x2="${right}" y2="${y}"/>`;
    }).join("");
    const dots = points.map((point) => `<circle class="chart-point" cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="3.5"><title>${formatDate(point.date, { month: "short", day: "numeric" })}: ${point.value} kg</title></circle>`).join("");
    const first = formatDate(entries[0].date, { month: "short", day: "numeric" });
    const last = formatDate(entries[entries.length - 1].date, { month: "short", day: "numeric" });
    chart.innerHTML = `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#9bb9dd" stop-opacity=".35"/><stop offset="100%" stop-color="#9bb9dd" stop-opacity=".02"/></linearGradient></defs>${grid}<path class="chart-area" d="${area}"/><path class="chart-line" d="${line}"/>${dots}<text class="chart-axis-label" x="${left}" y="112">${first}</text><text class="chart-axis-label" x="${right}" y="112" text-anchor="end">${last}</text></svg>`;
    const latest = values[values.length - 1];
    byId("chart-latest").textContent = latest.value.toFixed(1);
    byId("chart-range").textContent = `${values.length} ${values.length === 1 ? "check-in" : "check-ins"} this month`;
  }

  function renderInsights(entries) {
    const exerciseTotals = { done: 0, total: 0 };
    const mealTotals = { done: 0, total: 0 };
    entries.forEach(({ day }) => {
      if (!day) return;
      [day.exercises || [], day.meals || []].forEach((items, index) => {
        const totals = index === 0 ? exerciseTotals : mealTotals;
        totals.total += items.length;
        totals.done += items.filter((item) => item.done).length;
      });
    });

    const total = exerciseTotals.total + mealTotals.total;
    const done = exerciseTotals.done + mealTotals.done;
    const percentage = total ? Math.round((done / total) * 100) : null;
    byId("adherence-value").textContent = percentage === null ? "—" : `${percentage}%`;
    byId("adherence-bar").style.width = `${percentage || 0}%`;
    byId("exercise-rate").textContent = exerciseTotals.total ? `${Math.round(exerciseTotals.done / exerciseTotals.total * 100)}%` : "—";
    byId("meal-rate").textContent = mealTotals.total ? `${Math.round(mealTotals.done / mealTotals.total * 100)}%` : "—";
    byId("adherence-note").textContent = !total ? "Add a plan to start your 30-day story." : percentage >= 75 ? "Look at you, showing up for yourself." : "Every little bit of effort counts.";

    const weights = entries.map(({ day }) => day && numericLogValue(day.log, "weight")).filter((value) => typeof value === "number");
    const latestWeight = weights[weights.length - 1];
    const previousWeight = weights[0];
    byId("latest-weight").textContent = latestWeight === undefined ? "—" : latestWeight.toFixed(1);
    byId("chart-unit").textContent = "kg";
    byId("weight-caption").textContent = latestWeight === undefined
      ? "Log your first check-in"
      : weights.length > 1
        ? `${latestWeight - previousWeight > 0 ? "+" : ""}${(latestWeight - previousWeight).toFixed(1)} kg over 30 days`
        : "Your first check-in — noted";

    const sleeps = entries.map(({ day }) => day && numericLogValue(day.log, "sleep")).filter((value) => typeof value === "number");
    const latestSleep = sleeps[sleeps.length - 1];
    byId("latest-sleep").textContent = latestSleep === undefined ? "—" : latestSleep.toFixed(1);
    byId("sleep-caption").textContent = sleeps.length > 1
      ? `30-day average ${ (sleeps.reduce((sum, value) => sum + value, 0) / sleeps.length).toFixed(1) } hrs`
      : latestSleep === undefined ? "Sleep is part of progress" : "Logged in your latest check-in";

    ["waist", "hips", "chest"].forEach((field) => {
      const measurement = [...entries].reverse().map(({ log }) => numericLogValue(log, field)).find((value) => value !== null);
      byId(`latest-${field}`).textContent = measurement === undefined ? "—" : measurement.toFixed(1);
    });
    renderChart(entries);

    const days = getRecentDays(7);
    byId("streak-dots").replaceChildren(...days.map(({ day }, index) => {
      const dot = document.createElement("i");
      const wasActive = day && ((day.exercises || []).some((item) => item.done) || (day.meals || []).some((item) => item.done));
      dot.className = `${wasActive ? "active" : ""}${index === days.length - 1 ? " today" : ""}`;
      dot.title = `${formatDate(days[index].date, { weekday: "short" })}: ${wasActive ? "plan completed" : "no completed items"}`;
      return dot;
    }));

    let streak = 0;
    const streakDays = getRecentDays(30).reverse();
    for (const { day } of streakDays) {
      if (day && ((day.exercises || []).some((item) => item.done) || (day.meals || []).some((item) => item.done))) streak += 1;
      else break;
    }
    byId("streak-value").textContent = String(streak);
  }

  function render() {
    renderDate();
    renderList("exercise");
    renderList("meal");
    const day = getDay();
    const allItems = [...day.exercises, ...day.meals];
    const completed = allItems.filter((item) => item.done).length;
    const progress = allItems.length ? Math.round(completed / allItems.length * 100) : 0;
    byId("day-progress").textContent = `${progress}%`;
    byId("completed-count").textContent = `${completed} / ${allItems.length}`;
    byId("day-ring").style.setProperty("--progress", `${progress * 3.6}deg`);
    renderInsights(getRecentDays(30).map((entry) => ({ ...entry, log: entry.day && entry.day.log })));
  }

  function openLogDialog() {
    const log = getDay().log;
    const form = byId("log-form");
    ["weight", "sleep", "waist", "hips", "chest", "notes"].forEach((field) => {
      form.elements[field].value = log[field] ?? "";
    });
    logDialog.showModal();
  }

  byId("open-log").addEventListener("click", openLogDialog);
  byId("open-log-top").addEventListener("click", openLogDialog);
  byId("previous-day").addEventListener("click", () => changeSelectedDate(-1));
  byId("next-day").addEventListener("click", () => changeSelectedDate(1));
  byId("go-to-today").addEventListener("click", () => {
    selectedDate = new Date(today);
    selectedDateKey = todayKey;
    render();
  });
  byId("theme-toggle").addEventListener("click", () => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
  });
  byId("cancel-log").addEventListener("click", () => logDialog.close());
  byId("cancel-entry").addEventListener("click", () => entryDialog.close());

  byId("log-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextLog = {};
    ["weight", "sleep", "waist", "hips", "chest"].forEach((field) => {
      const value = String(formData.get(field) || "").trim();
      if (value) nextLog[field] = Number(value);
    });
    const notes = String(formData.get("notes") || "").trim();
    if (notes) nextLog.notes = notes;
    getDay().log = nextLog;
    if (saveData()) {
      logDialog.close();
      render();
      showToast("Check-in saved. You're taking care of you.");
    }
  });

  document.querySelectorAll("[data-add]").forEach((button) => {
    button.addEventListener("click", () => {
      activeList = button.dataset.add;
      const isExercise = activeList === "exercise";
      byId("dialog-title").innerHTML = `Add ${isExercise ? "movement" : "nourishment"}<span class="heading-period">.</span>`;
      byId("dialog-description").textContent = isExercise
        ? "Make room for a little movement. Your plan can be simple."
        : "Add a meal or snack that helps you feel your best.";
      byId("entry-name-label").textContent = isExercise ? "Exercise" : "Meal";
      byId("entry-name").placeholder = isExercise ? "e.g. Evening walk" : "e.g. Afternoon snack";
      byId("entry-form").reset();
      entryDialog.showModal();
      byId("entry-name").focus();
    });
  });

  byId("entry-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const name = byId("entry-name").value.trim();
    if (!name) return;
    const items = getDay()[activeList === "exercise" ? "exercises" : "meals"];
    items.push({ id: createId(), name, detail: activeList === "exercise" ? "Movement" : "Nourishment", done: false });
    if (saveData()) {
      entryDialog.close();
      render();
      showToast(`${activeList === "exercise" ? "Exercise" : "Meal"} added to the selected day's plan.`);
    }
  });

  document.querySelectorAll(".main-nav .nav-link").forEach((link) => {
    link.addEventListener("click", () => {
      document.querySelectorAll(".main-nav .nav-link").forEach((navLink) => navLink.classList.remove("active"));
      link.classList.add("active");
    });
  });

  render();
})();
