# ?? Edunova � Plateforme de formation interactive pour alternants

> Une application web pens�e pour rendre les parcours p�dagogiques engageants, personnalis�s et faciles � cr�er pour les formateurs.

![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)
![Django](https://img.shields.io/badge/Django-4.x-092E20?logo=django&logoColor=white)
![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white)
![License](https://img.shields.io/badge/Licence-MIT-green)

---

## ?? Sommaire

1. [Pr�requis](#-pr�requis)
2. [Installation](#-installation)
3. [Acc�s � l'application](#-acc�s-�-lapplication)
   - [En tant qu'apprenant](#en-tant-quapprenant)
   - [En tant que formateur](#en-tant-que-formateur)
   - [En tant qu'administrateur](#en-tant-quadministrateur)
4. [Donn�es de d�monstration](#-donn�es-de-d�monstration)
5. [Stack technique](#-stack-technique)
6. [Tests API](#-tests-api)
7. [D�pannage](#-d�pannage)

---

## ? Pr�requis

- [Docker Desktop](https://docs.docker.com/get-docker/) (inclut Docker Compose)

Aucune installation de Python, Node.js ou PostgreSQL n'est n�cessaire sur la machine h�te.

---

## ?? Installation

### �tape 1 � Cloner le d�p�t

```bash
git clone <url-du-depot>
cd Edunova
```

### �tape 2 � Cr�er le fichier de configuration

Copier le fichier d'exemple :

```bash
cp .env.example .env   # Linux / macOS
copy .env.example .env  # Windows
```

Ouvrir `.env` et renseigner **au minimum** ces variables :

```env
# Base de donn�es
POSTGRES_DB=edunova
POSTGRES_USER=edunova
POSTGRES_PASSWORD=motdepassefort

# Ports expos�s (modifier si d�j� utilis�s sur votre machine)
BACKEND_PORT=8000
FRONTEND_PORT=5173

# Django � � remplir � l'�tape suivante
SECRET_KEY=
```

### �tape 3 � G�n�rer la SECRET_KEY

La `SECRET_KEY` est obligatoire pour Django. G�n�rez-la avec cette commande (pas besoin de Python install� localement) :

```bash
docker compose run --rm --no-deps --entrypoint python backend -c "import secrets; print(secrets.token_urlsafe(50))"
```

Copiez la valeur affich�e dans `.env` :

```env
SECRET_KEY=la_valeur_generee_ici
```

### �tape 4 � Lancer l'application

```bash
docker compose up --build
```

> Le premier lancement t�l�charge les images Docker et installe les d�pendances npm � compter **2 � 5 minutes**. Les lancements suivants sont beaucoup plus rapides.

Une fois d�marr�, l'application est accessible :

| Service | URL |
|---------|-----|
| Interface web (frontend) | http://localhost:5173 |
| API (backend) | http://localhost:8000 |

---

## ?? Acc�s � l'application

### En tant qu'apprenant

1. Ouvrir **http://localhost:5173**
2. Cliquer sur **S'inscrire** et cr�er un compte
3. Se connecter avec ses identifiants
4. Depuis le **tableau de bord** (`/dashboard`), voir sa progression et ses badges
5. Aller sur **Mes cours** (`/courses/ma-thematiques`) pour suivre un parcours p�dagogique

> Un compte cr�� via l'inscription est automatiquement un apprenant. Il peut suivre des cours, passer des quiz et gagner des badges.

---

### En tant que formateur

Le formateur dispose d'un back-office pour cr�er et g�rer les cours et les quiz.

#### Option A � Utiliser les donn�es de d�monstration *(recommand� pour tester rapidement)*

Charger les donn�es de d�mo une fois l'application d�marr�e :

```bash
docker compose exec backend python manage.py seed_cosmetics
docker compose exec backend python manage.py seed_demo
```

Se connecter avec l'un de ces comptes :

| Email | Mot de passe | Th�matique |
|-------|-------------|------------|
| `marie.dubois@edunova.local` | `Edunova123!` | Cybers�curit� |
| `paul.martin@edunova.local` | `Edunova123!` | R�seaux |
| `sofia.garcia@edunova.local` | `Edunova123!` | D�veloppement web |
| `thomas.leroy@edunova.local` | `Edunova123!` | DevOps |

#### Option B � Cr�er un formateur manuellement

1. Cr�er un compte via la page d'inscription
2. Assigner le r�le `formateur` � ce compte :

```bash
docker compose exec backend python manage.py shell -c "
from apps.edunova.models import Role, Profile
role = Role.objects.get(role_name='formateur')
profile = Profile.objects.get(user__email='email@exemple.com')
profile.role = role
profile.save()
print('R�le formateur assign�.')
"
```

#### Pages accessibles au formateur

| URL | Description |
|-----|-------------|
| `/admin` | Tableau de bord � vue d'ensemble |
| `/admin/cours` | Cr�er, modifier et supprimer des cours |
| `/admin/quizz` | Cr�er et modifier les quiz li�s aux cours |

---

### En tant qu'administrateur

L'administrateur acc�de � toutes les pages du back-office, y compris la gestion des utilisateurs et les logs.

#### Option A � Utiliser le compte de d�mo *(apr�s `seed_demo`)*

| Email | Mot de passe |
|-------|-------------|
| `admin@edunova.local` | `Edunova123!` |

#### Option B � Cr�er un superutilisateur

```bash
docker compose exec backend python manage.py createsuperuser
```

#### Pages accessibles � l'administrateur

| URL | Description |
|-----|-------------|
| `/admin` | Tableau de bord |
| `/admin/cours` | Tous les cours |
| `/admin/quizz` | Tous les quiz |
| `/admin/users` | Liste et r�les de tous les utilisateurs |
| `/admin/logs` | Historique des actions |

---

## ?? Donn�es de d�monstration

Le script `seed_demo` peuple la base avec un jeu de donn�es r�aliste :

- **1 administrateur** (`admin@edunova.local`)
- **4 formateurs**, chacun responsable d'une th�matique
- **24 apprenants** avec des progressions vari�es (d�butant, interm�diaire, avanc�)
- **4 th�matiques**, **16 cours** complets avec quiz, questions et r�ponses
- Badges, avatars et historique d'activit�

Mot de passe pour tous les comptes de d�mo : **`Edunova123!`**

```bash
# � lancer dans cet ordre
docker compose exec backend python manage.py seed_cosmetics
docker compose exec backend python manage.py seed_demo

# R�initialiser et recharger depuis z�ro
docker compose exec backend python manage.py seed_demo --reset
```

---

## ?? Stack technique

| Couche | Technologie |
|--------|-------------|
| Backend | Django 4 + Django REST Framework |
| Frontend | React 18 + Vite |
| Base de donn�es | PostgreSQL 17 |
| Conteneurisation | Docker + Docker Compose |
| IA (g�n�ration de cours) | Google Gemini (optionnel) |

**G�n�ration IA** : pour activer la cr�ation de cours assist�e par IA, renseigner `GEMINI_API_KEY` dans `.env` (cl� obtenue sur [Google AI Studio](https://aistudio.google.com/apikey)). Sans cl�, l'endpoint `/api/formateur/ai/*` renvoie une erreur 503 mais le reste de l'application fonctionne normalement.

En production : passer `DEBUG=False`, d�finir une `SECRET_KEY` forte, et renseigner `ALLOWED_HOSTS` et `CSRF_TRUSTED_ORIGINS` avec vos domaines r�els.

---

## ?? Tests API

Les tests v�rifient les endpoints les plus critiques de l'application :

| Module | Ce qui est test� |
|--------|-----------------|
| `tests.auth` | Inscription, connexion, d�connexion, `/me/` |
| `tests.courses` | Liste, d�tail, inscription et d�sinscription � un cours |
| `tests.quiz` | Lecture (anti-triche), soumission r�ussie et �chou�e |
| `tests.cosmetics` | Liste, achat, double achat, �quipement |

Chaque suite cr�e ses propres donn�es et les supprime apr�s ex�cution.

### Lancement manuel

```bash
docker compose exec backend python -m tests.auth
docker compose exec backend python -m tests.courses
docker compose exec backend python -m tests.quiz
docker compose exec backend python -m tests.cosmetics
```

### Lancement automatique au d�marrage

Ajouter dans `.env` pour lancer les tests � chaque d�marrage du backend (utile en CI/CD) :

```env
RUN_TESTS=1
```

Le serveur **ne d�marre pas** si un test �choue.

---

## ?? D�pannage

**Le frontend affiche une erreur de connexion � l'API**
? V�rifier que tous les services sont d�marr�s : `docker compose ps`. Les services `backend` et `db` doivent �tre `healthy`.

**Le premier lancement est tr�s lent**
? Normal : npm installe les d�pendances lors du premier d�marrage (1�3 min). Les suivants utilisent le cache du volume `frontend_node_modules`.

**Erreur `InconsistentMigrationHistory`**
? La base de donn�es existe d�j� avec un historique incompatible. Repartir d'une base vide :
```bash
docker compose down -v
docker compose up --build
```

**Forcer la r�installation des d�pendances npm**
```bash
docker volume rm edunova_frontend_node_modules
docker compose up --build
```
ee