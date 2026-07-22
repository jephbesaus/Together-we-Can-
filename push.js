// ============================================================
// PUSH — Abonnement aux notifications (fonctionne app fermée)
// ============================================================

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

async function enablePushNotifications(userId) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.warn("[Together We Can] Notifications push non supportées sur ce navigateur.");
    return false;
  }
  if (!TWC_CONFIG.VAPID_PUBLIC_KEY) return false;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(TWC_CONFIG.VAPID_PUBLIC_KEY),
      });
    }

    const json = subscription.toJSON();
    await supabaseClient.from("push_subscriptions").upsert(
      {
        user_id: userId,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth_key: json.keys.auth,
      },
      { onConflict: "endpoint" }
    );
    return true;
  } catch (err) {
    console.warn("[Together We Can] Abonnement push échoué :", err.message);
    return false;
  }
}
