// ============================================================
// DB — Couche d'accès à Supabase, utilisée par toutes les sections
// ============================================================

const DB = {
  // ---------- Profil ----------
  async getProfile(userId) {
    const { data, error } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (error) throw error;
    return data;
  },

  async updateProfile(userId, fields) {
    const { error } = await supabaseClient.from("profiles").update(fields).eq("id", userId);
    if (error) throw error;
  },

  // ---------- Fil d'accueil (posts) ----------
  async listPosts() {
    const { data, error } = await supabaseClient
      .from("posts")
      .select("*, profiles(full_name, is_admin)")
      .eq("is_approved", true)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw error;
    return data;
  },

  async listRecentOfficialContent() {
    const { data, error } = await supabaseClient
      .from("content_items")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw error;
    return data;
  },

  async createPost(authorId, content, postType = "publication") {
    const { error } = await supabaseClient
      .from("posts")
      .insert({ author_id: authorId, content, post_type: postType });
    if (error) throw error;
  },

  async likePost(post) {
    const { error } = await supabaseClient
      .from("posts")
      .update({ likes_count: (post.likes_count || 0) + 1 })
      .eq("id", post.id);
    if (error) throw error;
  },

  // ---------- Contenu générique (Éducation, Formation, Opportunités,
  //            Entrepreneuriat, Marketing, Sport, Art) ----------
  async listContent(category) {
    const { data, error } = await supabaseClient
      .from("content_items")
      .select("*")
      .eq("category", category)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },

  async createContent(item) {
    const { error } = await supabaseClient.from("content_items").insert(item);
    if (error) throw error;
  },

  async submitQuizResult(contentId, userId, score) {
    const { error } = await supabaseClient
      .from("quiz_results")
      .insert({ content_id: contentId, user_id: userId, score });
    if (error) throw error;
  },

  // ---------- Candidatures / demandes d'accompagnement ----------
  async apply(contentId, userId, message) {
    const { error } = await supabaseClient
      .from("applications")
      .insert({ content_id: contentId, user_id: userId, message });
    if (error) throw error;
  },

  async myApplications(userId) {
    const { data, error } = await supabaseClient
      .from("applications")
      .select("*, content_items(title, category)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },

  // ---------- Marketplace ----------
  async listProducts() {
    const { data, error } = await supabaseClient
      .from("marketplace_products")
      .select("*, profiles(full_name, phone)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },

  async createProduct(product) {
    const { error } = await supabaseClient.from("marketplace_products").insert(product);
    if (error) throw error;
  },

  // ---------- Boost de visibilité ----------
  async createBoostRequest(payload) {
    const { error } = await supabaseClient.from("boost_requests").insert(payload);
    if (error) throw error;
  },

  async myBoostRequests(userId) {
    const { data, error } = await supabaseClient
      .from("boost_requests")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },

  // ---------- Messages (conversation avec l'admin) ----------
  async listMessages(userId) {
    const { data, error } = await supabaseClient
      .from("messages")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data;
  },

  async sendMessage(userId, content, senderIsAdmin = false) {
    const { error } = await supabaseClient
      .from("messages")
      .insert({ user_id: userId, content, sender_is_admin: senderIsAdmin });
    if (error) throw error;
  },

  // ---------- Équipe / parrainage ----------
  async myTeam(userId) {
    const { data, error } = await supabaseClient
      .from("profiles")
      .select("full_name, created_at")
      .eq("referred_by", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },

  // ---------- Points / récompenses ----------
  async createRewardRequest(userId, points, amountFc) {
    const { error } = await supabaseClient
      .from("reward_requests")
      .insert({ user_id: userId, points_requested: points, amount_fc: amountFc });
    if (error) throw error;
  },

  async myRewardRequests(userId) {
    const { data, error } = await supabaseClient
      .from("reward_requests")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },

  // ---------- Upload média (avatars, produits, publications) ----------
  async uploadMedia(file, folder) {
    const ext = file.name.split(".").pop();
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabaseClient.storage.from("twc-media").upload(path, file);
    if (error) throw error;
    const { data } = supabaseClient.storage.from("twc-media").getPublicUrl(path);
    return data.publicUrl;
  },

  async handleReferral(referralCode, newUserId) {
    const { error } = await supabaseClient.rpc("handle_referral", {
      p_referral_code: referralCode,
      p_new_user_id: newUserId,
    });
    if (error) throw error;
  },

  // ---------- Admin ----------
  async adminListApplications() {
    const { data, error } = await supabaseClient
      .from("applications")
      .select("*, content_items(title), profiles(full_name, phone)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
  async adminUpdateApplication(id, status) {
    const { error } = await supabaseClient.from("applications").update({ status }).eq("id", id);
    if (error) throw error;
  },
  async adminListBoosts() {
    const { data, error } = await supabaseClient
      .from("boost_requests")
      .select("*, profiles(full_name, phone)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
  async adminUpdateBoost(id, status) {
    const { error } = await supabaseClient.from("boost_requests").update({ status }).eq("id", id);
    if (error) throw error;
  },
  async adminListRewardRequests() {
    const { data, error } = await supabaseClient
      .from("reward_requests")
      .select("*, profiles(full_name, phone, points)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
  async adminValidateReward(request) {
    const { error: e1 } = await supabaseClient
      .from("reward_requests")
      .update({ status: "validee" })
      .eq("id", request.id);
    if (e1) throw e1;
    const { data: profile, error: e2 } = await supabaseClient
      .from("profiles")
      .select("points")
      .eq("id", request.user_id)
      .single();
    if (e2) throw e2;
    const { error: e3 } = await supabaseClient
      .from("profiles")
      .update({ points: Math.max(0, (profile.points || 0) - request.points_requested) })
      .eq("id", request.user_id);
    if (e3) throw e3;
  },
  async adminRejectReward(id) {
    const { error } = await supabaseClient.from("reward_requests").update({ status: "rejetee" }).eq("id", id);
    if (error) throw error;
  },
  async adminListUsers() {
    const { data, error } = await supabaseClient
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
  async adminListAllMessages() {
    const { data, error } = await supabaseClient
      .from("messages")
      .select("*, profiles(full_name)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
  async adminListPendingPosts() {
    const { data, error } = await supabaseClient
      .from("posts")
      .select("*, profiles(full_name)")
      .eq("is_approved", false)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
  async adminApprovePost(id) {
    const { error } = await supabaseClient.from("posts").update({ is_approved: true }).eq("id", id);
    if (error) throw error;
  },
  async adminRejectPost(id) {
    const { error } = await supabaseClient.from("posts").delete().eq("id", id);
    if (error) throw error;
  },

  // ---------- Assistant IA (via Edge Function sécurisée) ----------
  async askAI(message) {
    const { data, error } = await supabaseClient.functions.invoke("ai-assistant", {
      body: { message },
    });
    if (error) throw error;
    return data.reply;
  },
};
