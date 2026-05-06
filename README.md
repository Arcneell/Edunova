# 🎓 Edunova — Plateforme de formation interactive pour alternants

> Une application web pensée pour rendre les parcours pédagogiques engageants, personnalisés et faciles à créer pour les formateurs.

![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)
![Django](https://img.shields.io/badge/Django-4.x-092E20?logo=django&logoColor=white)
![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white)
![License](https://img.shields.io/badge/Licence-MIT-green)

---

## 🧰 Stack technique

| Couche | Technologie |
|--------|-------------|
| Backend | Django + Django REST Framework |
| Frontend | React + Vite |
| Base | PostgreSQL (service `db` dans Docker Compose) |
| Conteneurisation | Docker + Docker Compose |

Modèle de données : fichier unique **`backend/apps/edunova/models.py`**. Django REST Framework est prêt dans `INSTALLED_APPS`.

**Configuration** : copier `.env.example` vers `.env`, puis remplir les variables nécessaires. En production : **`DEBUG=False`**, **`SECRET_KEY`** forte, listes **`ALLOWED_HOSTS`** et **`CSRF_TRUSTED_ORIGINS`** explicites.

### SECRET_KEY (obligatoire)

Elle doit figurer dans **`.env`** à la racine du dépôt (injecté dans le backend via `env_file` dans Compose). **`settings.py`** charge aussi **`backend/.env`** si présent (`django-dotenv`). **Aucune clef n’est codée dans le projet.**

Sans Python installé **localement**, générez-la **dans l’image backend** ; `--no-deps` évite de démarrer Postgres pour cette étape :

```bash
docker compose run --rm --no-deps --entrypoint python backend -c "import secrets; print(secrets.token_urlsafe(50))"
```

Copiez la ligne affichée dans **`.env`** :

```env
SECRET_KEY=collez_la_valeur_sans_espace_ni_guillemets
```

Puis relancez le backend :

```bash
docker compose up -d --build backend
```

**Équivalent** via l’outil Django (même conteneur) :

```bash
docker compose run --rm --no-deps --entrypoint python backend -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

---


## 🐳 Docker

```bash
docker compose up --build
```

| Service   | URL / port typique |
|----------|--------------------|
| Backend  | `http://localhost:${BACKEND_PORT}` (souvent 8000, voir `.env`) |
| Frontend | `http://localhost:${FRONTEND_PORT}` (souvent 5173) |
| Postgres | port défini par **`POSTGRES_PORT`** dans `.env` (ex. `5432`) |

**PostgreSQL** : renseigner **`POSTGRES_DB`**, **`POSTGRES_USER`**, **`POSTGRES_PASSWORD`** et **`POSTGRES_PORT`** dans `.env` (aucune valeur par défaut dans `docker-compose.yml`).

Au démarrage du backend : attente Postgres puis **`migrate --noinput`** (bases vides ⇒ toutes les migrations appliquées). Pas de migration pendant **`docker build`**.

Commandes utiles dans le conteneur :

```bash
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
```

## Si « rien n’avance » au démarrage

- **Premier lancement** : `npm ci` peut prendre 1–3 minutes (téléchargement des paquets) ; les suivants sont courts grâce au volume `frontend_node_modules` et au cache de lock.
- **Backend** : plus d’`apt-get` dans l’image ; si l’attente Postgres dépasse **2 minutes**, un message d’erreur explicite s’affiche (vérifier que le service `db` est `healthy`).
- Pour forcer une réinstallation npm : `docker volume rm edunova_frontend_node_modules` (adapter le nom avec `docker volume ls`).

---

## ⚠️ Historique de migrations

Si tu changes de modèle utilisateur ou de structure d’apps sur une base déjà migrée, Postgres peut signaler une **`InconsistentMigrationHistory`**. Dans ce cas, purge le volume nommé ou repars d’une base neuve (`docker compose down -v` puis `up --build`).

---

## ✅ Prérequis

- [Docker](https://docs.docker.com/get-docker/) et Docker Compose

---

## 🧪 Tests API

Les tests vérifient les endpoints les plus critiques de l'application :

| Module | Endpoints couverts |
|---|---|
| `tests.auth` | register, login, logout, `/me/` |
| `tests.courses` | liste, détail, inscription / désinscription |
| `tests.quiz` | lecture (anti-triche), soumission réussie / échouée |
| `tests.cosmetics` | liste, achat, double achat, équipement, `is_equipped` |

Chaque suite crée ses propres données de test et les supprime après exécution. Elle retourne un exit code égal au nombre d'échecs.

### Lancement manuel

```bash
# Une suite à la fois
docker compose exec backend python -m tests.auth
docker compose exec backend python -m tests.courses
docker compose exec backend python -m tests.quiz
docker compose exec backend python -m tests.cosmetics
```

### Lancement automatique au démarrage

Les tests se déclenchent après les migrations, via la variable `RUN_TESTS`. Le serveur **ne démarre pas** si un test échoue.

**Linux / macOS :**
```bash
RUN_TESTS=1 docker compose up --build
```

**Windows PowerShell :**
```powershell
$env:RUN_TESTS=1 ; docker compose up --build
```

Pour les activer en permanence (CI/CD, environnement de staging), ajouter dans `.env` :
```env
RUN_TESTS=1
```

---
