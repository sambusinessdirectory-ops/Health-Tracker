(() => {
  "use strict";

  const STORAGE_KEY = "myHealthJourney:v1";
  const LANGUAGE_KEY = "myHealthJourney:language";
  const DASHBOARD_STATE_KEY = "myHealthJourney:dashboards:v1";
  const SUPABASE_TABLE = "health_entries";
  const APP_BASE_URL = new URL(".", document.currentScript.src);
  const SUPABASE_SDK_URL = new URL("vendor/supabase.min.js", APP_BASE_URL).href;
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
    "foodDesire",
    "exerciseDesire",
    "postExerciseFeeling",
    "foodPreference",
    "foodCutGoal",
    "sportPreference",
    "sportFocusGoal",
  ];
  const FORM_CATEGORY_KEYS = [
    "weight",
    "water",
    "cardio",
    "strength",
    "food",
    "groceries",
    "mealPrep",
    "calories",
    "foodPreference",
    "foodCutGoal",
    "sportPreference",
    "sportFocusGoal",
  ];
  const CHART_KEYS = [
    "weight",
    "water",
    "cardio",
    "strength",
    "food",
    "exerciseDesire",
    "postExerciseFeeling",
  ];
  const RATING_KEYS = ["exerciseDesire", "postExerciseFeeling"];
  const CARD_KEYS = [
    "weight",
    "water",
    "cardio",
    "strength",
    "food",
    "groceries",
    "mealPrep",
    "calories",
    "progress",
    "foodDesire",
    "foodPreference",
    "foodCutGoal",
    "sportPreference",
    "sportFocusGoal",
  ];
  let chartInstanceCounter = 0;
  const pwaCatalog = Array.isArray(window.HealthPwaCatalog) ? window.HealthPwaCatalog : [];
  const pwaByKey = new Map(pwaCatalog.map((entry) => [entry.key, entry]));
  const requestedTrackerKey =
    document.body.dataset.trackerKey ||
    (document.body.dataset.appMode === "food-desire" ? "foodDesire" : "");
  const standaloneTrackerKey = CARD_KEYS.includes(requestedTrackerKey) ? requestedTrackerKey : "";
  const appMode = standaloneTrackerKey ? "standalone" : "main";

  const t = (key, variables = {}) =>
    window.HealthI18n.translate(key, variables, currentLanguage);
  const locale = () => window.HealthI18n.locale(currentLanguage);

  let currentLanguage = window.HealthI18n.normalizeLanguage(
    window.localStorage.getItem(LANGUAGE_KEY) ||
      (navigator.language?.toLowerCase().startsWith("zh") ? "zh-Hant" : "en"),
  );

  const option = (value, labelKey) => ({ value, labelKey });
  const dateField = () => ({ key: "date", labelKey: "field.date", type: "date", required: true });
  const notesField = () => ({
    key: "notes",
    labelKey: "field.notes",
    type: "textarea",
    className: "full",
    placeholderKey: "field.optionalNote",
  });

  const categoryConfigs = [
    {
      key: "weight",
      number: "01",
      icon: "W",
      colors: ["#fffaf0", "#cfe8ff", "#2b7fd4"],
      uniqueDate: true,
      fields: [
        dateField(),
        {
          key: "weightKg",
          labelKey: "field.weight",
          type: "number",
          unitValue: true,
          required: true,
          min: 0.1,
          step: 0.1,
          placeholder: "180",
        },
        notesField(),
      ],
    },
    {
      key: "water",
      number: "02",
      icon: "H₂O",
      colors: ["#f1fbff", "#bde7f4", "#2391b4"],
      uniqueDate: true,
      fields: [
        dateField(),
        {
          key: "litres",
          labelKey: "field.water",
          type: "number",
          required: true,
          min: 0,
          step: 0.1,
          placeholder: "2.0",
          hintKey: "field.waterHint",
        },
        notesField(),
      ],
    },
    {
      key: "cardio",
      number: "03",
      icon: "↗",
      colors: ["#f3f8ff", "#c8dcff", "#527ad0"],
      fields: [
        dateField(),
        {
          key: "activity",
          labelKey: "field.cardioType",
          type: "text",
          required: true,
          className: "wide",
          placeholderKey: "field.cardioPlaceholder",
        },
        {
          key: "minutes",
          labelKey: "field.minutes",
          type: "number",
          required: true,
          min: 1,
          step: 1,
          placeholder: "30",
        },
        {
          key: "caloriesBurned",
          labelKey: "field.caloriesBurned",
          type: "number",
          min: 0,
          step: 1,
          placeholderKey: "field.optional",
        },
        notesField(),
      ],
    },
    {
      key: "strength",
      number: "04",
      icon: "KG",
      colors: ["#f3f6ff", "#d3d9fa", "#676fbd"],
      fields: [
        dateField(),
        {
          key: "exercise",
          labelKey: "field.exercise",
          type: "text",
          required: true,
          className: "wide",
          placeholderKey: "field.exercisePlaceholder",
        },
        {
          key: "sets",
          labelKey: "field.sets",
          type: "number",
          required: true,
          min: 1,
          step: 1,
          placeholder: "3",
          integer: true,
        },
        {
          key: "reps",
          labelKey: "field.reps",
          type: "number",
          required: true,
          min: 1,
          step: 1,
          placeholder: "10",
          integer: true,
        },
        {
          key: "loadKg",
          labelKey: "field.load",
          type: "number",
          unitValue: true,
          min: 0,
          step: 0.1,
          placeholderKey: "field.optional",
        },
        {
          key: "caloriesBurned",
          labelKey: "field.caloriesBurned",
          type: "number",
          min: 0,
          step: 1,
          placeholderKey: "field.optional",
        },
        notesField(),
      ],
    },
    {
      key: "food",
      number: "05",
      icon: "F",
      colors: ["#fffaf0", "#ffe0b9", "#d88735"],
      fields: [
        dateField(),
        {
          key: "meal",
          labelKey: "field.meal",
          type: "select",
          required: true,
          options: [
            option("Breakfast", "option.breakfast"),
            option("Lunch", "option.lunch"),
            option("Dinner", "option.dinner"),
            option("Snack", "option.snack"),
            option("Drink", "option.drink"),
          ],
        },
        {
          key: "item",
          labelKey: "field.foodDrink",
          type: "text",
          required: true,
          className: "wide",
          placeholderKey: "field.foodPlaceholder",
        },
        {
          key: "quantity",
          labelKey: "field.quantity",
          type: "number",
          required: true,
          min: 0.01,
          step: 0.1,
          placeholder: "1",
        },
        {
          key: "portionUnit",
          labelKey: "field.portionUnit",
          type: "select",
          required: true,
          options: [
            option("serving", "option.serving"),
            option("plate", "option.plate"),
            option("bowl", "option.bowl"),
            option("piece", "option.piece"),
            option("cup", "option.cup"),
            option("g", "option.g"),
            option("ml", "option.ml"),
          ],
        },
        {
          key: "calories",
          labelKey: "field.calories",
          type: "number",
          required: true,
          min: 0,
          step: 1,
          placeholder: "450",
        },
        notesField(),
      ],
    },
    {
      key: "groceries",
      number: "06",
      icon: "✓",
      colors: ["#f5fbf8", "#cfe9d9", "#489766"],
      fields: [
        dateField(),
        {
          key: "item",
          labelKey: "field.groceryItem",
          type: "text",
          required: true,
          className: "wide",
          placeholderKey: "field.groceryPlaceholder",
        },
        {
          key: "quantity",
          labelKey: "field.quantity",
          type: "number",
          required: true,
          min: 0.01,
          step: 0.1,
          placeholder: "2",
        },
        {
          key: "unit",
          labelKey: "field.unit",
          type: "select",
          required: true,
          options: [
            option("item", "option.item"),
            option("pack", "option.pack"),
            option("bag", "option.bag"),
            option("bottle", "option.bottle"),
            option("kg", "option.kg"),
            option("g", "option.g"),
            option("L", "option.litre"),
          ],
        },
        { key: "purchased", labelKey: "field.purchased", type: "checkbox", className: "checkbox-field" },
        notesField(),
      ],
    },
    {
      key: "mealPrep",
      number: "07",
      icon: "M",
      colors: ["#fff9f1", "#f2d8b8", "#bd7b43"],
      fields: [
        dateField(),
        {
          key: "dish",
          labelKey: "field.dish",
          type: "text",
          required: true,
          className: "wide",
          placeholderKey: "field.dishPlaceholder",
        },
        {
          key: "servings",
          labelKey: "field.servings",
          type: "number",
          required: true,
          min: 1,
          step: 1,
          placeholder: "4",
          integer: true,
        },
        {
          key: "caloriesPerServing",
          labelKey: "field.caloriesServing",
          type: "number",
          min: 0,
          step: 1,
          placeholderKey: "field.optional",
        },
        { key: "eatBy", labelKey: "field.eatBy", type: "date" },
        notesField(),
      ],
    },
    {
      key: "calories",
      number: "08",
      icon: "Σ",
      colors: ["#f4f9ff", "#c9e1ef", "#38799a"],
      uniqueDate: true,
      fields: [
        dateField(),
        {
          key: "goalKcal",
          labelKey: "field.dailyGoal",
          type: "number",
          required: true,
          min: 1,
          step: 1,
          placeholder: "2000",
        },
        {
          key: "consumedKcal",
          labelKey: "field.foodConsumed",
          type: "number",
          required: true,
          min: 0,
          step: 1,
          placeholder: "1800",
        },
        {
          key: "exerciseKcal",
          labelKey: "field.exerciseBurned",
          type: "number",
          required: true,
          min: 0,
          step: 1,
          placeholder: "250",
        },
        notesField(),
      ],
    },
    {
      key: "foodDesire",
      number: "10",
      icon: "♡",
      colors: ["#fff5f7", "#ffd9e4", "#bb5474"],
      custom: true,
      fields: [],
    },
    {
      key: "exerciseDesire",
      number: "03D",
      icon: "7",
      uniqueDate: true,
      hidden: true,
      fields: [],
    },
    {
      key: "postExerciseFeeling",
      number: "03F",
      icon: "7",
      uniqueDate: true,
      hidden: true,
      fields: [],
    },
    {
      key: "foodPreference",
      number: "11",
      icon: "♥",
      colors: ["#fff8f2", "#ffd9bf", "#c96b3e"],
      autoDate: true,
      fields: [
        {
          key: "item",
          labelKey: "field.foodPreference",
          type: "text",
          required: true,
          className: "wide",
          maxLength: 160,
          placeholderKey: "field.foodPreferencePlaceholder",
        },
        notesField(),
      ],
    },
    {
      key: "foodCutGoal",
      number: "12",
      icon: "↓",
      colors: ["#fff7f3", "#ffcfc7", "#b9534b"],
      autoDate: true,
      fields: [
        {
          key: "item",
          labelKey: "field.foodCutGoal",
          type: "text",
          required: true,
          className: "wide",
          maxLength: 160,
          placeholderKey: "field.foodCutGoalPlaceholder",
        },
        notesField(),
      ],
    },
    {
      key: "sportPreference",
      number: "13",
      icon: "S",
      colors: ["#f3fbff", "#c8e9f4", "#247b98"],
      autoDate: true,
      fields: [
        {
          key: "sport",
          labelKey: "field.sportPreference",
          type: "text",
          required: true,
          className: "wide",
          maxLength: 160,
          placeholderKey: "field.sportPreferencePlaceholder",
        },
        notesField(),
      ],
    },
    {
      key: "sportFocusGoal",
      number: "14",
      icon: "◎",
      colors: ["#f4f8ff", "#d3ddff", "#536fc0"],
      autoDate: true,
      fields: [
        {
          key: "sport",
          labelKey: "field.sportFocusGoal",
          type: "text",
          required: true,
          className: "wide",
          maxLength: 160,
          placeholderKey: "field.sportFocusGoalPlaceholder",
        },
        notesField(),
      ],
    },
  ];

  const progressCard = {
    key: "progress",
    number: "09",
    icon: "↗",
    colors: ["#f0f8ff", "#c4e1ff", "#296cb5"],
  };
  const configByKey = Object.fromEntries(categoryConfigs.map((config) => [config.key, config]));

  const hungerOptions = {
    hungerType: [option("physical", "option.physical"), option("mental", "option.mental")],
    emotionalState: [
      option("stressed", "option.stressed"),
      option("relaxed", "option.relaxed"),
      option("bored", "option.bored"),
      option("sad", "option.sad"),
      option("tired", "option.tired"),
      option("neutral", "option.neutral"),
    ],
    foodDesired: [
      option("meat", "option.meat"),
      option("sugar", "option.sugar"),
      option("salty", "option.salty"),
      option("snacks", "option.snacks"),
      option("others", "option.others"),
    ],
  };

  let activeStorageKey = STORAGE_KEY;
  let state = loadState(activeStorageKey);
  let currentCategory = null;
  let currentView = "dashboard";
  let lastCardKey = null;
  let editingId = null;
  let formSaveInProgress = false;
  let toastTimer = null;
  let supabaseClient = null;
  let cloudSession = null;
  let cloudIsAvailable = false;
  let cloudSyncInProgress = false;
  let previousDocumentTitle = document.title;
  let hungerOccurredAt = null;
  const ratingControllers = Object.fromEntries(
    RATING_KEYS.map((key) => [key, { timer: null, generation: 0, saveQueue: Promise.resolve() }]),
  );
  let ratingSaveQueue = Promise.resolve();
  const elements = {};

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    Object.assign(elements, {
      dashboardView: document.querySelector("#dashboard-view"),
      categoryView: document.querySelector("#category-view"),
      progressView: document.querySelector("#progress-view"),
      trackerGrid: document.querySelector("#tracker-grid"),
      categoryTitle: document.querySelector("#category-title"),
      categoryDescription: document.querySelector("#category-description"),
      categoryIcon: document.querySelector("#category-icon"),
      categoryKicker: document.querySelector("#category-kicker"),
      categoryChartPanel: document.querySelector("#category-chart-panel"),
      categoryChartSummary: document.querySelector("#category-chart-summary"),
      categoryChart: document.querySelector("#category-chart"),
      allChartsGrid: document.querySelector("#all-charts-grid"),
      formPanel: document.querySelector("#entry-panel"),
      recordsPanel: document.querySelector("#records-panel"),
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
      progressBackButton: document.querySelector("#progress-back-button"),
      standaloneAppLink: document.querySelector("#standalone-app-link"),
      progressStandaloneAppLink: document.querySelector("#progress-standalone-app-link"),
      categoryExportButton: document.querySelector("#category-export-button"),
      progressExportButton: document.querySelector("#progress-export-button"),
      exportAllButton: document.querySelector("#export-all-button"),
      installButton: document.querySelector("#install-button"),
      exerciseDesirePanel: document.querySelector("#exercise-desire-panel"),
      exerciseDesireScale: document.querySelector("#exercise-desire-scale"),
      exerciseDesireStatus: document.querySelector("#exercise-desire-status"),
      exerciseDesireChartDetails: document.querySelector("#exercise-desire-chart-details"),
      exerciseDesireChartSummary: document.querySelector("#exercise-desire-chart-summary"),
      exerciseDesireChart: document.querySelector("#exercise-desire-chart"),
      exerciseDesireTable: document.querySelector("#exercise-desire-table"),
      desireDateFrom: document.querySelector("#desire-date-from"),
      desireDateTo: document.querySelector("#desire-date-to"),
      desireExportButton: document.querySelector("#desire-export-button"),
      desireClearRangeButton: document.querySelector("#desire-clear-range-button"),
      desireRangeError: document.querySelector("#desire-range-error"),
      postExerciseFeelingScale: document.querySelector("#post-exercise-feeling-scale"),
      postExerciseFeelingStatus: document.querySelector("#post-exercise-feeling-status"),
      postExerciseFeelingChartDetails: document.querySelector("#post-exercise-feeling-chart-details"),
      postExerciseFeelingChartSummary: document.querySelector("#post-exercise-feeling-chart-summary"),
      postExerciseFeelingChart: document.querySelector("#post-exercise-feeling-chart"),
      postExerciseFeelingTable: document.querySelector("#post-exercise-feeling-table"),
      postFeelingDateFrom: document.querySelector("#post-feeling-date-from"),
      postFeelingDateTo: document.querySelector("#post-feeling-date-to"),
      postFeelingExportButton: document.querySelector("#post-feeling-export-button"),
      postFeelingClearRangeButton: document.querySelector("#post-feeling-clear-range-button"),
      postFeelingRangeError: document.querySelector("#post-feeling-range-error"),
      foodDesirePanel: document.querySelector("#food-desire-panel"),
      foodDesireSummary: document.querySelector("#food-desire-summary"),
      recordHungerButton: document.querySelector("#record-hunger-button"),
      foodDesireDialog: document.querySelector("#food-desire-dialog"),
      foodDesireForm: document.querySelector("#food-desire-form"),
      hungerType: document.querySelector("#hunger-type"),
      emotionalState: document.querySelector("#emotional-state"),
      foodDesired: document.querySelector("#food-desired"),
      otherFoodField: document.querySelector("#other-food-field"),
      otherFood: document.querySelector("#other-food"),
      foodDesireError: document.querySelector("#food-desire-error"),
      foodDesireConfirmButton: document.querySelector("#food-desire-confirm-button"),
      foodDesireCancelButton: document.querySelector("#food-desire-cancel-button"),
      cloudButton: document.querySelector("#cloud-button"),
      cloudButtonLabel: document.querySelector("#cloud-button-label"),
      miniCloudButton: document.getElementById("mini-cloud-button"),
      miniCloudButtonLabel: document.getElementById("mini-cloud-button-label"),
      progressCloudButton: document.getElementById("progress-cloud-button"),
      progressCloudButtonLabel: document.getElementById("progress-cloud-button-label"),
      cloudDialog: document.querySelector("#cloud-dialog"),
      cloudDialogTitle: document.querySelector("#cloud-dialog-title"),
      cloudDialogCopy: document.querySelector("#cloud-dialog-copy"),
      cloudSigninForm: document.querySelector("#cloud-signin-form"),
      cloudEmail: document.querySelector("#cloud-email"),
      cloudPassword: document.querySelector("#cloud-password"),
      cloudSigninButton: document.querySelector("#cloud-signin-button"),
      cloudSigninButtonLabel: document.querySelector("#cloud-signin-button span"),
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
    const hashKey = window.location.hash.replace("#", "");
    if (standaloneTrackerKey === "progress") showProgress(false);
    else if (standaloneTrackerKey) openCategory(standaloneTrackerKey, false);
    else if (hashKey === "progress") showProgress(false);
    else if (configByKey[hashKey] && !configByKey[hashKey].hidden) openCategory(hashKey, false);
  }

  function bindEvents() {
    document.querySelectorAll(".unit-button").forEach((button) => {
      button.addEventListener("click", () => setWeightUnit(button.dataset.unit));
    });
    document.querySelectorAll(".language-button").forEach((button) => {
      button.addEventListener("click", () => setLanguage(button.dataset.language));
    });
    elements.backButton.addEventListener("click", handleBack);
    elements.progressBackButton.addEventListener("click", handleBack);
    elements.form.addEventListener("submit", handleSaveEntry);
    elements.form.addEventListener("input", clearFieldErrors);
    elements.cancelButton.addEventListener("click", resetForm);
    elements.fillCaloriesButton.addEventListener("click", fillCaloriesFromLogs);
    elements.categoryExportButton.addEventListener("click", () => {
      if (currentCategory) printCategories([currentCategory]);
    });
    elements.progressExportButton.addEventListener("click", printProgressCharts);
    elements.exportAllButton.addEventListener("click", () => printCategories(RECORD_KEYS));
    elements.installButton.addEventListener("click", handleInstall);
    document.querySelectorAll("[data-pwa-install]").forEach((button) => {
      button.addEventListener("click", handleInstall);
    });
    elements.recordHungerButton.addEventListener("click", showFoodDesireDialog);
    elements.foodDesired.addEventListener("change", updateOtherFoodVisibility);
    elements.foodDesireForm.addEventListener("submit", handleFoodDesireSave);
    elements.foodDesireCancelButton.addEventListener("click", closeFoodDesireDialog);
    elements.foodDesireDialog.addEventListener("close", resetFoodDesireDialog);
    elements.desireExportButton.addEventListener("click", () => exportRatingRange("exerciseDesire"));
    elements.desireClearRangeButton.addEventListener("click", () => {
      elements.desireDateFrom.value = "";
      elements.desireDateTo.value = "";
      elements.desireRangeError.hidden = true;
    });
    elements.postFeelingExportButton.addEventListener("click", () => exportRatingRange("postExerciseFeeling"));
    elements.postFeelingClearRangeButton.addEventListener("click", () => {
      elements.postFeelingDateFrom.value = "";
      elements.postFeelingDateTo.value = "";
      elements.postFeelingRangeError.hidden = true;
    });
    elements.cloudButton.addEventListener("click", showCloudDialog);
    elements.miniCloudButton?.addEventListener("click", showCloudDialog);
    elements.progressCloudButton?.addEventListener("click", showCloudDialog);
    elements.cloudSigninForm.addEventListener("submit", handleCloudSignin);
    elements.syncNowButton.addEventListener("click", () => syncAllRecords(true));
    elements.signoutButton.addEventListener("click", handleCloudSignout);
    window.addEventListener("hashchange", handleHashChange);
    window.addEventListener("storage", handleExternalStorageChange);
    window.addEventListener("afterprint", cleanupPrintReport);
    window.addEventListener("online", () => {
      if (cloudSession && hasPendingMutations()) syncAllRecords(false);
    });
  }

  function freshState() {
    return {
      schemaVersion: 3,
      settings: { weightUnit: "lb", dailyWaterGoalL: 2, dailyCalorieGoalKcal: 2000 },
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
      loaded.settings.dailyWaterGoalL = positiveOrDefault(parsed.settings?.dailyWaterGoalL, 2);
      loaded.settings.dailyCalorieGoalKcal = positiveOrDefault(
        parsed.settings?.dailyCalorieGoalKcal,
        2000,
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
      showToast(t("validation.saveFailed"));
      console.error(error);
      return false;
    }
  }

  function handleExternalStorageChange(event) {
    if (event.key !== activeStorageKey || !event.newValue) return;
    const formSnapshot = currentCategory && FORM_CATEGORY_KEYS.includes(currentCategory) ? captureFormSnapshot() : null;
    state = loadState(activeStorageKey);
    renderAll();
    if (formSnapshot) restoreFormSnapshot(formSnapshot);
  }

  function renderAll() {
    cancelRatingTimer();
    applyStaticTranslations();
    updateLanguageButtons();
    updateUnitButtons();
    renderDashboard();
    if (currentView === "category" && currentCategory) renderCategory();
    if (currentView === "progress") {
      renderAllCharts();
      document.title = appMode === "standalone" ? configTitle("progress") : `${configTitle("progress")} · ${t("app.name")}`;
    }
    updateCloudUi();
  }

  function applyStaticTranslations() {
    document.documentElement.lang = currentLanguage;
    document.querySelectorAll("[data-i18n]").forEach((element) => {
      element.textContent = t(element.dataset.i18n);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
      element.placeholder = t(element.dataset.i18nPlaceholder);
    });
    const skip = document.querySelector(".skip-link");
    if (skip) skip.textContent = currentLanguage === "zh-Hant" ? "跳到追蹤內容" : "Skip to tracker";
    document.querySelectorAll(".language-control [role='group'], .category-nav .language-button:first-child").forEach((element) => {
      const group = element.matches("[role='group']") ? element : element.closest("[role='group']");
      if (!group) return;
      group.setAttribute("aria-label", currentLanguage === "zh-Hant" ? "選擇語言" : "Choose language");
    });
    document.querySelectorAll(".category-nav .language-button").forEach((button) => {
      const group = button.closest("[role='group']");
      if (group) group.setAttribute("aria-label", currentLanguage === "zh-Hant" ? "選擇語言" : "Choose language");
    });
    document.querySelectorAll(".unit-control [role='group'], .category-nav .unit-button:first-child").forEach((element) => {
      const group = element.matches("[role='group']") ? element : element.closest("[role='group']");
      if (!group) return;
      group.setAttribute("aria-label", currentLanguage === "zh-Hant" ? "選擇體重單位" : "Choose weight unit");
    });
    elements.trackerGrid?.setAttribute("aria-label", currentLanguage === "zh-Hant" ? "健康追蹤項目" : "Health trackers");
    document.querySelector(".hero-actions")?.setAttribute("aria-label", currentLanguage === "zh-Hant" ? "追蹤器控制項" : "Tracker controls");
    document.querySelector("#category-view .category-nav")?.setAttribute("aria-label", currentLanguage === "zh-Hant" ? "項目導覽" : "Category navigation");
    document.querySelector("#progress-view .category-nav")?.setAttribute("aria-label", currentLanguage === "zh-Hant" ? "圖表導覽" : "Dashboard navigation");
    elements.exerciseDesireScale?.setAttribute("aria-label", currentLanguage === "zh-Hant" ? "運動意欲一至七分" : "Exercise desire from 1 to 7");
    elements.postExerciseFeelingScale?.setAttribute(
      "aria-label",
      currentLanguage === "zh-Hant" ? "運動後感受一至七分" : "Post-exercise feeling from 1 to 7",
    );
    elements.allChartsGrid?.setAttribute("aria-label", currentLanguage === "zh-Hant" ? "所有進度圖表" : "All progress dashboards");
    elements.printReport?.setAttribute("aria-label", currentLanguage === "zh-Hant" ? "可列印健康報告" : "Printable health report");
    elements.foodDesireDialog?.querySelector(".dialog-close")?.setAttribute("aria-label", t("aria.closeHunger"));
    elements.cloudDialog?.querySelector(".dialog-close")?.setAttribute("aria-label", t("aria.closeCloud"));
    if (appMode === "standalone") {
      elements.backButton.textContent = t("mini.back");
      elements.progressBackButton.textContent = t("mini.back");
    }
  }

  function configTitle(key) {
    return t(`tracker.${key}.title`);
  }

  function configDescription(key) {
    return t(`tracker.${key}.description`);
  }

  function configCardDescription(key) {
    return t(`tracker.${key}.card`);
  }

  function renderDashboard() {
    elements.trackerGrid.replaceChildren();
    CARD_KEYS.forEach((key) => {
      const config = key === "progress" ? progressCard : configByKey[key];
      const card = document.createElement("button");
      card.type = "button";
      card.className = "tracker-card";
      card.dataset.number = config.number;
      card.dataset.category = key;
      card.style.setProperty("--card-start", config.colors[0]);
      card.style.setProperty("--card-end", config.colors[1]);
      card.style.setProperty("--card-key", config.colors[2]);
      card.setAttribute("aria-label", `${currentLanguage === "zh-Hant" ? "開啟" : "Open"} ${configTitle(key)}`);
      const inner = document.createElement("span");
      inner.className = "tracker-card-inner";
      const icon = document.createElement("span");
      icon.className = "tracker-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = config.icon;
      const title = document.createElement("span");
      title.className = "tracker-card-title";
      title.textContent = configTitle(key);
      const description = document.createElement("p");
      description.textContent = configCardDescription(key);
      const stat = document.createElement("span");
      stat.className = "card-stat";
      stat.textContent = cardStat(key);
      inner.append(icon, title, description, stat);
      card.append(inner);
      card.addEventListener("click", () => (key === "progress" ? showProgress() : openCategory(key)));
      elements.trackerGrid.append(card);
    });
    renderSummary();
  }

  function renderSummary() {
    const today = todayIso();
    const latestWeight = sortedRecords("weight")[0];
    if (latestWeight) {
      elements.summaryWeight.textContent = formatWeight(latestWeight.weightKg);
      elements.summaryWeightNote.textContent = t("summary.recorded", { date: formatDate(latestWeight.date) });
    } else {
      elements.summaryWeight.textContent = "—";
      elements.summaryWeightNote.textContent = t("summary.noEntry");
    }
    const waterToday = sumByDate("water", today, (record) => number(record.litres));
    elements.summaryWater.textContent = formatLitres(waterToday);
    elements.summaryWaterNote.textContent = t("summary.ofLitres", {
      amount: formatDecimal(state.settings.dailyWaterGoalL, 2),
    });
    const activityToday = sumByDate("cardio", today, (record) => number(record.minutes));
    elements.summaryActivity.textContent = formatMinutes(activityToday);
    const foodToday = sumFoodCalories(today);
    const calorieRecord = state.records.calories.find((record) => record.date === today);
    const goal = calorieRecord?.goalKcal || state.settings.dailyCalorieGoalKcal;
    elements.summaryCalories.textContent = formatCalories(foodToday);
    elements.summaryCaloriesNote.textContent = t("summary.ofCalories", { amount: formatInteger(goal) });
  }

  function cardStat(key) {
    const today = todayIso();
    const records = state.records[key] || [];
    if (key === "progress") return t("record.chartsCount");
    if (key === "weight") {
      const latest = sortedRecords(key)[0];
      return latest ? t("record.latest", { value: formatWeight(latest.weightKg) }) : t("record.ready");
    }
    if (key === "water") {
      const total = sumByDate(key, today, (record) => number(record.litres));
      return t("record.todayValue", { value: formatLitres(total) });
    }
    if (key === "cardio") {
      const minutes = sumByDate(key, today, (record) => number(record.minutes));
      return t("record.todayValue", { value: formatMinutes(minutes) });
    }
    if (key === "strength") {
      return t("record.exerciseToday", { count: records.filter((record) => record.date === today).length });
    }
    if (key === "food") return t("record.todayValue", { value: formatCalories(sumFoodCalories(today)) });
    if (key === "groceries") {
      const pending = records.filter((record) => !record.purchased).length;
      return t("record.itemsLeft", { count: pending, items: t(pending === 1 ? "record.item" : "record.items") });
    }
    if (key === "mealPrep") {
      const servings = records.reduce((sum, record) => sum + number(record.servings), 0);
      return t("record.portions", { count: formatInteger(servings) });
    }
    if (key === "calories") {
      const latest = sortedRecords(key)[0];
      return latest ? calorieRemainingText(latest) : t("record.setGoal");
    }
    if (key === "foodDesire") {
      return t("record.hungerToday", { count: records.filter((record) => record.date === today).length });
    }
    return `${records.length} ${t(records.length === 1 ? "record.entry" : "record.entries")}`;
  }

  function openCategory(key, updateHash = true) {
    const config = configByKey[key];
    if (!config || config.hidden) return;
    cancelRatingTimer();
    currentCategory = key;
    currentView = "category";
    lastCardKey = key;
    editingId = null;
    elements.dashboardView.hidden = true;
    elements.progressView.hidden = true;
    elements.categoryView.hidden = false;
    updateStandaloneLinks(key);
    renderCategory();
    if (updateHash && window.location.hash !== `#${key}`) {
      window.history.pushState(null, "", `#${key}`);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
    window.setTimeout(() => elements.categoryTitle.focus(), 0);
  }

  function showProgress(updateHash = true) {
    cancelRatingTimer();
    currentCategory = null;
    currentView = "progress";
    lastCardKey = "progress";
    elements.dashboardView.hidden = true;
    elements.categoryView.hidden = true;
    elements.progressView.hidden = false;
    updateStandaloneLinks("progress");
    renderAllCharts();
    document.title = appMode === "standalone" ? configTitle("progress") : `${configTitle("progress")} · ${t("app.name")}`;
    if (updateHash && window.location.hash !== "#progress") {
      window.history.pushState(null, "", "#progress");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
    window.setTimeout(() => document.querySelector("#progress-title")?.focus(), 0);
  }

  function handleBack() {
    if (appMode === "standalone") {
      window.location.href = "../";
      return;
    }
    showDashboard();
  }

  function showDashboard() {
    cancelRatingTimer();
    const returnFocusKey = currentCategory || lastCardKey;
    currentCategory = null;
    currentView = "dashboard";
    editingId = null;
    elements.categoryView.hidden = true;
    elements.progressView.hidden = true;
    elements.dashboardView.hidden = false;
    document.title = t("app.name");
    renderDashboard();
    if (window.location.hash) window.history.pushState(null, "", window.location.pathname);
    window.scrollTo({ top: 0, behavior: "smooth" });
    window.setTimeout(() => elements.trackerGrid.querySelector(`[data-category="${returnFocusKey}"]`)?.focus(), 0);
  }

  function handleHashChange() {
    if (appMode === "standalone") return;
    const key = window.location.hash.replace("#", "");
    if (key === "progress") showProgress(false);
    else if (configByKey[key] && !configByKey[key].hidden) openCategory(key, false);
    else if (currentView !== "dashboard") showDashboard();
  }

  function renderCategory() {
    const config = configByKey[currentCategory];
    if (!config) return;
    elements.categoryTitle.textContent = configTitle(currentCategory);
    elements.categoryDescription.textContent = configDescription(currentCategory);
    elements.categoryIcon.textContent = config.icon;
    elements.categoryKicker.textContent = `${t("tracker.kicker")} ${config.number}`;
    elements.fillCaloriesButton.hidden = currentCategory !== "calories";
    elements.formPanel.hidden = Boolean(config.custom);
    elements.recordsPanel.hidden = false;
    elements.foodDesirePanel.hidden = currentCategory !== "foodDesire";
    const isExerciseTracker = currentCategory === "cardio" || currentCategory === "strength";
    elements.exerciseDesirePanel.hidden = !isExerciseTracker;
    elements.categoryChartPanel.hidden = !["weight", "water", "cardio", "strength", "food"].includes(currentCategory);
    if (!config.custom) renderForm(editingId ? findCurrentRecord(editingId) : null);
    renderTable();
    renderCategoryChart();
    if (isExerciseTracker) renderRatingSurveys();
    if (currentCategory === "foodDesire") renderFoodDesireSummary();
    updateUnitButtons();
    document.title = appMode === "standalone" ? configTitle(currentCategory) : `${configTitle(currentCategory)} · ${t("app.name")}`;
    if (appMode === "standalone") {
      elements.backButton.textContent = t("mini.back");
      elements.categoryExportButton.hidden = false;
    }
  }

  function updateStandaloneLinks(key) {
    const catalogEntry = pwaByKey.get(key);
    const link = key === "progress" ? elements.progressStandaloneAppLink : elements.standaloneAppLink;
    if (!link) return;
    link.hidden = appMode === "standalone" || !catalogEntry;
    if (catalogEntry) link.href = new URL(`${catalogEntry.slug}/`, APP_BASE_URL).href;
  }

  function renderForm(record = null) {
    const config = configByKey[currentCategory];
    if (!config || config.custom) return;
    elements.formFields.replaceChildren();
    elements.formError.hidden = true;
    elements.formError.textContent = "";
    config.fields.forEach((field) => {
      const label = document.createElement("label");
      label.className = `field ${field.className || ""}`.trim();
      const labelText = fieldLabel(field);
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
      if (field.hintKey) {
        const hint = document.createElement("small");
        hint.className = "input-hint";
        hint.textContent = t(field.hintKey);
        label.append(hint);
      }
      elements.formFields.append(label);
    });
    const editing = Boolean(record);
    elements.formTitle.textContent = editing
      ? t("section.editEntry", { tracker: configTitle(currentCategory) })
      : t("section.addEntry");
    elements.saveButton.textContent = t(editing ? "action.update" : "action.save");
    elements.cancelButton.hidden = !editing;
  }

  function createFieldInput(field, record) {
    let input;
    if (field.type === "select") {
      input = document.createElement("select");
      field.options.forEach((choice) => {
        const optionElement = document.createElement("option");
        optionElement.value = choice.value;
        optionElement.textContent = t(choice.labelKey);
        input.append(optionElement);
      });
    } else if (field.type === "textarea") input = document.createElement("textarea");
    else {
      input = document.createElement("input");
      input.type = field.type;
    }
    input.id = `field-${field.key}`;
    input.name = field.key;
    input.required = Boolean(field.required);
    if (field.min !== undefined) input.min = String(field.min);
    if (field.step !== undefined) input.step = String(field.step);
    if (field.maxLength !== undefined) input.maxLength = field.maxLength;
    if (field.placeholderKey) input.placeholder = t(field.placeholderKey);
    else if (field.placeholder) input.placeholder = field.placeholder;
    const rawValue = record?.[field.key];
    if (field.type === "checkbox") input.checked = Boolean(rawValue);
    else if (field.unitValue && rawValue !== null && rawValue !== undefined && rawValue !== "") {
      input.value = String(roundForDisplay(convertKgToActiveUnit(number(rawValue))));
    } else if (rawValue !== null && rawValue !== undefined) input.value = String(rawValue);
    else if (field.key === "date") input.value = todayIso();
    else if (field.key === "goalKcal") input.value = String(state.settings.dailyCalorieGoalKcal);
    else if (field.key === "consumedKcal" || field.key === "exerciseKcal") input.value = "0";
    else if (field.key === "quantity") input.value = "1";
    return input;
  }

  async function handleSaveEntry(event) {
    event.preventDefault();
    if (formSaveInProgress) return;
    if (cloudSession && cloudSyncInProgress) {
      showToast(t("cloud.waitSave"));
      return;
    }
    formSaveInProgress = true;
    elements.saveButton.disabled = true;
    try {
      const config = configByKey[currentCategory];
      if (!config || config.custom) return;
      clearFieldErrors();
      const result = collectFormRecord(config);
      if (!result.ok) {
        elements.formError.textContent = result.error;
        elements.formError.hidden = false;
        const invalidInput =
          (result.fieldKey && elements.form.elements[result.fieldKey]) || elements.form.querySelector(":invalid");
        invalidInput?.setAttribute("aria-invalid", "true");
        invalidInput?.setAttribute("aria-describedby", "form-error");
        invalidInput?.focus();
        return;
      }
      const stateBeforeSave = JSON.stringify(state);
      const now = new Date().toISOString();
      const records = state.records[currentCategory];
      let existingIndex = editingId ? records.findIndex((record) => record.id === editingId) : -1;
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
      if (savedRecord._restore) state.pendingDeletes = state.pendingDeletes.filter((id) => id !== savedRecord.id);
      if (currentCategory === "calories") state.settings.dailyCalorieGoalKcal = number(savedRecord.goalKcal);
      if (!saveState()) {
        state = JSON.parse(stateBeforeSave);
        return;
      }
      showToast(t(existingIndex >= 0 ? "toast.updated" : "toast.saved"));
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
      const value = field.type === "checkbox" ? input.checked : input.value.trim();
      if (field.required && (value === "" || value === false)) {
        return { ok: false, error: t("validation.required", { field: fieldLabel(field) }), fieldKey: field.key };
      }
      if (field.type === "number") {
        if (value === "") {
          record[field.key] = null;
          continue;
        }
        const parsed = Number(value);
        if (!Number.isFinite(parsed)) {
          return { ok: false, error: t("validation.number", { field: fieldLabel(field) }), fieldKey: field.key };
        }
        if (field.min !== undefined && parsed < field.min) {
          return {
            ok: false,
            error: t("validation.minimum", { field: fieldLabel(field), minimum: field.min }),
            fieldKey: field.key,
          };
        }
        if (field.integer && !Number.isInteger(parsed)) {
          return { ok: false, error: t("validation.integer", { field: fieldLabel(field) }), fieldKey: field.key };
        }
        record[field.key] = field.unitValue ? convertActiveUnitToKg(parsed) : parsed;
      } else record[field.key] = value;
    }
    if (config.autoDate) {
      record.date = editingId ? findCurrentRecord(editingId)?.date || todayIso() : todayIso();
    }
    if (!isValidIsoDate(record.date)) return { ok: false, error: t("validation.date"), fieldKey: "date" };
    if (currentCategory === "water" && number(record.litres) > 20) {
      return { ok: false, error: t("validation.waterHigh"), fieldKey: "litres" };
    }
    return { ok: true, record };
  }

  function clearFieldErrors() {
    elements.formError.hidden = true;
    elements.formError.textContent = "";
    elements.form.querySelectorAll('[aria-invalid="true"]').forEach((input) => {
      input.removeAttribute("aria-invalid");
      if (input.getAttribute("aria-describedby") === "form-error") input.removeAttribute("aria-describedby");
    });
  }

  function columnsFor(key) {
    const notes = { label: t("column.notes"), value: (record) => record.notes || "—", className: "table-note" };
    const date = { label: t("column.date"), value: (record) => formatDate(record.date) };
    if (key === "weight")
      return [
        date,
        { label: t("column.weight", { unit: state.settings.weightUnit }), value: (record) => formatWeight(record.weightKg), className: "table-number" },
        { label: t("column.change"), value: formatWeightChange, pill: weightChangeTone },
        notes,
      ];
    if (key === "water")
      return [
        date,
        { label: t("column.water"), value: (record) => formatLitres(record.litres), className: "table-number" },
        {
          label: t("column.goal"),
          value: (record) => `${Math.round((number(record.litres) / state.settings.dailyWaterGoalL) * 100)}%`,
          pill: (record) => (number(record.litres) >= state.settings.dailyWaterGoalL ? "positive" : ""),
        },
        notes,
      ];
    if (key === "cardio")
      return [
        date,
        { label: t("column.cardioType"), value: (record) => record.activity },
        { label: t("column.minutes"), value: (record) => formatMinutes(record.minutes), className: "table-number" },
        { label: t("column.calories"), value: (record) => optionalCalories(record.caloriesBurned) },
        notes,
      ];
    if (key === "strength")
      return [
        date,
        { label: t("column.exercise"), value: (record) => record.exercise },
        { label: t("column.sets"), value: (record) => formatInteger(record.sets) },
        { label: t("column.reps"), value: (record) => formatInteger(record.reps) },
        { label: t("column.totalReps"), value: (record) => formatInteger(number(record.sets) * number(record.reps)), className: "table-number" },
        {
          label: t("column.load", { unit: state.settings.weightUnit }),
          value: (record) => isBlank(record.loadKg) ? "—" : formatWeight(record.loadKg),
          className: "table-number",
        },
        { label: t("column.volume", { unit: state.settings.weightUnit }), value: strengthVolume },
        { label: t("column.calories"), value: (record) => optionalCalories(record.caloriesBurned) },
        notes,
      ];
    if (key === "food")
      return [
        date,
        { label: t("column.meal"), value: (record) => mealLabel(record.meal) },
        { label: t("column.foodDrink"), value: (record) => record.item },
        { label: t("column.portion"), value: (record) => `${formatDecimal(record.quantity, 2)} ${portionLabel(record.portionUnit)}` },
        { label: t("column.calories"), value: (record) => formatCalories(record.calories), className: "table-number" },
        notes,
      ];
    if (key === "groceries")
      return [
        date,
        { label: t("column.item"), value: (record) => record.item },
        { label: t("column.quantity"), value: (record) => `${formatDecimal(record.quantity, 2)} ${groceryUnitLabel(record.unit)}` },
        { label: t("column.status"), value: (record) => t(record.purchased ? "record.purchased" : "record.toBuy"), pill: (record) => (record.purchased ? "positive" : "warning") },
        notes,
      ];
    if (key === "mealPrep")
      return [
        { label: t("column.prepDate"), value: (record) => formatDate(record.date) },
        { label: t("column.dish"), value: (record) => record.dish },
        { label: t("column.servings"), value: (record) => formatInteger(record.servings) },
        { label: t("column.caloriesServing"), value: (record) => optionalCalories(record.caloriesPerServing) },
        {
          label: t("column.totalCalories"),
          value: (record) => isBlank(record.caloriesPerServing) ? "—" : formatCalories(number(record.servings) * number(record.caloriesPerServing)),
        },
        { label: t("column.eatBy"), value: (record) => formatDate(record.eatBy) },
        notes,
      ];
    if (key === "calories")
      return [
        date,
        { label: t("column.goal"), value: (record) => formatCalories(record.goalKcal) },
        { label: t("column.food"), value: (record) => formatCalories(record.consumedKcal) },
        { label: t("column.exerciseCalories"), value: (record) => formatCalories(record.exerciseKcal) },
        { label: t("column.net"), value: (record) => formatCalories(calorieNet(record)), className: "table-number" },
        { label: t("column.remaining"), value: calorieRemainingText, pill: (record) => (calorieRemaining(record) >= 0 ? "positive" : "warning") },
        notes,
      ];
    if (key === "foodDesire")
      return [
        date,
        { label: t("column.time"), value: (record) => formatTime(record.occurredAt) },
        { label: t("column.hungerType"), value: (record) => t(`option.${record.hungerType}`) },
        { label: t("column.emotion"), value: (record) => t(`option.${record.emotionalState}`) },
        { label: t("column.foodDesired"), value: foodDesireLabel },
      ];
    if (key === "exerciseDesire")
      return [
        date,
        { label: t("column.rating"), value: (record) => t("record.ratingValue", { value: formatInteger(record.rating) }), className: "table-number" },
      ];
    if (key === "postExerciseFeeling")
      return [
        date,
        { label: t("column.postRating"), value: (record) => t("record.ratingValue", { value: formatInteger(record.rating) }), className: "table-number" },
      ];
    if (key === "foodPreference" || key === "foodCutGoal")
      return [
        { label: t("column.addedOn"), value: (record) => formatDate(record.date) },
        { label: t(key === "foodPreference" ? "column.foodPreference" : "column.foodCutGoal"), value: (record) => record.item },
        notes,
      ];
    if (key === "sportPreference" || key === "sportFocusGoal")
      return [
        { label: t("column.addedOn"), value: (record) => formatDate(record.date) },
        { label: t(key === "sportPreference" ? "column.sportPreference" : "column.sportFocusGoal"), value: (record) => record.sport },
        notes,
      ];
    return [date];
  }

  function renderTable() {
    const config = configByKey[currentCategory];
    if (!config) return;
    const records = sortedRecords(currentCategory);
    elements.recordCount.textContent = `${records.length} ${t(records.length === 1 ? "record.entry" : "record.entries")}`;
    elements.tableWrap.replaceChildren();
    if (!records.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      const copy = document.createElement("div");
      const strong = document.createElement("strong");
      strong.textContent = t("record.noRecords");
      const text = document.createElement("span");
      text.textContent = currentCategory === "foodDesire" ? t("section.foodDesireCopy") : t("record.emptyCopy");
      copy.append(strong, text);
      empty.append(copy);
      elements.tableWrap.append(empty);
      return;
    }
    const table = document.createElement("table");
    table.className = "records-table";
    const caption = document.createElement("caption");
    caption.textContent = t("record.newestFirst", { tracker: configTitle(currentCategory) });
    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    const columns = columnsFor(currentCategory);
    [...columns.map((column) => column.label), t("column.actions")].forEach((label) => {
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
      if (!config.custom) {
        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "icon-button";
        editButton.textContent = t("action.edit");
        editButton.addEventListener("click", () => startEdit(record.id));
        actions.append(editButton);
      }
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "icon-button delete";
      deleteButton.textContent = t("action.delete");
      deleteButton.addEventListener("click", () => deleteRecord(record.id));
      actions.append(deleteButton);
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
      pill.className = `status-pill ${column.pill(record) || ""}`.trim();
      pill.textContent = value;
      td.append(pill);
    } else td.textContent = value;
    return td;
  }

  function startEdit(id) {
    const record = state.records[currentCategory].find((item) => item.id === id);
    if (!record) return;
    editingId = id;
    renderForm(record);
    elements.formPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => elements.form.querySelector("input, select, textarea")?.focus(), 250);
  }

  function resetForm() {
    editingId = null;
    renderForm();
    elements.form.querySelector("input, select, textarea")?.focus();
  }

  async function deleteRecord(id) {
    if (cloudSession && cloudSyncInProgress) {
      showToast(t("cloud.waitDelete"));
      return;
    }
    const record = state.records[currentCategory].find((item) => item.id === id);
    if (!record) return;
    const confirmed =
      currentCategory === "foodDesire"
        ? window.confirm(t("foodDesire.deleteConfirm", { date: formatDate(record.date), time: formatTime(record.occurredAt) }))
        : window.confirm(t("confirm.delete", { tracker: configTitle(currentCategory), date: formatDate(record.date) }));
    if (!confirmed) return;
    const stateBeforeDelete = JSON.stringify(state);
    state.records[currentCategory] = state.records[currentCategory].filter((item) => item.id !== id);
    if (!state.pendingDeletes.includes(id)) state.pendingDeletes.push(id);
    if (editingId === id) editingId = null;
    if (!saveState()) {
      state = JSON.parse(stateBeforeDelete);
      return;
    }
    renderAll();
    elements.recordCount.focus();
    showToast(t(currentCategory === "foodDesire" ? "foodDesire.deleted" : "toast.deleted"));
    await deleteRemote(id);
  }

  function fillCaloriesFromLogs() {
    const date = elements.form.elements.date?.value || todayIso();
    if (elements.form.elements.consumedKcal) elements.form.elements.consumedKcal.value = String(Math.round(sumFoodCalories(date)));
    if (elements.form.elements.exerciseKcal) elements.form.elements.exerciseKcal.value = String(Math.round(sumExerciseCalories(date)));
    showToast(t("toast.caloriesFilled"));
  }

  function setWeightUnit(unit) {
    if (!['lb', 'kg'].includes(unit) || state.settings.weightUnit === unit) return;
    const previousUnit = state.settings.weightUnit;
    const formSnapshot = currentCategory && FORM_CATEGORY_KEYS.includes(currentCategory) ? captureFormSnapshot() : null;
    state.settings.weightUnit = unit;
    if (!saveState()) {
      state.settings.weightUnit = previousUnit;
      updateUnitButtons();
      return;
    }
    renderAll();
    if (formSnapshot) restoreFormSnapshotAfterUnitChange(formSnapshot, previousUnit);
    showToast(t("toast.unit", { unit }));
  }

  function setLanguage(language) {
    const normalized = window.HealthI18n.normalizeLanguage(language);
    if (normalized === currentLanguage) return;
    const formSnapshot = currentCategory && FORM_CATEGORY_KEYS.includes(currentCategory) ? captureFormSnapshot() : null;
    const hungerSnapshot = elements.foodDesireDialog.open
      ? {
          hungerType: elements.hungerType.value,
          emotionalState: elements.emotionalState.value,
          foodDesired: elements.foodDesired.value,
          otherFood: elements.otherFood.value,
        }
      : null;
    currentLanguage = normalized;
    window.localStorage.setItem(LANGUAGE_KEY, currentLanguage);
    renderAll();
    if (formSnapshot) restoreFormSnapshot(formSnapshot);
    if (hungerSnapshot) {
      renderHungerSelects(hungerSnapshot);
      updateOtherFoodVisibility();
    }
  }

  function captureFormSnapshot() {
    const snapshot = {};
    configByKey[currentCategory].fields.forEach((field) => {
      const input = elements.form.elements[field.key];
      if (input) snapshot[field.key] = field.type === "checkbox" ? input.checked : input.value;
    });
    return snapshot;
  }

  function restoreFormSnapshot(snapshot) {
    configByKey[currentCategory].fields.forEach((field) => {
      const input = elements.form.elements[field.key];
      if (!input || snapshot[field.key] === undefined) return;
      if (field.type === "checkbox") input.checked = snapshot[field.key];
      else input.value = snapshot[field.key];
    });
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
        input.value = String(roundForDisplay(state.settings.weightUnit === "lb" ? valueKg * LB_PER_KG : valueKg));
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

  function updateLanguageButtons() {
    document.querySelectorAll(".language-button").forEach((button) => {
      const active = button.dataset.language === currentLanguage;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function renderCategoryChart() {
    if (!["weight", "water", "cardio", "strength", "food"].includes(currentCategory)) {
      elements.categoryChart.replaceChildren();
      return;
    }
    configureDashboardDetails(
      elements.categoryChartPanel,
      elements.categoryChartSummary,
      `category-${currentCategory}`,
      t(`chart.${currentCategory}.title`),
    );
    window.HealthCharts.renderLineChart(elements.categoryChart, chartModel(currentCategory));
  }

  function renderAllCharts() {
    elements.allChartsGrid.replaceChildren();
    CHART_KEYS.forEach((key) => {
      const card = document.createElement("details");
      card.className = `chart-panel collapsible-dashboard chart-panel-${key}`;
      const summary = document.createElement("summary");
      summary.className = "dashboard-summary";
      const chart = document.createElement("div");
      window.HealthCharts.renderLineChart(chart, chartModel(key));
      card.append(summary, chart);
      configureDashboardDetails(card, summary, `all-${key}`, t(`chart.${key}.title`));
      elements.allChartsGrid.append(card);
    });
  }

  function configureDashboardDetails(details, summary, id, title) {
    if (!details || !summary) return;
    const preferences = loadDashboardPreferences();
    details.dataset.dashboardId = id;
    details.open = preferences[id] !== false;
    summary.textContent = t("chart.toggle", { title });
    details.ontoggle = () => {
      const nextPreferences = loadDashboardPreferences();
      nextPreferences[id] = details.open;
      try {
        window.localStorage.setItem(DASHBOARD_STATE_KEY, JSON.stringify(nextPreferences));
      } catch (error) {
        console.warn("Could not save dashboard display preference.", error);
      }
    };
  }

  function loadDashboardPreferences() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(DASHBOARD_STATE_KEY));
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
      return {};
    }
  }

  function aggregateDaily(records, valueSelector) {
    const totals = new Map();
    records.forEach((record) => {
      if (!isValidIsoDate(record.date)) return;
      totals.set(record.date, (totals.get(record.date) || 0) + number(valueSelector(record)));
    });
    return [...totals.entries()].sort(([a], [b]) => a.localeCompare(b));
  }

  function ratingDateData(records) {
    const newestByDate = new Map();
    records.forEach((record) => {
      const rating = number(record.rating);
      if (!isValidIsoDate(record.date) || !Number.isInteger(rating) || rating < 1 || rating > 7) return;
      const current = newestByDate.get(record.date);
      if (!current || timestamp(record.updatedAt || record.createdAt) >= timestamp(current.updatedAt || current.createdAt)) {
        newestByDate.set(record.date, record);
      }
    });
    return [...newestByDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, record]) => [date, number(record.rating)]);
  }

  function aggregateChartData(key) {
    if (key === "weight") {
      return sortedChronological("weight").map((record) => [record.date, convertKgToActiveUnit(number(record.weightKg))]);
    }
    if (key === "water") return aggregateDaily(state.records.water, (record) => record.litres);
    if (key === "cardio") return aggregateDaily(state.records.cardio, (record) => record.minutes);
    if (key === "strength") return aggregateDaily(state.records.strength, (record) => number(record.sets) * number(record.reps));
    if (RATING_KEYS.includes(key)) return ratingDateData(state.records[key]);
    if (key === "food") {
      const grouped = new Map();
      state.records.food.forEach((record) => {
        if (!isValidIsoDate(record.date)) return;
        const day = grouped.get(record.date) || { Breakfast: 0, Lunch: 0, Dinner: 0, total: 0 };
        const calories = number(record.calories);
        if (["Breakfast", "Lunch", "Dinner"].includes(record.meal)) day[record.meal] += calories;
        day.total += calories;
        grouped.set(record.date, day);
      });
      return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b));
    }
    return [];
  }

  function chartModel(key) {
    const data = aggregateChartData(key);
    const dates = data.map(([date]) => date);
    const common = {
      id: `chart-${key}`,
      instanceId: `chart-${key}-${++chartInstanceCounter}`,
      dates,
      title: t(`chart.${key}.title`),
      subtitle: t(`chart.${key}.subtitle`),
      yLabel: t(`chart.${key}.y`, { unit: state.settings.weightUnit }),
      emptyText: t("chart.empty"),
      dateLabel: t("column.date"),
      dataTableLabel: t("chart.dataTable"),
      legendLabel: currentLanguage === "zh-Hant" ? "圖例" : "Legend",
      formatDate,
      formatDateShort,
      formatTick: (value) => formatDecimal(value, key === "weight" || key === "water" ? 1 : 0),
      formatValue: (value) => {
        if (key === "weight") return `${formatDecimal(value, 1)} ${state.settings.weightUnit}`;
        if (key === "water") return formatLitres(value);
        if (key === "cardio") return formatMinutes(value);
        if (key === "food") return formatCalories(value);
        if (RATING_KEYS.includes(key)) return t("record.ratingValue", { value: formatInteger(value) });
        return formatInteger(value);
      },
      includeZero: key !== "weight" && !RATING_KEYS.includes(key),
      ...(RATING_KEYS.includes(key)
        ? { domain: { minimum: 1, maximum: 7 }, tickValues: [1, 2, 3, 4, 5, 6, 7] }
        : {}),
    };
    if (key === "food") {
      return {
        ...common,
        series: [
          { name: t("chart.series.breakfast"), color: "#e6a03b", dash: "", values: data.map(([, day]) => day.Breakfast) },
          { name: t("chart.series.lunch"), color: "#2d8d7e", dash: "8 4", values: data.map(([, day]) => day.Lunch) },
          { name: t("chart.series.dinner"), color: "#6b66c4", dash: "3 5", values: data.map(([, day]) => day.Dinner) },
          { name: t("chart.series.total"), color: "#c84762", dash: "12 4 3 4", emphasis: true, values: data.map(([, day]) => day.total) },
        ],
      };
    }
    const colors = {
      weight: "#246ec0",
      water: "#2295b6",
      cardio: "#606bd0",
      strength: "#8b5dad",
      exerciseDesire: "#7652b7",
      postExerciseFeeling: "#258b72",
    };
    return {
      ...common,
      series: [{ name: t(`chart.series.${key}`), color: colors[key], values: data.map(([, value]) => value) }],
    };
  }

  function ratingElements(key) {
    if (key === "exerciseDesire") {
      return {
        scale: elements.exerciseDesireScale,
        status: elements.exerciseDesireStatus,
        table: elements.exerciseDesireTable,
        chartDetails: elements.exerciseDesireChartDetails,
        chartSummary: elements.exerciseDesireChartSummary,
        chart: elements.exerciseDesireChart,
        dateFrom: elements.desireDateFrom,
        dateTo: elements.desireDateTo,
        rangeError: elements.desireRangeError,
        prefix: "desire",
      };
    }
    return {
      scale: elements.postExerciseFeelingScale,
      status: elements.postExerciseFeelingStatus,
      table: elements.postExerciseFeelingTable,
      chartDetails: elements.postExerciseFeelingChartDetails,
      chartSummary: elements.postExerciseFeelingChartSummary,
      chart: elements.postExerciseFeelingChart,
      dateFrom: elements.postFeelingDateFrom,
      dateTo: elements.postFeelingDateTo,
      rangeError: elements.postFeelingRangeError,
      prefix: "postFeeling",
    };
  }

  function renderRatingSurveys() {
    RATING_KEYS.forEach(renderRatingSurvey);
  }

  function renderRatingSurvey(key) {
    const ui = ratingElements(key);
    const todayRecord = state.records[key].find((record) => record.date === todayIso());
    ui.scale.replaceChildren();
    for (let rating = 1; rating <= 7; rating += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "rating-button";
      button.textContent = String(rating);
      button.setAttribute("aria-label", `${configTitle(key)} ${rating} / 7`);
      button.setAttribute("aria-pressed", String(number(todayRecord?.rating) === rating));
      if (number(todayRecord?.rating) === rating) button.classList.add("is-saved");
      button.addEventListener("click", () => selectRating(key, rating));
      ui.scale.append(button);
    }
    ui.status.textContent = todayRecord
      ? t(`${ui.prefix}.today`, { value: formatInteger(todayRecord.rating) })
      : t(`${ui.prefix}.noneToday`);
    renderRatingTable(key);
    configureDashboardDetails(ui.chartDetails, ui.chartSummary, `survey-${key}`, t(`chart.${key}.title`));
    window.HealthCharts.renderLineChart(ui.chart, chartModel(key));
  }

  function selectRating(key, rating) {
    if (!Number.isInteger(rating) || rating < 1 || rating > 7) return;
    cancelRatingTimer(key);
    const controller = ratingControllers[key];
    controller.generation += 1;
    const generation = controller.generation;
    const ui = ratingElements(key);
    ui.scale.querySelectorAll("button").forEach((button) => {
      button.classList.toggle("is-pending", number(button.textContent) === rating);
    });
    ui.status.textContent = t(`${ui.prefix}.waiting`, { value: rating });
    controller.timer = window.setTimeout(() => {
      if (generation !== controller.generation) return;
      const confirmed = window.confirm(t(`${ui.prefix}.confirm`, { value: rating }));
      if (!confirmed) {
        renderRatingSurvey(key);
        ui.status.textContent = t(`${ui.prefix}.cancelled`);
        return;
      }
      controller.saveQueue = controller.saveQueue.then(() => {
        ratingSaveQueue = ratingSaveQueue.then(() => saveRating(key, rating));
        return ratingSaveQueue;
      });
    }, 2000);
  }

  function cancelRatingTimer(key = null) {
    const keys = key ? [key] : RATING_KEYS;
    keys.forEach((ratingKey) => {
      const controller = ratingControllers[ratingKey];
      if (controller.timer) window.clearTimeout(controller.timer);
      controller.timer = null;
      controller.generation += 1;
    });
  }

  async function saveRating(key, rating) {
    const ui = ratingElements(key);
    if (cloudSession && cloudSyncInProgress) {
      showToast(t("cloud.waitSave"));
      renderRatingSurvey(key);
      return;
    }
    const stateBeforeSave = JSON.stringify(state);
    const date = todayIso();
    const now = new Date().toISOString();
    const records = state.records[key];
    const existingIndex = records.findIndex((record) => record.date === date);
    const existing = records[existingIndex];
    const savedRecord = {
      ...(existing || {}),
      id: existing?.id || makeRecordId(configByKey[key], date),
      date,
      rating,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      _pending: true,
      _restore: !existing,
    };
    if (existingIndex >= 0) records[existingIndex] = savedRecord;
    else records.push(savedRecord);
    if (!saveState()) {
      state = JSON.parse(stateBeforeSave);
      renderRatingSurvey(key);
      return;
    }
    renderRatingSurveys();
    showToast(t(`${ui.prefix}.saved`, { value: rating }));
    await upsertRemote(key, savedRecord);
  }

  function renderRatingTable(key) {
    const ui = ratingElements(key);
    const records = sortedRecords(key);
    ui.table.replaceChildren();
    if (!records.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state compact-empty";
      empty.textContent = t("record.noRecords");
      ui.table.append(empty);
      return;
    }
    ui.table.append(createSimpleTable(columnsFor(key), records));
  }

  function exportRatingRange(key) {
    const ui = ratingElements(key);
    const from = ui.dateFrom.value;
    const to = ui.dateTo.value;
    ui.rangeError.hidden = true;
    if (from && to && from > to) {
      ui.rangeError.textContent = t("desire.rangeInvalid");
      ui.rangeError.hidden = false;
      return;
    }
    const records = filterDateRange(state.records[key], from, to);
    if (!records.length) {
      ui.rangeError.textContent = t(`${ui.prefix}.rangeEmpty`);
      ui.rangeError.hidden = false;
      return;
    }
    printCategories([key], { from, to, recordsByKey: { [key]: records } });
  }

  function showFoodDesireDialog() {
    hungerOccurredAt = new Date().toISOString();
    renderHungerSelects();
    resetFoodDesireDialog(false);
    if (typeof elements.foodDesireDialog.showModal === "function") elements.foodDesireDialog.showModal();
    else elements.foodDesireDialog.setAttribute("open", "");
  }

  function renderHungerSelects(values = {}) {
    [
      [elements.hungerType, "hungerType"],
      [elements.emotionalState, "emotionalState"],
      [elements.foodDesired, "foodDesired"],
    ].forEach(([select, key]) => {
      const previous = values[key] || select.value;
      select.replaceChildren();
      hungerOptions[key].forEach((choice) => {
        const optionElement = document.createElement("option");
        optionElement.value = choice.value;
        optionElement.textContent = t(choice.labelKey);
        select.append(optionElement);
      });
      if ([...select.options].some((item) => item.value === previous)) select.value = previous;
    });
    if (values.otherFood !== undefined) elements.otherFood.value = values.otherFood;
  }

  function updateOtherFoodVisibility() {
    const show = elements.foodDesired.value === "others";
    elements.otherFoodField.hidden = !show;
    elements.otherFood.required = show;
    if (!show) elements.otherFood.value = "";
  }

  function resetFoodDesireDialog(clearValues = true) {
    elements.foodDesireError.hidden = true;
    elements.foodDesireError.textContent = "";
    if (clearValues) {
      elements.foodDesireForm.reset();
      elements.otherFood.value = "";
      hungerOccurredAt = null;
    }
    updateOtherFoodVisibility();
  }

  function closeFoodDesireDialog() {
    if (typeof elements.foodDesireDialog.close === "function") elements.foodDesireDialog.close();
    else elements.foodDesireDialog.removeAttribute("open");
  }

  async function handleFoodDesireSave(event) {
    event.preventDefault();
    if (cloudSession && cloudSyncInProgress) {
      showToast(t("cloud.waitSave"));
      return;
    }
    if (!hungerOccurredAt) hungerOccurredAt = new Date().toISOString();
    const otherFood = elements.otherFood.value.trim();
    if (elements.foodDesired.value === "others" && !otherFood) {
      elements.foodDesireError.textContent = t("foodDesire.otherRequired");
      elements.foodDesireError.hidden = false;
      elements.otherFood.focus();
      return;
    }
    elements.foodDesireConfirmButton.disabled = true;
    const occurredAt = hungerOccurredAt;
    const date = localIsoDate(new Date(occurredAt));
    const now = new Date().toISOString();
    const record = {
      id: makeId(),
      date,
      occurredAt,
      hungerType: elements.hungerType.value,
      emotionalState: elements.emotionalState.value,
      foodDesired: elements.foodDesired.value,
      otherFood: elements.foodDesired.value === "others" ? otherFood : "",
      createdAt: now,
      updatedAt: now,
      _pending: true,
      _restore: true,
    };
    const stateBeforeSave = JSON.stringify(state);
    state.records.foodDesire.push(record);
    if (!saveState()) {
      state = JSON.parse(stateBeforeSave);
      elements.foodDesireConfirmButton.disabled = false;
      return;
    }
    closeFoodDesireDialog();
    renderAll();
    showToast(t("foodDesire.saved", { time: formatTime(occurredAt) }));
    await upsertRemote("foodDesire", record);
    elements.foodDesireConfirmButton.disabled = false;
  }

  function renderFoodDesireSummary() {
    const records = state.records.foodDesire;
    const todayCount = records.filter((record) => record.date === todayIso()).length;
    const latest = [...records].sort((a, b) => timestamp(b.occurredAt) - timestamp(a.occurredAt))[0];
    const stats = [
      [t("foodDesire.total"), formatInteger(records.length)],
      [t("foodDesire.today"), formatInteger(todayCount)],
      [t("foodDesire.latest"), latest ? `${formatDate(latest.date)} · ${formatTime(latest.occurredAt)}` : t("foodDesire.noLatest")],
    ];
    elements.foodDesireSummary.replaceChildren();
    stats.forEach(([label, value]) => {
      const item = document.createElement("div");
      const small = document.createElement("span");
      small.textContent = label;
      const strong = document.createElement("strong");
      strong.textContent = value;
      item.append(small, strong);
      elements.foodDesireSummary.append(item);
    });
  }

  function handleInstall() {
    if (window.HealthPWA?.promptInstall) {
      window.HealthPWA.promptInstall().then((installed) => {
        if (installed) showToast(t("pwa.installed"));
      });
      return;
    }
    const isApple = /iphone|ipad|ipod/i.test(navigator.userAgent);
    window.alert(`${t("pwa.helpTitle")}\n\n${t(isApple ? "pwa.helpApple" : "pwa.helpOther")}`);
  }

  function printCategories(keys, options = {}) {
    buildPrintReport(keys, options);
    previousDocumentTitle = document.title;
    document.title =
      keys.length === 1
        ? `${configTitle(keys[0])} - ${t("report.health")}`
        : `${t("app.name")} - ${t("report.complete")}`;
    elements.printReport.hidden = false;
    window.requestAnimationFrame(() => window.print());
  }

  function buildPrintReport(keys, options = {}) {
    elements.printReport.replaceChildren();
    const header = document.createElement("header");
    header.className = "print-report-header";
    const titleWrap = document.createElement("div");
    const title = document.createElement("h1");
    const singleRatingKey = keys.length === 1 && RATING_KEYS.includes(keys[0]) ? keys[0] : null;
    title.textContent = singleRatingKey
      ? t(singleRatingKey === "exerciseDesire" ? "report.desireTitle" : "report.postFeelingTitle")
      : t("app.name");
    const subtitle = document.createElement("p");
    if (singleRatingKey) {
      const rangeKey = singleRatingKey === "exerciseDesire" ? "report.range" : "report.postFeelingRange";
      const allTimeKey = singleRatingKey === "exerciseDesire" ? "report.allTime" : "report.postFeelingAllTime";
      subtitle.textContent = options.from || options.to
        ? t(rangeKey, { from: options.from ? formatDate(options.from) : "…", to: options.to ? formatDate(options.to) : "…" })
        : t(allTimeKey);
    } else subtitle.textContent = keys.length === 1 ? configTitle(keys[0]) : t("report.complete");
    titleWrap.append(title, subtitle);
    const meta = document.createElement("p");
    meta.textContent = t("report.exported", {
      date: new Intl.DateTimeFormat(locale(), { dateStyle: "long", timeStyle: "short" }).format(new Date()),
      unit: state.settings.weightUnit,
    });
    header.append(titleWrap, meta);
    elements.printReport.append(header);
    keys.forEach((key) => {
      const section = document.createElement("section");
      section.className = "print-section";
      const heading = document.createElement("h2");
      heading.textContent = configTitle(key);
      section.append(heading, createPrintTable(key, options.recordsByKey?.[key]));
      elements.printReport.append(section);
    });
  }

  function createPrintTable(key, suppliedRecords) {
    const columns = columnsFor(key);
    const records = suppliedRecords || sortedRecords(key);
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
      cell.textContent = t("report.noRecords");
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

  function printProgressCharts() {
    elements.printReport.replaceChildren();
    const header = document.createElement("header");
    header.className = "print-report-header";
    const title = document.createElement("h1");
    title.textContent = configTitle("progress");
    const meta = document.createElement("p");
    meta.textContent = new Intl.DateTimeFormat(locale(), { dateStyle: "long", timeStyle: "short" }).format(new Date());
    header.append(title, meta);
    elements.printReport.append(header);
    CHART_KEYS.forEach((key) => {
      const section = document.createElement("section");
      section.className = "print-chart-section";
      window.HealthCharts.renderLineChart(section, chartModel(key));
      elements.printReport.append(section);
    });
    previousDocumentTitle = document.title;
    document.title = configTitle("progress");
    elements.printReport.hidden = false;
    window.requestAnimationFrame(() => window.print());
  }

  function cleanupPrintReport() {
    elements.printReport.hidden = true;
    elements.printReport.replaceChildren();
    document.title = currentView === "category" && currentCategory
      ? appMode === "standalone"
        ? configTitle(currentCategory)
        : `${configTitle(currentCategory)} · ${t("app.name")}`
      : currentView === "progress"
        ? appMode === "standalone"
          ? configTitle("progress")
          : `${configTitle("progress")} · ${t("app.name")}`
        : t("app.name");
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
        auth: { storageKey: CLOUD_AUTH_STORAGE_KEY, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
      });
      cloudIsAvailable = true;
      const { data, error } = await supabaseClient.auth.getSession();
      if (error) throw error;
      if (data.session && isAllowedCloudSession(data.session)) {
        await activateCloudSession(data.session, false);
        await syncAllRecords(false);
      } else if (data.session) await supabaseClient.auth.signOut({ scope: "local" });
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
    if (!url || !publishableKey || !ownerUserId || url.includes("YOUR_") || publishableKey.includes("YOUR_") || ownerUserId.includes("YOUR_")) return null;
    return { url, publishableKey, ownerUserId };
  }

  function loadSupabaseLibrary() {
    if (window.supabase?.createClient) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SUPABASE_SDK_URL;
      script.async = true;
      script.referrerPolicy = "no-referrer";
      script.addEventListener("load", () => (window.supabase?.createClient ? resolve() : reject(new Error("Supabase library did not load correctly."))));
      script.addEventListener("error", () => reject(new Error("Supabase library could not load.")));
      document.head.append(script);
    });
  }

  function isAllowedCloudSession(session) {
    if (!session?.user || session.user.is_anonymous) return false;
    const expectedUserId = getCloudConfig()?.ownerUserId;
    return Boolean(expectedUserId && String(session.user.id || "").toLowerCase() === expectedUserId);
  }

  async function activateCloudSession(session, offerImport) {
    if (!isAllowedCloudSession(session)) throw new Error(t("cloud.ownerOnly"));
    const accountStorageKey = userStorageKey(session.user.id);
    const browserState = activeStorageKey === STORAGE_KEY ? state : loadState(STORAGE_KEY);
    let accountState = loadState(accountStorageKey);
    let removeBrowserStateAfterSave = false;
    if (offerImport && hasAnyRecords(browserState) && window.confirm(t("cloud.import"))) {
      accountState = mergeStatesForImport(accountState, browserState);
      removeBrowserStateAfterSave = true;
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
      throw new Error(t("cloud.cacheFailed"));
    }
    if (removeBrowserStateAfterSave) window.localStorage.removeItem(STORAGE_KEY);
    renderAll();
  }

  function deactivateCloudSession() {
    const preserveRecoveryCopy = hasPendingMutations();
    if (activeStorageKey !== STORAGE_KEY && !preserveRecoveryCopy) window.localStorage.removeItem(activeStorageKey);
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
    elements.cloudSigninButtonLabel.textContent = t("cloud.signingIn");
    elements.cloudError.hidden = true;
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!isAllowedCloudSession(data.session)) {
        await supabaseClient.auth.signOut({ scope: "local" });
        throw new Error(t("cloud.ownerOnly"));
      }
      await activateCloudSession(data.session, true);
      elements.cloudPassword.value = "";
      await syncAllRecords(true);
    } catch (error) {
      const localizedErrors = new Set([t("cloud.ownerOnly"), t("cloud.cacheFailed")]);
      elements.cloudError.textContent = localizedErrors.has(error.message)
        ? error.message
        : t("cloud.signinFailed");
      elements.cloudError.hidden = false;
    } finally {
      elements.cloudSigninButton.disabled = false;
      elements.cloudSigninButtonLabel.textContent = t("action.signIn");
    }
  }

  async function handleCloudSignout() {
    if (!supabaseClient) return;
    if (cloudSyncInProgress) {
      showToast(t("cloud.waitSignout"));
      return;
    }
    elements.signoutButton.disabled = true;
    try {
      if (hasPendingMutations()) await syncAllRecords(false);
      const preserveRecoveryCopy = hasPendingMutations();
      if (preserveRecoveryCopy && !window.confirm(t("cloud.signoutRecovery"))) return;
      const accountStorageKey = activeStorageKey;
      const { error } = await supabaseClient.auth.signOut({ scope: "local" });
      if (error) throw error;
      if (accountStorageKey !== STORAGE_KEY && !preserveRecoveryCopy) window.localStorage.removeItem(accountStorageKey);
      activeStorageKey = STORAGE_KEY;
      state = loadState(STORAGE_KEY);
      cloudSession = null;
      renderAll();
      showToast(t(preserveRecoveryCopy ? "cloud.signedOutRecovery" : "cloud.signedOut"));
      elements.cloudDialog.close();
    } catch (error) {
      console.warn("Cloud sign-out failed.", error);
      showToast(t("cloud.signoutFailed"));
    } finally {
      elements.signoutButton.disabled = false;
    }
  }

  function updateCloudUi() {
    if (!elements.cloudButton) return;
    const dot = elements.cloudButton.querySelector(".status-dot");
    dot.classList.toggle("is-online", Boolean(cloudSession) && !cloudSyncInProgress);
    dot.classList.toggle("is-syncing", cloudSyncInProgress);
    elements.cloudButtonLabel.textContent = t(cloudSyncInProgress ? "cloud.syncing" : cloudSession ? "cloud.private" : "cloud.browser");
    if (elements.miniCloudButton) {
      const miniDot = elements.miniCloudButton.querySelector(".status-dot");
      miniDot.classList.toggle("is-online", Boolean(cloudSession) && !cloudSyncInProgress);
      miniDot.classList.toggle("is-syncing", cloudSyncInProgress);
      elements.miniCloudButtonLabel.textContent = t(cloudSyncInProgress ? "cloud.syncing" : cloudSession ? "cloud.private" : "cloud.browser");
    }
    if (elements.progressCloudButton) {
      const progressDot = elements.progressCloudButton.querySelector(".status-dot");
      progressDot.classList.toggle("is-online", Boolean(cloudSession) && !cloudSyncInProgress);
      progressDot.classList.toggle("is-syncing", cloudSyncInProgress);
      elements.progressCloudButtonLabel.textContent = t(cloudSyncInProgress ? "cloud.syncing" : cloudSession ? "cloud.private" : "cloud.browser");
    }
    elements.cloudSigninForm.hidden = !cloudIsAvailable || Boolean(cloudSession);
    elements.cloudAccount.hidden = !cloudSession;
    elements.cloudSetupNote.hidden = cloudIsAvailable;
    if (!cloudIsAvailable) {
      elements.cloudDialogTitle.textContent = t("cloud.setupTitle");
      elements.cloudDialogCopy.textContent = t("cloud.setupCopy");
    } else if (cloudSession) {
      elements.cloudDialogTitle.textContent = t("cloud.accountTitle");
      elements.cloudDialogCopy.textContent = t("cloud.accountCopy");
      elements.cloudAccountEmail.textContent = cloudSession.user?.email || "—";
    } else {
      elements.cloudDialogTitle.textContent = t("cloud.connectTitle");
      elements.cloudDialogCopy.textContent = t("cloud.connectCopy");
    }
    elements.storageHeading.textContent = t(cloudSession ? "storage.cloudTitle" : "storage.browserTitle");
    elements.storageCopy.textContent = t(cloudSession ? "storage.cloudCopy" : "storage.browserCopy");
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
      if (showSuccess) showToast(t("cloud.syncComplete"));
    } catch (error) {
      console.warn("Cloud sync failed.", error);
      showToast(t(error?.code === "42P01" ? "cloud.tableMissing" : "cloud.syncFailed"));
    } finally {
      cloudSyncInProgress = false;
      updateCloudUi();
    }
  }

  async function upsertRemote(category, record) {
    if (!supabaseClient || !cloudSession) return;
    try {
      setCloudSyncing(true);
      const { error } = await supabaseClient.from(SUPABASE_TABLE).upsert(toCloudRow(category, record), { onConflict: "id" });
      if (error) throw error;
      const saved = state.records[category].find((item) => item.id === record.id);
      if (saved && timestamp(saved.updatedAt) === timestamp(record.updatedAt)) {
        saved._pending = false;
        saved._restore = false;
        saveState();
      }
    } catch (error) {
      console.warn("Could not sync entry.", error);
      showToast(t("cloud.savedRetry"));
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
      if (data?.length) state.pendingDeletes = state.pendingDeletes.filter((pendingId) => pendingId !== id);
      saveState();
    } catch (error) {
      console.warn("Could not sync deletion.", error);
      showToast(t("cloud.deletedRetry"));
    } finally {
      setCloudSyncing(false);
    }
  }

  function setCloudSyncing(value) {
    cloudSyncInProgress = value;
    updateCloudUi();
  }

  function flattenPendingCloudRows() {
    return RECORD_KEYS.flatMap((key) =>
      state.records[key].filter((record) => record._pending !== false).map((record) => toCloudRow(key, record)),
    );
  }

  async function flushPendingCloudMutations() {
    if (state.pendingDeletes.length) {
      const deletionTime = new Date().toISOString();
      for (const ids of chunkArray([...new Set(state.pendingDeletes)], 200)) {
        const { error } = await supabaseClient.from(SUPABASE_TABLE).update({ deleted_at: deletionTime, data: {} }).in("id", ids);
        if (error) throw error;
      }
      state.pendingDeletes = [];
      saveState();
    }
    const pendingRows = flattenPendingCloudRows();
    for (const rows of chunkArray(pendingRows, 200)) {
      const { error } = await supabaseClient.from(SUPABASE_TABLE).upsert(rows, { onConflict: "id" });
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
      const merged = new Map(remoteByCategory[key].filter((record) => !pendingDeleteIds.has(record.id)).map((record) => [record.id, record]));
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
        updatedAt: payload.updatedAt || row.updated_at,
        _pending: false,
        _restore: false,
      });
    });
    return remoteByCategory;
  }

  function chunkArray(items, size) {
    const chunks = [];
    for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
    return chunks;
  }

  function toCloudRow(category, record) {
    const { _pending, _restore, ...data } = record;
    const row = { id: record.id, category, entry_date: record.date, data };
    if (_restore) row.deleted_at = null;
    return row;
  }

  function mergeRecordArrays(localRecords, remoteRecords) {
    const merged = new Map();
    [...remoteRecords, ...localRecords].forEach((record) => {
      const current = merged.get(record.id);
      if (!current || timestamp(record.updatedAt) >= timestamp(current.updatedAt)) merged.set(record.id, record);
    });
    return [...merged.values()];
  }

  function mergeStatesForImport(accountState, browserState) {
    const merged = accountState;
    merged.settings = { ...browserState.settings };
    merged.pendingDeletes = [...new Set([...(accountState.pendingDeletes || []), ...(browserState.pendingDeletes || [])])];
    RECORD_KEYS.forEach((key) => {
      merged.records[key] = mergeRecordArrays(accountState.records[key], browserState.records[key]).map((record) => ({ ...record, _pending: true, _restore: true }));
    });
    return merged;
  }

  function hasAnyRecords(candidateState) {
    return RECORD_KEYS.some((key) => candidateState.records[key].length > 0);
  }

  function hasPendingMutations() {
    return state.pendingDeletes.length > 0 || RECORD_KEYS.some((key) => state.records[key].some((record) => record._pending !== false));
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
        return pendingDifference || timestamp(b.updatedAt) - timestamp(a.updatedAt);
      });
      ordered.forEach((record) => {
        if (!groups.has(record.date)) groups.set(record.date, []);
        groups.get(record.date).push(record);
      });
      const winners = [];
      for (const [date, records] of groups) {
        const desiredId = makeDailyRecordId(cloudSession.user.id, config.key, date);
        const winner = records[0];
        records.forEach((record) => {
          if (record.id !== desiredId && !state.pendingDeletes.includes(record.id)) state.pendingDeletes.push(record.id);
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
      if (byDate) return byDate;
      const timeA = timestamp(a.occurredAt || a.createdAt);
      const timeB = timestamp(b.occurredAt || b.createdAt);
      return timeB - timeA;
    });
  }

  function sortedChronological(key) {
    return [...state.records[key]].sort((a, b) => {
      const byDate = safeText(a.date).localeCompare(safeText(b.date));
      return byDate || timestamp(a.createdAt) - timestamp(b.createdAt);
    });
  }

  function formatWeightChange(record) {
    const chronological = sortedChronological("weight");
    const index = chronological.findIndex((item) => item.id === record.id);
    if (index <= 0) return t("record.first");
    const differenceKg = number(record.weightKg) - number(chronological[index - 1].weightKg);
    if (Math.abs(differenceKg) < 0.005) return t("record.noChange");
    return t(differenceKg < 0 ? "record.down" : "record.up", {
      value: formatDecimal(convertKgToActiveUnit(Math.abs(differenceKg)), 1),
      unit: state.settings.weightUnit,
    });
  }

  function weightChangeTone(record) {
    const chronological = sortedChronological("weight");
    const index = chronological.findIndex((item) => item.id === record.id);
    if (index <= 0) return "";
    const difference = number(record.weightKg) - number(chronological[index - 1].weightKg);
    return difference < -0.005 ? "positive" : difference > 0.005 ? "warning" : "";
  }

  function strengthVolume(record) {
    if (isBlank(record.loadKg)) return "—";
    const volumeKg = number(record.sets) * number(record.reps) * number(record.loadKg);
    return `${formatDecimal(convertKgToActiveUnit(volumeKg), 1)} ${state.settings.weightUnit}`;
  }

  function sumFoodCalories(date) {
    return sumByDate("food", date, (record) => number(record.calories));
  }

  function sumExerciseCalories(date) {
    return ["cardio", "strength"].reduce((total, key) => total + sumByDate(key, date, (record) => number(record.caloriesBurned)), 0);
  }

  function sumByDate(key, date, selector) {
    return state.records[key].filter((record) => record.date === date).reduce((sum, record) => sum + number(selector(record)), 0);
  }

  function calorieNet(record) {
    return number(record.consumedKcal) - number(record.exerciseKcal);
  }

  function calorieRemaining(record) {
    return number(record.goalKcal) - calorieNet(record);
  }

  function calorieRemainingText(record) {
    const remaining = calorieRemaining(record);
    return t(remaining >= 0 ? "record.left" : "record.over", { value: formatInteger(Math.abs(remaining)) });
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
    return isBlank(value) ? "—" : formatCalories(value);
  }

  function formatLitres(value) {
    return `${formatDecimal(value, 2)} ${t("unit.litre")}`;
  }

  function formatMinutes(value) {
    return `${formatInteger(value)} ${t("unit.minute")}`;
  }

  function formatCalories(value) {
    return `${formatInteger(value)} ${t("unit.calorie")}`;
  }

  function formatDate(isoDate) {
    if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return "—";
    const [year, month, day] = isoDate.split("-");
    return `${day}/${month}/${year}`;
  }

  function formatDateShort(isoDate) {
    if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return "—";
    const [, month, day] = isoDate.split("-");
    return `${day}/${month}`;
  }

  function formatTime(isoTimestamp) {
    const date = new Date(isoTimestamp || "");
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat(locale(), { hour: "2-digit", minute: "2-digit" }).format(date);
  }

  function todayIso() {
    return localIsoDate(new Date());
  }

  function localIsoDate(date) {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }

  function isValidIsoDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split("-").map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
  }

  function formatDecimal(value, maximumFractionDigits = 1) {
    return new Intl.NumberFormat(locale(), { maximumFractionDigits, minimumFractionDigits: 0 }).format(number(value));
  }

  function formatInteger(value) {
    return new Intl.NumberFormat(locale(), { maximumFractionDigits: 0 }).format(number(value));
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
    return value === null || value === undefined || value === "" ? "—" : String(value);
  }

  function isBlank(value) {
    return value === null || value === undefined || value === "";
  }

  function fieldLabel(field) {
    return t(field.labelKey, { unit: state.settings.weightUnit });
  }

  function mealLabel(value) {
    const map = { Breakfast: "breakfast", Lunch: "lunch", Dinner: "dinner", Snack: "snack", Drink: "drink" };
    return map[value] ? t(`option.${map[value]}`) : safeText(value);
  }

  function portionLabel(value) {
    const map = { serving: "serving", plate: "plate", bowl: "bowl", piece: "piece", cup: "cup" };
    return map[value] ? t(`option.${map[value]}`) : safeText(value);
  }

  function groceryUnitLabel(value) {
    const map = { item: "item", pack: "pack", bag: "bag", bottle: "bottle" };
    return map[value] ? t(`option.${map[value]}`) : safeText(value);
  }

  function foodDesireLabel(record) {
    return record.foodDesired === "others" && record.otherFood ? `${t("option.others")}: ${record.otherFood}` : t(`option.${record.foodDesired}`);
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

  function filterDateRange(records, from, to) {
    return [...records]
      .filter((record) => (!from || record.date >= from) && (!to || record.date <= to))
      .sort((a, b) => safeText(b.date).localeCompare(safeText(a.date)));
  }

  function createSimpleTable(columns, records) {
    const table = document.createElement("table");
    table.className = "records-table compact-table";
    const head = document.createElement("thead");
    const headRow = document.createElement("tr");
    columns.forEach((column) => {
      const th = document.createElement("th");
      th.scope = "col";
      th.textContent = column.label;
      headRow.append(th);
    });
    head.append(headRow);
    const body = document.createElement("tbody");
    records.forEach((record) => {
      const row = document.createElement("tr");
      columns.forEach((column) => row.append(createTableCell(column, record)));
      body.append(row);
    });
    table.append(head, body);
    return table;
  }

  function makeRecordId(config, date) {
    if (config.uniqueDate && cloudSession?.user?.id) return makeDailyRecordId(cloudSession.user.id, config.key, date);
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
      for (let byte = 0; byte < 4; byte += 1) bytes[round * 4 + byte] = (current >>> (byte * 8)) & 0xff;
      hash = current;
    }
    return bytes;
  }

  function makeId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    const bytes = new Uint8Array(16);
    if (window.crypto?.getRandomValues) window.crypto.getRandomValues(bytes);
    else for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    return formatUuidBytes(bytes);
  }

  function formatUuidBytes(bytes) {
    const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => elements.toast.classList.remove("is-visible"), 3600);
  }

  window.HealthTrackerTestHooks = Object.freeze({
    aggregateDaily,
    ratingDateData,
    filterDateRange,
    localIsoDate,
  });
})();
