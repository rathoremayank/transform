(() => {
  "use strict";

  const STORAGE_KEY = "form-transform-tracker-v1";
  const today = new Date();
  const dateKey = (date) => {
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 10);
  };
  const todayKey = dateKey(today);
  const formatDate = (date, options) => new Intl.DateTimeFormat(undefined, options).format(date);
  const dateFromKey = (key) => new Date(`${key}T12:00:00`);
  const createId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

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
          exercises: [
            { id: createId(), name: "Strength session", detail: "30 min · Full body", done: false },
            { id: createId(), name: "Get outside", detail: "20 min · Easy pace", done: false }
          ],
          meals: [
            { id: createId(), name: "Breakfast", detail: "A balanced start", done: false },
            { id: createId(), name: "Lunch", detail: "A nourishing plate", done: false },
            { id: createId(), name: "Dinner", detail: "Eat well, feel good", done: false }
          ],
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

  function getDay(key = todayKey) {
    if (!state.days[key]) state.days[key] = { exercises: [], meals: [], log: {} };
    if (!Array.isArray(state.days[key].exercises)) state.days[key].exercises = [];
    if (!Array.isArray(state.days[key].meals)) state.days[key].meals = [];
    if (!state.days[key].log || typeof state.days[key].log !== "object") state.days[key].log = {};
    return state.days[key];
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
    byId("header-date").textContent = formatDate(today, { weekday: "short", month: "short", day: "numeric" });
    byId("today-date").textContent = formatDate(today, { month: "short", day: "numeric", year: "numeric" });
  }

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
          showToast(`${label} removed from today's plan.`);
        });
        row.append(checkbox, copy, remove);
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
    chart.innerHTML = `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#b6ce9b" stop-opacity=".35"/><stop offset="100%" stop-color="#b6ce9b" stop-opacity=".02"/></linearGradient></defs>${grid}<path class="chart-area" d="${area}"/><path class="chart-line" d="${line}"/>${dots}<text class="chart-axis-label" x="${left}" y="112">${first}</text><text class="chart-axis-label" x="${right}" y="112" text-anchor="end">${last}</text></svg>`;
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
      showToast(`${activeList === "exercise" ? "Exercise" : "Meal"} added to today's plan.`);
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
