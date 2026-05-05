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

Le schéma métier est défini dans **`apps.edunova`** (modèles MCD) ; la **migration initiale** est appliquée sur PostgreSQL au démarrage du backend Docker (`docker-entrypoint.sh` → `migrate`). DRF est déclaré dans `INSTALLED_APPS` pour préparer les **routes API** à venir.

---

## 🐳 Docker

Depuis la racine du dépôt :

```bash
docker compose up --build
```

- **API / admin Django** : `http://localhost:8000` (dont `/admin/`)
- **Frontend Vite** : `http://localhost:5173`
- **PostgreSQL** : port `5432` (voir `.env.example`)

Les migrations **ne s’exécutent pas pendant `docker build`** : au premier `compose up`, le backend attend une base joignable puis lance **`migrate`** (volume Postgres neuf ⇒ base vide ⇒ toutes les migrations, dont la `0001`, sont appliquées). Réessais automatiques sont prévus après `pg_isready` au cas où la connexion Django mettrait une seconde de plus à être disponible.

Commandes utiles dans le conteneur :

```bash
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
```

---

## ⚠️ Historique de migrations

Si tu changes de modèle utilisateur ou de structure d’apps sur une base déjà migrée, Postgres peut signaler une **`InconsistentMigrationHistory`**. Dans ce cas, purge le volume nommé ou repars d’une base neuve (`docker compose down -v` puis `up --build`).

---

## ✅ Prérequis

- [Docker](https://docs.docker.com/get-docker/) et Docker Compose

---
