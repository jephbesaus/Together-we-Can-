// ============================================================
// AUTH — Together We Can
// Comptes persistants : une fois inscrit, l'utilisateur reste
// connecté (pas de déconnexion automatique). Il peut se
// déconnecter manuellement via le menu Profil.
// ============================================================

const TWCAuth = {
  currentUser: null,

  async init(onReady) {
    if (!isConfigured) {
      onReady(null);
      return;
    }

    const { data } = await supabaseClient.auth.getSession();
    this.currentUser = data.session ? data.session.user : null;
    onReady(this.currentUser);

    supabaseClient.auth.onAuthStateChange((_event, session) => {
      this.currentUser = session ? session.user : null;
    });
  },

  async signUp({ name, phone, email, password }) {
    if (!isConfigured) {
      throw new Error(
        "Supabase n'est pas configuré. Ajoutez vos clés dans js/config.js."
      );
    }

    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          phone: phone,
        },
      },
    });

    if (error) throw error;
    this.currentUser = data.user;
    return data;
  },

  async signIn({ email, password }) {
    if (!isConfigured) {
      throw new Error(
        "Supabase n'est pas configuré. Ajoutez vos clés dans js/config.js."
      );
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    this.currentUser = data.user;
    return data;
  },

  async signOut() {
    if (!isConfigured) return;
    await supabaseClient.auth.signOut();
    this.currentUser = null;
  },
};
