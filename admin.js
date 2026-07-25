// ============================================================
// ADMIN — panel accessible uniquement si profile.is_admin = true
// ============================================================

async function renderAdmin(container, ctx) {
  container.innerHTML = `
    <div class="chip-row" id="admin-tabs">
      <button class="chip active" data-tab="posts">Publications</button>
      <button class="chip" data-tab="users">Utilisateurs</button>
      <button class="chip" data-tab="verifications">Vérifications</button>
      <button class="chip" data-tab="topups">Recharges</button>
      <button class="chip" data-tab="withdrawals">Retraits</button>
      <button class="chip" data-tab="applications">Candidatures</button>
      <button class="chip" data-tab="boosts">Boosts</button>
      <button class="chip" data-tab="points">Points</button>
      <button class="chip" data-tab="messages">Messages</button>
    </div>
    <div id="admin-panel-body"></div>
  `;

  const body = container.querySelector("#admin-panel-body");
  const tabs = {
    posts: renderAdminPosts,
    users: renderAdminUsers,
    verifications: renderAdminVerifications,
    topups: renderAdminTopups,
    withdrawals: renderAdminWithdrawals,
    applications: renderAdminApplications,
    boosts: renderAdminBoosts,
    points: renderAdminPoints,
    messages: renderAdminMessages,
  };

  container.querySelectorAll("[data-tab]").forEach((btn) =>
    btn.addEventListener("click", () => {
      container.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");
      tabs[btn.dataset.tab](body, ctx);
    })
  );

  tabs.posts(body, ctx);
}

async function renderAdminPosts(body) {
  body.innerHTML = `<p class="section-loading">Chargement...</p>`;
  const posts = await DB.adminListRecentPosts();
  if (!posts.length) {
    body.innerHTML = `<div class="empty-state"><div class="placeholder-badge">📝</div><h2>Aucune publication</h2><p>Rien à afficher pour l'instant.</p></div>`;
    return;
  }
  body.innerHTML = `<div class="card-list">${posts
    .map(
      (p) => `<article class="content-card" data-id="${p.id}">
      <div class="content-card-head"><h3>${esc(p.profiles?.full_name || "Membre")}</h3></div>
      <p class="content-card-body">${esc(p.content)}</p>
      <p class="content-card-meta">${formatDate(p.created_at)}</p>
      <div class="content-card-actions">
        <button class="btn-secondary" data-delete="${p.id}">🗑️ Supprimer</button>
      </div>
    </article>`
    )
    .join("")}</div>`;

  body.querySelectorAll("[data-delete]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      if (confirm("Supprimer définitivement cette publication ?")) {
        await DB.adminDeletePost(btn.dataset.delete);
        renderAdminPosts(body);
      }
    })
  );
}

async function renderAdminUsers(body) {
  body.innerHTML = `<p class="section-loading">Chargement...</p>`;
  const users = await DB.adminListUsers();
  body.innerHTML = `<div class="card-list">${users
    .map(
      (u) => `<article class="content-card" data-id="${u.id}">
      <div class="content-card-head"><h3>${esc(u.full_name || "Membre")}</h3>${u.is_admin ? '<span class="badge badge-gold">Admin</span>' : ""}${u.is_verified ? '<span class="verified-badge">✅</span>' : ""}${u.is_blocked ? '<span class="badge badge-danger">Bloqué</span>' : ""}</div>
      <p class="content-card-meta">${esc(u.phone || "")} · ${u.points || 0} pts · ${u.balance_fc || 0} FC · Code: ${u.referral_code}</p>
      <div class="content-card-actions">
        <button class="btn-secondary" data-rename="${u.id}">✏️ Renommer</button>
        <button class="btn-secondary" data-block="${u.id}" data-current="${u.is_blocked}">${u.is_blocked ? "🔓 Débloquer" : "🔒 Bloquer"}</button>
      </div>
    </article>`
    )
    .join("")}</div>`;

  body.querySelectorAll("[data-rename]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      const newName = prompt("Nouveau nom :");
      if (!newName) return;
      await DB.adminRenameUser(btn.dataset.rename, newName);
      renderAdminUsers(body);
    })
  );
  body.querySelectorAll("[data-block]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      const currentlyBlocked = btn.dataset.current === "true";
      await DB.adminSetBlocked(btn.dataset.block, !currentlyBlocked);
      renderAdminUsers(body);
    })
  );
}

async function renderAdminVerifications(body) {
  body.innerHTML = `<p class="section-loading">Chargement...</p>`;
  const reqs = await DB.adminListVerifications();
  if (!reqs.length) {
    body.innerHTML = `<p class="section-loading">Aucune demande de vérification.</p>`;
    return;
  }
  body.innerHTML = `<div class="card-list">${reqs
    .map(
      (r) => `<article class="content-card">
      <div class="content-card-head"><h3>${esc(r.profiles?.full_name || "Membre")}</h3>${statusBadge(r.status)}</div>
      <p class="content-card-meta">${esc(r.phone || "")} · ${esc(r.email || "")}</p>
      <div class="content-card-actions">
        <a class="btn-secondary" href="${esc(r.id_document_url)}" target="_blank">🪪 Pièce d'identité</a>
        <a class="btn-secondary" href="${esc(r.selfie_url)}" target="_blank">🤳 Selfie</a>
        <a class="btn-secondary" href="${esc(r.payment_proof_url)}" target="_blank">💵 Preuve de paiement</a>
      </div>
      ${r.status === "en_attente" ? `<div class="content-card-actions" style="margin-top:8px;">
        <button class="btn-secondary" data-approve="${r.id}">✅ Valider (activer badge)</button>
        <button class="btn-secondary" data-reject="${r.id}">❌ Rejeter</button>
      </div>` : ""}
    </article>`
    )
    .join("")}</div>`;

  body.querySelectorAll("[data-approve]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      await DB.adminApproveVerification(btn.dataset.approve);
      renderAdminVerifications(body);
    })
  );
  body.querySelectorAll("[data-reject]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      await DB.adminRejectVerification(btn.dataset.reject);
      renderAdminVerifications(body);
    })
  );
}

async function renderAdminTopups(body) {
  body.innerHTML = `<p class="section-loading">Chargement...</p>`;
  const reqs = await DB.adminListTopups();
  if (!reqs.length) {
    body.innerHTML = `<p class="section-loading">Aucune recharge.</p>`;
    return;
  }
  body.innerHTML = `<div class="card-list">${reqs
    .map(
      (r) => `<article class="content-card">
      <div class="content-card-head"><h3>${r.amount} FC · ${esc(r.operator)}</h3>${statusBadge(r.status)}</div>
      <p class="content-card-meta">${esc(r.profiles?.full_name || "")} · ${esc(r.profiles?.phone || "")}</p>
      <div class="content-card-actions"><a class="btn-secondary" href="${esc(r.proof_url)}" target="_blank">🧾 Voir la preuve</a></div>
      ${r.status === "en_attente" ? `<div class="content-card-actions" style="margin-top:8px;">
        <button class="btn-secondary" data-approve="${r.id}">✅ Valider</button>
        <button class="btn-secondary" data-reject="${r.id}">❌ Rejeter</button>
      </div>` : ""}
    </article>`
    )
    .join("")}</div>`;

  body.querySelectorAll("[data-approve]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      await DB.adminApproveTopup(btn.dataset.approve);
      renderAdminTopups(body);
    })
  );
  body.querySelectorAll("[data-reject]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      await DB.adminRejectTopup(btn.dataset.reject);
      renderAdminTopups(body);
    })
  );
}

async function renderAdminWithdrawals(body) {
  body.innerHTML = `<p class="section-loading">Chargement...</p>`;
  const reqs = await DB.adminListWithdrawals();
  if (!reqs.length) {
    body.innerHTML = `<p class="section-loading">Aucun retrait.</p>`;
    return;
  }
  body.innerHTML = `<div class="card-list">${reqs
    .map(
      (r) => `<article class="content-card">
      <div class="content-card-head"><h3>${r.amount} FC</h3>${statusBadge(r.status)}</div>
      <p class="content-card-meta">${esc(r.profiles?.full_name || "")} · Envoyer à : ${esc(r.payment_number)}</p>
      ${r.status === "en_attente" ? `<div class="content-card-actions" style="margin-top:8px;">
        <button class="btn-secondary" data-approve="${r.id}">✅ Marquer payé</button>
        <button class="btn-secondary" data-reject="${r.id}">❌ Rejeter</button>
      </div>` : ""}
    </article>`
    )
    .join("")}</div>`;

  body.querySelectorAll("[data-approve]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      await DB.adminApproveWithdrawal(btn.dataset.approve);
      renderAdminWithdrawals(body);
    })
  );
  body.querySelectorAll("[data-reject]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      await DB.adminRejectWithdrawal(btn.dataset.reject);
      renderAdminWithdrawals(body);
    })
  );
}

async function renderAdminApplications(body) {
  body.innerHTML = `<p class="section-loading">Chargement...</p>`;
  const apps = await DB.adminListApplications();
  if (!apps.length) {
    body.innerHTML = `<p class="section-loading">Aucune candidature.</p>`;
    return;
  }
  body.innerHTML = `<div class="card-list">${apps
    .map(
      (a) => `<article class="content-card" data-id="${a.id}">
      <div class="content-card-head"><h3>${esc(a.content_items?.title || "Contenu supprimé")}</h3>${statusBadge(a.status)}</div>
      <p class="content-card-meta">${esc(a.profiles?.full_name || "")} · ${esc(a.profiles?.phone || "")}</p>
      <p class="content-card-body">${esc(a.message || "")}</p>
      ${a.status === "en_attente" ? `<div class="content-card-actions">
        <button class="btn-secondary" data-approve="${a.id}">✅ Accepter</button>
        <button class="btn-secondary" data-reject="${a.id}">❌ Refuser</button>
      </div>` : ""}
    </article>`
    )
    .join("")}</div>`;

  body.querySelectorAll("[data-approve]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      await DB.adminUpdateApplication(btn.dataset.approve, "acceptee");
      renderAdminApplications(body);
    })
  );
  body.querySelectorAll("[data-reject]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      await DB.adminUpdateApplication(btn.dataset.reject, "refusee");
      renderAdminApplications(body);
    })
  );
}

async function renderAdminBoosts(body) {
  body.innerHTML = `<p class="section-loading">Chargement...</p>`;
  const boosts = await DB.adminListBoosts();
  if (!boosts.length) {
    body.innerHTML = `<p class="section-loading">Aucune demande de boost.</p>`;
    return;
  }
  body.innerHTML = `<div class="card-list">${boosts
    .map(
      (b) => `<article class="content-card">
      <div class="content-card-head"><h3>${esc(b.platform)} · ${esc(b.target_type)}</h3>${statusBadge(b.status)}</div>
      <p class="content-card-meta">${esc(b.profiles?.full_name || "")} · Budget: ${b.budget} FC · Transaction: ${esc(b.transaction_id)}</p>
      <p class="content-card-meta"><a href="${esc(b.link)}" target="_blank" rel="noopener">${esc(b.link)}</a></p>
      ${b.status === "en_attente" ? `<div class="content-card-actions">
        <button class="btn-secondary" data-approve="${b.id}">✅ Valider</button>
        <button class="btn-secondary" data-reject="${b.id}">❌ Rejeter</button>
      </div>` : ""}
    </article>`
    )
    .join("")}</div>`;

  body.querySelectorAll("[data-approve]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      await DB.adminUpdateBoost(btn.dataset.approve, "validee");
      renderAdminBoosts(body);
    })
  );
  body.querySelectorAll("[data-reject]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      await DB.adminUpdateBoost(btn.dataset.reject, "rejetee");
      renderAdminBoosts(body);
    })
  );
}

async function renderAdminPoints(body) {
  body.innerHTML = `<p class="section-loading">Chargement...</p>`;
  const reqs = await DB.adminListRewardRequests();
  if (!reqs.length) {
    body.innerHTML = `<p class="section-loading">Aucune demande d'échange.</p>`;
    return;
  }
  body.innerHTML = `<div class="card-list">${reqs
    .map(
      (r) => `<article class="content-card">
      <div class="content-card-head"><h3>${r.points_requested} points → ${r.amount_fc} FC</h3>${statusBadge(r.status)}</div>
      <p class="content-card-meta">${esc(r.profiles?.full_name || "")} · Solde actuel : ${r.profiles?.points || 0} points</p>
      ${r.status === "en_attente" ? `<div class="content-card-actions">
        <button class="btn-secondary" data-validate="${r.id}">✅ Valider</button>
        <button class="btn-secondary" data-reject="${r.id}">❌ Rejeter</button>
      </div>` : ""}
    </article>`
    )
    .join("")}</div>`;

  body.querySelectorAll("[data-validate]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      const req = reqs.find((r) => r.id === btn.dataset.validate);
      const amount = prompt(`Combien de FC pour ${req.points_requested} points ?`);
      if (amount === null || amount.trim() === "") return;
      await DB.adminFinalizeReward(req.id, parseFloat(amount));
      renderAdminPoints(body);
    })
  );
  body.querySelectorAll("[data-reject]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      await DB.adminRejectReward(btn.dataset.reject);
      renderAdminPoints(body);
    })
  );
}

async function renderAdminMessages(body) {
  body.innerHTML = `<p class="section-loading">Chargement...</p>`;
  const all = await DB.adminListAllMessages();
  const byUser = {};
  all.forEach((m) => {
    if (!byUser[m.user_id]) byUser[m.user_id] = { name: m.profiles?.full_name || "Membre", msgs: [] };
    byUser[m.user_id].msgs.push(m);
  });
  const userIds = Object.keys(byUser);

  if (!userIds.length) {
    body.innerHTML = `<p class="section-loading">Aucun message.</p>`;
    return;
  }

  body.innerHTML = `
    <div class="chip-row">
      ${userIds.map((id, i) => `<button class="chip ${i === 0 ? "active" : ""}" data-user="${id}">${esc(byUser[id].name)}</button>`).join("")}
    </div>
    <div id="admin-chat-log" class="chat-log"></div>
    <form id="admin-chat-form" class="assistant-input-row">
      <input type="text" id="admin-chat-input" placeholder="Répondre..." required />
      <button type="submit" class="btn-primary">Envoyer</button>
    </form>
  `;

  let activeUser = userIds[0];
  const log = body.querySelector("#admin-chat-log");

  function paintLog() {
    const msgs = [...byUser[activeUser].msgs].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    log.innerHTML = msgs
      .map((m) => `<div class="bubble ${m.sender_is_admin ? "bubble-bot" : "bubble-user"}">${esc(m.content)}</div>`)
      .join("");
    log.scrollTop = log.scrollHeight;
  }
  paintLog();

  body.querySelectorAll("[data-user]").forEach((chip) =>
    chip.addEventListener("click", () => {
      body.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      activeUser = chip.dataset.user;
      paintLog();
    })
  );

  body.querySelector("#admin-chat-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = body.querySelector("#admin-chat-input");
    const content = input.value.trim();
    if (!content) return;
    input.value = "";
    await DB.sendMessage(activeUser, content, true);
    byUser[activeUser].msgs.push({ content, sender_is_admin: true, created_at: new Date().toISOString() });
    paintLog();
  });
}
