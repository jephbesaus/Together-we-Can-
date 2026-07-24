// ============================================================
// ACCOUNT — Messages, Profil, Mon équipe, Échange des points
// ============================================================

let messagesPollTimer = null;

// ---------- Profil public (suivre / contacter) ----------
async function renderPublicProfile(container, ctx) {
  const targetId = ctx.targetUserId;
  if (!targetId) {
    container.innerHTML = `<p class="section-error">Profil introuvable.</p>`;
    return;
  }
  container.innerHTML = `<p class="section-loading">Chargement...</p>`;
  const [profile, following] = await Promise.all([
    DB.getPublicProfile(targetId),
    DB.isFollowing(ctx.user.id, targetId),
  ]);

  container.innerHTML = `
    <div class="profile-head">
      <div class="profile-avatar">${(profile.full_name || "M").charAt(0).toUpperCase()}</div>
      <div>
        <h2>${esc(profile.full_name || "Membre")} ${profile.is_verified ? '<span class="verified-badge">✅</span>' : ""}</h2>
      </div>
    </div>
    <div class="content-card-actions" style="margin-top:14px;">
      <button id="btn-follow" class="${following ? "btn-secondary" : "btn-primary"}">${following ? "✓ Suivi(e)" : "➕ Suivre"}</button>
      <button id="btn-contact" class="btn-secondary">✉️ Contacter</button>
    </div>
  `;

  container.querySelector("#btn-follow").addEventListener("click", async (e) => {
    const btn = e.target;
    try {
      if (following) {
        await DB.unfollow(ctx.user.id, targetId);
      } else {
        await DB.follow(ctx.user.id, targetId);
        alert(`Vous suivez désormais ${profile.full_name || "ce membre"} — vous serez informé en priorité de ses publications.`);
      }
      renderPublicProfile(container, ctx);
    } catch (err) {
      alert("❌ " + err.message);
    }
  });

  container.querySelector("#btn-contact").addEventListener("click", () => {
    openSection("dm", profile.full_name || "Conversation", { targetUserId: targetId, targetName: profile.full_name });
  });
}

// ---------- Messagerie entre membres : fil de discussion ----------
let dmPollTimer = null;
async function renderDirectMessageThread(container, ctx) {
  const otherId = ctx.targetUserId;
  container.innerHTML = `
    <div class="chat-box">
      <div id="dm-log" class="chat-log"><p class="section-loading">Chargement...</p></div>
      <form id="dm-form" class="assistant-input-row">
        <input type="text" id="dm-input" placeholder="Écrire un message..." required />
        <button type="submit" class="btn-primary">Envoyer</button>
      </form>
    </div>
  `;
  const log = container.querySelector("#dm-log");

  async function load() {
    try {
      const msgs = await DB.listDirectMessages(ctx.user.id, otherId);
      if (!msgs.length) {
        log.innerHTML = `<p class="section-loading">Aucun message. Démarrez la conversation !</p>`;
        return;
      }
      log.innerHTML = msgs
        .map((m) => `<div class="bubble ${m.sender_id === ctx.user.id ? "bubble-user" : "bubble-bot"}">${esc(m.content)}</div>`)
        .join("");
      log.scrollTop = log.scrollHeight;
    } catch (err) {
      log.innerHTML = `<p class="section-error">${esc(err.message)}</p>`;
    }
  }

  container.querySelector("#dm-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = container.querySelector("#dm-input");
    const content = input.value.trim();
    if (!content) return;
    input.value = "";
    try {
      await DB.sendDirectMessage(ctx.user.id, otherId, content);
      load();
    } catch (err) {
      alert("❌ " + err.message);
    }
  });

  await load();
  clearInterval(dmPollTimer);
  dmPollTimer = setInterval(load, 5000);
}

async function renderMessages(container, ctx) {
  container.innerHTML = `
    <div class="chip-row">
      <button class="chip active" data-tab="admin">Together We Can Admin</button>
      <button class="chip" data-tab="membres">Membres</button>
    </div>
    <div id="messages-body"></div>
  `;
  const body = container.querySelector("#messages-body");

  container.querySelectorAll("[data-tab]").forEach((btn) =>
    btn.addEventListener("click", () => {
      container.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");
      clearInterval(messagesPollTimer);
      if (btn.dataset.tab === "admin") renderAdminConversation(body, ctx);
      else renderMemberConversations(body, ctx);
    })
  );

  renderAdminConversation(body, ctx);
}

async function renderMemberConversations(container, ctx) {
  container.innerHTML = `
    <div class="inline-form" style="margin-bottom:14px;">
      <input type="text" id="dm-search" placeholder="Rechercher un membre..." />
    </div>
    <div id="dm-results" class="card-list"></div>
    <h3 class="list-title">Mes conversations</h3>
    <div id="dm-conversations" class="card-list"><p class="section-loading">Chargement...</p></div>
  `;

  const results = container.querySelector("#dm-results");
  const search = container.querySelector("#dm-search");
  let debounce;
  search.addEventListener("input", () => {
    clearTimeout(debounce);
    debounce = setTimeout(async () => {
      const q = search.value.trim();
      if (!q) {
        results.innerHTML = "";
        return;
      }
      const people = await DB.searchProfiles(q);
      results.innerHTML = people
        .filter((p) => p.id !== ctx.user.id)
        .map(
          (p) => `<article class="content-card" data-open="${p.id}" data-name="${esc(p.full_name || "Membre")}">
          <h3>${esc(p.full_name || "Membre")} ${p.is_verified ? '<span class="verified-badge">✅</span>' : ""}</h3>
        </article>`
        )
        .join("");
      results.querySelectorAll("[data-open]").forEach((card) =>
        card.addEventListener("click", () => openSection("dm", card.dataset.name, { targetUserId: card.dataset.open, targetName: card.dataset.name }))
      );
    }, 300);
  });

  const convList = container.querySelector("#dm-conversations");
  try {
    const ids = await DB.myConversationPartners(ctx.user.id);
    if (!ids.length) {
      convList.innerHTML = `<p class="section-loading">Aucune conversation. Recherchez un membre ci-dessus.</p>`;
      return;
    }
    const profiles = await Promise.all(ids.map((id) => DB.getPublicProfile(id).catch(() => null)));
    convList.innerHTML = profiles
      .filter(Boolean)
      .map(
        (p) => `<article class="content-card" data-open="${p.id}" data-name="${esc(p.full_name || "Membre")}">
        <h3>${esc(p.full_name || "Membre")} ${p.is_verified ? '<span class="verified-badge">✅</span>' : ""}</h3>
      </article>`
      )
      .join("");
    convList.querySelectorAll("[data-open]").forEach((card) =>
      card.addEventListener("click", () => openSection("dm", card.dataset.name, { targetUserId: card.dataset.open, targetName: card.dataset.name }))
    );
  } catch (err) {
    convList.innerHTML = `<p class="section-error">${esc(err.message)}</p>`;
  }
}

async function renderAdminConversation(container, ctx) {
  container.innerHTML = `
    <div class="chat-box">
      <div id="chat-log" class="chat-log"><p class="section-loading">Chargement...</p></div>
      <form id="chat-form" class="assistant-input-row">
        <input type="text" id="chat-input" placeholder="Écrire à Together We Can Admin..." required />
        <button type="submit" class="btn-primary">Envoyer</button>
      </form>
    </div>
  `;

  const log = container.querySelector("#chat-log");

  async function loadMessages() {
    try {
      const msgs = await DB.listMessages(ctx.user.id);
      if (!msgs.length) {
        log.innerHTML = `<p class="section-loading">Aucun message. Écrivez à l'administration ci-dessous.</p>`;
        return;
      }
      log.innerHTML = msgs
        .map(
          (m) => `<div class="bubble ${m.sender_is_admin ? "bubble-bot" : "bubble-user"}">
            <span class="bubble-label">${m.sender_is_admin ? "Together We Can Admin" : "Vous"}</span>
            ${esc(m.content)}
          </div>`
        )
        .join("");
      log.scrollTop = log.scrollHeight;
    } catch (err) {
      log.innerHTML = `<p class="section-error">${esc(err.message)}</p>`;
    }
  }

  container.querySelector("#chat-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = container.querySelector("#chat-input");
    const content = input.value.trim();
    if (!content) return;
    input.value = "";
    try {
      await DB.sendMessage(ctx.user.id, content, false);
      loadMessages();
    } catch (err) {
      alert("❌ " + err.message);
    }
  });

  await loadMessages();
  clearInterval(messagesPollTimer);
  messagesPollTimer = setInterval(loadMessages, 5000);
}

async function renderProfile(container, ctx) {
  const p = ctx.profile;
  const shareLink = `${window.location.origin}${window.location.pathname}?ref=${p.referral_code}`;

  container.innerHTML = `
    <div class="profile-head">
      <div class="profile-avatar">${(p.full_name || "M").charAt(0).toUpperCase()}</div>
      <div>
        <h2>${esc(p.full_name || "Membre")} ${p.is_verified ? '<span class="verified-badge">✅</span>' : ""}</h2>
        <p class="content-card-meta">${esc(p.phone || "")}</p>
      </div>
    </div>

    <div class="stat-row">
      <div class="stat-box"><strong>${p.points || 0}</strong><span>Points</span></div>
      <div class="stat-box"><strong>${p.balance_fc || 0} FC</strong><span>Solde</span></div>
    </div>

    <form id="profile-form" class="inline-form card-form">
      <label class="field"><span>Nom complet</span><input type="text" name="full_name" value="${esc(p.full_name || "")}" required /></label>
      <label class="field"><span>Téléphone</span><input type="tel" name="phone" value="${esc(p.phone || "")}" required /></label>
      <label class="field"><span>Photo de profil</span><input type="file" name="avatar" accept="image/*" /></label>
      <button type="submit" class="btn-primary">Enregistrer</button>
      <p class="form-status hidden"></p>
    </form>

    <h3 class="list-title">Mon lien de parrainage</h3>
    <div class="share-box">
      <input type="text" readonly value="${shareLink}" id="share-input" />
      <button class="btn-secondary" id="btn-copy-link">Copier</button>
    </div>

    <h3 class="list-title">Mon compte</h3>
    <div class="profile-menu">
      <button class="profile-menu-item" data-goto="caisse">💰 Ma caisse ${p.is_verified ? "" : ""}</button>
      <button class="profile-menu-item" data-goto="verification">${p.is_verified ? "✅ Compte vérifié" : "🛡️ Vérifier mon compte"}</button>
      <button class="profile-menu-item" data-goto="securite">🔒 Sécurité</button>
      <button class="profile-menu-item" data-goto="activites">📋 Mes activités</button>
    </div>
  `;

  container.querySelectorAll("[data-goto]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const map = { caisse: "Ma caisse", verification: "Vérification", securite: "Sécurité", activites: "Mes activités" };
      openSection(btn.dataset.goto, map[btn.dataset.goto]);
    })
  );

  container.querySelector("#btn-copy-link").addEventListener("click", () => {
    const input = container.querySelector("#share-input");
    input.select();
    navigator.clipboard?.writeText(input.value).catch(() => {});
    alert("Lien copié !");
  });

  container.querySelector("#profile-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const status = form.querySelector(".form-status");
    const fd = new FormData(form);
    try {
      const fields = { full_name: fd.get("full_name"), phone: fd.get("phone") };
      const avatar = fd.get("avatar");
      if (avatar && avatar.size > 0) {
        fields.avatar_url = await DB.uploadMedia(avatar, "avatars");
      }
      await DB.updateProfile(ctx.user.id, fields);
      ctx.profile = { ...ctx.profile, ...fields };
      status.textContent = "✅ Profil mis à jour.";
      status.className = "form-status success";
      status.classList.remove("hidden");
      ctx.refreshHeader?.();
    } catch (err) {
      status.textContent = "❌ " + err.message;
      status.className = "form-status error";
      status.classList.remove("hidden");
    }
  });
}

async function renderTeam(container, ctx) {
  container.innerHTML = `<p class="section-loading">Chargement...</p>`;
  let team = [];
  try {
    team = await DB.myTeam(ctx.user.id);
  } catch (err) {
    container.innerHTML = `<p class="section-error">${esc(err.message)}</p>`;
    return;
  }

  const shareLink = `${window.location.origin}${window.location.pathname}?ref=${ctx.profile.referral_code}`;
  const shareMessage = `Ensemble, nous pouvons aller plus loin ! Rejoignez Together We Can et découvrez une communauté d'entraide, d'opportunités et de développement. Cliquez sur le lien ci-dessous pour nous rejoindre.\nLien : ${shareLink}`;

  container.innerHTML = `
    <div class="stat-row">
      <div class="stat-box"><strong>${team.length}</strong><span>Membres invités</span></div>
      <div class="stat-box"><strong>${ctx.profile.points || 0}</strong><span>Points gagnés</span></div>
    </div>
    <div class="content-card">
      <p class="content-card-body">${esc(shareMessage).replace(/\n/g, "<br/>")}</p>
    </div>
    <div class="share-box">
      <input type="text" readonly value="${shareLink}" id="share-input-team" />
      <button class="btn-secondary" id="btn-copy-team">Copier le message</button>
    </div>
    <h3 class="list-title">Mon équipe</h3>
    <div class="card-list">
      ${
        team.length
          ? team.map((m) => `<article class="content-card"><h3>${esc(m.full_name || "Membre")}</h3><p class="content-card-meta">Rejoint le ${formatDate(m.created_at)}</p></article>`).join("")
          : `<div class="empty-state"><div class="placeholder-badge">🤝</div><h2>Personne pour l'instant</h2><p>Partagez votre lien pour inviter des membres et gagner des points.</p></div>`
      }
    </div>
  `;

  container.querySelector("#btn-copy-team").addEventListener("click", () => {
    navigator.clipboard?.writeText(shareMessage).catch(() => {});
    alert("Message copié !");
  });
}

// ---------- Ma caisse (portefeuille) ----------
const OPERATORS = [
  { key: "airtel", label: "Airtel", number: "0961105201", logo: "airtel.png" },
  { key: "vodacom", label: "Vodacom", number: "08000410630", logo: "vodacom.png" },
  { key: "orange", label: "Orange", number: "0850504961", logo: "orange.png" },
  { key: "africell", label: "Africell", number: "289026", logo: "africell.png" },
];

async function renderCaisse(container, ctx) {
  let topups = [];
  try {
    topups = await DB.myTopups(ctx.user.id);
  } catch (_) {}

  container.innerHTML = `
    <div class="stat-row">
      <div class="stat-box stat-box-gold"><strong>${ctx.profile.balance_fc || 0} FC</strong><span>Solde disponible</span></div>
    </div>
    <p class="rules-box">💡 Effectuez vos opérations ici pour avoir un solde suffisant pour vos commandes dans l'application (vérification, services, etc.).</p>

    <h3 class="list-title">Paiement Mobile Money</h3>
    <div class="operator-list">
      ${OPERATORS.map((o) => `
        <div class="operator-row">
          <img src="${o.logo}" alt="${o.label}" class="operator-logo" />
          <div><strong>${o.label}</strong><p class="content-card-meta">${o.number}</p></div>
        </div>`).join("")}
    </div>

    <div class="content-card" style="margin-top:14px;">
      <p class="content-card-body">🔜 Paiement en crypto-monnaie — Bientôt disponible</p>
      <p class="content-card-body">🔜 Paiement bancaire — Bientôt disponible</p>
    </div>

    <form id="topup-form" class="inline-form card-form" style="margin-top:16px;">
      <label class="field"><span>Opérateur utilisé</span>
        <select name="operator" required>
          ${OPERATORS.map((o) => `<option value="${o.label}">${o.label}</option>`).join("")}
        </select>
      </label>
      <label class="field"><span>Montant envoyé (FC)</span><input type="number" name="amount" min="1" required /></label>
      <label class="field"><span>Capture d'écran du paiement</span><input type="file" name="proof" accept="image/*" required /></label>
      <button type="submit" class="btn-primary">J'ai payé</button>
      <p class="form-status hidden"></p>
    </form>

    <h3 class="list-title">Historique</h3>
    <div class="card-list">
      ${
        topups.length
          ? topups.map((t) => `<article class="content-card"><div class="content-card-head"><h3>${t.amount} FC · ${esc(t.operator)}</h3>${statusBadge(t.status)}</div><p class="content-card-meta">${formatDate(t.created_at)}</p></article>`).join("")
          : `<p class="section-loading">Aucune recharge pour l'instant.</p>`
      }
    </div>
  `;

  container.querySelector("#topup-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const status = form.querySelector(".form-status");
    const fd = new FormData(form);
    try {
      const proofUrl = await DB.uploadMedia(fd.get("proof"), "payment-proofs");
      await DB.createTopup({
        user_id: ctx.user.id,
        operator: fd.get("operator"),
        amount: parseFloat(fd.get("amount")),
        proof_url: proofUrl,
      });
      status.textContent = "✅ Paiement envoyé, en attente de validation par l'administration.";
      status.className = "form-status success";
      status.classList.remove("hidden");
      form.reset();
      setTimeout(() => renderCaisse(container, ctx), 900);
    } catch (err) {
      status.textContent = "❌ " + err.message;
      status.className = "form-status error";
      status.classList.remove("hidden");
    }
  });
}

// ---------- Vérification du compte (badge) ----------
async function renderVerification(container, ctx) {
  if (ctx.profile.is_verified) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="placeholder-badge">✅</div>
        <h2>Compte déjà vérifié</h2>
        <p>Votre profil affiche désormais le badge Together We Can ✅</p>
      </div>`;
    return;
  }

  let requests = [];
  try {
    requests = await DB.myVerificationRequests(ctx.user.id);
  } catch (_) {}
  const pending = requests.find((r) => r.status === "en_attente");

  container.innerHTML = `
    <div class="content-card">
      <h3 class="post-official-title">Pourquoi se faire vérifier ?</h3>
      <p class="content-card-body">Le badge "Membre vérifié" ✅ vous donne : priorité pour les demandes de prêts/aides, publications mises en avant, accès à des formations exclusives, meilleure visibilité au Marketplace, points de confiance plus rapides, support prioritaire, et la possibilité de devenir responsable ou ambassadeur.</p>
    </div>

    ${pending ? `
    <div class="empty-state">
      <div class="placeholder-badge">⏳</div>
      <h2>Demande en attente</h2>
      <p>Votre demande de vérification est en cours d'examen par l'administration.</p>
    </div>` : `
    <form id="verif-form" class="inline-form card-form" style="margin-top:16px;">
      <label class="field"><span>Photo de la carte d'identité (ou document officiel)</span><input type="file" name="id_document" accept="image/*" required /></label>
      <label class="field"><span>Selfie (pour confirmer votre identité)</span><input type="file" name="selfie" accept="image/*" required /></label>
      <label class="field"><span>Numéro de téléphone</span><input type="tel" name="phone" value="${esc(ctx.profile.phone || "")}" required /></label>
      <label class="field"><span>Adresse e-mail</span><input type="email" name="email" required /></label>
      <p class="rules-box">💰 Frais de vérification : <strong>18 000 FC</strong>. Payez via Mobile Money (voir « Ma caisse »), puis joignez la capture d'écran ci-dessous.</p>
      <label class="field"><span>Capture d'écran du paiement (18 000 FC)</span><input type="file" name="payment_proof" accept="image/*" required /></label>
      <button type="submit" class="btn-primary">Envoyer ma demande</button>
      <p class="form-status hidden"></p>
    </form>`}
  `;

  const form = container.querySelector("#verif-form");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const status = form.querySelector(".form-status");
      const fd = new FormData(form);
      try {
        const [idUrl, selfieUrl, paymentUrl] = await Promise.all([
          DB.uploadMedia(fd.get("id_document"), "verification"),
          DB.uploadMedia(fd.get("selfie"), "verification"),
          DB.uploadMedia(fd.get("payment_proof"), "verification"),
        ]);
        await DB.submitVerification({
          user_id: ctx.user.id,
          id_document_url: idUrl,
          selfie_url: selfieUrl,
          phone: fd.get("phone"),
          email: fd.get("email"),
          payment_proof_url: paymentUrl,
        });
        status.textContent = "✅ Demande envoyée, en attente de validation.";
        status.className = "form-status success";
        status.classList.remove("hidden");
        setTimeout(() => renderVerification(container, ctx), 900);
      } catch (err) {
        status.textContent = "❌ " + err.message;
        status.className = "form-status error";
        status.classList.remove("hidden");
      }
    });
  }
}

// ---------- Sécurité ----------
async function renderSecurity(container, ctx) {
  container.innerHTML = `
    <form id="pwd-form" class="inline-form card-form">
      <h3 class="post-official-title">Modifier le mot de passe</h3>
      <label class="field"><span>Nouveau mot de passe</span><input type="password" name="new_password" minlength="6" required /></label>
      <label class="field"><span>Confirmer</span><input type="password" name="confirm_password" minlength="6" required /></label>
      <button type="submit" class="btn-primary">Mettre à jour</button>
      <p class="form-status hidden"></p>
    </form>
    <div class="content-card" style="margin-top:14px;">
      <h3 class="post-official-title">Authentification à deux facteurs (2FA)</h3>
      <p class="content-card-body">🔜 Bientôt disponible.</p>
    </div>
    <div class="content-card" style="margin-top:14px;">
      <h3 class="post-official-title">Appareils connectés</h3>
      <p class="content-card-body">🔜 Bientôt disponible.</p>
    </div>
  `;

  container.querySelector("#pwd-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const status = form.querySelector(".form-status");
    const fd = new FormData(form);
    if (fd.get("new_password") !== fd.get("confirm_password")) {
      status.textContent = "❌ Les mots de passe ne correspondent pas.";
      status.className = "form-status error";
      status.classList.remove("hidden");
      return;
    }
    try {
      const { error } = await supabaseClient.auth.updateUser({ password: fd.get("new_password") });
      if (error) throw error;
      status.textContent = "✅ Mot de passe mis à jour.";
      status.className = "form-status success";
      status.classList.remove("hidden");
      form.reset();
    } catch (err) {
      status.textContent = "❌ " + err.message;
      status.className = "form-status error";
      status.classList.remove("hidden");
    }
  });
}

// ---------- Mes activités ----------
async function renderActivities(container, ctx) {
  container.innerHTML = `<p class="section-loading">Chargement...</p>`;
  try {
    const [posts, products, applications] = await Promise.all([
      supabaseClient.from("posts").select("*").eq("author_id", ctx.user.id).order("created_at", { ascending: false }),
      supabaseClient.from("marketplace_products").select("*").eq("seller_id", ctx.user.id).order("created_at", { ascending: false }),
      DB.myApplications(ctx.user.id),
    ]);
    container.innerHTML = `
      <h3 class="list-title">Mes publications (${posts.data?.length || 0})</h3>
      <div class="card-list">${(posts.data || []).map((p) => `<article class="content-card"><p class="content-card-body">${esc(p.content)}</p><p class="content-card-meta">${formatDate(p.created_at)}</p></article>`).join("") || `<p class="section-loading">Aucune publication.</p>`}</div>

      <h3 class="list-title">Mes produits en vente (${products.data?.length || 0})</h3>
      <div class="card-list">${(products.data || []).map((p) => `<article class="content-card"><h3>${esc(p.title)}</h3><p class="content-card-meta">${p.price} FC</p></article>`).join("") || `<p class="section-loading">Aucun produit.</p>`}</div>

      <h3 class="list-title">Mes candidatures / services demandés (${applications.length})</h3>
      <div class="card-list">${applications.map((a) => `<article class="content-card"><h3>${esc(a.content_items?.title || "—")}</h3>${statusBadge(a.status)}</article>`).join("") || `<p class="section-loading">Aucune candidature.</p>`}</div>
    `;
  } catch (err) {
    container.innerHTML = `<p class="section-error">${esc(err.message)}</p>`;
  }
}

async function renderPoints(container, ctx) {
  let history = [];
  let withdrawals = [];
  try {
    [history, withdrawals] = await Promise.all([DB.myRewardRequests(ctx.user.id), DB.myWithdrawals(ctx.user.id)]);
  } catch (_) {}

  container.innerHTML = `
    <div class="stat-row">
      <div class="stat-box stat-box-gold"><strong>${ctx.profile.points || 0}</strong><span>Points disponibles</span></div>
      <div class="stat-box stat-box-gold"><strong>${ctx.profile.balance_fc || 0} FC</strong><span>Solde disponible</span></div>
    </div>
    <div class="rules-box">
      <p><strong>Règles d'échange :</strong></p>
      <p>Un minimum de membres actifs parrainés est requis. Chaque demande est validée manuellement par l'administration, qui fixe le montant en FC.</p>
    </div>
    <form id="reward-form" class="inline-form card-form">
      <label class="field"><span>Points à échanger</span><input type="number" name="points" min="10" step="10" required /></label>
      <button type="submit" class="btn-primary">Envoyer la demande</button>
      <p class="form-status hidden"></p>
    </form>
    <h3 class="list-title">Historique des échanges</h3>
    <div class="card-list">
      ${
        history.length
          ? history.map((r) => `<article class="content-card"><div class="content-card-head"><h3>${r.points_requested} points${r.amount_fc ? ` → ${r.amount_fc} FC` : ""}</h3>${statusBadge(r.status)}</div><p class="content-card-meta">${formatDate(r.created_at)}</p></article>`).join("")
          : `<p class="section-loading">Aucune demande pour l'instant.</p>`
      }
    </div>

    <h3 class="list-title">💸 Retirer mon solde</h3>
    <form id="withdraw-form" class="inline-form card-form">
      <label class="field"><span>Numéro de paiement (mobile money)</span><input type="tel" name="payment_number" placeholder="+243..." required /></label>
      <label class="field"><span>Montant à retirer (FC)</span><input type="number" name="amount" min="1" required /></label>
      <button type="submit" class="btn-primary">Lancer le retrait</button>
      <p class="form-status hidden"></p>
    </form>
    <div class="card-list">
      ${
        withdrawals.length
          ? withdrawals.map((w) => `<article class="content-card"><div class="content-card-head"><h3>${w.amount} FC</h3>${statusBadge(w.status)}</div><p class="content-card-meta">${esc(w.payment_number)} · ${formatDate(w.created_at)}</p></article>`).join("")
          : `<p class="section-loading">Aucun retrait pour l'instant.</p>`
      }
    </div>
  `;

  container.querySelector("#withdraw-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const status = form.querySelector(".form-status");
    const fd = new FormData(form);
    const amount = parseFloat(fd.get("amount"));
    if (amount > (ctx.profile.balance_fc || 0)) {
      status.textContent = "❌ Solde insuffisant.";
      status.className = "form-status error";
      status.classList.remove("hidden");
      return;
    }
    try {
      await DB.createWithdrawal(ctx.user.id, fd.get("payment_number"), amount);
      status.textContent = "✅ Retrait envoyé, en attente de validation.";
      status.className = "form-status success";
      status.classList.remove("hidden");
      form.reset();
      setTimeout(() => renderPoints(container, ctx), 800);
    } catch (err) {
      status.textContent = "❌ " + err.message;
      status.className = "form-status error";
      status.classList.remove("hidden");
    }
  });

  container.querySelector("#reward-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const status = form.querySelector(".form-status");
    const points = parseInt(new FormData(form).get("points"), 10);
    if (points > (ctx.profile.points || 0)) {
      status.textContent = "❌ Vous n'avez pas assez de points.";
      status.className = "form-status error";
      status.classList.remove("hidden");
      return;
    }
    try {
      await DB.createRewardRequest(ctx.user.id, points, null);
      status.textContent = "✅ Demande envoyée, en attente de validation.";
      status.className = "form-status success";
      status.classList.remove("hidden");
      form.reset();
      setTimeout(() => renderPoints(container, ctx), 800);
    } catch (err) {
      status.textContent = "❌ " + err.message;
      status.className = "form-status error";
      status.classList.remove("hidden");
    }
  });
}
