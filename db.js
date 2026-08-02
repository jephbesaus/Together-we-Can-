// ============================================================
// DB — Couche d'accès à Supabase, utilisée par toutes les sections
// ============================================================

const DB = {
  // Réessaie automatiquement en cas de coupure réseau (jusqu'à 2 fois, avec pause)
  async _withRetry(fn, retries = 2) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        const isNetworkError = err?.message?.toLowerCase().includes("fetch") || err?.message?.toLowerCase().includes("network");
        if (!isNetworkError || attempt === retries) throw err;
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
      }
    }
  },

  async listNotifications(userId) {
    const { data, error } = await supabaseClient
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw error;
    return data;
  },
  async countUnreadNotifications(userId) {
    const { count, error } = await supabaseClient
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false);
    if (error) throw error;
    return count || 0;
  },
  async markAllNotificationsRead(userId) {
    const { error } = await supabaseClient.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
    if (error) throw error;
  },

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
    return DB._withRetry(async () => {
      const { error } = await supabaseClient.from("profiles").update(fields).eq("id", userId);
      if (error) throw error;
    });
  },

  // ---------- Fil d'accueil (posts) ----------
  async listPosts() {
    const { data, error } = await supabaseClient
      .from("posts")
      .select("*, profiles!author_id(full_name, is_admin, is_verified, avatar_url)")
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw error;
    return data;
  },

  async listRecentOfficialContent() {
    const { data, error } = await supabaseClient
      .from("content_items")
      .select("*, profiles!author_id(full_name, is_admin, is_verified, avatar_url)")
      .order("created_at", { ascending: false })
      .limit(15);
    if (error) throw error;
    return data;
  },

  async listRecentMarketplaceForFeed() {
    const { data, error } = await supabaseClient
      .from("marketplace_products")
      .select("*, profiles!seller_id(full_name, is_admin, is_verified, avatar_url)")
      .eq("is_sold", false)
      .order("created_at", { ascending: false })
      .limit(15);
    if (error) throw error;
    return data;
  },

  async createPost(authorId, content, postType = "publication", imageUrl = null) {
    return DB._withRetry(async () => {
      const { error } = await supabaseClient
        .from("posts")
        .insert({ author_id: authorId, content, post_type: postType, image_url: imageUrl });
      if (error) throw error;
    });
  },

  async setReaction(postId, emoji) {
    const { error } = await supabaseClient.rpc("set_reaction", { p_post_id: postId, p_emoji: emoji });
    if (error) throw error;
  },
  async removeReaction(postId) {
    const { error } = await supabaseClient.rpc("remove_reaction", { p_post_id: postId });
    if (error) throw error;
  },
  async myReactions(userId) {
    const { data, error } = await supabaseClient.from("post_reactions").select("post_id, emoji").eq("user_id", userId);
    if (error) throw error;
    return data || [];
  },
  async postReactionCounts(postId) {
    const { data, error } = await supabaseClient.from("post_reactions").select("emoji").eq("post_id", postId);
    if (error) throw error;
    const counts = {};
    (data || []).forEach((r) => (counts[r.emoji] = (counts[r.emoji] || 0) + 1));
    return counts;
  },
  async countFollowers(userId) {
    const { count, error } = await supabaseClient
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("followed_id", userId);
    if (error) throw error;
    return count || 0;
  },
  async listComments(postId) {
    const { data, error } = await supabaseClient
      .from("post_comments")
      .select("*, profiles!user_id(full_name)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data;
  },
  async addComment(postId, userId, content) {
    const { error } = await supabaseClient.from("post_comments").insert({ post_id: postId, user_id: userId, content });
    if (error) throw error;
    try {
      await supabaseClient.rpc("increment_comment_count", { p_post_id: postId });
    } catch (_) {
      // le compteur est secondaire, on n'échoue pas la publication du commentaire pour ça
    }
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
      .select("*, profiles!seller_id(full_name, phone)")
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
    return DB._withRetry(async () => {
      const ext = file.name.split(".").pop();
      const path = `${folder}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabaseClient.storage.from("twc-media").upload(path, file);
      if (error) throw error;
      const { data } = supabaseClient.storage.from("twc-media").getPublicUrl(path);
      return data.publicUrl;
    });
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
      .select("*, content_items(title), profiles!user_id(full_name, phone)")
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
      .select("*, profiles!user_id(full_name, phone)")
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
      .select("*, profiles!user_id(full_name, phone, points)")
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
      .select("*, profiles!user_id(full_name)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
  async adminListRecentPosts() {
    const { data, error } = await supabaseClient
      .from("posts")
      .select("*, profiles!author_id(full_name)")
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
      .select("*, profiles!user_id(full_name, phone)")
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
      .select("*, profiles!user_id(full_name, phone)")
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
      .select("*, profiles!user_id(full_name, phone)")
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

  async selfActivateAdmin(code) {
    const { data, error } = await supabaseClient.rpc("self_activate_admin", { p_code: code });
    if (error) throw error;
    return data;
  },

  async createMarketingRequest(payload) {
    const { error } = await supabaseClient.from("marketing_requests").insert(payload);
    if (error) throw error;
  },
  async myMarketingRequests(userId) {
    const { data, error } = await supabaseClient
      .from("marketing_requests")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
  async markProductSold(id) {
    const { error } = await supabaseClient.from("marketplace_products").update({ is_sold: true }).eq("id", id);
    if (error) throw error;
  },
  async deleteProduct(id) {
    const { error } = await supabaseClient.from("marketplace_products").delete().eq("id", id);
    if (error) throw error;
  },

  async clicBoostFetchServices() {
    const { data, error } = await supabaseClient.functions.invoke("clicboost-api", { body: { action: "services" } });
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  },
  async clicBoostPlaceOrder(serviceId, link, quantity) {
    const { data, error } = await supabaseClient.functions.invoke("clicboost-api", {
      body: { action: "add", service: serviceId, link, quantity },
    });
    if (error) throw error;
    return data;
  },
  async clicBoostBalance() {
    const { data, error } = await supabaseClient.functions.invoke("clicboost-api", { body: { action: "balance" } });
    if (error) throw error;
    return data;
  },

  async createClicBoostRequest(payload) {
    const { error } = await supabaseClient.from("clic_boost_requests").insert(payload);
    if (error) throw error;
  },
  async myClicBoostRequests(userId) {
    const { data, error } = await supabaseClient
      .from("clic_boost_requests")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
  async adminListClicBoost() {
    const { data, error } = await supabaseClient
      .from("clic_boost_requests")
      .select("*, profiles!user_id(full_name, phone)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
  async adminUpdateClicBoost(id, status) {
    const { error } = await supabaseClient.from("clic_boost_requests").update({ status }).eq("id", id);
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
