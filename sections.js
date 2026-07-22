// ============================================================
// SECTIONS — rendu des 11 rubriques du menu
// Chaque fonction reçoit (container, ctx) où
// ctx = { user, profile, refreshHeader }
// ============================================================

function esc(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function statusBadge(status) {
  const map = {
    en_attente: ["En attente", "badge-pending"],
    validee: ["Validée", "badge-success"],
    acceptee: ["Acceptée", "badge-success"],
    rejetee: ["Rejetée", "badge-danger"],
    refusee: ["Refusée", "badge-danger"],
  };
  const [label, cls] = map[status] || [status, "badge-pending"];
  return `<span class="badge ${cls}">${label}</span>`;
}

// ---------- Formulaire admin générique d'ajout de contenu ----------
function adminAddContentForm(category, subcategoryOptions = null) {
  return `
    <details class="admin-add">
      <summary>➕ Ajouter un contenu (admin)</summary>
      <form class="inline-form" data-admin-add="${category}">
        <input type="text" name="title" placeholder="Titre" required />
        <textarea name="body" placeholder="Description" rows="3" required></textarea>
        ${subcategoryOptions ? `
        <select name="subcategory">
          ${subcategoryOptions.map((o) => `<option value="${o}">${o}</option>`).join("")}
        </select>` : ""}
        <input type="url" name="video_url" placeholder="Lien vidéo (optionnel)" />
        <input type="url" name="document_url" placeholder="Lien document (optionnel)" />
        ${category === "education" || category === "formation" ? `
        <label class="checkbox-line"><input type="checkbox" name="is_premium" /> Contenu Premium (accompagnement payant)</label>` : ""}
        ${category === "opportunites" ? `<input type="date" name="deadline" placeholder="Date limite" />` : ""}
        <button type="submit" class="btn-primary">Publier</button>
        <p class="form-status hidden"></p>
      </form>
    </details>
  `;
}

function bindAdminAddForm(container, ctx, category) {
  const form = container.querySelector(`form[data-admin-add="${category}"]`);
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const status = form.querySelector(".form-status");
    const fd = new FormData(form);
    const item = {
      category,
      title: fd.get("title"),
      body: fd.get("body"),
      subcategory: fd.get("subcategory") || null,
      video_url: fd.get("video_url") || null,
      document_url: fd.get("document_url") || null,
      is_premium: fd.get("is_premium") === "on",
      deadline: fd.get("deadline") || null,
      author_id: ctx.user.id,
    };
    try {
      await DB.createContent(item);
      status.textContent = "✅ Contenu publié.";
      status.className = "form-status success";
      form.reset();
      setTimeout(() => renderSection(category)(container.parentElement, ctx), 700);
    } catch (err) {
      status.textContent = "❌ " + err.message;
      status.className = "form-status error";
    }
    status.classList.remove("hidden");
  });
}

// ---------- Rendu générique d'une liste de contenu ----------
async function renderGenericContent(container, ctx, category, opts = {}) {
  container.innerHTML = `<p class="section-loading">Chargement...</p>`;
  let items = [];
  try {
    items = await DB.listContent(category);
  } catch (err) {
    container.innerHTML = `<p class="section-error">Erreur de chargement : ${esc(err.message)}</p>`;
    return;
  }

  const adminForm = ctx.profile?.is_admin ? adminAddContentForm(category, opts.subcategoryOptions) : "";

  if (!items.length) {
    container.innerHTML = `
      ${adminForm}
      <div class="empty-state">
        <div class="placeholder-badge">🌱</div>
        <h2>Rien à afficher pour l'instant</h2>
        <p>${opts.emptyText || "Revenez bientôt pour découvrir du nouveau contenu."}</p>
      </div>`;
    if (ctx.profile?.is_admin) bindAdminAddForm(container, ctx, category);
    return;
  }

  container.innerHTML = `
    ${adminForm}
    ${opts.subcategoryOptions ? `
      <div class="chip-row" id="chip-row">
        <button class="chip active" data-sub="">Tous</button>
        ${opts.subcategoryOptions.map((s) => `<button class="chip" data-sub="${s}">${s}</button>`).join("")}
      </div>` : ""}
    <div class="card-list" id="card-list"></div>
  `;
  if (ctx.profile?.is_admin) bindAdminAddForm(container, ctx, category);

  function renderList(filterSub) {
    const list = container.querySelector("#card-list");
    const filtered = filterSub ? items.filter((i) => i.subcategory === filterSub) : items;
    if (!filtered.length) {
      list.innerHTML = `<p class="section-loading">Aucun contenu dans cette catégorie.</p>`;
      return;
    }
    list.innerHTML = filtered
      .map(
        (item) => `
      <article class="content-card" data-id="${item.id}">
        <div class="content-card-head">
          <h3>${esc(item.title)}</h3>
          ${item.is_premium ? '<span class="badge badge-gold">✨ Premium</span>' : ""}
        </div>
        <p class="content-card-body">${esc(item.body)}</p>
        <div class="content-card-meta">
          ${item.video_url ? `<a href="${esc(item.video_url)}" target="_blank" rel="noopener">🎬 Vidéo</a>` : ""}
          ${item.document_url ? `<a href="${esc(item.document_url)}" target="_blank" rel="noopener">📄 Document</a>` : ""}
          ${item.deadline ? `<span>⏳ Limite : ${formatDate(item.deadline)}</span>` : ""}
        </div>
        <div class="content-card-actions">
          ${opts.actionLabel ? `<button class="btn-secondary" data-act="${item.id}">${opts.actionLabel}</button>` : ""}
          ${item.is_premium ? `<button class="btn-gold" data-premium="${item.id}">Demander un accompagnement</button>` : ""}
        </div>
      </article>`
      )
      .join("");

    if (opts.actionLabel) {
      list.querySelectorAll("[data-act]").forEach((btn) =>
        btn.addEventListener("click", () => handleApply(btn.dataset.act, opts.actionPromptLabel))
      );
    }
    list.querySelectorAll("[data-premium]").forEach((btn) =>
      btn.addEventListener("click", () => handleApply(btn.dataset.premium, "Décrivez votre besoin d'accompagnement"))
    );
  }

  async function handleApply(contentId, promptLabel) {
    const msg = prompt(promptLabel || "Un message pour votre demande ?") || "";
    try {
      await DB.apply(contentId, ctx.user.id, msg);
      alert("✅ Votre demande a été envoyée à l'équipe Together We Can.");
    } catch (err) {
      alert("❌ " + err.message);
    }
  }

  if (opts.subcategoryOptions) {
    container.querySelectorAll(".chip").forEach((chip) =>
      chip.addEventListener("click", () => {
        container.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        renderList(chip.dataset.sub);
      })
    );
  }
  renderList("");
}

function renderSection(category, opts) {
  return (container, ctx) => renderGenericContent(container, ctx, category, opts);
}

// ---------- MARKETPLACE ----------
async function renderMarketplace(container, ctx) {
  container.innerHTML = `<p class="section-loading">Chargement...</p>`;
  let products = [];
  try {
    products = await DB.listProducts();
  } catch (err) {
    container.innerHTML = `<p class="section-error">${esc(err.message)}</p>`;
    return;
  }

  container.innerHTML = `
    <details class="admin-add">
      <summary>➕ Vendre un produit</summary>
      <form class="inline-form" id="product-form">
        <input type="text" name="title" placeholder="Nom du produit" required />
        <textarea name="description" placeholder="Description" rows="2"></textarea>
        <input type="number" name="price" placeholder="Prix (FC)" step="0.01" required />
        <input type="file" name="image" accept="image/*" />
        <button type="submit" class="btn-primary">Publier le produit</button>
        <p class="form-status hidden"></p>
      </form>
    </details>
    <div class="card-list">
      ${
        products.length
          ? products
              .map(
                (p) => `
        <article class="content-card">
          ${p.image_url ? `<img src="${esc(p.image_url)}" class="product-image" alt="${esc(p.title)}" />` : ""}
          <div class="content-card-head"><h3>${esc(p.title)}</h3><span class="badge badge-gold">${p.price} FC</span></div>
          <p class="content-card-body">${esc(p.description || "")}</p>
          <p class="content-card-meta">Vendeur : ${esc(p.profiles?.full_name || "Membre")}</p>
        </article>`
              )
              .join("")
          : `<div class="empty-state"><div class="placeholder-badge">🛒</div><h2>Aucun produit pour l'instant</h2><p>Soyez le premier à publier un produit.</p></div>`
      }
    </div>
  `;

  const form = container.querySelector("#product-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const status = form.querySelector(".form-status");
    const fd = new FormData(form);
    const file = fd.get("image");
    try {
      let imageUrl = null;
      if (file && file.size > 0) imageUrl = await DB.uploadMedia(file, "products");
      await DB.createProduct({
        seller_id: ctx.user.id,
        title: fd.get("title"),
        description: fd.get("description"),
        price: parseFloat(fd.get("price")),
        image_url: imageUrl,
      });
      status.textContent = "✅ Produit publié !";
      status.className = "form-status success";
      status.classList.remove("hidden");
      setTimeout(() => renderMarketplace(container, ctx), 700);
    } catch (err) {
      status.textContent = "❌ " + err.message;
      status.className = "form-status error";
      status.classList.remove("hidden");
    }
  });
}

// ---------- BOOST DE VISIBILITÉ ----------
async function renderBoost(container, ctx) {
  let mine = [];
  try {
    mine = await DB.myBoostRequests(ctx.user.id);
  } catch (_) {}

  container.innerHTML = `
    <form class="inline-form card-form" id="boost-form">
      <label class="field"><span>Plateforme</span>
        <select name="platform" required>
          <option value="facebook">Facebook</option>
          <option value="tiktok">TikTok</option>
          <option value="instagram">Instagram</option>
          <option value="youtube">YouTube</option>
        </select>
      </label>
      <label class="field"><span>Élément à booster</span>
        <select name="target_type" required>
          <option value="profil">Mon profil</option>
          <option value="page">Ma page</option>
          <option value="publication">Ma publication</option>
        </select>
      </label>
      <label class="field"><span>Lien</span><input type="url" name="link" placeholder="https://..." required /></label>
      <label class="field"><span>Budget (FC)</span><input type="number" name="budget" step="0.01" required /></label>
      <label class="field"><span>ID de transaction (après paiement)</span><input type="text" name="transaction_id" placeholder="Ex: MM-2026-XXXX" required /></label>
      <button type="submit" class="btn-primary">Envoyer la demande</button>
      <p class="form-status hidden"></p>
    </form>
    <h3 class="list-title">Mes demandes</h3>
    <div class="card-list">
      ${
        mine.length
          ? mine
              .map(
                (r) => `
        <article class="content-card">
          <div class="content-card-head"><h3>${esc(r.platform)} · ${esc(r.target_type)}</h3>${statusBadge(r.status)}</div>
          <p class="content-card-meta">Budget : ${r.budget} FC · Transaction : ${esc(r.transaction_id)} · ${formatDate(r.created_at)}</p>
        </article>`
              )
              .join("")
          : `<p class="section-loading">Aucune demande envoyée.</p>`
      }
    </div>
  `;

  container.querySelector("#boost-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const status = form.querySelector(".form-status");
    const fd = new FormData(form);
    try {
      await DB.createBoostRequest({
        user_id: ctx.user.id,
        platform: fd.get("platform"),
        target_type: fd.get("target_type"),
        link: fd.get("link"),
        budget: parseFloat(fd.get("budget")),
        transaction_id: fd.get("transaction_id"),
      });
      status.textContent = "✅ Demande envoyée à l'administration.";
      status.className = "form-status success";
      status.classList.remove("hidden");
      setTimeout(() => renderBoost(container, ctx), 800);
    } catch (err) {
      status.textContent = "❌ " + err.message;
      status.className = "form-status error";
      status.classList.remove("hidden");
    }
  });
}

// ---------- SUPPORT ----------
const FAQ = [
  { q: "comment gagner des points", a: "Vous gagnez des points en parrainant des membres actifs via votre lien dans « Mon équipe »." },
  { q: "comment échanger mes points", a: "Allez dans « Échange des points », indiquez le montant souhaité et attendez la validation de l'administration." },
  { q: "comment postuler à une opportunité", a: "Ouvrez la section « Opportunités », choisissez une offre et cliquez sur « Postuler »." },
  { q: "comment vendre un produit", a: "Allez dans « Marketplace » puis cliquez sur « Vendre un produit »." },
  { q: "comment booster ma visibilité", a: "Allez dans « Boost de visibilité », choisissez votre plateforme, payez, puis entrez l'ID de transaction." },
];

function renderSupport(container, ctx) {
  container.innerHTML = `
    <div class="support-links">
      <a href="https://wa.me/" target="_blank" rel="noopener" class="support-link">💬 WhatsApp</a>
      <a href="https://facebook.com" target="_blank" rel="noopener" class="support-link">📘 Page Facebook</a>
      <button class="support-link" id="btn-open-conversation">✉️ Écrire à l'administration</button>
    </div>
    <h3 class="list-title">🤖 Assistant (questions fréquentes)</h3>
    <div class="assistant-box">
      <div id="assistant-log" class="assistant-log"></div>
      <form id="assistant-form" class="assistant-input-row">
        <input type="text" id="assistant-input" placeholder="Posez votre question..." />
        <button type="submit" class="btn-primary">Envoyer</button>
      </form>
    </div>
  `;

  const log = container.querySelector("#assistant-log");
  function addBubble(text, fromBot) {
    const div = document.createElement("div");
    div.className = "bubble " + (fromBot ? "bubble-bot" : "bubble-user");
    div.textContent = text;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
  }
  addBubble("Bonjour 👋 Je suis l'assistant Together We Can. Posez-moi une question sur l'app !", true);

  container.querySelector("#assistant-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = container.querySelector("#assistant-input");
    const question = input.value.trim();
    if (!question) return;
    addBubble(question, false);
    input.value = "";

    const thinking = document.createElement("div");
    thinking.className = "bubble bubble-bot";
    thinking.textContent = "...";
    log.appendChild(thinking);
    log.scrollTop = log.scrollHeight;

    try {
      const reply = await DB.askAI(question);
      thinking.remove();
      addBubble(reply, true);
    } catch (err) {
      thinking.remove();
      const found = FAQ.find((f) => question.toLowerCase().includes(f.q));
      addBubble(
        found ? found.a : "L'assistant IA n'est pas encore configuré (voir README). Écrivez à l'administration via « Écrire à l'administration ».",
        true
      );
    }
  });

  container.querySelector("#btn-open-conversation").addEventListener("click", () => {
    openSection("messages", "Messages", ctx);
  });
}

// ---------- À PROPOS ----------
function renderAbout(container) {
  container.innerHTML = `
    <div class="about-body">
      <img src="assets/logo.png" class="about-logo" alt="Together We Can" />
      <h2>Together We Can</h2>
      <p class="about-text"><strong>Présentation :</strong> Together We Can est une plateforme communautaire qui rassemble éducation, formation, opportunités, entrepreneuriat et talents pour aider chaque membre à grandir.</p>
      <p class="about-text"><strong>Vision :</strong> Bâtir une communauté solidaire où chacun peut apprendre, entreprendre et réussir ensemble.</p>
      <p class="about-text"><strong>Historique :</strong> Née de la conviction qu'ensemble, nous pouvons aller plus loin.</p>
    </div>
  `;
}
