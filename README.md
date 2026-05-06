# Edunova - Plateforme de formation interactive pour alternants

> Une application web pensee pour rendre les parcours pedagogiques engageants, personnalises et faciles a creer pour les formateurs.

![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)
![Django](https://img.shields.io/badge/Django-4.x-092E20?logo=django&logoColor=white)
![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white)
![License](https://img.shields.io/badge/Licence-MIT-green)

---

## Sommaire

1. Prerequis
2. Installation
3. Acces a l'application
   - En tant qu'apprenant
   - En tant que formateur
   - En tant qu'administrateur
4. Donnees de demonstration
5. Stack technique
6. Tests API
7. Depannage

---

## Prerequis

- [Docker Desktop](https://docs.docker.com/get-docker/) (inclut Docker Compose)

Aucune installation de Python, Node.js ou PostgreSQL n'est necessaire sur la machine hote.

---

## Installation

### Etape 1 - Cloner le depot

```bash
git clone <url-du-depot>
cd Edunova
```

### Etape 2 - Creer le fichier de configuration

Copier le fichier d'exemple :

```bash
cp .env.example .env   # Linux / macOS
copy .env.example .env  # Windows
```

Ouvrir `.env` et renseigner **au minimum** ces variables :

```env
# Base de donnees
POSTGRES_DB=edunova
POSTGRES_USER=edunova
POSTGRES_PASSWORD=motdepassefort

# Ports exposes (modifier si deja utilises sur votre machine)
BACKEND_PORT=8000
FRONTEND_PORT=5173

# Django - a remplir a l'etape suivante
SECRET_KEY=
```

### Etape 3 - Generer la SECRET_KEY

La `SECRET_KEY` est obligatoire pour Django. Generez-la avec cette commande (pas besoin de Python installe localement) :

```bash
docker compose run --rm --no-deps --entrypoint python backend -c "import secrets; print(secrets.token_urlsafe(50))"
```

Copiez la valeur affichee dans `.env` :

```env
SECRET_KEY=la_valeur_generee_ici
```

### Etape 4 - Lancer l'application

```bash
docker compose up --build
```

> Le premier lancement telecharge les images Docker et installe les dependances npm - compter **2 a 5 minutes**. Les lancements suivants sont beaucoup plus rapides.

Une fois demarre, l'application est accessible :

| Service | URL |
|---------|-----|
| Interface web (frontend) | http://localhost:5173 |
| API (backend) | http://localhost:8000 |

---

## Acces a l'application

### En tant qu'apprenant

1. Ouvrir **http://localhost:5173**
2. Cliquer sur **S'inscrire** et creer un compte
3. Se connecter avec ses identifiants
4. Depuis le **tableau de bord** (`/dashboard`), voir sa progression et ses badges
5. Aller sur **Mes cours** pour suivre un parcours pedagogique

> Un compte cree via l'inscription est automatiquement un apprenant. Il peut suivre des cours, passer des quiz et gagner des badges.

---

### En tant que formateur

Le formateur dispose d'un back-office pour creer et gerer les cours et les quiz.

#### Option A - Utiliser les donnees de demonstration *(recommande pour tester rapidement)*

Charger les donnees de demo une fois l'application demarree :

```bash
docker compose exec backend python manage.py seed_cosmetics
docker compose exec backend python manage.py seed_demo
```

Se connecter avec l'un de ces comptes :

| Email | Mot de passe | Thematique |
|-------|-------------|------------|
| `marie.dubois@edunova.local` | `Edunova123!` | Cybersecurite |
| `paul.martin@edunova.local` | `Edunova123!` | Reseaux |
| `sofia.garcia@edunova.local` | `Edunova123!` | Developpement web |
| `thomas.leroy@edunova.local` | `Edunova123!` | DevOps |

#### Option B - Creer un formateur manuellement

1. Creer un compte via la page d'inscription
2. Assigner le role `formateur` a ce compte :

```bash
docker compose exec backend python manage.py shell -c "
from apps.edunova.models import Role, Profile
role = Role.objects.get(role_name='formateur')
profile = Profile.objects.get(user__email='email@exemple.com')
profile.role = role
profile.save()
print('Role formateur assigne.')
"
```

#### Pages accessibles au formateur

| URL | Description |
|-----|-------------|
| `/admin` | Tableau de bord - vue d'ensemble |
| `/admin/cours` | Creer, modifier et supprimer des cours |
| `/admin/quizz` | Creer et modifier les quiz lies aux cours |

---

### En tant qu'administrateur

L'administrateur accede a toutes les pages du back-office, y compris la gestion des utilisateurs et les logs.

#### Option A - Utiliser le compte de demo *(apres `seed_demo`)*

| Email | Mot de passe |
|-------|-------------|
| `admin@edunova.local` | `Edunova123!` |

#### Option B - Creer un superutilisateur

```bash
docker compose exec backend python manage.py createsuperuser
```

#### Pages accessibles a l'administrateur

| URL | Description |
|-----|-------------|
| `/admin` | Tableau de bord |
| `/admin/cours` | Tous les cours |
| `/admin/quizz` | Tous les quiz |
| `/admin/users` | Liste et roles de tous les utilisateurs |
| `/admin/logs` | Historique des actions |

---

## Donnees de demonstration

Le script `seed_demo` peuple la base avec un jeu de donnees realiste :

- **1 administrateur** (`admin@edunova.local`)
- **4 formateurs**, chacun responsable d'une thematique
- **24 apprenants** avec des progressions variees (debutant, intermediaire, avance)
- **4 thematiques**, **16 cours** complets avec quiz, questions et reponses
- Badges, avatars et historique d'activite

Mot de passe pour tous les comptes de demo : **`Edunova123!`**

```bash
# A lancer dans cet ordre
docker compose exec backend python manage.py seed_cosmetics
docker compose exec backend python manage.py seed_demo

# Reinitialiser et recharger depuis zero
docker compose exec backend python manage.py seed_demo --reset
```

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Backend | Django 4 + Django REST Framework |
| Frontend | React 18 + Vite |
| Base de donnees | PostgreSQL 17 |
| Conteneurisation | Docker + Docker Compose |
| IA (generation de cours) | Google Gemini (optionnel) |

**Generation IA** : pour activer la creation de cours assistee par IA, renseigner `GEMINI_API_KEY` dans `.env` (cle obtenue sur [Google AI Studio](https://aistudio.google.com/apikey)). Sans cle, l'endpoint `/api/formateur/ai/*` renvoie une erreur 503 mais le reste de l'application fonctionne normalement.

En production : passer `DEBUG=False`, definir une `SECRET_KEY` forte, et renseigner `ALLOWED_HOSTS` et `CSRF_TRUSTED_ORIGINS` avec vos domaines reels.

---

## Tests API

Les tests verifient les endpoints les plus critiques de l'application :

| Module | Ce qui est teste |
|--------|-----------------|
| `tests.auth` | Inscription, connexion, deconnexion, `/me/` |
| `tests.courses` | Liste, detail, inscription et desinscription a un cours |
| `tests.quiz` | Lecture (anti-triche), soumission reussie et echouee |
| `tests.cosmetics` | Liste, achat, double achat, equipement |

Chaque suite cree ses propres donnees et les supprime apres execution.

### Lancement manuel

```bash
docker compose exec backend python -m tests.auth
docker compose exec backend python -m tests.courses
docker compose exec backend python -m tests.quiz
docker compose exec backend python -m tests.cosmetics
```

### Lancement automatique au demarrage

Ajouter dans `.env` pour lancer les tests a chaque demarrage du backend (utile en CI/CD) :

```env
RUN_TESTS=1
```

Le serveur **ne demarre pas** si un test echoue.

---

## Depannage

**Le frontend affiche une erreur de connexion a l'API**
Verifier que tous les services sont demarres : `docker compose ps`. Les services `backend` et `db` doivent etre `healthy`.

**Le premier lancement est tres lent**
Normal : npm installe les dependances lors du premier demarrage (1-3 min). Les suivants utilisent le cache du volume `frontend_node_modules`.

**Erreur `InconsistentMigrationHistory`**
La base de donnees existe deja avec un historique incompatible. Repartir d'une base vide :
```bash
docker compose down -v
docker compose up --build
```

**Forcer la reinstallation des dependances npm**
```bash
docker volume rm edunova_frontend_node_modules
docker compose up --build
```