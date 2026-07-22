// ============================================================
// ACCOUNT — Messages, Profil, Mon équipe, Échange des points
// ============================================================

let messagesPollTimer = null;

async function renderMessages(container, ctx) {
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
        <h2>${esc(p.full_name || "Membre")}</h2>
        <p class="content-card-meta">${esc(p.phone || "")}</p>
      </div>
    </div>

    <div class="stat-row">
      <div class="stat-box"><strong>${p.points || 0}</strong><span>Points</span></div>
      <div class="stat-box"><strong>${p.referral_code}</strong><span>Code parrain</span></div>
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
  `;

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

  container.innerHTML = `
    <div class="stat-row">
      <div class="stat-box"><strong>${team.length}</strong><span>Membres invités</span></div>
      <div class="stat-box"><strong>${ctx.profile.points || 0}</strong><span>Points gagnés</span></div>
    </div>
    <div class="share-box">
      <input type="text" readonly value="${shareLink}" id="share-input-team" />
      <button class="btn-secondary" id="btn-copy-team">Copier mon lien</button>
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
    const input = container.querySelector("#share-input-team");
    input.select();
    navigator.clipboard?.writeText(input.value).catch(() => {});
    alert("Lien copié !");
  });
}

async function renderPoints(container, ctx) {
  let history = [];
  try {
    history = await DB.myRewardRequests(ctx.user.id);
  } catch (_) {}

  container.innerHTML = `
    <div class="stat-row">
      <div class="stat-box stat-box-gold"><strong>${ctx.profile.points || 0}</strong><span>Points disponibles</span></div>
    </div>
    <div class="rules-box">
      <p><strong>Règles d'échange :</strong></p>
      <p>100 points = 1000 FC · 200 points = 2000 FC</p>
      <p>Un minimum de membres actifs parrainés est requis. Chaque demande est validée manuellement par l'administration.</p>
    </div>
    <form id="reward-form" class="inline-form card-form">
      <label class="field"><span>Points à échanger</span><input type="number" name="points" min="10" step="10" required /></label>
      <button type="submit" class="btn-primary">Envoyer la demande</button>
      <p class="form-status hidden"></p>
    </form>
    <h3 class="list-title">Historique</h3>
    <div class="card-list">
      ${
        history.length
          ? history.map((r) => `<article class="content-card"><div class="content-card-head"><h3>${r.points_requested} points</h3>${statusBadge(r.status)}</div><p class="content-card-meta">${formatDate(r.created_at)}</p></article>`).join("")
          : `<p class="section-loading">Aucune demande pour l'instant.</p>`
      }
    </div>
  `;

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
      await DB.createRewardRequest(ctx.user.id, points, (points / 100) * 1000);
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
