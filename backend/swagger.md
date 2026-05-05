# APIs Edunova — version simple (MVP)

Objectif : **peu de routes**, vite codées avec Django REST Framework, **comportement complet côté élève**.  
Les **données de référence** (rôles, thèmes, cours, quiz, questions, badges, cosmétiques) peuvent être **créées / modifiées dans l’admin Django** pour éviter de multiplier les ViewSets.

Préfixe **`/api/`**. Auth : **`IsAuthenticated`** sur tout sauf `register`, `login` et lectures publiques si tu les ouvres sans compte.

---

## Convention minimale

- JSON `application/json`
- Connexion : au plus simple, **sessions Django** (`POST login` puis cookie) *ou* un seul JWT access sans refresh (à toi de choisir une option)
- Erreurs DRF : `{ "detail": "..." }` ou erreurs par champ

---

## 1. Auth & compte

| Méthode | Chemin | Rôle |
|---------|--------|------|
| `POST` | `/api/auth/register/` | `email`, `password`, `role_id` (ou rôle défaut côté serveur) → crée `User` + `Profile` |
| `POST` | `/api/auth/login/` | `email`, `password` → session ou token |
| `POST` | `/api/auth/logout/` | Déconnexion (si session / invalider token selon ta stack) |
| `GET` | `/api/me/` | Infos utilisateur connecté : `user_id`, `email`, `role` (léger, sans mot de passe) |
| `PATCH` | `/api/me/` | Ex. mise à jour `email` si tu le permets |

*Pas de reset mot de passe ni refresh JWT dans cette version (ajout futur si besoin).*

---

## 2. Lecture utile au front (liste / détail courts)

| Méthode | Chemin | Rôle |
|---------|--------|------|
| `GET` | `/api/roles/` | Liste des rôles (ex. inscription) |
| `GET` | `/api/ranks/` | Liste des rangs (carte progression) |
| `GET` | `/api/themes/` | Liste des thèmes |
| `GET` | `/api/badges/` | Catalogue badges |
| `GET` | `/api/cosmetics/` | Liste cosmétiques (boutique) |

---

## 3. Profil joueur (`Profile`)

| Méthode | Chemin | Rôle |
|---------|--------|------|
| `GET` | `/api/me/profile/` | `total_xp`, `wallet_balance`, `current_avatar_url`, `current_banner_url`, `current_streak`, `rank` |
| `PATCH` | `/api/me/profile/` | Mettre à jour URLs avatar / bannière affichées |

*L’XP, les pièces et le badge après quiz : mis à jour **dans la vue** `POST …/quiz/submit/` (pas d’endpoint séparé pour l’instant).*

---

## 4. Badges du joueur (`UserBadge`)

| Méthode | Chemin | Rôle |
|---------|--------|------|
| `GET` | `/api/me/badges/` | Liste des badges obtenus avec `earned_at` |

---

## 5. Boutique (`Cosmetic` + achat)

| Méthode | Chemin | Rôle |
|---------|--------|------|
| `POST` | `/api/cosmetics/purchase/` | Corps : `{ "cosmetic_id": <id> }` — vérifie le solde, débite `wallet_balance`, crée `UserCosmeticPurchase`, idempotence : erreur si déjà acheté |

(Optionnel vite fait : `GET /api/me/purchases/` pour l’historique — même query que le `through`, une ligne de plus.)

---

## 6. Cours & parcours

| Méthode | Chemin | Rôle |
|---------|--------|------|
| `GET` | `/api/courses/` | Liste ; query optionnelle `?theme=<id>` |
| `GET` | `/api/courses/<course_id>/` | Détail (texte cours + ids quiz / badge / thème) |
| `GET` | `/api/me/courses/` | Cours suivis (via `CourseEnrollment`) |
| `POST` | `/api/courses/<course_id>/enroll/` | S’inscrire (409 si déjà inscrit) |
| `DELETE` | `/api/courses/<course_id>/enroll/` | Se désinscrire |

*Création / édition des cours : **admin Django**.*

---

## 7. Quiz côté élève (`Quiz`, `Question`, `Answer`)

| Méthode | Chemin | Rôle |
|---------|--------|------|
| `GET` | `/api/quizzes/<quiz_id>/play/` | Quiz pour jouer : questions + réponses (**sans** champ `is_correct` dans le JSON pour limiter la triche) |
| `POST` | `/api/quizzes/<quiz_id>/submit/` | Corps : `{ "answers": { "<question_id>": <answer_id>, ... } }` — calcule le score ; si réussite (`≥ min_score_to_pass`) : ajoute pièces (`coins_on_success`), XP des questions (`xp_value`), crée `UserBadge` pour le badge du cours si le quiz correspond au cours validé et que l’utilisateur est inscrit |

*Création / édition des quiz et questions : **admin Django**.*

---

## 8. Santé (facultatif)

| Méthode | Chemin | Rôle |
|---------|--------|------|
| `GET` | `/api/health/` | `{"ok": true}` pour surveillance |

---

## Récap : environ **20 routes** au lieu d’une grosse surface CRUD

| Modèle | Couverture MVP |
|--------|----------------|
| `User` | `register`, `login`, `logout`, `me` |
| `Role` | `GET /roles/` |
| `Rank` | `GET /ranks/` |
| `Profile` | `me/profile` |
| `Badge` | `GET /badges/` |
| `UserBadge` | `me/badges` (+ créé au submit quiz) |
| `Cosmetic` | `GET /cosmetics/` + `purchase` |
| `UserCosmeticPurchase` | créé via `purchase` |
| `Theme` | `GET /themes/` |
| `Course` | `GET` liste/détail, enroll + `me/courses` |
| `CourseEnrollment` | via enroll / désinscription |
| `Quiz` | `play` + `submit` |
| `Question` / `Answer` | imbriqués dans `play` / utilisés dans `submit` |

**Hors API pour aller vite** : création modification `Role`, `Rank`, `Theme`, `Course`, `Quiz`, `Question`, `Answer`, `Badge`, `Cosmetic` dans **`/admin/`**.

Quand tout tourne, tu pourras réintroduire des ViewSets CRUD staff et OpenAPI détaillé sans changer les URLs élève ci-dessus.
