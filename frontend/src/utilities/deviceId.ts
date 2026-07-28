const DEVICE_ID_KEY = "realtimestocks:deviceId";

export function getDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    // localStorage unavailable (private browsing, disabled, etc.) — every
    // request in this session falls back to a shared anonymous bucket
    return "anonymous";
  }
}
