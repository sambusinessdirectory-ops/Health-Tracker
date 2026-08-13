const serviceWorkerUrl = new URL("./sw.js", import.meta.url);
let deferredInstallPrompt = null;
const hadServiceWorkerController = Boolean(navigator.serviceWorker?.controller);
let reloadingForUpdate = false;

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  window.dispatchEvent(new CustomEvent("health-pwa-installable"));
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadServiceWorkerController || reloadingForUpdate) return;
    reloadingForUpdate = true;
    window.location.reload();
  });
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register(serviceWorkerUrl);
      await registration.update();
    } catch (error) {
      console.warn("Offline support could not be started.", error);
    }
  });
}

function usesTraditionalChinese() {
  const savedLanguage = window.localStorage.getItem("myHealthJourney:language");
  return savedLanguage === "zh-Hant" || (!savedLanguage && navigator.language?.toLowerCase().startsWith("zh"));
}

function showManualInstallHelp() {
  const isAppleMobile = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const chinese = usesTraditionalChinese();
  if (isAppleMobile) {
    window.alert(
      chinese
        ? "在 Safari 點按「分享」，再選擇「加入主畫面」。"
        : "In Safari, tap Share, then choose Add to Home Screen.",
    );
    return;
  }
  window.alert(
    chinese
      ? "請開啟瀏覽器選單，然後選擇「安裝應用程式」或「加到主畫面」。"
      : "Open your browser menu, then choose Install app or Add to Home Screen.",
  );
}

window.HealthPWA = Object.freeze({
  isStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  },
  async promptInstall() {
    if (!deferredInstallPrompt) {
      showManualInstallHelp();
      return false;
    }
    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    return choice.outcome === "accepted";
  },
});
