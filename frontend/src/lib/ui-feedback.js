const TOAST_EVENT = "app:toast";
const NOTIFICATION_EVENT = "app:notification";
const STORAGE_KEY = "tm_notifications";

export function pushToast(toast) {
  window.dispatchEvent(
    new CustomEvent(TOAST_EVENT, {
      detail: {
        id: Date.now().toString(),
        type: toast?.type || "info",
        text: toast?.text || "",
      },
    }),
  );
}

export function pushNotification(text, level = "info") {
  const next = {
    id: Date.now().toString(),
    text,
    level,
    createdAt: new Date().toISOString(),
  };
  const current = getNotifications();
  const updated = [next, ...current].slice(0, 20);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent(NOTIFICATION_EVENT, { detail: next }));
}

export function getNotifications() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function clearNotifications() {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(NOTIFICATION_EVENT, { detail: null }));
}

export function uiEvents() {
  return { TOAST_EVENT, NOTIFICATION_EVENT };
}
