# APIs Edunova

Préfixe **`/api/`**. Auth : **`IsAuthenticated`** sur tout sauf `register`, `login` et `health`.  
Sessions Django + cookie CSRF. Erreurs DRF : `{ "detail": "..." }` ou erreurs par champ.

---


## 1. Auth & compte

| Méthode | Chemin | Auth | Description |
|---------|--------|------|-------------|
| `GET` | `/api/auth/csrf/` | Non | Récupérer le cookie CSRF (SPA) |
| `POST` | `/api/auth/register/` | Non | `email`, `password`, `role_id` optionnel → crée `User` + `Profile` (rôle `élève` par défaut ; rôle `formateur` interdit à l'inscription) |
| `POST` | `/api/auth/login/` | Non | `email`, `password` → session |
| `POST` | `/api/auth/logout/` | Oui | Déconnexion |
| `GET` | `/api/me/` | Oui | `user_id`, `email`, `role` |
| `PATCH` | `/api/me/` | Oui | Mise à jour `email` |

---

## 2. Référentiels (lecture)

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `GET` | `/api/roles/` | Liste des rôles |
| `GET` | `/api/ranks/` | Liste des rangs triés par seuil XP |
| `GET` | `/api/themes/` | Liste des thèmes |
| `GET` | `/api/badges/` | Catalogue des badges |
| `GET` | `/api/cosmetics/` | Catalogue des cosmétiques |

---

## 3. Profil joueur

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `GET` | `/api/me/profile/` | `total_xp`, `wallet_balance`, `current_avatar_url`, `current_banner_url`, `current_streak`, `rank` |
| `PATCH` | `/api/me/profile/` | Mettre à jour `current_avatar_url` / `current_banner_url` |

*XP et pièces mis à jour dans `POST …/submit/`.*

---

## 4. Badges & achats du joueur

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `GET` | `/api/me/badges/` | Badges obtenus avec `earned_at` |
| `GET` | `/api/me/purchases/` | Historique des achats cosmétiques |

---

## 5. Boutique

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `POST` | `/api/cosmetics/purchase/` | Corps : `{ "cosmetic_id": <id> }` — vérifie solde, débite `wallet_balance`, crée `UserCosmeticPurchase` (409 si déjà acheté, 402 si solde insuffisant) |

---

## 6. Cours & parcours (élève)

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `GET` | `/api/courses/` | Liste ; `?theme=<id>` optionnel |
| `GET` | `/api/courses/<course_id>/` | Détail (contenu + ids quiz / badge / thème) |
| `GET` | `/api/me/courses/` | Cours suivis |
| `POST` | `/api/courses/<course_id>/enroll/` | S'inscrire (409 si déjà inscrit) |
| `DELETE` | `/api/courses/<course_id>/enroll/` | Se désinscrire |

---

## 7. Quiz côté élève

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `GET` | `/api/quizzes/<quiz_id>/play/` | Questions + réponses sans `is_correct` |
| `POST` | `/api/quizzes/<quiz_id>/submit/` | Corps : `{ "answers": { "<question_id>": <answer_id>, … } }` — calcule score ; si réussite : crédite pièces + XP, met à jour rang, attribue badge du cours si inscrit |

---

## 8. Espace formateur (`IsFormateur`)

> Toutes ces routes exigent le rôle `formateur`. L'ownership est vérifié : un formateur ne peut accéder qu'aux ressources qu'il a créées. Le rôle `formateur` ne peut pas être choisi à l'inscription — il est attribué par un administrateur.

### Cours

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `GET` | `/api/formateur/courses/` | Liste ses propres cours |
| `POST` | `/api/formateur/courses/` | Créer un cours |
| `GET` | `/api/formateur/courses/<course_id>/` | Détail |
| `PATCH` | `/api/formateur/courses/<course_id>/` | Modifier (partiel) |
| `DELETE` | `/api/formateur/courses/<course_id>/` | Supprimer |
| `GET` | `/api/formateur/courses/<course_id>/stats/` | Stats apprenants : `enrolled_count`, liste avec `email`, `total_xp`, `rank`, `badge_earned` |

### Quiz

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `GET` | `/api/formateur/quizzes/` | Liste ses propres quiz |
| `POST` | `/api/formateur/quizzes/` | Créer un quiz (`coins_on_success`, `min_score_to_pass`) |
| `GET` | `/api/formateur/quizzes/<quiz_id>/` | Détail |
| `PATCH` | `/api/formateur/quizzes/<quiz_id>/` | Modifier |
| `DELETE` | `/api/formateur/quizzes/<quiz_id>/` | Supprimer |

### Questions

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `GET` | `/api/formateur/quizzes/<quiz_id>/questions/` | Liste les questions d'un quiz |
| `POST` | `/api/formateur/quizzes/<quiz_id>/questions/` | Ajouter une question (`question_content`, `xp_value`) |
| `PATCH` | `/api/formateur/questions/<question_id>/` | Modifier |
| `DELETE` | `/api/formateur/questions/<question_id>/` | Supprimer |

### Réponses

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `GET` | `/api/formateur/questions/<question_id>/answers/` | Liste les réponses d'une question |
| `POST` | `/api/formateur/questions/<question_id>/answers/` | Ajouter une réponse (`label_answer`, `is_correct`) |
| `PATCH` | `/api/formateur/answers/<answer_id>/` | Modifier |
| `DELETE` | `/api/formateur/answers/<answer_id>/` | Supprimer |

---

## 9. Administration (`is_staff`)

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `GET` | `/api/admin/users/` | Liste paginée des comptes (25/page) |
| `GET` | `/api/admin/users/<user_id>/` | Détail d'un compte |
| `PATCH` | `/api/admin/users/<user_id>/` | Modifier un compte (ex. changer le rôle) |

---

## 10. Santé

| Méthode | Chemin | Auth | Description |
|---------|--------|------|-------------|
| `GET` | `/api/health/` | Non | `{"ok": true}` |

---

## Récap couverture

| Modèle | Routes |
|--------|--------|
| `User` | register, login, logout, me, admin |
| `Role` | `GET /roles/` |
| `Rank` | `GET /ranks/` |
| `Profile` | `me/profile` GET + PATCH |
| `Badge` | `GET /badges/` |
| `UserBadge` | `me/badges` (+ créé au submit quiz) |
| `Cosmetic` | `GET /cosmetics/` + purchase |
| `UserCosmeticPurchase` | `me/purchases` + créé via purchase |
| `Theme` | `GET /themes/` |
| `Course` | liste/détail/enroll/me/courses + CRUD formateur + stats |
| `CourseEnrollment` | enroll / désinscription |
| `Quiz` | play + submit + CRUD formateur |
| `Question` | imbriquée dans play + CRUD formateur |
| `Answer` | imbriquée dans play/submit + CRUD formateur |
| `ActivityLog` | écrit automatiquement par les vues (non exposé en API) |

