# Together We Can — PWA complète

## ✅ Nouveautés de cette version

- **Modération** : les publications des membres passent en attente de validation admin avant d'apparaître dans le fil (Panel Admin → onglet Publications)
- **Contenu officiel certifié ✅** : tout ce que vous publiez dans une section du menu (Éducation, Formation, Opportunités...) apparaît automatiquement dans la page d'accueil avec le badge **Together We Can ✅**
- **Assistant IA réel** : connecté à l'API Claude via une fonction serveur sécurisée (votre clé API n'est jamais visible dans le navigateur)
- **Notifications push** : les membres reçoivent une notification même app fermée à chaque nouvelle publication/contenu (Web Push, gratuit, pas besoin de Firebase)

## Étape 1 — Supabase (base de données)

1. Créez un projet sur [supabase.com](https://supabase.com)
2. **Project Settings → API** → copiez **Project URL** et **anon public key** dans `js/config.js`
3. **SQL Editor** → collez tout `sql/schema.sql` → **Run**
4. **Authentication → Providers** : Email activé. **Authentication → Settings** : désactivez "Confirm email" pour les tests

## Étape 2 — Devenir administrateur

Inscrivez-vous dans l'app une première fois, puis dans **SQL Editor** :
```sql
update public.profiles set is_admin = true
where id = (select id from auth.users where email = 'votre-email@gmail.com');
```

## Étape 3 — Assistant IA (Edge Function)

Nécessite le [Supabase CLI](https://supabase.com/docs/guides/cli) installé sur votre ordinateur :
```bash
supabase login
supabase link --project-ref VOTRE_REF_PROJET
supabase functions deploy ai-assistant
supabase secrets set ANTHROPIC_API_KEY=sk-ant-VOTRE_CLE
```
Obtenez une clé API sur [console.anthropic.com](https://console.anthropic.com). Une fois déployé, le chat IA dans Support fonctionne immédiatement — sans configuration côté navigateur.

## Étape 4 — Notifications push (fonctionne app fermée)

La clé publique VAPID est déjà intégrée dans `js/config.js` (aucune action requise de votre part pour ça). Il faut juste déployer la fonction d'envoi et configurer les secrets :

```bash
supabase functions deploy send-notification
supabase secrets set VAPID_PUBLIC_KEY=BNKX-V7M2UjDsaoiIXA6oZJ81Xj4R13EMka6fTzJkLG0Ii82-OiSNusJ2f-u-yQSOXWNI0d6GV6CGdN8JngN1GI
supabase secrets set VAPID_PRIVATE_KEY=Qw620yhUPgpyISeL-QdZlFtF9JNTU4h3aHm4zEN7tFE
supabase secrets set VAPID_SUBJECT=mailto:votre-email@example.com
```

Puis, dans le Dashboard Supabase → **Database → Webhooks → Create a new hook**, créez-en deux :
1. **Table** `posts`, **Événement** `UPDATE`, **appelle** votre fonction `send-notification` (envoie une notif quand une publication est approuvée)
2. **Table** `content_items`, **Événement** `INSERT`, **appelle** la même fonction (envoie une notif à chaque contenu publié dans une section)

⚠️ Sans cette étape, l'app fonctionne normalement mais sans notifications push. C'est la seule partie qui nécessite un peu de configuration technique (impossible à faire sans votre compte Supabase).

## Étape 5 — Héberger

100% statique : **Netlify** (glisser-déposer sur app.netlify.com/drop), **Vercel**, ou **GitHub Pages**. HTTPS obligatoire (automatique sur ces plateformes).

## Réponses à vos questions

- **Firebase** : non nécessaire — Supabase + Web Push standard couvrent tout (base de données, auth, stockage, notifications).
- **Qui peut publier ?** Tous les membres peuvent proposer une publication sur l'accueil, mais elle reste invisible tant que vous ne l'approuvez pas dans le Panel Admin. Le contenu des sections (Éducation, Opportunités, etc.) reste 100% réservé à l'administrateur.
- **Badge de certification** : c'est visuel pour l'instant (✅ à côté de "Together We Can" et de tout compte `is_admin = true`) — il n'y a pas encore de système de vérification pour les membres eux-mêmes (ex. artistes vérifiés). Dites-moi si vous voulez que j'ajoute une demande de vérification pour les membres.
- **Aspect professionnel** : la structure (base de données sécurisée avec permissions par rôle, authentification réelle, modération, notifications) suit les standards des vraies applications communautaires. Le visuel est propre et cohérent avec votre identité verte. Pour un rendu "grand public" encore plus abouti (animations, richesse graphique par section), on peut continuer à peaufiner section par section une fois que la base tourne chez vous.

## Limitations connues (transparence)

- Les likes ne sont pas encore limités à un par utilisateur.
- Les quiz d'Éducation se créent actuellement via l'éditeur de table Supabase (colonne `quiz`), pas encore via une interface dédiée.
- Le contenu du Panel Admin pour ajouter cours/formations est un formulaire simple (titre, description, vidéo, document) — pas encore d'éditeur de modules multi-étapes.
