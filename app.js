// ============================================================
// APP — Together We Can : routing, menu, fil d'accueil
// ============================================================

const MENU_GROUPS = [
  {
    title: "COMMUNAUTÉ",
    items: [
      { id: "about", icon: "ℹ️", label: "À propos" },
      { id: "messages", icon: "💬", label: "Messages" },
      { id: "support", icon: "🎧", label: "Support" },
    ],
  },
  {
    title: "DÉVELOPPEMENT",
    items: [
      { id: "education", icon: "🎓", label: "Éducation" },
      { id: "formation", icon: "📖", label: "Formation" },
      { id: "opportunites", icon: "🚀", label: "Opportunités" },
      { id: "entrepreneuriat", icon: "💼", label: "Entrepreneuriat" },
    ],
  },
  {
    title: "SERVICES",
    items: [
      { id: "marketing", icon: "📈", label: "Marketing" },
      { id: "sport", icon: "⚽", label: "Sport" },
      { id: "boost", icon: "📣", label: "Booster ma visibilité" },
      { id: "marketplace", icon: "🛒", label: "Marketplace" },
      { id: "art", icon: "🎨", label: "Art" },
    ],
  },
];

const BOTTOM_NAV = [
  { id: "decouvrir", icon: "🌍", label: "Découvrir" },
  { id: "messages", icon: "💬", label: "Messages" },
  { id: "profil", icon: "👤", label: "Profil" },
  { id: "equipe", icon: "🤝", label: "Équipe" },
  { id: "points", icon: "💰", label: "Points" },
];

// Registre : id de section -> fonction de rendu (container, ctx)
const SECTION_RENDERERS = {
  about: (c) => renderAbout(c),
  education: (c, ctx) => renderSection("education", { actionLabel: null, emptyText: "Les cours et formations arrivent bientôt." })(c, ctx),
  formation: (c, ctx) => renderSection("formation", { emptyText: "Les programmes de formation arrivent bientôt." })(c, ctx),
  opportunites: (c, ctx) => renderSection("opportunites", { actionLabel: "Postuler", actionPromptLabel: "Votre message de candidature", emptyText: "Aucune opportunité publiée pour l'instant." })(c, ctx),
  entrepreneuriat: (c, ctx) => renderSection("entrepreneuriat", { actionLabel: "Présenter mon projet", actionPromptLabel: "Décrivez votre projet", emptyText: "Le contenu entrepreneuriat arrive bientôt." })(c, ctx),
  marketing: (c, ctx) => renderMarketing(c, ctx),
  sport: (c, ctx) => renderSection("sport", { actionLabel: "Me faire connaître", actionPromptLabel: "Parlez-nous de votre talent sportif", emptyText: "Aucune actualité sportive pour l'instant." })(c, ctx),
  art: (c, ctx) => renderSection("art", { actionLabel: "Présenter mon œuvre", actionPromptLabel: "Décrivez votre œuvre / lien", emptyText: "Aucune création publiée pour l'instant." })(c, ctx),
  marketplace: (c, ctx) => renderMarketplace(c, ctx),
  boost: (c, ctx) => renderBoost(c, ctx),
  support: (c, ctx) => renderSupport(c, ctx),
  messages: (c, ctx) => renderMessages(c, ctx),
  profil: (c, ctx) => renderProfile(c, ctx),
  equipe: (c, ctx) => renderTeam(c, ctx),
  points: (c, ctx) => renderPoints(c, ctx),
  caisse: (c, ctx) => renderCaisse(c, ctx),
  verification: (c, ctx) => renderVerification(c, ctx),
  securite: (c, ctx) => renderSecurity(c, ctx),
  activites: (c, ctx) => renderActivities(c, ctx),
  publicProfile: (c, ctx) => renderPublicProfile(c, ctx),
  dm: (c, ctx) => renderDirectMessageThread(c, ctx),
  admin: (c, ctx) => renderAdmin(c, ctx),
};

const REACTION_EMOJIS = ["👍", "👌", "😜", "😍", "🥰", "🤩", "🔥", "😡"];

function findMenuItem(id) {
  for (const group of MENU_GROUPS) {
    const found = group.items.find((i) => i.id === id);
    if (found) return found;
  }
  return null;
}

const FEED_EMPTY_TEXT = "Aucune publication pour l'instant. Soyez le premier à publier !";

// ---------- État global ----------
const TWCState = { user: null, profile: null };

// ---------- DOM refs ----------
const screenAuth = document.getElementById("screen-auth");
const screenApp = document.getElementById("screen-app");
const screenSection = document.getElementById("screen-section");

const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const tabLogin = document.getElementById("tab-login");
const tabSignup = document.getElementById("tab-signup");
const authError = document.getElementById("auth-error");
const configWarning = document.getElementById("config-warning");

const drawer = document.getElementById("drawer");
const drawerOverlay = document.getElementById("drawer-overlay");
const btnMenu = document.getElementById("btn-menu");
const btnCloseDrawer = document.getElementById("btn-close-drawer");
const menuList = document.getElementById("menu-list");
const drawerProfileBlock = document.getElementById("drawer-profile-block");
const drawerPremiumBanner = document.getElementById("drawer-premium-banner");
const bottomNav = document.getElementById("bottom-nav");
const feedContainer = document.getElementById("feed-container");
const userGreeting = document.getElementById("user-greeting");
const btnBackFromSection = document.getElementById("btn-back-section");
const sectionTitle = document.getElementById("section-title");
const sectionBody = document.getElementById("section-body");

// ---------- Screen routing ----------
function showScreen(screen) {
  [screenAuth, screenApp, screenSection].forEach((s) => s.classList.add("hidden"));
  screen.classList.remove("hidden");
}

function buildCtx() {
  return {
    user: TWCState.user,
    profile: TWCState.profile,
    refreshHeader: () => {
      const name = TWCState.profile?.full_name || "Membre";
      userGreeting.textContent = `Bonjour, ${name.split(" ")[0]} 👋`;
    },
  };
}

function openSection(id, title, extra) {
  clearInterval(messagesPollTimer);
  sectionTitle.textContent = title;
  sectionBody.innerHTML = `<p class="section-loading">Chargement...</p>`;
  showScreen(screenSection);
  const renderer = SECTION_RENDERERS[id];
  const ctx = Object.assign(buildCtx(), extra || {});
  if (renderer) {
    renderer(sectionBody, ctx);
  } else {
    sectionBody.innerHTML = `
      <div class="empty-state">
        <div class="placeholder-badge">🌱</div>
        <h2>Cette section arrive bientôt</h2>
        <p>Nous construisons cette partie de Together We Can.</p>
      </div>`;
  }
}
btnBackFromSection.addEventListener("click", () => {
  clearInterval(messagesPollTimer);
  showScreen(screenApp);
});

// ---------- Auth tabs ----------
function setAuthTab(tab) {
  authError.classList.add("hidden");
  if (tab === "login") {
    tabLogin.classList.add("active");
    tabSignup.classList.remove("active");
    loginForm.classList.remove("hidden");
    signupForm.classList.add("hidden");
  } else {
    tabSignup.classList.add("active");
    tabLogin.classList.remove("active");
    signupForm.classList.remove("hidden");
    loginForm.classList.add("hidden");
  }
}
tabLogin.addEventListener("click", () => setAuthTab("login"));
tabSignup.addEventListener("click", () => setAuthTab("signup"));

function showAuthError(message) {
  authError.textContent = message;
  authError.classList.remove("hidden");
}

// ---------- Signup ----------
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  authError.classList.add("hidden");

  const name = document.getElementById("signup-name").value.trim();
  const phone = document.getElementById("signup-phone").value.trim();
  const email = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value;
  const confirm = document.getElementById("signup-confirm").value;

  if (!name || !phone || !email || !password || !confirm) {
    showAuthError("Veuillez remplir tous les champs.");
    return;
  }
  if (password.length < 6) {
    showAuthError("Le mot de passe doit contenir au moins 6 caractères.");
    return;
  }
  if (password !== confirm) {
    showAuthError("Les mots de passe ne correspondent pas.");
    return;
  }

  const btn = signupForm.querySelector("button[type=submit]");
  btn.disabled = true;
  btn.textContent = "Inscription en cours...";

  try {
    await TWCAuth.signUp({ name, phone, email, password });

    const refCode = new URLSearchParams(window.location.search).get("ref");
    if (refCode && TWCAuth.currentUser) {
      DB.handleReferral(refCode, TWCAuth.currentUser.id).catch(() => {});
    }

    await enterApp();
  } catch (err) {
    showAuthError(err.message || "Une erreur est survenue lors de l'inscription.");
  } finally {
    btn.disabled = false;
    btn.textContent = "S'inscrire";
  }
});

// ---------- Login ----------
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  authError.classList.add("hidden");

  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  if (!email || !password) {
    showAuthError("Veuillez remplir tous les champs.");
    return;
  }

  const btn = loginForm.querySelector("button[type=submit]");
  btn.disabled = true;
  btn.textContent = "Connexion en cours...";

  try {
    await TWCAuth.signIn({ email, password });
    await enterApp();
  } catch (err) {
    showAuthError(err.message || "Identifiants incorrects.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Se connecter";
  }
});

// ---------- Logout ----------
document.getElementById("btn-logout").addEventListener("click", async () => {
  await TWCAuth.signOut();
  TWCState.user = null;
  TWCState.profile = null;
  showScreen(screenAuth);
  setAuthTab("login");
});

// ---------- Drawer menu ----------
function renderMenu() {
  const p = TWCState.profile || {};
  const joinYear = p.created_at ? new Date(p.created_at).getFullYear() : new Date().getFullYear();

  drawerProfileBlock.innerHTML = `
    <div class="drawer-avatar">${p.avatar_url ? `<img src="${p.avatar_url}" alt="" />` : (p.full_name || "M").charAt(0).toUpperCase()}</div>
    <div>
      <p class="drawer-name">${esc(p.full_name || "Membre")}${p.is_verified ? ' <img src="verified-badge.png" class="verified-badge-img" alt="Vérifié" />' : ""}</p>
      <p class="drawer-meta">Membre depuis ${joinYear}</p>
    </div>
  `;

  menuList.innerHTML = "";
  MENU_GROUPS.forEach((group) => {
    const groupTitle = document.createElement("li");
    groupTitle.className = "menu-group-title";
    groupTitle.textContent = group.title;
    menuList.appendChild(groupTitle);
    group.items.forEach((item) => {
      const li = document.createElement("li");
      li.innerHTML = `<button class="menu-item"><span class="menu-icon-circle">${item.icon}</span><span>${item.label}</span></button>`;
      li.querySelector("button").addEventListener("click", () => {
        closeDrawer();
        openSection(item.id, item.label);
      });
      menuList.appendChild(li);
    });
  });

  const isSuperAdmin = p.is_admin && TWCState.user?.email === "jephbesaus07@gmail.com";
  if (isSuperAdmin) {
    const li = document.createElement("li");
    li.innerHTML = `<button class="menu-item"><span class="menu-icon-circle">🛠️</span><span>Panel Administrateur</span></button>`;
    li.querySelector("button").addEventListener("click", () => {
      closeDrawer();
      openSection("admin", "Panel Administrateur");
    });
    menuList.appendChild(li);
  }

  drawerPremiumBanner.classList.toggle("hidden", !!p.is_verified);
}

drawerPremiumBanner.addEventListener("click", () => {
  closeDrawer();
  openSection("verification", "Vérification");
});

function openDrawer() {
  drawer.classList.add("open");
  drawerOverlay.classList.remove("hidden");
}
function closeDrawer() {
  drawer.classList.remove("open");
  drawerOverlay.classList.add("hidden");
}
btnMenu.addEventListener("click", openDrawer);
btnCloseDrawer.addEventListener("click", closeDrawer);
drawerOverlay.addEventListener("click", closeDrawer);

// ---------- Notifications ----------
const btnNotifications = document.getElementById("btn-notifications");
const notifPanel = document.getElementById("notif-panel");
const btnCloseNotif = document.getElementById("btn-close-notif");
btnNotifications.addEventListener("click", () => notifPanel.classList.toggle("hidden"));
btnCloseNotif.addEventListener("click", () => notifPanel.classList.add("hidden"));

// ---------- Bottom nav ----------
function renderBottomNav() {
  bottomNav.innerHTML = "";
  BOTTOM_NAV.forEach((item, index) => {
    const btn = document.createElement("button");
    btn.className = "nav-item" + (index === 0 ? " active" : "");
    btn.innerHTML = `<span class="nav-icon">${item.icon}</span><span class="nav-label">${item.label}</span>`;
    btn.addEventListener("click", () => {
      document.querySelectorAll(".nav-item").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      if (item.id !== "decouvrir") {
        openSection(item.id, item.label);
      } else {
        showScreen(screenApp);
        renderFeed();
      }
    });
    bottomNav.appendChild(btn);
  });
}

// ---------- Feed (page d'accueil) ----------
async function renderFeed() {
  feedContainer.innerHTML = `<p class="section-loading">Chargement...</p>`;
  let posts = [];
  let official = [];
  let products = [];
  let followedIds = [];
  let myReactions = {};
  try {
    [posts, official, products, followedIds, myReactions] = await Promise.all([
      DB.listPosts(),
      DB.listRecentOfficialContent(),
      DB.listRecentMarketplaceForFeed(),
      DB.myFollowedIds(TWCState.user.id),
      DB.myReactions(TWCState.user.id).then((arr) => Object.fromEntries(arr.map((r) => [r.post_id, r.emoji]))),
    ]);
  } catch (err) {
    feedContainer.innerHTML = `<p class="section-error">${esc(err.message)}</p>`;
    return;
  }

  const officialCategoryLabels = {
    education: "Éducation", formation: "Formation", opportunites: "Opportunités",
    entrepreneuriat: "Entrepreneuriat", marketing: "Marketing", sport: "Sport", art: "Art",
  };

  const officialItems = official.map((item) => ({
    kind: "official",
    id: item.id,
    category: item.category,
    title: item.title,
    body: item.body,
    created_at: item.created_at,
    author_id: item.author_id,
    profiles: item.profiles,
    isOfficial: !!item.profiles?.is_admin,
  }));
  const productItems = products.map((p) => ({
    kind: "product",
    id: p.id,
    title: p.title,
    description: p.description,
    price: p.price,
    currency: p.currency || "FC",
    location: p.location,
    image_url: p.image_url,
    created_at: p.created_at,
    author_id: p.seller_id,
    profiles: p.profiles,
  }));
  const postItems = posts.map((p) => ({ kind: "post", ...p }));
  let feedItems = [...officialItems, ...productItems, ...postItems].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );
  const followedSet = new Set(followedIds);
  const priority = feedItems.filter((i) => i.kind === "post" && followedSet.has(i.author_id));
  const rest = feedItems.filter((i) => !(i.kind === "post" && followedSet.has(i.author_id)));
  feedItems = [...priority, ...rest];

  const composer = `
    <form id="post-form" class="inline-form card-form">
      <textarea id="post-content" placeholder="Partagez quelque chose avec la communauté... (photo, vidéo, message, astuce)" rows="2" required></textarea>
      <div id="post-media-preview"></div>
      <div class="composer-media-row">
        <label class="composer-media-btn">🖼️ Photo<input type="file" id="post-photo-input" accept="image/*" hidden /></label>
        <label class="composer-media-btn">🎬 Vidéo<input type="file" id="post-video-input" accept="video/*" hidden /></label>
      </div>
      <button type="submit" class="btn-primary">Publier</button>
    </form>
  `;

  if (!feedItems.length) {
    feedContainer.innerHTML = `
      ${composer}
      <div class="empty-state">
        <div class="placeholder-badge">🌱</div>
        <h2>Le fil est vide</h2>
        <p>${FEED_EMPTY_TEXT}</p>
      </div>`;
  } else {
    feedContainer.innerHTML =
      composer +
      feedItems
        .map((item) => {
          if (item.kind === "official" && item.isOfficial) {
            return `
      <article class="post-card post-card-official">
        <div class="post-header">
          <div class="post-avatar post-avatar-official"><img src="icon-96.png" alt="" /></div>
          <div>
            <p class="post-author">Together We Can <img src="verified-badge.png" class="verified-badge-img" alt="Vérifié" /></p>
            <p class="post-meta"><span class="post-tag">${officialCategoryLabels[item.category] || item.category}</span> · ${formatDate(item.created_at)}</p>
          </div>
        </div>
        <h3 class="post-official-title">${esc(item.title)}</h3>
        <p class="post-content">${esc(item.body || "")}</p>
        <div class="post-actions">
          <button class="post-action" data-open-section="${item.category}">👉 Voir dans ${officialCategoryLabels[item.category] || item.category}</button>
        </div>
      </article>`;
          }
          if (item.kind === "official" && !item.isOfficial) {
            return `
      <article class="post-card" data-id="${item.id}">
        <div class="post-header post-header-clickable" data-open-profile="${item.author_id}">
          <div class="post-avatar">${(item.profiles?.full_name || "M").charAt(0).toUpperCase()}</div>
          <div>
            <p class="post-author">${esc(item.profiles?.full_name || "Membre")} ${item.profiles?.is_verified ? '<img src="verified-badge.png" class="verified-badge-img" alt="Vérifié" />' : ""}</p>
            <p class="post-meta"><span class="post-tag">🎨 Art</span> · ${formatDate(item.created_at)}</p>
          </div>
        </div>
        <h3 class="post-official-title">${esc(item.title)}</h3>
        <p class="post-content">${esc(item.body || "")}</p>
      </article>`;
          }
          if (item.kind === "product") {
            return `
      <article class="post-card" data-id="${item.id}">
        <div class="post-header post-header-clickable" data-open-profile="${item.author_id}">
          <div class="post-avatar">${(item.profiles?.full_name || "M").charAt(0).toUpperCase()}</div>
          <div>
            <p class="post-author">${esc(item.profiles?.full_name || "Membre")} ${item.profiles?.is_verified ? '<img src="verified-badge.png" class="verified-badge-img" alt="Vérifié" />' : ""}</p>
            <p class="post-meta"><span class="post-tag">🛒 Marketplace</span> · ${formatDate(item.created_at)}</p>
          </div>
        </div>
        ${item.image_url ? `<img src="${esc(item.image_url)}" class="product-image" alt="${esc(item.title)}" />` : ""}
        <h3 class="post-official-title">${esc(item.title)}</h3>
        <p class="post-content">${item.price} ${esc(item.currency)}${item.location ? ` · 📍 ${esc(item.location)}` : ""}</p>
        <div class="post-actions">
          <button class="post-action btn-buy-now" data-buy="${item.author_id}" data-buyname="${esc(item.profiles?.full_name || "Vendeur")}">🛍️ Acheter maintenant</button>
        </div>
      </article>`;
          }
          const isAdminAuthor = item.profiles?.is_admin;
          const isOwnPost = item.author_id === TWCState.user.id;
          const alreadyFollowed = followedSet.has(item.author_id);
          return `
      <article class="post-card ${isAdminAuthor ? "post-card-official" : ""}" data-id="${item.id}">
        <div class="post-header">
          <div class="post-avatar post-header-clickable ${isAdminAuthor ? "post-avatar-official" : ""}" data-open-profile="${item.author_id}">${item.profiles?.avatar_url ? `<img src="${esc(item.profiles.avatar_url)}" alt="" />` : (item.profiles?.full_name || "M").charAt(0).toUpperCase()}</div>
          <div>
            <p class="post-author">
              <span class="post-header-clickable" data-open-profile="${item.author_id}">${esc(item.profiles?.full_name || "Membre")}</span>
              ${(isAdminAuthor || item.profiles?.is_verified) ? '<img src="verified-badge.png" class="verified-badge-img" alt="Vérifié" />' : ""}
              ${!isOwnPost && !alreadyFollowed ? `<span class="inline-follow" data-quick-follow="${item.author_id}"> · Suivre</span>` : ""}
            </p>
            <p class="post-meta"><span class="post-tag">${esc(item.post_type)}</span> · ${formatDate(item.created_at)}</p>
          </div>
        </div>
        <p class="post-content">${esc(item.content)}</p>
        ${item.image_url ? (
          /\.(mp4|webm|mov)(\?|$)/i.test(item.image_url)
            ? `<video src="${esc(item.image_url)}" class="post-media" controls></video>`
            : `<img src="${esc(item.image_url)}" class="post-media" alt="" />`
        ) : ""}
        <div class="post-actions">
          <button class="post-action ${myReactions[item.id] ? "" : ""}" data-react-toggle="${item.id}">${myReactions[item.id] || "👍"} <span>${item.likes_count || 0}</span></button>
          <button class="post-action" data-comment="${item.id}">💬 <span>${item.comments_count || 0}</span></button>
          <button class="post-action">🔗 Partager</button>
        </div>
        <div class="reaction-picker hidden" id="reactions-${item.id}">
          ${REACTION_EMOJIS.map((e) => `<button class="reaction-emoji ${myReactions[item.id] === e ? "reaction-active" : ""}" data-react="${item.id}" data-emoji="${e}">${e}</button>`).join("")}
        </div>
        <div class="comment-box hidden" id="comments-${item.id}"></div>
      </article>`;
        })
        .join("");

    feedContainer.querySelectorAll("[data-react-toggle]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const picker = document.getElementById(`reactions-${btn.dataset.reactToggle}`);
        picker?.classList.toggle("hidden");
      })
    );
    feedContainer.querySelectorAll("[data-react]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        const postId = btn.dataset.react;
        const emoji = btn.dataset.emoji;
        const alreadyThis = myReactions[postId] === emoji;
        try {
          if (alreadyThis) await DB.removeReaction(postId);
          else await DB.setReaction(postId, emoji);
          renderFeed();
        } catch (err) {
          alert("❌ " + err.message);
        }
      })
    );
    feedContainer.querySelectorAll("[data-comment]").forEach((btn) =>
      btn.addEventListener("click", () => toggleCommentBox(btn.dataset.comment))
    );
    feedContainer.querySelectorAll("[data-buy]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const sellerId = btn.dataset.buy;
        if (sellerId === TWCState.user.id) {
          alert("C'est votre propre produit.");
          return;
        }
        openSection("dm", btn.dataset.buyname, { targetUserId: sellerId, targetName: btn.dataset.buyname });
      })
    );
    feedContainer.querySelectorAll("[data-quick-follow]").forEach((el) =>
      el.addEventListener("click", async (e) => {
        e.stopPropagation();
        try {
          await DB.follow(TWCState.user.id, el.dataset.quickFollow);
          renderFeed();
        } catch (err) {
          alert("❌ " + err.message);
        }
      })
    );
    feedContainer.querySelectorAll("[data-open-profile]").forEach((el) =>
      el.addEventListener("click", () => {
        const id = el.dataset.openProfile;
        if (id === TWCState.user.id) {
          openSection("profil", "Mon Profil");
        } else {
          openSection("publicProfile", "Profil", { targetUserId: id });
        }
      })
    );
    feedContainer.querySelectorAll("[data-open-section]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const id = btn.dataset.openSection;
        openSection(id, findMenuItem(id)?.label || id);
      })
    );
  }

  let selectedMediaFile = null;
  const mediaPreview = feedContainer.querySelector("#post-media-preview");
  const photoInput = feedContainer.querySelector("#post-photo-input");
  const videoInput = feedContainer.querySelector("#post-video-input");

  function showPreview(file) {
    selectedMediaFile = file;
    const url = URL.createObjectURL(file);
    const isVideo = file.type.startsWith("video");
    mediaPreview.innerHTML = isVideo
      ? `<video src="${url}" class="composer-preview" controls></video><button type="button" class="btn-secondary" id="btn-remove-media">✕ Retirer</button>`
      : `<img src="${url}" class="composer-preview" /><button type="button" class="btn-secondary" id="btn-remove-media">✕ Retirer</button>`;
    mediaPreview.querySelector("#btn-remove-media").addEventListener("click", () => {
      selectedMediaFile = null;
      mediaPreview.innerHTML = "";
      photoInput.value = "";
      videoInput.value = "";
    });
  }
  photoInput.addEventListener("change", () => photoInput.files[0] && showPreview(photoInput.files[0]));
  videoInput.addEventListener("change", () => videoInput.files[0] && showPreview(videoInput.files[0]));

  feedContainer.querySelector("#post-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const textarea = feedContainer.querySelector("#post-content");
    const content = textarea.value.trim();
    if (!content) return;
    const submitBtn = e.target.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    submitBtn.textContent = "Publication...";
    try {
      let mediaUrl = null;
      if (selectedMediaFile) mediaUrl = await DB.uploadMedia(selectedMediaFile, "posts");
      await DB.createPost(TWCState.user.id, content, "publication", mediaUrl);
      textarea.value = "";
      selectedMediaFile = null;
      renderFeed();
    } catch (err) {
      alert("❌ " + err.message);
      submitBtn.disabled = false;
      submitBtn.textContent = "Publier";
    }
  });
}

async function toggleCommentBox(postId) {
  const box = document.getElementById(`comments-${postId}`);
  if (!box) return;
  if (!box.classList.contains("hidden")) {
    box.classList.add("hidden");
    return;
  }
  box.classList.remove("hidden");
  box.innerHTML = `<p class="section-loading">Chargement...</p>`;
  try {
    const comments = await DB.listComments(postId);
    box.innerHTML = `
      <div class="comment-list">
        ${comments.map((c) => `<p class="comment-line"><strong>${esc(c.profiles?.full_name || "Membre")}</strong> ${esc(c.content)}</p>`).join("") || `<p class="section-loading">Aucun commentaire. Soyez le premier !</p>`}
      </div>
      <form class="comment-form">
        <input type="text" placeholder="Écrire un commentaire..." required />
        <button type="submit" class="btn-secondary">Envoyer</button>
      </form>
    `;
    box.querySelector(".comment-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const input = box.querySelector("input");
      const content = input.value.trim();
      if (!content) return;
      try {
        await DB.addComment(postId, TWCState.user.id, content);
        renderFeed();
      } catch (err) {
        alert("❌ " + err.message);
      }
    });
  } catch (err) {
    box.innerHTML = `<p class="section-error">${esc(err.message)}</p>`;
  }
}

const discoverSearchInput = document.getElementById("discover-search-input");
discoverSearchInput.addEventListener("input", () => {
  const q = discoverSearchInput.value.trim().toLowerCase();
  document.querySelectorAll(".post-card").forEach((card) => {
    const text = card.textContent.toLowerCase();
    card.style.display = !q || text.includes(q) ? "" : "none";
  });
});

// ---------- Enter app ----------
async function enterApp() {
  TWCState.user = TWCAuth.currentUser;
  try {
    TWCState.profile = await DB.getProfile(TWCState.user.id);
  } catch (_) {
    TWCState.profile = { full_name: TWCState.user?.user_metadata?.full_name || "Membre", points: 0, is_admin: false };
  }

  if (TWCState.profile?.is_blocked) {
    await TWCAuth.signOut();
    showScreen(screenAuth);
    setAuthTab("login");
    showAuthError("Votre compte a été bloqué par l'administration. Contactez le support.");
    return;
  }

  const name = TWCState.profile?.full_name || "Membre";
  userGreeting.textContent = `Bonjour, ${name.split(" ")[0]} 👋`;
  renderMenu();
  renderBottomNav();
  renderFeed();
  showScreen(screenApp);
  enablePushNotifications(TWCState.user.id);
}

// ---------- Boot ----------
function boot() {
  initSupabase();

  if (!isConfigured) {
    configWarning.classList.remove("hidden");
  }

  TWCAuth.init(async (user) => {
    if (user) {
      await enterApp();
    } else {
      showScreen(screenAuth);
      setAuthTab("login");
    }
  });
}

document.addEventListener("DOMContentLoaded", boot);

// ---------- Service worker registration ----------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}
