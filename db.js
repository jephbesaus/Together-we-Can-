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
      .select("*, profiles(full_name, is_admin, is_verified)")
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
  async adminListRecentPosts() {
    const { data, error } = await supabaseClient
      .from("posts")
      .select("*, profiles(full_name)")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return data;
  },
  async adminDeletePost(id) {
    const { error } = await supabaseClient.from("posts").delete().eq("id", id);
    if (error) throw error;
  },

  // ---------- Suivi (follow) ----------
  async isFollowing(followerId, followedId) {
    const { data } = await supabaseClient
      .from("follows")
      .select("*")
      .eq("follower_id", followerId)
      .eq("followed_id", followedId)
      .maybeSingle();
    return !!data;
  },
  async follow(followerId, followedId) {
    const { error } = await supabaseClient.from("follows").insert({ follower_id: followerId, followed_id: followedId });
    if (error) throw error;
  },
  async unfollow(followerId, followedId) {
    const { error } = await supabaseClient
      .from("follows")
      .delete()
      .eq("follower_id", followerId)
      .eq("followed_id", followedId);
    if (error) throw error;
  },
  async myFollowedIds(userId) {
    const { data, error } = await supabaseClient.from("follows").select("followed_id").eq("follower_id", userId);
    if (error) throw error;
    return (data || []).map((f) => f.followed_id);
  },
  async getPublicProfile(userId) {
    const { data, error } = await supabaseClient.from("profiles").select("*").eq("id", userId).single();
    if (error) throw error;
    return data;
  },

  // ---------- Messagerie entre membres ----------
  async searchProfiles(query) {
    const { data, error } = await supabaseClient
      .from("profiles")
      .select("id, full_name, avatar_url, is_verified")
      .ilike("full_name", `%${query}%`)
      .limit(20);
    if (error) throw error;
    return data;
  },
  async myConversationPartners(userId) {
    const { data, error } = await supabaseClient
      .from("direct_messages")
      .select("sender_id, receiver_id, profiles!direct_messages_sender_id_fkey(full_name), profiles!direct_messages_receiver_id_fkey(full_name)")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: false });
    if (error) throw error;
    const seen = new Map();
    (data || []).forEach((m) => {
      const otherId = m.sender_id === userId ? m.receiver_id : m.sender_id;
      if (!seen.has(otherId)) seen.set(otherId, otherId);
    });
    return [...seen.keys()];
  },
  async listDirectMessages(userId, otherId) {
    const { data, error } = await supabaseClient
      .from("direct_messages")
      .select("*")
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${userId})`)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data;
  },
  async sendDirectMessage(senderId, receiverId, content) {
    const { error } = await supabaseClient.from("direct_messages").insert({ sender_id: senderId, receiver_id: receiverId, content });
    if (error) throw error;
  },

  // ---------- Vérification (badge) ----------
  async submitVerification(payload) {
    const { error } = await supabaseClient.from("verification_requests").insert(payload);
    if (error) throw error;
  },
  async myVerificationRequests(userId) {
    const { data, error } = await supabaseClient
      .from("verification_requests")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },

  // ---------- Ma caisse (portefeuille) ----------
  async createTopup(payload) {
    const { error } = await supabaseClient.from("wallet_topups").insert(payload);
    if (error) throw error;
  },
  async myTopups(userId) {
    const { data, error } = await supabaseClient
      .from("wallet_topups")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
  async createWithdrawal(userId, paymentNumber, amount) {
    const { error } = await supabaseClient
      .from("withdrawal_requests")
      .insert({ user_id: userId, payment_number: paymentNumber, amount });
    if (error) throw error;
  },
  async myWithdrawals(userId) {
    const { data, error } = await supabaseClient
      .from("withdrawal_requests")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },

  // ---------- Admin : nouvelles fonctions ----------
  async adminListVerifications() {
    const { data, error } = await supabaseClient
      .from("verification_requests")
      .select("*, profiles(full_name, phone)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
  async adminApproveVerification(id) {
    const { error } = await supabaseClient.rpc("admin_approve_verification", { p_request_id: id });
    if (error) throw error;
  },
  async adminRejectVerification(id) {
    const { error } = await supabaseClient.from("verification_requests").update({ status: "rejetee" }).eq("id", id);
    if (error) throw error;
  },
  async adminListTopups() {
    const { data, error } = await supabaseClient
      .from("wallet_topups")
      .select("*, profiles(full_name, phone)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
  async adminApproveTopup(id) {
    const { error } = await supabaseClient.rpc("admin_approve_topup", { p_request_id: id });
    if (error) throw error;
  },
  async adminRejectTopup(id) {
    const { error } = await supabaseClient.from("wallet_topups").update({ status: "rejetee" }).eq("id", id);
    if (error) throw error;
  },
  async adminListWithdrawals() {
    const { data, error } = await supabaseClient
      .from("withdrawal_requests")
      .select("*, profiles(full_name, phone)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
  async adminApproveWithdrawal(id) {
    const { error } = await supabaseClient.rpc("admin_approve_withdrawal", { p_request_id: id });
    if (error) throw error;
  },
  async adminRejectWithdrawal(id) {
    const { error } = await supabaseClient.from("withdrawal_requests").update({ status: "rejetee" }).eq("id", id);
    if (error) throw error;
  },
  async adminFinalizeReward(id, amountFc) {
    const { error } = await supabaseClient.rpc("admin_finalize_reward", { p_request_id: id, p_amount_fc: amountFc });
    if (error) throw error;
  },
  async adminSetBlocked(userId, blocked) {
    const { error } = await supabaseClient.rpc("admin_set_blocked", { p_user_id: userId, p_blocked: blocked });
    if (error) throw error;
  },
  async adminRenameUser(userId, newName) {
    const { error } = await supabaseClient.rpc("admin_rename_user", { p_user_id: userId, p_new_name: newName });
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
