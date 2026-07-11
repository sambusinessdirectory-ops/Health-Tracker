(() => {
  "use strict";

  const STORAGE_KEY = "myHealthJourney:v1";
  const SUPABASE_TABLE = "health_entries";
  const SUPABASE_SDK_URL =
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/dist/umd/supabase.min.js";
  const CLOUD_AUTH_STORAGE_KEY = "my-health-journey-auth-v1";
  const LB_PER_KG = 2.2046226218;
  const RECORD_KEYS = [
    "weight",
    "water",
    "cardio",
    "strength",
    "food",
    "groceries",
    "mealPrep",
    "calories",
  ];

  const dateField = () => ({ key: "date", label: "Date", type: "date", required: true });
  const notesField = () => ({
    key: "notes",
    label: "Notes",
    type: "textarea",
    className: "full",
    placeholder: "Optional note",
  });

  const categoryConfigs = [
    {
      key: "weight",
      number: "01",
      icon: "W",
      title: "Weight record",
      description: "Track one weight reading per day and follow the change over time.",
      cardDescription: "Log a daily reading and see your change.",
      colors: ["#fffaf0", "#cfe8ff", "#2b7fd4"],
      uniqueDate: true,
      fields: [
        dateField(),
        {
          key: "weightKg",
          label: () => `Weight (${state.settings.weightUnit})`,
          type: "number",
          unitValue: true,
          required: true,
          min: 0.1,
          step: 0.1,
          placeholder: "e.g. 180",
        },
        notesField(),
      ],
      columns: () => [
        { label: "Date", value: (record) => formatDate(record.date) },
        {
          label: `Weight (${state.settings.weightUnit})`,
          value: (record) => formatWeight(record.weightKg),
          className: "table-number",
        },
        {
          label: "Change",
          value: (record) => formatWeightChange(record),
          pill: (record) => weightChangeTone(record),
        },
        { label: "Notes", value: (record) => record.notes || "—", className: "table-note" },
      ],
    },
    {
      key: "water",
      number: "02",
      icon: "H₂O",
      title: "Water intake",
      description: "Record the total litres of water you drank on each day.",
      cardDescription: "Keep a simple daily hydration total.",
      colors: ["#f1fbff", "#bde7f4", "#2391b4"],
      uniqueDate: true,
      fields: [
        dateField(),
        {
          key: "litres",
          label: "Water consumed (L)",
          type: "number",
          required: true,
          min: 0,
          step: 0.1,
          placeholder: "e.g. 2.0",
          hint: "Enter the day's total in litres.",
        },
        notesField(),
      ],
      columns: () => [
        { label: "Date", value: (record) => formatDate(record.date) },
        {
          label: "Water (L)",
          value: (record) => `${formatDecimal(record.litres, 2)} L`,
          className: "table-number",
        },
        {
          label: "Daily goal",
          value: (record) =>
            `${Math.round((number(record.litres) / state.settings.dailyWaterGoalL) * 100)}%`,
          pill: (record) =>
            number(record.litres) >= state.settings.dailyWaterGoalL ? "positive" : "",
        },
        { label: "Notes", value: (record) => record.notes || "—", className: "table-note" },
      ],
    },
    {
      key: "cardio",
      number: "03",
      icon: "↗",
      title: "Cardio exercise",
      description: "Record the activity, time and optional estimated calories burned.",
      cardDescription: "Log the activity and minutes completed.",
      colors: ["#f3f8ff", "#c8dcff", "#527ad0"],
      fields: [
        dateField(),
        {
          key: "activity",
          label: "Type of cardio",
          type: "text",
          required: true,
          className: "wide",
          placeholder: "Walking, cycling, swimming…",
        },
        {
          key: "minutes",
          label: "How long (minutes)",
          type: "number",
          required: true,
          min: 1,
          step: 1,
          placeholder: "30",
        },
        {
          key: "caloriesBurned",
          label: "Calories burned",
          type: "number",
          min: 0,
          step: 1,
          placeholder: "Optional",
        },
        notesField(),
      ],
      columns: () => [
        { label: "Date", value: (record) => formatDate(record.date) },
        { label: "Cardio type", value: (record) => record.activity },
        {
          label: "Minutes",
          value: (record) => `${formatInteger(record.minutes)} min`,
          className: "table-number",
        },
        {
          label: "Calories",
          value: (record) => optionalCalories(record.caloriesBurned),
        },
        { label: "Notes", value: (record) => record.notes || "—", className: "table-note" },
      ],
    },
    {
      key: "strength",
      number: "04",
      icon: "KG",
      title: "Weight exercise",
      description: "Keep your exercise, sets, reps and lifting load together.",
      cardDescription: "Track sets, reps and lifting load.",
      colors: ["#f3f6ff", "#d3d9fa", "#676fbd"],
      fields: [
        dateField(),
        {
          key: "exercise",
          label: "Exercise",
          type: "text",
          required: true,
          className: "wide",
          placeholder: "Squat, chest press…",
        },
        {
          key: "sets",
          label: "Sets",
          type: "number",
          required: true,
          min: 1,
          step: 1,
          placeholder: "3",
          integer: true,
        },
        {
          key: "reps",
          label: "Reps",
          type: "number",
          required: true,
          min: 1,
          step: 1,
          placeholder: "10",
          integer: true,
        },
        {
          key: "loadKg",
          label: () => `Load (${state.settings.weightUnit})`,
          type: "number",
          unitValue: true,
          min: 0,
          step: 0.1,
          placeholder: "Optional",
        },
        {
          key: "caloriesBurned",
          label: "Calories burned",
          type: "number",
          min: 0,
          step: 1,
          placeholder: "Optional",
        },
        notesField(),
      ],
      columns: () => [
        { label: "Date", value: (record) => formatDate(record.date) },
        { label: "Exercise", value: (record) => record.exercise },
        { label: "Sets", value: (record) => formatInteger(record.sets) },
        { label: "Reps", value: (record) => formatInteger(record.reps) },
        {
          label: `Load (${state.settings.weightUnit})`,
          value: (record) =>
            record.loadKg === null || record.loadKg === "" || record.loadKg === undefined
              ? "—"
              : formatWeight(record.loadKg),
          className: "table-number",
        },
        {
          label: `Volume (${state.settings.weightUnit})`,
          value: (record) => strengthVolume(record),
        },
        { label: "Calories", value: (record) => optionalCalories(record.caloriesBurned) },
        { label: "Notes", value: (record) => record.notes || "—", className: "table-note" },
      ],
    },
    {
      key: "food",
      number: "05",
      icon: "F",
      title: "Food taken",
      description: "Record meals, portions and calories without overcomplicating the day.",
      cardDescription: "Note meals, portions and calories.",
      colors: ["#fffaf0", "#ffe0b9", "#d88735"],
      fields: [
        dateField(),
        {
          key: "meal",
          label: "Meal",
          type: "select",
          required: true,
          options: ["Breakfast", "Lunch", "Dinner", "Snack", "Drink"],
        },
        {
          key: "item",
          label: "Food / drink",
          type: "text",
          required: true,
          className: "wide",
          placeholder: "Chicken rice, apple…",
        },
        {
          key: "quantity",
          label: "Quantity",
          type: "number",
          required: true,
          min: 0.01,
          step: 0.1,
          placeholder: "1",
        },
        {
          key: "portionUnit",
          label: "Portion unit",
          type: "select",
          required: true,
          options: ["serving", "plate", "bowl", "piece", "cup", "g", "ml"],
        },
        {
          key: "calories",
          label: "Calories (kcal)",
          type: "number",
          required: true,
          min: 0,
          step: 1,
          placeholder: "450",
        },
        notesField(),
      ],
      columns: () => [
        { label: "Date", value: (record) => formatDate(record.date) },
        { label: "Meal", value: (record) => record.meal },
        { label: "Food / drink", value: (record) => record.item },
        {
          label: "Portion",
          value: (record) => `${formatDecimal(record.quantity, 2)} ${record.portionUnit}`,
        },
        {
          label: "Calories",
          value: (record) => `${formatInteger(record.calories)} kcal`,
          className: "table-number",
        },
        { label: "Notes", value: (record) => record.notes || "—", className: "table-note" },
      ],
    },
    {
      key: "groceries",
      number: "06",
      icon: "✓",
      title: "Grocery shopping",
      description: "Build a dated grocery list and tick off items after buying them.",
      cardDescription: "Plan items and mark them purchased.",
      colors: ["#f5fbf8", "#cfe9d9", "#489766"],
      fields: [
        dateField(),
        {
          key: "item",
          label: "Grocery item",
          type: "text",
          required: true,
          className: "wide",
          placeholder: "Chicken breast, broccoli…",
        },
        {
          key: "quantity",
          label: "Quantity",
          type: "number",
          required: true,
          min: 0.01,
          step: 0.1,
          placeholder: "2",
        },
        {
          key: "unit",
          label: "Unit",
          type: "select",
          required: true,
          options: ["item", "pack", "bag", "bottle", "kg", "g", "L"],
        },
        {
          key: "purchased",
          label: "Purchased",
          type: "checkbox",
          className: "checkbox-field",
        },
        notesField(),
      ],
      columns: () => [
        { label: "Date", value: (record) => formatDate(record.date) },
        { label: "Item", value: (record) => record.item },
        {
          label: "Quantity",
          value: (record) => `${formatDecimal(record.quantity, 2)} ${record.unit}`,
        },
        {
          label: "Status",
          value: (record) => (record.purchased ? "Purchased" : "To buy"),
          pill: (record) => (record.purchased ? "positive" : "warning"),
        },
        { label: "Notes", value: (record) => record.notes || "—", className: "table-note" },
      ],
    },
    {
      key: "mealPrep",
      number: "07",
      icon: "M",
      title: "Meal prep",
      description: "Plan prepared dishes, servings, calories and the date to eat them by.",
      cardDescription: "Plan dishes, servings and eat-by dates.",
      colors: ["#fff9f1", "#f2d8b8", "#bd7b43"],
      fields: [
        dateField(),
        {
          key: "dish",
          label: "Dish",
          type: "text",
          required: true,
          className: "wide",
          placeholder: "Chicken and vegetables",
        },
        {
          key: "servings",
          label: "Servings",
          type: "number",
          required: true,
          min: 1,
          step: 1,
          placeholder: "4",
          integer: true,
        },
        {
          key: "caloriesPerServing",
          label: "Calories / serving",
          type: "number",
          min: 0,
          step: 1,
          placeholder: "Optional",
        },
        {
          key: "eatBy",
          label: "Eat by",
          type: "date",
        },
        notesField(),
      ],
      columns: () => [
        { label: "Prep date", value: (record) => formatDate(record.date) },
        { label: "Dish", value: (record) => record.dish },
        { label: "Servings", value: (record) => formatInteger(record.servings) },
        {
          label: "Calories / serving",
          value: (record) => optionalCalories(record.caloriesPerServing),
        },
        {
          label: "Total calories",
          value: (record) =>
            record.caloriesPerServing === null ||
            record.caloriesPerServing === "" ||
            record.caloriesPerServing === undefined
              ? "—"
              : `${formatInteger(number(record.servings) * number(record.caloriesPerServing))} kcal`,
        },
        { label: "Eat by", value: (record) => formatDate(record.eatBy) },
        { label: "Notes", value: (record) => record.notes || "—", className: "table-note" },
      ],
    },
    {
      key: "calories",
      number: "08",
      icon: "Σ",
      title: "Calories calculation",
      description: "Compare your food, exercise and daily goal in one clear row.",
      cardDescription: "See goal, net calories and remaining.",
      colors: ["#f4f9ff", "#c9e1ef", "#38799a"],
      uniqueDate: true,
      fields: [
        dateField(),
        {
          key: "goalKcal",
          label: "Daily goal (kcal)",
          type: "number",
          required: true,
          min: 1,
          step: 1,
          placeholder: "2000",
        },
        {
          key: "consumedKcal",
          label: "Food consumed (kcal)",
          type: "number",
          required: true,
          min: 0,
          step: 1,
          placeholder: "1800",
        },
        {
          key: "exerciseKcal",
          label: "Exercise burned (kcal)",
          type: "number",
          required: true,
          min: 0,
          step: 1,
          placeholder: "250",
        },
        notesField(),
      ],
      columns: () => [
        { label: "Date", value: (record) => formatDate(record.date) },
        { label: "Goal", value: (record) => `${formatInteger(record.goalKcal)} kcal` },
        { label: "Food", value: (record) => `${formatInteger(record.consumedKcal)} kcal` },
        {
          label: "Exercise",
          value: (record) => `${formatInteger(record.exerciseKcal)} kcal`,
        },
        {
          label: "Net",
          value: (record) => `${formatInteger(calorieNet(record))} kcal`,
          className: "table-number",
        },
        {
          label: "Remaining",
          value: (record) => calorieRemainingText(record),
          pill: (record) => (calorieRemaining(record) >= 0 ? "positive" : "warning"),
        },
        { label: "Notes", value: (record) => record.notes || "—", className: "table-note" },
      ],
    },
  ];

  const configByKey = Object.fromEntries(categoryConfigs.map((config) => [config.key, config]));
  let activeStorageKey = STORAGE_KEY;
  let state = loadState(activeStorageKey);
  let currentCategory = null;
  let lastCategoryKey = null;
  let editingId = null;
  let formSaveInProgress = false;
  let toastTimer = null;
  let supabaseClient = null;
  let cloudSession = null;
  let cloudIsAvailable = false;
  let cloudSyncInProgress = false;
  let previousDocumentTitle = document.title;

  const elements = {};

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    Object.assign(elements, {
      dashboardView: document.querySelector("#dashboard-view"),
      categoryView: document.querySelector("#category-view"),
      trackerGrid: document.querySelector("#tracker-grid"),
      categoryTitle: document.querySelector("#category-title"),
      categoryDescription: document.querySelector("#category-description"),
      categoryIcon: document.querySelector("#category-icon"),
      categoryKicker: document.querySelector("#category-kicker"),
      form: document.querySelector("#entry-form"),
      formFields: document.querySelector("#form-fields"),
      formTitle: document.querySelector("#entry-form-title"),
      formError: document.querySelector("#form-error"),
      saveButton: document.querySelector("#save-entry-button"),
      cancelButton: document.querySelector("#cancel-edit-button"),
      fillCaloriesButton: document.querySelector("#fill-calories-button"),
      tableWrap: document.querySelector("#table-wrap"),
      recordCount: document.querySelector("#record-count"),
      backButton: document.querySelector("#back-button"),
      categoryExportButton: document.querySelector("#category-export-button"),
      exportAllButton: document.querySelector("#export-all-button"),
      cloudButton: document.querySelector("#cloud-button"),
      cloudButtonLabel: document.querySelector("#cloud-button-label"),
      cloudDialog: document.querySelector("#cloud-dialog"),
      cloudDialogTitle: document.querySelector("#cloud-dialog-title"),
      cloudDialogCopy: document.querySelector("#cloud-dialog-copy"),
      cloudSigninForm: document.querySelector("#cloud-signin-form"),
      cloudEmail: document.querySelector("#cloud-email"),
      cloudPassword: document.querySelector("#cloud-password"),
      cloudSigninButton: document.querySelector("#cloud-signin-button"),
      cloudError: document.querySelector("#cloud-error"),
      cloudAccount: document.querySelector("#cloud-account"),
      cloudAccountEmail: document.querySelector("#cloud-account-email"),
      cloudSetupNote: document.querySelector("#cloud-setup-note"),
      syncNowButton: document.querySelector("#sync-now-button"),
      signoutButton: document.querySelector("#signout-button"),
      storageHeading: document.querySelector("#storage-heading"),
      storageCopy: document.querySelector("#storage-copy"),
      printReport: document.querySelector("#print-report"),
      toast: document.querySelector("#toast"),
      summaryWeight: document.querySelector("#summary-weight"),
      summaryWeightNote: document.querySelector("#summary-weight-note"),
      summaryWater: document.querySelector("#summary-water"),
      summaryWaterNote: document.querySelector("#summary-water-note"),
      summaryActivity: document.querySelector("#summary-activity"),
      summaryCalories: document.querySelector("#summary-calories"),
      summaryCaloriesNote: document.querySelector("#summary-calories-note"),
    });

    bindEvents();
    renderAll();
    initCloud();

    const hashCategory = window.location.hash.replace("#", "");
    if (configByKey[hashCategory]) openCategory(hashCategory, false);
  }

  function bindEvents() {
    document.querySelectorAll(".unit-button").forEach((button) => {
      button.addEventListener("click", () => setWeightUnit(button.dataset.unit));
    });

    elements.backButton.addEventListener("click", showDashboard);
    elements.form.addEventListener("submit", handleSaveEntry);
    elements.form.addEventListener("input", clearFieldErrors);
    elements.cancelButton.addEventListener("click", resetForm);
    elements.fillCaloriesButton.addEventListener("click", fillCaloriesFromLogs);
    elements.categoryExportButton.addEventListener("click", () => {
      if (currentCategory) printCategories([currentCategory]);
    });
    elements.exportAllButton.addEventListener("click", () => printCategories(RECORD_KEYS));
    elements.cloudButton.addEventListener("click", showCloudDialog);
    elements.cloudSigninForm.addEventListener("submit", handleCloudSignin);
    elements.syncNowButton.addEventListener("click", () => syncAllRecords(true));
    elements.signoutButton.addEventListener("click", handleCloudSignout);
    window.addEventListener("hashchange", handleHashChange);
    window.addEventListener("afterprint", cleanupPrintReport);
  }

  function freshState() {
    return {
      schemaVersion: 1,
      settings: {
        weightUnit: "lb",
        dailyWaterGoalL: 2,
        dailyCalorieGoalKcal: 2000,
      },
      pendingDeletes: [],
      records: Object.fromEntries(RECORD_KEYS.map((key) => [key, []])),
    };
  }

  function loadState(storageKey = activeStorageKey) {
    const defaults = freshState();
    try {
      const parsed = JSON.parse(window.localStorage.getItem(storageKey));
      if (!parsed || typeof parsed !== "object") return defaults;

      const loaded = freshState();
      loaded.settings.weightUnit = parsed.settings?.weightUnit === "kg" ? "kg" : "lb";
      loaded.settings.dailyWaterGoalL = positiveOrDefault(
        parsed.settings?.dailyWaterGoalL,
        defaults.settings.dailyWaterGoalL,
      );
      loaded.settings.dailyCalorieGoalKcal = positiveOrDefault(
        parsed.settings?.dailyCalorieGoalKcal,
        defaults.settings.dailyCalorieGoalKcal,
      );
      loaded.pendingDeletes = Array.isArray(parsed.pendingDeletes)
        ? parsed.pendingDeletes.filter((id) => typeof id === "string")
        : [];
      RECORD_KEYS.forEach((key) => {
        loaded.records[key] = Array.isArray(parsed.records?.[key])
          ? parsed.records[key].filter((record) => record && typeof record === "object")
          : [];
      });
      return loaded;
    } catch (error) {
      console.warn("Could not read saved tracker data.", error);
      return defaults;
    }
  }

  function saveState() {
    try {
      window.localStorage.setItem(activeStorageKey, JSON.stringify(state));
      return true;
    } catch (error) {
      showToast("This browser could not save the change. Please check its storage settings.");
      console.error(error);
      return false;
    }
  }

  function renderAll() {
    updateUnitButtons();
    renderDashboard();
    if (currentCategory) {
      renderForm();
      renderTable();
      renderCategoryHeader();
    }
    updateCloudUi();
  }

  function renderDashboard() {
    elements.trackerGrid.replaceChildren();
    categoryConfigs.forEach((config) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "tracker-card";
      card.dataset.number = config.number;
      card.dataset.category = config.key;
      card.style.setProperty("--card-start", config.colors[0]);
      card.style.setProperty("--card-end", config.colors[1]);
      card.style.setProperty("--card-key", config.colors[2]);
      card.setAttribute("aria-label", `Open ${config.title}`);

      const inner = document.createElement("span");
      inner.className = "tracker-card-inner";

      const icon = document.createElement("span");
      icon.className = "tracker-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = config.icon;

      const title = document.createElement("span");
      title.className = "tracker-card-title";
      title.textContent = config.title;

      const description = document.createElement("p");
      description.textContent = config.cardDescription;

      const stat = document.createElement("span");
      stat.className = "card-stat";
      stat.textContent = cardStat(config.key);

      inner.append(icon, title, description, stat);
      card.append(inner);
      card.addEventListener("click", () => openCategory(config.key));
      elements.trackerGrid.append(card);
    });

    renderSummary();
  }

  function renderSummary() {
    const today = todayIso();
    const weights = sortedRecords("weight");
    const latestWeight = weights[0];

    if (latestWeight) {
      elements.summaryWeight.textContent = formatWeight(latestWeight.weightKg);
      elements.summaryWeightNote.textContent = `recorded ${formatDate(latestWeight.date)}`;
    } else {
      elements.summaryWeight.textContent = "—";
      elements.summaryWeightNote.textContent = "No entry yet";
    }

    const waterToday = state.records.water
      .filter((record) => record.date === today)
      .reduce((total, record) => total + number(record.litres), 0);
    elements.summaryWater.textContent = `${formatDecimal(waterToday, 2)} L`;
    elements.summaryWaterNote.textContent = `of ${formatDecimal(
      state.settings.dailyWaterGoalL,
      2,
    )} L`;

    const activityToday = state.records.cardio
      .filter((record) => record.date === today)
      .reduce((total, record) => total + number(record.minutes), 0);
    elements.summaryActivity.textContent = `${formatInteger(activityToday)} min`;

    const foodToday = sumFoodCalories(today);
    const calorieRecord = state.records.calories.find((record) => record.date === today);
    const goal = calorieRecord?.goalKcal || state.settings.dailyCalorieGoalKcal;
    elements.summaryCalories.textContent = `${formatInteger(foodToday)} kcal`;
    elements.summaryCaloriesNote.textContent = `of ${formatInteger(goal)} kcal`;
  }

  function cardStat(key) {
    const today = todayIso();
    const records = state.records[key];
    const countText = `${records.length} ${records.length === 1 ? "entry" : "entries"}`;

    if (key === "weight") {
      const latest = sortedRecords(key)[0];
      return latest ? `Latest: ${formatWeight(latest.weightKg)}` : "Ready for your first entry";
    }
    if (key === "water") {
      const total = records
        .filter((record) => record.date === today)
        .reduce((sum, record) => sum + number(record.litres), 0);
      return `Today: ${formatDecimal(total, 2)} L`;
    }
    if (key === "cardio") {
      const minutes = records
        .filter((record) => record.date === today)
        .reduce((sum, record) => sum + number(record.minutes), 0);
      return `Today: ${formatInteger(minutes)} min`;
    }
    if (key === "strength") {
      return `${records.filter((record) => record.date === today).length} exercises today`;
    }
    if (key === "food") return `Today: ${formatInteger(sumFoodCalories(today))} kcal`;
    if (key === "groceries") {
      const pending = records.filter((record) => !record.purchased).length;
      return `${pending} ${pending === 1 ? "item" : "items"} left to buy`;
    }
    if (key === "mealPrep") {
      const servings = records.reduce((sum, record) => sum + number(record.servings), 0);
      return `${formatInteger(servings)} portions planned`;
    }
    if (key === "calories") {
      const latest = sortedRecords(key)[0];
      return latest ? calorieRemainingText(latest) : "Set your daily calorie goal";
    }
    return countText;
  }

  function openCategory(key, updateHash = true) {
    if (!configByKey[key]) return;
    currentCategory = key;
    lastCategoryKey = key;
    editingId = null;
    elements.dashboardView.hidden = true;
    elements.categoryView.hidden = false;
    renderCategoryHeader();
    renderForm();
    renderTable();
    updateUnitButtons();
    if (updateHash && window.location.hash !== `#${key}`) {
      window.history.pushState(null, "", `#${key}`);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
    window.setTimeout(() => elements.categoryTitle.focus(), 0);
  }

  function showDashboard() {
    const returnFocusKey = currentCategory || lastCategoryKey;
    currentCategory = null;
    editingId = null;
    elements.categoryView.hidden = true;
    elements.dashboardView.hidden = false;
    document.title = "My Health Journey";
    renderDashboard();
    if (window.location.hash) window.history.pushState(null, "", window.location.pathname);
    window.scrollTo({ top: 0, behavior: "smooth" });
    window.setTimeout(() => {
      elements.trackerGrid
        .querySelector(`[data-category="${returnFocusKey}"]`)
        ?.focus();
    }, 0);
  }

  function handleHashChange() {
    const key = window.location.hash.replace("#", "");
    if (configByKey[key]) openCategory(key, false);
    else if (!elements.dashboardView.hidden) return;
    else showDashboard();
  }

  function renderCategoryHeader() {
    const config = configByKey[currentCategory];
    if (!config) return;
    elements.categoryTitle.textContent = config.title;
    elements.categoryDescription.textContent = config.description;
    elements.categoryIcon.textContent = config.icon;
    elements.categoryKicker.textContent = `TRACKER ${config.number}`;
    elements.fillCaloriesButton.hidden = currentCategory !== "calories";
    document.title = `${config.title} · My Health Journey`;
  }

  function renderForm(record = null) {
    const config = configByKey[currentCategory];
    if (!config) return;

    elements.formFields.replaceChildren();
    elements.formError.hidden = true;
    elements.formError.textContent = "";

    config.fields.forEach((field) => {
      const label = document.createElement("label");
      label.className = `field ${field.className || ""}`.trim();
      const labelText = typeof field.label === "function" ? field.label() : field.label;

      if (field.type === "checkbox") {
        const checkboxLabel = document.createElement("span");
        checkboxLabel.className = "checkbox-label";
        const input = createFieldInput(field, record);
        const text = document.createElement("span");
        text.textContent = labelText;
        checkboxLabel.append(input, text);
        label.append(checkboxLabel);
      } else {
        const title = document.createElement("span");
        title.textContent = labelText;
        label.append(title, createFieldInput(field, record));
      }

      if (field.hint) {
        const hint = document.createElement("small");
        hint.className = "input-hint";
        hint.textContent = field.hint;
        label.append(hint);
      }
      elements.formFields.append(label);
    });

    const editing = Boolean(record);
    elements.formTitle.textContent = editing ? `Edit ${config.title.toLowerCase()}` : "Add an entry";
    elements.saveButton.textContent = editing ? "Update entry" : "Save entry";
    elements.cancelButton.hidden = !editing;
  }

  function createFieldInput(field, record) {
    let input;
    if (field.type === "select") {
      input = document.createElement("select");
      field.options.forEach((optionValue) => {
        const option = document.createElement("option");
        option.value = optionValue;
        option.textContent = optionValue;
        input.append(option);
      });
    } else if (field.type === "textarea") {
      input = document.createElement("textarea");
    } else {
      input = document.createElement("input");
      input.type = field.type;
    }

    input.id = `field-${field.key}`;
    input.name = field.key;
    input.required = Boolean(field.required);
    if (field.min !== undefined) input.min = String(field.min);
    if (field.step !== undefined) input.step = String(field.step);
    if (field.placeholder) input.placeholder = field.placeholder;

    const rawValue = record?.[field.key];
    if (field.type === "checkbox") {
      input.checked = Boolean(rawValue);
    } else if (field.unitValue && rawValue !== null && rawValue !== undefined && rawValue !== "") {
      input.value = String(roundForDisplay(convertKgToActiveUnit(number(rawValue))));
    } else if (rawValue !== null && rawValue !== undefined) {
      input.value = String(rawValue);
    } else if (field.key === "date") {
      input.value = todayIso();
    } else if (field.key === "goalKcal") {
      input.value = String(state.settings.dailyCalorieGoalKcal);
    } else if (field.key === "consumedKcal" || field.key === "exerciseKcal") {
      input.value = "0";
    } else if (field.key === "quantity") {
      input.value = "1";
    }

    return input;
  }

  async function handleSaveEntry(event) {
    event.preventDefault();
    if (formSaveInProgress) return;
    if (cloudSession && cloudSyncInProgress) {
      showToast("Please wait for private cloud sync to finish, then save.");
      return;
    }
    formSaveInProgress = true;
    elements.saveButton.disabled = true;
    try {
      const config = configByKey[currentCategory];
      if (!config) return;
      clearFieldErrors();

      const result = collectFormRecord(config);
      if (!result.ok) {
        elements.formError.textContent = result.error;
        elements.formError.hidden = false;
        const invalidInput =
          (result.fieldKey && elements.form.elements[result.fieldKey]) ||
          elements.form.querySelector(":invalid");
        invalidInput?.setAttribute("aria-invalid", "true");
        invalidInput?.setAttribute("aria-describedby", "form-error");
        invalidInput?.focus();
        return;
      }

      const stateBeforeSave = JSON.stringify(state);
      const now = new Date().toISOString();
      const records = state.records[currentCategory];
      let existingIndex = editingId
        ? records.findIndex((record) => record.id === editingId)
        : -1;

      if (existingIndex < 0 && config.uniqueDate) {
        existingIndex = records.findIndex((record) => record.date === result.record.date);
      }

      let savedRecord;
      if (existingIndex >= 0) {
        const existing = records[existingIndex];
        const nextId =
          config.uniqueDate && cloudSession
            ? makeDailyRecordId(cloudSession.user.id, currentCategory, result.record.date)
            : existing.id;
        if (nextId !== existing.id && !state.pendingDeletes.includes(existing.id)) {
          state.pendingDeletes.push(existing.id);
        }
        savedRecord = {
          ...existing,
          ...result.record,
          id: nextId,
          createdAt: existing.createdAt || now,
          updatedAt: now,
          _pending: true,
          _restore: false,
        };
        records[existingIndex] = savedRecord;
      } else {
        savedRecord = {
          ...result.record,
          id: makeRecordId(config, result.record.date),
          createdAt: now,
          updatedAt: now,
          _pending: true,
          _restore: true,
        };
        records.push(savedRecord);
      }
      if (savedRecord._restore) {
        state.pendingDeletes = state.pendingDeletes.filter((id) => id !== savedRecord.id);
      }

      if (currentCategory === "calories") {
        state.settings.dailyCalorieGoalKcal = number(savedRecord.goalKcal);
      }
      if (!saveState()) {
        state = JSON.parse(stateBeforeSave);
        return;
      }
      showToast(existingIndex >= 0 ? "Entry updated." : "Entry saved.");
      editingId = null;
      renderAll();
      await upsertRemote(currentCategory, savedRecord);
    } finally {
      formSaveInProgress = false;
      elements.saveButton.disabled = false;
    }
  }

  function collectFormRecord(config) {
    const record = {};
    for (const field of config.fields) {
      const input = elements.form.elements[field.key];
      if (!input) continue;

      let value;
      if (field.type === "checkbox") value = input.checked;
      else value = input.value.trim();

      if (field.required && (value === "" || value === false)) {
        return { ok: false, error: `${fieldLabel(field)} is required.`, fieldKey: field.key };
      }

      if (field.type === "number") {
        if (value === "") {
          record[field.key] = null;
          continue;
        }
        const parsed = Number(value);
        if (!Number.isFinite(parsed)) {
          return {
            ok: false,
            error: `${fieldLabel(field)} must be a number.`,
            fieldKey: field.key,
          };
        }
        if (field.min !== undefined && parsed < field.min) {
          return {
            ok: false,
            error: `${fieldLabel(field)} must be at least ${field.min}.`,
            fieldKey: field.key,
          };
        }
        if (field.integer && !Number.isInteger(parsed)) {
          return {
            ok: false,
            error: `${fieldLabel(field)} must be a whole number.`,
            fieldKey: field.key,
          };
        }
        record[field.key] = field.unitValue ? convertActiveUnitToKg(parsed) : parsed;
      } else {
        record[field.key] = value;
      }
    }

    if (!isValidIsoDate(record.date)) {
      return { ok: false, error: "Please choose a valid date.", fieldKey: "date" };
    }
    if (currentCategory === "water" && number(record.litres) > 20) {
      return {
        ok: false,
        error: "That is above 20 L. Please check the number before saving.",
        fieldKey: "litres",
      };
    }
    return { ok: true, record };
  }

  function clearFieldErrors() {
    elements.formError.hidden = true;
    elements.formError.textContent = "";
    elements.form.querySelectorAll('[aria-invalid="true"]').forEach((input) => {
      input.removeAttribute("aria-invalid");
      if (input.getAttribute("aria-describedby") === "form-error") {
        input.removeAttribute("aria-describedby");
      }
    });
  }

  function renderTable() {
    const config = configByKey[currentCategory];
    if (!config) return;
    const records = sortedRecords(currentCategory);
    elements.recordCount.textContent = `${records.length} ${records.length === 1 ? "entry" : "entries"}`;
    elements.tableWrap.replaceChildren();

    if (!records.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      const copy = document.createElement("div");
      const strong = document.createElement("strong");
      strong.textContent = "No records yet";
      const text = document.createElement("span");
      text.textContent = "Use the quick entry form above to add your first one.";
      copy.append(strong, text);
      empty.append(copy);
      elements.tableWrap.append(empty);
      return;
    }

    const table = document.createElement("table");
    table.className = "records-table";
    const caption = document.createElement("caption");
    caption.textContent = `${config.title} history, newest first`;
    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    const columns = config.columns();

    [...columns.map((column) => column.label), "Actions"].forEach((label) => {
      const th = document.createElement("th");
      th.scope = "col";
      th.textContent = label;
      headRow.append(th);
    });
    thead.append(headRow);

    const tbody = document.createElement("tbody");
    records.forEach((record) => {
      const row = document.createElement("tr");
      columns.forEach((column) => row.append(createTableCell(column, record)));

      const actions = document.createElement("td");
      actions.className = "row-actions";
      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "icon-button";
      editButton.textContent = "Edit";
      editButton.setAttribute(
        "aria-label",
        `Edit ${recordDescriptor(currentCategory, record)} for ${formatDate(record.date)}`,
      );
      editButton.addEventListener("click", () => startEdit(record.id));

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "icon-button delete";
      deleteButton.textContent = "Delete";
      deleteButton.setAttribute(
        "aria-label",
        `Delete ${recordDescriptor(currentCategory, record)} for ${formatDate(record.date)}`,
      );
      deleteButton.addEventListener("click", () => deleteRecord(record.id));
      actions.append(editButton, deleteButton);
      row.append(actions);
      tbody.append(row);
    });

    table.append(caption, thead, tbody);
    elements.tableWrap.append(table);
  }

  function createTableCell(column, record) {
    const td = document.createElement("td");
    if (column.className) td.className = column.className;
    const value = safeText(column.value(record));
    if (column.pill) {
      const pill = document.createElement("span");
      const tone = column.pill(record);
      pill.className = `status-pill ${tone || ""}`.trim();
      pill.textContent = value;
      td.append(pill);
    } else {
      td.textContent = value;
    }
    return td;
  }

  function startEdit(id) {
    const record = state.records[currentCategory].find((item) => item.id === id);
    if (!record) return;
    editingId = id;
    renderForm(record);
    document.querySelector(".entry-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => elements.form.querySelector("input, select, textarea")?.focus(), 250);
  }

  function resetForm() {
    editingId = null;
    renderForm();
    elements.form.querySelector("input, select, textarea")?.focus();
  }

  async function deleteRecord(id) {
    if (cloudSession && cloudSyncInProgress) {
      showToast("Please wait for private cloud sync to finish, then delete.");
      return;
    }
    const config = configByKey[currentCategory];
    const record = state.records[currentCategory].find((item) => item.id === id);
    if (!record) return;
    const confirmed = window.confirm(
      `Delete this ${config.title.toLowerCase()} entry from ${formatDate(record.date)}?`,
    );
    if (!confirmed) return;

    const stateBeforeDelete = JSON.stringify(state);
    state.records[currentCategory] = state.records[currentCategory].filter(
      (item) => item.id !== id,
    );
    if (!state.pendingDeletes.includes(id)) state.pendingDeletes.push(id);
    if (editingId === id) editingId = null;
    if (!saveState()) {
      state = JSON.parse(stateBeforeDelete);
      return;
    }
    renderAll();
    elements.recordCount.focus();
    showToast("Entry deleted.");
    await deleteRemote(id);
  }

  function fillCaloriesFromLogs() {
    const dateInput = elements.form.elements.date;
    const date = dateInput?.value || todayIso();
    const consumed = sumFoodCalories(date);
    const burned = sumExerciseCalories(date);
    if (elements.form.elements.consumedKcal) {
      elements.form.elements.consumedKcal.value = String(Math.round(consumed));
    }
    if (elements.form.elements.exerciseKcal) {
      elements.form.elements.exerciseKcal.value = String(Math.round(burned));
    }
    showToast("Food and exercise totals filled in. Review them, then save.");
  }

  function setWeightUnit(unit) {
    if (!['lb', 'kg'].includes(unit) || state.settings.weightUnit === unit) return;
    const previousUnit = state.settings.weightUnit;
    const formSnapshot = currentCategory ? captureFormSnapshot() : null;
    state.settings.weightUnit = unit;
    if (!saveState()) {
      state.settings.weightUnit = previousUnit;
      updateUnitButtons();
      return;
    }
    updateUnitButtons();
    renderDashboard();
    if (currentCategory) {
      renderCategoryHeader();
      renderForm(editingId ? findCurrentRecord(editingId) : null);
      restoreFormSnapshotAfterUnitChange(formSnapshot, previousUnit);
      renderTable();
    }
    showToast(`Weight unit changed to ${unit}. Stored records were converted for display.`);
  }

  function captureFormSnapshot() {
    const snapshot = {};
    configByKey[currentCategory].fields.forEach((field) => {
      const input = elements.form.elements[field.key];
      if (!input) return;
      snapshot[field.key] = field.type === "checkbox" ? input.checked : input.value;
    });
    return snapshot;
  }

  function restoreFormSnapshotAfterUnitChange(snapshot, previousUnit) {
    if (!snapshot) return;
    configByKey[currentCategory].fields.forEach((field) => {
      const input = elements.form.elements[field.key];
      if (!input || snapshot[field.key] === undefined) return;
      if (field.type === "checkbox") input.checked = snapshot[field.key];
      else if (field.unitValue && snapshot[field.key] !== "") {
        const oldValue = Number(snapshot[field.key]);
        if (!Number.isFinite(oldValue)) return;
        const valueKg = previousUnit === "lb" ? oldValue / LB_PER_KG : oldValue;
        const newValue = state.settings.weightUnit === "lb" ? valueKg * LB_PER_KG : valueKg;
        input.value = String(roundForDisplay(newValue));
      } else input.value = snapshot[field.key];
    });
  }

  function updateUnitButtons() {
    document.querySelectorAll(".unit-button").forEach((button) => {
      const active = button.dataset.unit === state.settings.weightUnit;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function printCategories(keys) {
    buildPrintReport(keys);
    previousDocumentTitle = document.title;
    document.title =
      keys.length === 1
        ? `${configByKey[keys[0]].title} - Health Report`
        : "My Health Journey - Complete Report";
    elements.printReport.hidden = false;
    window.requestAnimationFrame(() => window.print());
  }

  function buildPrintReport(keys) {
    elements.printReport.replaceChildren();

    const header = document.createElement("header");
    header.className = "print-report-header";
    const titleWrap = document.createElement("div");
    const title = document.createElement("h1");
    title.textContent = "My Health Journey";
    const subtitle = document.createElement("p");
    subtitle.textContent =
      keys.length === 1 ? configByKey[keys[0]].title : "Complete health tracker report";
    titleWrap.append(title, subtitle);
    const meta = document.createElement("p");
    meta.textContent = `Exported ${new Intl.DateTimeFormat("en-GB", {
      dateStyle: "long",
      timeStyle: "short",
    }).format(new Date())} · Weight unit: ${state.settings.weightUnit}`;
    header.append(titleWrap, meta);
    elements.printReport.append(header);

    keys.forEach((key) => {
      const config = configByKey[key];
      const section = document.createElement("section");
      section.className = "print-section";
      const heading = document.createElement("h2");
      heading.textContent = config.title;
      section.append(heading, createPrintTable(key));
      elements.printReport.append(section);
    });
  }

  function createPrintTable(key) {
    const config = configByKey[key];
    const columns = config.columns();
    const records = sortedRecords(key);
    const table = document.createElement("table");
    table.className = "print-table";
    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    columns.forEach((column) => {
      const th = document.createElement("th");
      th.scope = "col";
      th.textContent = column.label;
      headRow.append(th);
    });
    thead.append(headRow);

    const tbody = document.createElement("tbody");
    if (!records.length) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = columns.length;
      cell.textContent = "No records.";
      row.append(cell);
      tbody.append(row);
    } else {
      records.forEach((record) => {
        const row = document.createElement("tr");
        columns.forEach((column) => {
          const cell = document.createElement("td");
          cell.textContent = safeText(column.value(record));
          row.append(cell);
        });
        tbody.append(row);
      });
    }
    table.append(thead, tbody);
    return table;
  }

  function cleanupPrintReport() {
    elements.printReport.hidden = true;
    elements.printReport.replaceChildren();
    document.title = currentCategory
      ? `${configByKey[currentCategory].title} · My Health Journey`
      : previousDocumentTitle || "My Health Journey";
  }

  async function initCloud() {
    const config = getCloudConfig();
    if (!config) {
      updateCloudUi();
      return;
    }

    try {
      await loadSupabaseLibrary();
      supabaseClient = window.supabase.createClient(config.url, config.publishableKey, {
        auth: {
          storageKey: CLOUD_AUTH_STORAGE_KEY,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      });
      cloudIsAvailable = true;

      const { data, error } = await supabaseClient.auth.getSession();
      if (error) throw error;
      if (data.session && isAllowedCloudSession(data.session)) {
        await activateCloudSession(data.session, false);
        await syncAllRecords(false);
      } else if (data.session) {
        await supabaseClient.auth.signOut({ scope: "local" });
      }

      supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === "TOKEN_REFRESHED" && isAllowedCloudSession(session)) {
          cloudSession = session;
          updateCloudUi();
        }
        if (event === "SIGNED_OUT" && cloudSession) deactivateCloudSession();
      });
      updateCloudUi();
    } catch (error) {
      console.warn("Cloud sync is unavailable.", error);
      cloudIsAvailable = false;
      supabaseClient = null;
      updateCloudUi();
    }
  }

  function getCloudConfig() {
    const config = window.HEALTH_TRACKER_SUPABASE;
    const url = String(config?.url || "").trim();
    const publishableKey = String(config?.publishableKey || "").trim();
    const ownerUserId = String(config?.ownerUserId || "").trim().toLowerCase();
    if (
      !url ||
      !publishableKey ||
      !ownerUserId ||
      url.includes("YOUR_") ||
      publishableKey.includes("YOUR_") ||
      ownerUserId.includes("YOUR_")
    ) {
      return null;
    }
    return {
      url,
      publishableKey,
      ownerUserId,
    };
  }

  function loadSupabaseLibrary() {
    if (window.supabase?.createClient) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SUPABASE_SDK_URL;
      script.async = true;
      script.referrerPolicy = "no-referrer";
      script.addEventListener("load", () => {
        if (window.supabase?.createClient) resolve();
        else reject(new Error("Supabase library did not load correctly."));
      });
      script.addEventListener("error", () => reject(new Error("Supabase library could not load.")));
      document.head.append(script);
    });
  }

  function isAllowedCloudSession(session) {
    if (!session?.user || session.user.is_anonymous) return false;
    const expectedUserId = getCloudConfig()?.ownerUserId;
    if (!expectedUserId) return false;
    return String(session.user.id || "").toLowerCase() === expectedUserId;
  }

  async function activateCloudSession(session, offerImport) {
    if (!isAllowedCloudSession(session)) {
      throw new Error("This account is not the configured tracker owner.");
    }

    const accountStorageKey = userStorageKey(session.user.id);
    const browserState = activeStorageKey === STORAGE_KEY ? state : loadState(STORAGE_KEY);
    let accountState = loadState(accountStorageKey);
    let removeBrowserStateAfterSave = false;

    if (offerImport && hasAnyRecords(browserState)) {
      const shouldImport = window.confirm(
        "Import the health records currently saved on this browser into this private account?",
      );
      if (shouldImport) {
        accountState = mergeStatesForImport(accountState, browserState);
        removeBrowserStateAfterSave = true;
      }
    }

    const previousStorageKey = activeStorageKey;
    const previousState = state;
    activeStorageKey = accountStorageKey;
    state = accountState;
    cloudSession = session;
    if (!saveState()) {
      activeStorageKey = previousStorageKey;
      state = previousState;
      cloudSession = null;
      throw new Error("The account cache could not be created on this device.");
    }
    if (removeBrowserStateAfterSave) window.localStorage.removeItem(STORAGE_KEY);
    renderAll();
  }

  function deactivateCloudSession() {
    const preserveRecoveryCopy = hasPendingMutations();
    if (activeStorageKey !== STORAGE_KEY && !preserveRecoveryCopy) {
      window.localStorage.removeItem(activeStorageKey);
    }
    activeStorageKey = STORAGE_KEY;
    state = loadState(STORAGE_KEY);
    cloudSession = null;
    renderAll();
  }

  function showCloudDialog() {
    elements.cloudError.hidden = true;
    elements.cloudError.textContent = "";
    updateCloudUi();
    if (typeof elements.cloudDialog.showModal === "function") elements.cloudDialog.showModal();
    else elements.cloudDialog.setAttribute("open", "");
  }

  async function handleCloudSignin(event) {
    event.preventDefault();
    if (!cloudIsAvailable || !supabaseClient) return;
    const email = elements.cloudEmail.value.trim();
    const password = elements.cloudPassword.value;
    elements.cloudSigninButton.disabled = true;
    elements.cloudSigninButton.textContent = "Signing in…";
    elements.cloudError.hidden = true;

    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!isAllowedCloudSession(data.session)) {
        await supabaseClient.auth.signOut({ scope: "local" });
        throw new Error("This account is not allowed to use the private tracker.");
      }
      await activateCloudSession(data.session, true);
      elements.cloudPassword.value = "";
      await syncAllRecords(true);
    } catch (error) {
      elements.cloudError.textContent = error.message || "Sign-in failed. Check your details.";
      elements.cloudError.hidden = false;
    } finally {
      elements.cloudSigninButton.disabled = false;
      elements.cloudSigninButton.textContent = "Sign in";
    }
  }

  async function handleCloudSignout() {
    if (!supabaseClient) return;
    if (cloudSyncInProgress) {
      showToast("Please wait for private cloud sync to finish, then sign out.");
      return;
    }
    elements.signoutButton.disabled = true;
    try {
      if (hasPendingMutations()) await syncAllRecords(false);
      const preserveRecoveryCopy = hasPendingMutations();
      if (
        preserveRecoveryCopy &&
        !window.confirm(
          "Some changes have not reached the cloud. Sign out and keep a hidden recovery copy on this device?",
        )
      ) {
        return;
      }
      const accountStorageKey = activeStorageKey;
      const { error } = await supabaseClient.auth.signOut({ scope: "local" });
      if (error) throw error;
      if (accountStorageKey !== STORAGE_KEY && !preserveRecoveryCopy) {
        window.localStorage.removeItem(accountStorageKey);
      }
      activeStorageKey = STORAGE_KEY;
      state = loadState(STORAGE_KEY);
      cloudSession = null;
      renderAll();
      showToast(
        preserveRecoveryCopy
          ? "Signed out. Unsynced changes were kept in an account-specific recovery copy."
          : "Signed out. The synced cloud cache was removed from this device.",
      );
      elements.cloudDialog.close();
    } catch (error) {
      showToast(error.message || "Could not sign out.");
    } finally {
      elements.signoutButton.disabled = false;
    }
  }

  function updateCloudUi() {
    if (!elements.cloudButton) return;
    const dot = elements.cloudButton.querySelector(".status-dot");
    dot.classList.toggle("is-online", Boolean(cloudSession) && !cloudSyncInProgress);
    dot.classList.toggle("is-syncing", cloudSyncInProgress);

    if (cloudSyncInProgress) elements.cloudButtonLabel.textContent = "Syncing…";
    else if (cloudSession) elements.cloudButtonLabel.textContent = "Private cloud";
    else elements.cloudButtonLabel.textContent = "This browser";

    elements.cloudSigninForm.hidden = !cloudIsAvailable || Boolean(cloudSession);
    elements.cloudAccount.hidden = !cloudSession;
    elements.cloudSetupNote.hidden = cloudIsAvailable;

    if (!cloudIsAvailable) {
      elements.cloudDialogTitle.textContent = "Cloud setup needed";
      elements.cloudDialogCopy.textContent =
        "The tracker is saving to this browser. Follow the included dedicated Supabase guide to add private cross-device sync.";
    } else if (cloudSession) {
      elements.cloudDialogTitle.textContent = "Your private cloud";
      elements.cloudDialogCopy.textContent =
        "Records are cached in an account-specific store on this device and synced privately.";
      elements.cloudAccountEmail.textContent = cloudSession.user?.email || "Your account";
    } else {
      elements.cloudDialogTitle.textContent = "Connect your account";
      elements.cloudDialogCopy.textContent =
        "Sign in to sync. You will choose whether to import any separate browser-only records.";
    }

    if (cloudSession) {
      elements.storageHeading.textContent = "Private cloud sync is on";
      elements.storageCopy.textContent =
        "Your account has its own browser cache, which is erased from this device when you sign out.";
    } else {
      elements.storageHeading.textContent = "Saved on this browser";
      elements.storageCopy.textContent =
        "Your records stay on this device unless you connect your dedicated Supabase account.";
    }
  }

  async function syncAllRecords(showSuccess) {
    if (!supabaseClient || !cloudSession || cloudSyncInProgress) return;
    cloudSyncInProgress = true;
    updateCloudUi();

    try {
      const initialRows = await fetchAllCloudRows();
      mergeCloudRowsIntoState(initialRows);
      await normalizeDailyRecordIds();
      await flushPendingCloudMutations();

      const finalRows = await fetchAllCloudRows();
      replaceStateWithCloudRows(finalRows);
      state.pendingDeletes = [];
      if (!saveState()) throw new Error("The synced records could not be cached on this device.");
      renderAll();
      if (showSuccess) showToast("Private cloud sync complete.");
    } catch (error) {
      console.warn("Cloud sync failed.", error);
      showToast(
        error?.code === "42P01"
          ? "Supabase table not found. Run the included setup SQL first."
          : "Cloud sync could not finish. Pending changes remain safely on this device.",
      );
    } finally {
      cloudSyncInProgress = false;
      updateCloudUi();
    }
  }

  async function upsertRemote(category, record) {
    if (!supabaseClient || !cloudSession) return;
    try {
      setCloudSyncing(true);
      const { error } = await supabaseClient
        .from(SUPABASE_TABLE)
        .upsert(toCloudRow(category, record), { onConflict: "id" });
      if (error) throw error;
      const saved = state.records[category].find((item) => item.id === record.id);
      if (saved) {
        saved._pending = false;
        saved._restore = false;
        saveState();
      }
    } catch (error) {
      console.warn("Could not sync entry.", error);
      showToast("Saved on this device; the private cloud will retry later.");
    } finally {
      setCloudSyncing(false);
    }
  }

  async function deleteRemote(id) {
    if (!supabaseClient || !cloudSession) return;
    try {
      setCloudSyncing(true);
      const { data, error } = await supabaseClient
        .from(SUPABASE_TABLE)
        .update({ deleted_at: new Date().toISOString(), data: {} })
        .eq("id", id)
        .select("id");
      if (error) throw error;
      if (data?.length) {
        state.pendingDeletes = state.pendingDeletes.filter((pendingId) => pendingId !== id);
      }
      saveState();
    } catch (error) {
      console.warn("Could not sync deletion.", error);
      showToast("Deleted on this device; the private cloud will retry later.");
    } finally {
      setCloudSyncing(false);
    }
  }

  function setCloudSyncing(value) {
    cloudSyncInProgress = value;
    updateCloudUi();
  }

  function flattenPendingCloudRows() {
    const rows = [];
    RECORD_KEYS.forEach((key) => {
      state.records[key]
        .filter((record) => record._pending !== false)
        .forEach((record) => rows.push(toCloudRow(key, record)));
    });
    return rows;
  }

  async function flushPendingCloudMutations() {
    if (state.pendingDeletes.length) {
      const deletionTime = new Date().toISOString();
      for (const ids of chunkArray([...new Set(state.pendingDeletes)], 200)) {
        const { error } = await supabaseClient
          .from(SUPABASE_TABLE)
          .update({ deleted_at: deletionTime, data: {} })
          .in("id", ids);
        if (error) throw error;
      }
      state.pendingDeletes = [];
      saveState();
    }

    const pendingRows = flattenPendingCloudRows();
    for (const rows of chunkArray(pendingRows, 200)) {
      const { error } = await supabaseClient
        .from(SUPABASE_TABLE)
        .upsert(rows, { onConflict: "id" });
      if (error) throw error;
    }
  }

  async function fetchAllCloudRows() {
    const pageSize = 500;
    const rows = [];
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabaseClient
        .from(SUPABASE_TABLE)
        .select("id, category, entry_date, data, created_at, updated_at, deleted_at")
        .order("entry_date", { ascending: false })
        .order("id", { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) throw error;
      rows.push(...(data || []));
      if (!data || data.length < pageSize) break;
    }
    return rows;
  }

  function mergeCloudRowsIntoState(rows) {
    const remoteByCategory = cloudRowsByCategory(rows);
    const deletedIds = new Set(rows.filter((row) => row.deleted_at).map((row) => row.id));
    const pendingDeleteIds = new Set(state.pendingDeletes);

    RECORD_KEYS.forEach((key) => {
      const merged = new Map(
        remoteByCategory[key]
          .filter((record) => !pendingDeleteIds.has(record.id))
          .map((record) => [record.id, record]),
      );
      state.records[key].forEach((record) => {
        if (record._restore && pendingDeleteIds.has(record.id)) {
          pendingDeleteIds.delete(record.id);
          state.pendingDeletes = state.pendingDeletes.filter((id) => id !== record.id);
        }
        if (pendingDeleteIds.has(record.id)) return;
        if (deletedIds.has(record.id) && !record._restore) return;
        const remote = merged.get(record.id);
        if (!remote || record._pending !== false || record._restore) merged.set(record.id, record);
      });
      state.records[key] = [...merged.values()];
    });
  }

  function replaceStateWithCloudRows(rows) {
    const remoteByCategory = cloudRowsByCategory(rows);
    RECORD_KEYS.forEach((key) => {
      state.records[key] = remoteByCategory[key];
    });
  }

  function cloudRowsByCategory(rows) {
    const remoteByCategory = Object.fromEntries(RECORD_KEYS.map((key) => [key, []]));
    rows.forEach((row) => {
      if (row.deleted_at || !remoteByCategory[row.category]) return;
      const { _pending, _restore, ...payload } = row.data || {};
      remoteByCategory[row.category].push({
        ...payload,
        id: row.id,
        date: row.entry_date,
        createdAt: payload.createdAt || row.created_at,
        updatedAt: row.updated_at,
        _pending: false,
        _restore: false,
      });
    });
    return remoteByCategory;
  }

  function chunkArray(items, size) {
    const chunks = [];
    for (let index = 0; index < items.length; index += size) {
      chunks.push(items.slice(index, index + size));
    }
    return chunks;
  }

  function toCloudRow(category, record) {
    const { _pending, _restore, ...data } = record;
    const row = {
      id: record.id,
      category,
      entry_date: record.date,
      data,
    };
    if (_restore) row.deleted_at = null;
    return row;
  }

  function mergeRecordArrays(localRecords, remoteRecords) {
    const merged = new Map();
    [...remoteRecords, ...localRecords].forEach((record) => {
      const current = merged.get(record.id);
      if (!current || timestamp(record.updatedAt) >= timestamp(current.updatedAt)) {
        merged.set(record.id, record);
      }
    });
    return [...merged.values()];
  }

  function mergeStatesForImport(accountState, browserState) {
    const merged = accountState;
    merged.settings = { ...browserState.settings };
    merged.pendingDeletes = [
      ...new Set([...(accountState.pendingDeletes || []), ...(browserState.pendingDeletes || [])]),
    ];
    RECORD_KEYS.forEach((key) => {
      merged.records[key] = mergeRecordArrays(accountState.records[key], browserState.records[key]).map(
        (record) => ({ ...record, _pending: true, _restore: true }),
      );
    });
    return merged;
  }

  function hasAnyRecords(candidateState) {
    return RECORD_KEYS.some((key) => candidateState.records[key].length > 0);
  }

  function hasPendingMutations() {
    return (
      state.pendingDeletes.length > 0 ||
      RECORD_KEYS.some((key) =>
        state.records[key].some((record) => record._pending !== false),
      )
    );
  }

  function userStorageKey(userId) {
    return `${STORAGE_KEY}:user:${userId}`;
  }

  async function normalizeDailyRecordIds() {
    if (!cloudSession) return;
    for (const config of categoryConfigs.filter((item) => item.uniqueDate)) {
      const groups = new Map();
      const ordered = [...state.records[config.key]].sort((a, b) => {
        const pendingDifference = Number(b._pending !== false) - Number(a._pending !== false);
        if (pendingDifference !== 0) return pendingDifference;
        return timestamp(b.updatedAt) - timestamp(a.updatedAt);
      });
      for (const record of ordered) {
        if (!groups.has(record.date)) groups.set(record.date, []);
        groups.get(record.date).push(record);
      }

      const winners = [];
      for (const [date, records] of groups) {
        const desiredId = makeDailyRecordId(
          cloudSession.user.id,
          config.key,
          date,
        );
        const winner = records[0];
        records.forEach((record) => {
          if (record.id !== desiredId && !state.pendingDeletes.includes(record.id)) {
            state.pendingDeletes.push(record.id);
          }
        });
        if (winner.id !== desiredId || records.length > 1) {
          winner.id = desiredId;
          winner._pending = true;
          winner._restore = true;
        }
        winners.push(winner);
      }
      state.records[config.key] = winners;
    }
    saveState();
  }

  function sortedRecords(key) {
    return [...state.records[key]].sort((a, b) => {
      const byDate = safeText(b.date).localeCompare(safeText(a.date));
      if (byDate !== 0) return byDate;
      return timestamp(b.createdAt) - timestamp(a.createdAt);
    });
  }

  function formatWeightChange(record) {
    const chronological = [...state.records.weight].sort((a, b) => {
      const byDate = safeText(a.date).localeCompare(safeText(b.date));
      if (byDate !== 0) return byDate;
      return timestamp(a.createdAt) - timestamp(b.createdAt);
    });
    const index = chronological.findIndex((item) => item.id === record.id);
    if (index <= 0) return "First entry";
    const differenceKg = number(record.weightKg) - number(chronological[index - 1].weightKg);
    if (Math.abs(differenceKg) < 0.005) return "No change";
    const difference = convertKgToActiveUnit(Math.abs(differenceKg));
    return `${differenceKg < 0 ? "Down" : "Up"} ${formatDecimal(difference, 1)} ${
      state.settings.weightUnit
    }`;
  }

  function weightChangeTone(record) {
    const text = formatWeightChange(record);
    if (text.startsWith("Down")) return "positive";
    if (text.startsWith("Up")) return "warning";
    return "";
  }

  function strengthVolume(record) {
    if (record.loadKg === null || record.loadKg === "" || record.loadKg === undefined) return "—";
    const volumeKg = number(record.sets) * number(record.reps) * number(record.loadKg);
    return `${formatDecimal(convertKgToActiveUnit(volumeKg), 1)} ${state.settings.weightUnit}`;
  }

  function sumFoodCalories(date) {
    return state.records.food
      .filter((record) => record.date === date)
      .reduce((sum, record) => sum + number(record.calories), 0);
  }

  function sumExerciseCalories(date) {
    return ["cardio", "strength"].reduce(
      (total, key) =>
        total +
        state.records[key]
          .filter((record) => record.date === date)
          .reduce((sum, record) => sum + number(record.caloriesBurned), 0),
      0,
    );
  }

  function calorieNet(record) {
    return number(record.consumedKcal) - number(record.exerciseKcal);
  }

  function calorieRemaining(record) {
    return number(record.goalKcal) - calorieNet(record);
  }

  function calorieRemainingText(record) {
    const remaining = calorieRemaining(record);
    return remaining >= 0
      ? `${formatInteger(remaining)} kcal left`
      : `Over by ${formatInteger(Math.abs(remaining))} kcal`;
  }

  function formatWeight(weightKg) {
    return `${formatDecimal(convertKgToActiveUnit(number(weightKg)), 1)} ${state.settings.weightUnit}`;
  }

  function convertKgToActiveUnit(valueKg) {
    return state.settings.weightUnit === "lb" ? valueKg * LB_PER_KG : valueKg;
  }

  function convertActiveUnitToKg(value) {
    return state.settings.weightUnit === "lb" ? value / LB_PER_KG : value;
  }

  function optionalCalories(value) {
    return value === null || value === "" || value === undefined
      ? "—"
      : `${formatInteger(value)} kcal`;
  }

  function formatDate(isoDate) {
    if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return "—";
    const [year, month, day] = isoDate.split("-");
    return `${day}/${month}/${year}`;
  }

  function todayIso() {
    const date = new Date();
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }

  function isValidIsoDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split("-").map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    return (
      parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() === month - 1 &&
      parsed.getUTCDate() === day
    );
  }

  function formatDecimal(value, maximumFractionDigits = 1) {
    return new Intl.NumberFormat("en-GB", {
      maximumFractionDigits,
      minimumFractionDigits: 0,
    }).format(number(value));
  }

  function formatInteger(value) {
    return new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }).format(number(value));
  }

  function number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function positiveOrDefault(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  function safeText(value) {
    if (value === null || value === undefined || value === "") return "—";
    return String(value);
  }

  function recordDescriptor(category, record) {
    const detail =
      record.activity || record.exercise || record.item || record.dish || record.meal || "entry";
    return `${configByKey[category].title}: ${detail}`;
  }

  function fieldLabel(field) {
    return typeof field.label === "function" ? field.label() : field.label;
  }

  function roundForDisplay(value) {
    return Math.round(value * 10) / 10;
  }

  function timestamp(value) {
    const parsed = Date.parse(value || "");
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function findCurrentRecord(id) {
    return state.records[currentCategory].find((record) => record.id === id) || null;
  }

  function makeRecordId(config, date) {
    if (config.uniqueDate && cloudSession?.user?.id) {
      return makeDailyRecordId(cloudSession.user.id, config.key, date);
    }
    return makeId();
  }

  function makeDailyRecordId(userId, category, date) {
    return deterministicUuid(`${userId}:${category}:${date}`);
  }

  function deterministicUuid(value) {
    const bytes = deterministicBytes(value);
    bytes[6] = (bytes[6] & 0x0f) | 0x50;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    return formatUuidBytes(bytes);
  }

  function deterministicBytes(value) {
    const bytes = new Uint8Array(16);
    let hash = 2166136261;
    for (let round = 0; round < 4; round += 1) {
      let current = (hash + round * 2654435761) >>> 0;
      for (let index = 0; index < value.length; index += 1) {
        current ^= value.charCodeAt(index) + round;
        current = Math.imul(current, 16777619) >>> 0;
      }
      for (let byte = 0; byte < 4; byte += 1) {
        bytes[round * 4 + byte] = (current >>> (byte * 8)) & 0xff;
      }
      hash = current;
    }
    return bytes;
  }

  function makeId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    const bytes = new Uint8Array(16);
    if (window.crypto?.getRandomValues) window.crypto.getRandomValues(bytes);
    else {
      for (let index = 0; index < bytes.length; index += 1) {
        bytes[index] = Math.floor(Math.random() * 256);
      }
    }
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    return formatUuidBytes(bytes);
  }

  function formatUuidBytes(bytes) {
    const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(
      16,
      20,
    )}-${hex.slice(20, 32)}`;
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => elements.toast.classList.remove("is-visible"), 3200);
  }
})();
