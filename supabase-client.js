// ============================================================
// Initialisation du client Supabase
// ============================================================
// Nécessite que config.js soit chargé avant ce fichier,
// et que la librairie Supabase (CDN) soit chargée dans index.html.

let supabaseClient = null;
let isConfigured = false;

function initSupabase() {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = TWC_CONFIG;

  if (
    !SUPABASE_URL ||
    !SUPABASE_ANON_KEY ||
    SUPABASE_URL.includes("VOTRE-PROJET") ||
    SUPABASE_ANON_KEY.includes("VOTRE_CLE")
  ) {
    isConfigured = false;
    console.warn(
      "[Together We Can] Supabase n'est pas encore configuré. Ouvrez js/config.js et ajoutez vos clés."
    );
    return null;
  }

  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true, // garde le compte connecté en permanence
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
  isConfigured = true;
  return supabaseClient;
}
