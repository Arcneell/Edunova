"""Seed maître Edunova : produit un état de démo proche de la prod.

But : faire tourner l'application sur une base contenant 1 admin, 4 formateurs,
24 apprenants, 4 thématiques (cybersécurité, réseaux, web, devops), 16 cours
avec quiz / questions / réponses, des inscriptions, des progressions
réalistes, des badges gagnés, un avatar équipé sur chaque utilisateur, et
quelques entrées de log d'activité.

Idempotent : peut être relancé sans dupliquer les données. ``--reset`` purge
au préalable les apprenants/formateurs/cours/quiz/badges seedés.

Usage :
    docker compose exec backend python manage.py seed_cosmetics
    docker compose exec backend python manage.py seed_demo
    # ou avec un mot de passe personnalisé
    docker compose exec backend python manage.py seed_demo --password=AutreMdp123!
"""

from __future__ import annotations

from dataclasses import dataclass, field

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.edunova.models import (
    ActivityLog,
    Answer,
    Badge,
    Cosmetic,
    Course,
    CourseEnrollment,
    Profile,
    Question,
    Quiz,
    Rank,
    Role,
    Theme,
    User,
    UserBadge,
    UserCosmeticPurchase,
    UserCourseProgress,
)


# ─────────────────────────────────────────────────────────────────────────────
#  Constantes / données de seed
# ─────────────────────────────────────────────────────────────────────────────

DEFAULT_PASSWORD = 'Edunova123!'

# Domaine fictif réservé (évite tout courrier réel involontaire).
EMAIL_DOMAIN_STAFF = 'edunova.local'
EMAIL_DOMAIN_USERS = 'edunova.local'


@dataclass
class _AnswerSpec:
    label: str
    correct: bool = False


@dataclass
class _QuestionSpec:
    content: str
    xp: int
    answers: list[_AnswerSpec]


@dataclass
class _QuizSpec:
    coins_on_success: int
    min_score_to_pass: int
    questions: list[_QuestionSpec]


@dataclass
class _CourseSpec:
    title: str
    map_order: int
    body_content: str
    badge_name: str
    badge_icon_url: str
    quiz: _QuizSpec


@dataclass
class _ThemeSpec:
    title: str
    formateur_key: str
    courses: list[_CourseSpec] = field(default_factory=list)


@dataclass
class _UserSpec:
    key: str
    email: str
    role_key: str
    is_staff: bool = False
    is_superuser: bool = False
    formateur_key: str | None = None
    avatar_seed: str | None = None


# ─────────────────────────────────────────────────────────────────────────────
#  Catalogue thématique (4 thèmes × 4 cours)
# ─────────────────────────────────────────────────────────────────────────────

def _q(content: str, xp: int, *answers: _AnswerSpec) -> _QuestionSpec:
    return _QuestionSpec(content=content, xp=xp, answers=list(answers))


def _ok(label: str) -> _AnswerSpec:
    return _AnswerSpec(label=label, correct=True)


def _ko(label: str) -> _AnswerSpec:
    return _AnswerSpec(label=label, correct=False)


def _badge_icon(slug: str) -> str:
    return f'https://api.dicebear.com/9.x/icons/svg?seed={slug}&size=128'


# ── Cybersécurité ────────────────────────────────────────────────────────────

CYBER_THEME = _ThemeSpec(
    title='Cybersécurité',
    formateur_key='formateur_cyber',
    courses=[
        _CourseSpec(
            title='Fondamentaux de la cybersécurité',
            map_order=1,
            badge_name='Sentinelle Numérique',
            badge_icon_url=_badge_icon('sentinelle'),
            body_content=(
                "Découvrir la triade CIA (Confidentialité, Intégrité, Disponibilité), "
                "les grandes familles d'attaques (phishing, ransomware, DDoS), et les "
                "bonnes pratiques personnelles : gestion des mots de passe, MFA, "
                "vigilance sur les pièces jointes.\n\n"
                "Ce premier module pose les bases d'hygiène nécessaires avant tout "
                "approfondissement technique."
            ),
            quiz=_QuizSpec(
                coins_on_success=80,
                min_score_to_pass=70,
                questions=[
                    _q(
                        'Que signifie le sigle CIA en sécurité de l\'information ?',
                        20,
                        _ok('Confidentiality, Integrity, Availability'),
                        _ko('Control, Isolation, Authentication'),
                        _ko('Cipher, Integrity, Authorization'),
                        _ko('Compliance, Identification, Audit'),
                    ),
                    _q(
                        'Quelle technique réduit le mieux la surface d\'attaque ?',
                        20,
                        _ok('Le principe du moindre privilège'),
                        _ko('Désactiver les journaux système'),
                        _ko('Multiplier les comptes administrateurs'),
                        _ko('Utiliser uniquement IPv6'),
                    ),
                    _q(
                        'Une attaque de type phishing repose principalement sur :',
                        20,
                        _ok("L'usurpation d'identité par e-mail ou faux site"),
                        _ko('Une injection SQL dans un formulaire'),
                        _ko('Une saturation de bande passante'),
                        _ko("L'exploitation d'une faille kernel"),
                    ),
                    _q(
                        'Le MFA (multi-factor authentication) protège surtout contre :',
                        20,
                        _ok('Le vol ou la fuite de mots de passe'),
                        _ko('Les attaques DDoS volumétriques'),
                        _ko('Les bugs applicatifs côté serveur'),
                        _ko('Les pannes matérielles'),
                    ),
                ],
            ),
        ),
        _CourseSpec(
            title='Cryptographie appliquée',
            map_order=2,
            badge_name='Cryptographe Junior',
            badge_icon_url=_badge_icon('cryptographe'),
            body_content=(
                "Comprendre la différence entre chiffrement symétrique et "
                "asymétrique, les fonctions de hachage cryptographiques, les "
                "certificats TLS et la PKI.\n\n"
                "On insiste sur les bonnes pratiques opérationnelles : choix des "
                "algorithmes (AES-GCM, ChaCha20-Poly1305, RSA-2048+ ou ECC), "
                "rotation et stockage des clefs."
            ),
            quiz=_QuizSpec(
                coins_on_success=120,
                min_score_to_pass=75,
                questions=[
                    _q(
                        'Différence clé entre chiffrement symétrique et asymétrique ?',
                        25,
                        _ok('Symétrique : une seule clef ; asymétrique : paire publique/privée'),
                        _ko('Symétrique est toujours plus lent'),
                        _ko('Asymétrique fonctionne uniquement en 128 bits'),
                        _ko('Symétrique ne chiffre que du texte'),
                    ),
                    _q(
                        'À quoi sert une fonction de hachage cryptographique ?',
                        25,
                        _ok('Produire une empreinte de taille fixe et non réversible'),
                        _ko('Chiffrer un message avec une clef secrète'),
                        _ko('Générer une paire de clefs RSA'),
                        _ko('Compresser les données avant transmission'),
                    ),
                    _q(
                        'Quel protocole sécurise les communications HTTPS ?',
                        25,
                        _ok('TLS'),
                        _ko('Telnet'),
                        _ko('FTP'),
                        _ko('ICMP'),
                    ),
                    _q(
                        'Qu\'est-ce qu\'une attaque man-in-the-middle ?',
                        25,
                        _ok("Interception et modification du trafic entre deux parties"),
                        _ko("Brute force d'un mot de passe"),
                        _ko('Saturation UDP d\'un service'),
                        _ko('Injection de scripts dans une page web'),
                    ),
                ],
            ),
        ),
        _CourseSpec(
            title='Sécurité applicative & OWASP Top 10',
            map_order=3,
            badge_name='Auditeur AppSec',
            badge_icon_url=_badge_icon('appsec'),
            body_content=(
                "Identifier et neutraliser les vulnérabilités majeures côté "
                "application : injection SQL, XSS, CSRF, mauvaise configuration, "
                "secrets exposés, désérialisation non sûre.\n\n"
                "On s'appuie sur le Top 10 OWASP comme grille de revue, et on "
                "introduit le SAST/DAST dans le pipeline CI."
            ),
            quiz=_QuizSpec(
                coins_on_success=150,
                min_score_to_pass=80,
                questions=[
                    _q(
                        'Le risque principal d\'une injection SQL est :',
                        30,
                        _ok('Accès ou destruction non autorisée de la base de données'),
                        _ko('Ralentissement des requêtes SELECT'),
                        _ko('Saturation de la mémoire applicative'),
                        _ko('Corruption des fichiers journaux'),
                    ),
                    _q(
                        'Pour prévenir les attaques XSS, il faut surtout :',
                        30,
                        _ok("Échapper et valider toutes les entrées utilisateur"),
                        _ko('Désactiver JavaScript chez les utilisateurs'),
                        _ko('Utiliser uniquement la méthode GET'),
                        _ko('Supprimer les cookies de session'),
                    ),
                    _q(
                        'Le Top 10 OWASP recense :',
                        30,
                        _ok('Les risques de sécurité applicative les plus critiques'),
                        _ko('Les meilleurs pare-feux commerciaux'),
                        _ko('Les langages les plus sécurisés'),
                        _ko('Une norme ISO de certification'),
                    ),
                    _q(
                        'Un token CSRF protège contre :',
                        30,
                        _ok('La falsification de requêtes intersites'),
                        _ko('Le vol de mot de passe'),
                        _ko('Les attaques DDoS'),
                        _ko('Les écoutes réseau'),
                    ),
                ],
            ),
        ),
        _CourseSpec(
            title='Réponse aux incidents (IR)',
            map_order=4,
            badge_name='Incident Responder',
            badge_icon_url=_badge_icon('incident'),
            body_content=(
                "Mettre en place un plan de réponse aux incidents : préparation, "
                "détection, containment, éradication, recovery, post-mortem.\n\n"
                "Le module aborde le rôle d'un SOC, les indicateurs de "
                "compromission (IOC), la communication de crise et la "
                "documentation des actions."
            ),
            quiz=_QuizSpec(
                coins_on_success=170,
                min_score_to_pass=80,
                questions=[
                    _q(
                        "Quelle est la première étape d'un plan IR ?",
                        30,
                        _ok('Préparation (politiques, outils, équipes)'),
                        _ko('Communication presse'),
                        _ko('Sauvegardes complètes'),
                        _ko('Migration cloud immédiate'),
                    ),
                    _q(
                        'Un IOC (Indicator of Compromise) est :',
                        30,
                        _ok('Une trace observable laissée par un attaquant'),
                        _ko('Un certificat TLS expiré'),
                        _ko('Une mise à jour de sécurité Windows'),
                        _ko("Un type d'algorithme de hachage"),
                    ),
                    _q(
                        'Le « containment » dans la réponse à incident vise à :',
                        30,
                        _ok("Limiter la propagation d'un incident actif"),
                        _ko('Effacer toutes les sauvegardes'),
                        _ko('Notifier la presse'),
                        _ko('Mettre à jour les dépendances NPM'),
                    ),
                    _q(
                        'Que contient un post-mortem efficace ?',
                        30,
                        _ok("Chronologie, causes, impact et plan d'action correctif"),
                        _ko('Uniquement le nom du coupable'),
                        _ko('Les logs bruts sans analyse'),
                        _ko('Aucune information sensible'),
                    ),
                ],
            ),
        ),
    ],
)


# ── Infrastructures réseaux ─────────────────────────────────────────────────

NETWORK_THEME = _ThemeSpec(
    title='Infrastructures réseaux',
    formateur_key='formateur_reseau',
    courses=[
        _CourseSpec(
            title='Modèle OSI et fondamentaux LAN',
            map_order=1,
            badge_name='Architecte LAN',
            badge_icon_url=_badge_icon('lan'),
            body_content=(
                "Revoir les sept couches du modèle OSI, distinguer domaines de "
                "collision et de broadcast, et comprendre le rôle des "
                "switches/hubs dans un LAN moderne.\n\n"
                "On illustre avec des captures Wireshark simples (ARP, ICMP)."
            ),
            quiz=_QuizSpec(
                coins_on_success=80,
                min_score_to_pass=70,
                questions=[
                    _q(
                        'Quel équipement opère principalement en couche 2 OSI ?',
                        20,
                        _ok('Switch'),
                        _ko('Routeur'),
                        _ko('Pare-feu applicatif'),
                        _ko('Serveur DNS'),
                    ),
                    _q(
                        'La topologie en étoile présente comme avantage :',
                        20,
                        _ok('Une isolation simplifiée des pannes'),
                        _ko('Aucun équipement central requis'),
                        _ko('Un câblage minimal'),
                        _ko('Une latence toujours nulle'),
                    ),
                    _q(
                        'Une trame Ethernet unicast contient :',
                        20,
                        _ok('Une adresse MAC source et une MAC destination'),
                        _ko('Uniquement une adresse IP'),
                        _ko('Une URL HTTP'),
                        _ko('Une session TCP complète'),
                    ),
                    _q(
                        'À quel niveau OSI agit ARP ?',
                        20,
                        _ok('Entre la couche 2 et 3'),
                        _ko('Couche 7 uniquement'),
                        _ko('Couche 1 (physique)'),
                        _ko('Couche 4 (transport)'),
                    ),
                ],
            ),
        ),
        _CourseSpec(
            title='VLAN et segmentation',
            map_order=2,
            badge_name='Ingénieur Segmentation',
            badge_icon_url=_badge_icon('vlan'),
            body_content=(
                "Configurer la segmentation logique avec des VLANs, comprendre "
                "le tagging 802.1Q, le routage inter-VLAN et l'usage des SVI.\n\n"
                "On insiste sur la cohérence entre topologie physique et plan "
                "d'adressage IP."
            ),
            quiz=_QuizSpec(
                coins_on_success=120,
                min_score_to_pass=75,
                questions=[
                    _q(
                        'À quoi sert un VLAN dans un réseau d\'entreprise ?',
                        25,
                        _ok('Segmenter logiquement le réseau'),
                        _ko('Augmenter la fréquence CPU'),
                        _ko('Remplacer le pare-feu'),
                        _ko('Chiffrer le trafic TLS'),
                    ),
                    _q(
                        'Pour faire communiquer deux VLANs, il faut :',
                        25,
                        _ok('Du routage inter-VLAN'),
                        _ko('Un hub passif'),
                        _ko('Un répartiteur coaxial'),
                        _ko('Un proxy ARP secondaire'),
                    ),
                    _q(
                        'Un trunk 802.1Q transporte :',
                        25,
                        _ok('Plusieurs VLANs entre deux équipements'),
                        _ko('Uniquement de la voix'),
                        _ko('Du trafic chiffré IPSec'),
                        _ko('Le protocole BGP'),
                    ),
                    _q(
                        'Un SVI (Switched Virtual Interface) sert à :',
                        25,
                        _ok('Donner une IP de routage à un VLAN sur un L3 switch'),
                        _ko('Authentifier les utilisateurs WiFi'),
                        _ko('Faire de l\'agrégation de liens LACP'),
                        _ko('Configurer le DHCP relay uniquement'),
                    ),
                ],
            ),
        ),
        _CourseSpec(
            title='Routage dynamique : OSPF & BGP',
            map_order=3,
            badge_name='Maître du Routage',
            badge_icon_url=_badge_icon('routage'),
            body_content=(
                "Découvrir le routage dynamique interne (OSPF) et externe (BGP). "
                "Voir le calcul de meilleur chemin, les zones OSPF, et la "
                "logique des AS / iBGP / eBGP.\n\n"
                "Notions opérationnelles : convergence, route-map, "
                "filtres de préfixes, prévention des boucles."
            ),
            quiz=_QuizSpec(
                coins_on_success=140,
                min_score_to_pass=80,
                questions=[
                    _q(
                        'OSPF est un protocole de :',
                        30,
                        _ok('Routage dynamique interne (IGP)'),
                        _ko('Authentification utilisateur'),
                        _ko('Synchronisation horaire'),
                        _ko('Gestion DNS'),
                    ),
                    _q(
                        'BGP est utilisé principalement pour :',
                        30,
                        _ok('Échanger des préfixes entre systèmes autonomes'),
                        _ko('Distribuer des baux DHCP'),
                        _ko('Convertir IPv4 en IPv6'),
                        _ko('Encapsuler du SSH'),
                    ),
                    _q(
                        'Une zone OSPF de type stub :',
                        30,
                        _ok('Reçoit une route par défaut au lieu des routes externes'),
                        _ko('Est limitée à un seul routeur'),
                        _ko('Supprime tous les LSA Type 1'),
                        _ko('Est obligatoire en zone 0'),
                    ),
                    _q(
                        'Le « split-horizon » sert à :',
                        30,
                        _ok('Éviter de réannoncer une route par l\'interface qui l\'a apprise'),
                        _ko('Doubler la bande passante'),
                        _ko('Compresser les en-têtes IPv4'),
                        _ko('Forcer la table ARP'),
                    ),
                ],
            ),
        ),
        _CourseSpec(
            title='Supervision réseau & SOC',
            map_order=4,
            badge_name='Analyste NOC/SOC',
            badge_icon_url=_badge_icon('soc'),
            body_content=(
                "Mettre en place une supervision proactive : SNMP, NetFlow, "
                "ping/latence, perte de paquets. Centraliser les logs sur un "
                "SIEM, corréler les événements et créer des alertes "
                "actionnables.\n\n"
                "Bonus : différence entre NOC (perf/dispo) et SOC (sécurité)."
            ),
            quiz=_QuizSpec(
                coins_on_success=140,
                min_score_to_pass=80,
                questions=[
                    _q(
                        'Quel composant applique des règles de filtrage entre zones ?',
                        30,
                        _ok('Pare-feu'),
                        _ko('Onduleur'),
                        _ko('Point d\'accès Wi-Fi'),
                        _ko('Switch non manageable'),
                    ),
                    _q(
                        'Un SIEM sert principalement à :',
                        30,
                        _ok('Centraliser, corréler et analyser les logs sécurité'),
                        _ko('Faire du load balancing L4'),
                        _ko('Distribuer des images PXE'),
                        _ko('Compresser le trafic TLS'),
                    ),
                    _q(
                        'Pourquoi surveiller la latence en continu ?',
                        30,
                        _ok('Détecter rapidement une dégradation de service'),
                        _ko("Augmenter automatiquement la bande passante"),
                        _ko('Supprimer le besoin de sauvegardes'),
                        _ko('Remplacer les tests de charge'),
                    ),
                    _q(
                        'NetFlow est utile pour :',
                        30,
                        _ok('Visualiser les flux et top talkers du réseau'),
                        _ko('Faire de l\'authentification 802.1X'),
                        _ko('Configurer un VPN IPSec'),
                        _ko('Encrypter une session SSH'),
                    ),
                ],
            ),
        ),
    ],
)


# ── Développement web ───────────────────────────────────────────────────────

WEB_THEME = _ThemeSpec(
    title='Développement web',
    formateur_key='formateur_web',
    courses=[
        _CourseSpec(
            title='HTML5 & CSS modernes',
            map_order=1,
            badge_name='Intégrateur HTML/CSS',
            badge_icon_url=_badge_icon('html'),
            body_content=(
                "Maîtriser la sémantique HTML5 (header, nav, section, article), "
                "le modèle de boîte CSS, Flexbox et Grid, et l'accessibilité "
                "(rôles ARIA, focus visible).\n\n"
                "Le module insiste sur la structure logique des documents et "
                "la séparation contenu / présentation."
            ),
            quiz=_QuizSpec(
                coins_on_success=70,
                min_score_to_pass=60,
                questions=[
                    _q(
                        'La balise <article> sert à :',
                        20,
                        _ok('Délimiter un contenu autonome et réutilisable'),
                        _ko('Imposer un fond bleu'),
                        _ko('Centrer du texte'),
                        _ko('Forcer le mode flex'),
                    ),
                    _q(
                        'Quelle propriété CSS active le Flexbox ?',
                        20,
                        _ok('display: flex'),
                        _ko('position: relative'),
                        _ko('flow-direction: row'),
                        _ko('grid-flow: auto'),
                    ),
                    _q(
                        'Que fait `aria-hidden="true"` ?',
                        20,
                        _ok("Cache l'élément aux lecteurs d'écran"),
                        _ko("Le supprime du DOM"),
                        _ko("Désactive ses styles CSS"),
                        _ko('Empêche les clics souris'),
                    ),
                    _q(
                        'CSS Grid permet de :',
                        20,
                        _ok('Créer des mises en page 2D (lignes + colonnes)'),
                        _ko('Compiler du JavaScript'),
                        _ko('Faire du SSR'),
                        _ko('Authentifier des requêtes'),
                    ),
                ],
            ),
        ),
        _CourseSpec(
            title='JavaScript moderne (ES2020+)',
            map_order=2,
            badge_name='Ninja JavaScript',
            badge_icon_url=_badge_icon('js'),
            body_content=(
                "Aborder les fondamentaux JS : portée, hoisting, closures, "
                "promesses et async/await, destructuring, modules ESM.\n\n"
                "Bonnes pratiques : éviter `var`, préférer `const`/`let`, "
                "gérer correctement les erreurs asynchrones."
            ),
            quiz=_QuizSpec(
                coins_on_success=110,
                min_score_to_pass=70,
                questions=[
                    _q(
                        '`const` en JavaScript signifie :',
                        25,
                        _ok('Variable dont la liaison ne peut pas être réassignée'),
                        _ko('Constante mathématique uniquement'),
                        _ko('Type uniquement utilisable en module'),
                        _ko('Synonyme strict de `let`'),
                    ),
                    _q(
                        'Que retourne `typeof null` ?',
                        25,
                        _ok('"object"'),
                        _ko('"null"'),
                        _ko('"undefined"'),
                        _ko('"function"'),
                    ),
                    _q(
                        '`async function f()` retourne toujours :',
                        25,
                        _ok('Une Promise'),
                        _ko('Une string'),
                        _ko('Un Symbol'),
                        _ko('Rien'),
                    ),
                    _q(
                        'Le destructuring permet de :',
                        25,
                        _ok("Extraire des propriétés d'un objet ou éléments d'un tableau"),
                        _ko("Compiler du TypeScript"),
                        _ko('Verrouiller un objet'),
                        _ko('Créer un Symbol unique'),
                    ),
                ],
            ),
        ),
        _CourseSpec(
            title='APIs REST & bonnes pratiques',
            map_order=3,
            badge_name='API Designer',
            badge_icon_url=_badge_icon('rest'),
            body_content=(
                "Concevoir des APIs REST cohérentes : ressources, verbes HTTP, "
                "codes de statut, idempotence, pagination, versioning.\n\n"
                "Sécurité de base : authentification, rate limiting, validation "
                "des entrées et bonnes pratiques de log."
            ),
            quiz=_QuizSpec(
                coins_on_success=130,
                min_score_to_pass=75,
                questions=[
                    _q(
                        'Quel verbe HTTP est idempotent ?',
                        30,
                        _ok('PUT'),
                        _ko('POST'),
                        _ko('PATCH'),
                        _ko('CONNECT'),
                    ),
                    _q(
                        'Quel code retourner pour une création réussie ?',
                        30,
                        _ok('201 Created'),
                        _ko('200 OK obligatoirement'),
                        _ko('204 No Content'),
                        _ko('301 Moved Permanently'),
                    ),
                    _q(
                        'Pour limiter les abus côté API, on utilise :',
                        30,
                        _ok('Du rate limiting / throttling'),
                        _ko('Une compression gzip'),
                        _ko('Une rotation DNS'),
                        _ko('Du CSS scoping'),
                    ),
                    _q(
                        'Le versioning d\'API se fait classiquement via :',
                        30,
                        _ok('Un préfixe d\'URL ou un en-tête dédié'),
                        _ko('Une variable d\'environnement client'),
                        _ko('Un cookie de session'),
                        _ko('Un fichier robots.txt'),
                    ),
                ],
            ),
        ),
        _CourseSpec(
            title='Frameworks SPA : React & Vue',
            map_order=4,
            badge_name='SPA Builder',
            badge_icon_url=_badge_icon('spa'),
            body_content=(
                "Comprendre les concepts partagés des frameworks SPA modernes : "
                "composants, état local vs global, cycle de vie, hooks, "
                "rendu conditionnel.\n\n"
                "Comparaison rapide React / Vue / Svelte sur la performance, "
                "l'écosystème et la courbe d'apprentissage."
            ),
            quiz=_QuizSpec(
                coins_on_success=140,
                min_score_to_pass=75,
                questions=[
                    _q(
                        'Le hook `useState` en React permet de :',
                        30,
                        _ok('Gérer un état local dans un composant fonctionnel'),
                        _ko('Faire des appels HTTP'),
                        _ko('Configurer le routing'),
                        _ko('Compiler du JSX'),
                    ),
                    _q(
                        'Vue 3 utilise comme moteur de réactivité :',
                        30,
                        _ok('Des Proxies ES6'),
                        _ko('Des Promises uniquement'),
                        _ko('Des Web Workers'),
                        _ko('Des décorateurs Java'),
                    ),
                    _q(
                        'Un composant pur idéal :',
                        30,
                        _ok('Rend la même UI pour les mêmes props'),
                        _ko('Modifie le DOM directement'),
                        _ko('Mute toujours ses props'),
                        _ko('Doit appeler fetch à chaque render'),
                    ),
                    _q(
                        'Le SSR (Server-Side Rendering) améliore surtout :',
                        30,
                        _ok('Le SEO et le temps avant premier rendu'),
                        _ko('La taille du bundle JS'),
                        _ko('La sécurité des cookies'),
                        _ko('La consommation GPU'),
                    ),
                ],
            ),
        ),
    ],
)


# ── DevOps & cloud ──────────────────────────────────────────────────────────

DEVOPS_THEME = _ThemeSpec(
    title='DevOps & cloud',
    formateur_key='formateur_devops',
    courses=[
        _CourseSpec(
            title='Conteneurs & Docker',
            map_order=1,
            badge_name='Docker Captain',
            badge_icon_url=_badge_icon('docker'),
            body_content=(
                "Comprendre la différence entre image et conteneur, écrire un "
                "Dockerfile minimal, gérer le multi-stage build, comprendre "
                "les volumes et les réseaux Docker.\n\n"
                "On termine sur Docker Compose pour orchestrer un environnement "
                "de dev (web + base de données)."
            ),
            quiz=_QuizSpec(
                coins_on_success=90,
                min_score_to_pass=70,
                questions=[
                    _q(
                        'Une image Docker est :',
                        25,
                        _ok('Un template immuable utilisé pour créer des conteneurs'),
                        _ko('Un fichier de log Linux'),
                        _ko("Un type d'utilisateur Unix"),
                        _ko('Un volume persistant'),
                    ),
                    _q(
                        'Le multi-stage build sert à :',
                        25,
                        _ok('Réduire la taille finale de l\'image'),
                        _ko('Augmenter le nombre de couches inutiles'),
                        _ko('Désactiver le cache'),
                        _ko('Forcer un OS host particulier'),
                    ),
                    _q(
                        'Un volume Docker permet :',
                        25,
                        _ok('De persister des données entre redémarrages'),
                        _ko('De compiler du C++'),
                        _ko('De gérer les certificats TLS'),
                        _ko('De créer un système de templates HTML'),
                    ),
                    _q(
                        'Docker Compose est utilisé pour :',
                        25,
                        _ok('Décrire et orchestrer plusieurs services en YAML'),
                        _ko('Convertir une VM en conteneur'),
                        _ko('Encrypter le trafic réseau'),
                        _ko('Faire du linting Python'),
                    ),
                ],
            ),
        ),
        _CourseSpec(
            title='CI/CD & automatisation',
            map_order=2,
            badge_name='Pipeline Master',
            badge_icon_url=_badge_icon('cicd'),
            body_content=(
                "Concevoir un pipeline CI/CD : lint, tests unitaires, build, "
                "scan de sécurité, déploiement progressif.\n\n"
                "Critères de qualité : feedback rapide, idempotence des "
                "déploiements, gestion des secrets, traçabilité."
            ),
            quiz=_QuizSpec(
                coins_on_success=110,
                min_score_to_pass=70,
                questions=[
                    _q(
                        'L\'objectif principal du CI est :',
                        25,
                        _ok('Vérifier rapidement chaque modification de code'),
                        _ko('Désactiver les tests pour aller plus vite'),
                        _ko('Faire de la pré-prod permanente'),
                        _ko('Compiler le kernel Linux'),
                    ),
                    _q(
                        'Le déploiement « blue/green » consiste à :',
                        25,
                        _ok('Maintenir deux environnements et basculer le trafic'),
                        _ko('Utiliser uniquement des conteneurs verts'),
                        _ko('Forcer une rotation DNS toutes les heures'),
                        _ko('Désactiver les bases de données pendant la mise à jour'),
                    ),
                    _q(
                        'Un secret CI/CD doit être :',
                        25,
                        _ok('Stocké chiffré et injecté à l\'exécution uniquement'),
                        _ko('Hard-codé dans le repo'),
                        _ko('Imprimé dans les logs'),
                        _ko('Partagé par e-mail'),
                    ),
                    _q(
                        'Le « canary deployment » permet :',
                        25,
                        _ok('De tester une release sur un sous-ensemble d\'utilisateurs'),
                        _ko('De rollback automatiquement le DNS'),
                        _ko('De désactiver le pare-feu'),
                        _ko('De forcer la mise à jour des navigateurs'),
                    ),
                ],
            ),
        ),
        _CourseSpec(
            title='Infrastructure as Code',
            map_order=3,
            badge_name='Terraform Wizard',
            badge_icon_url=_badge_icon('iac'),
            body_content=(
                "Décrire son infrastructure de manière déclarative avec "
                "Terraform/Pulumi/CloudFormation. Comprendre l'idempotence, "
                "le state file, les modules réutilisables.\n\n"
                "Pratiques essentielles : versionnage, revue de plan, "
                "stockage distant et verrou du state."
            ),
            quiz=_QuizSpec(
                coins_on_success=130,
                min_score_to_pass=75,
                questions=[
                    _q(
                        'Terraform est principalement :',
                        30,
                        _ok('Un outil d\'Infrastructure as Code déclaratif'),
                        _ko('Un orchestrateur de conteneurs'),
                        _ko('Un client SSH'),
                        _ko('Un IDE Python'),
                    ),
                    _q(
                        'Le state file Terraform contient :',
                        30,
                        _ok('La représentation de l\'infra gérée'),
                        _ko('Les logs applicatifs des serveurs'),
                        _ko('Les binaires des images Docker'),
                        _ko('Les certificats TLS uniquement'),
                    ),
                    _q(
                        'Pour collaborer en équipe sur Terraform :',
                        30,
                        _ok('Stocker le state distant et activer le verrou'),
                        _ko('Envoyer le state par e-mail'),
                        _ko('Le commiter chiffré dans Git public'),
                        _ko('Désactiver les modules tiers'),
                    ),
                    _q(
                        'Un avantage de l\'IaC est :',
                        30,
                        _ok('Reproduire des environnements de manière fiable'),
                        _ko('Supprimer les besoins de monitoring'),
                        _ko('Économiser sur les sauvegardes'),
                        _ko('Éviter les revues de code'),
                    ),
                ],
            ),
        ),
        _CourseSpec(
            title='Observabilité & SRE',
            map_order=4,
            badge_name='Site Reliability',
            badge_icon_url=_badge_icon('sre'),
            body_content=(
                "Mettre en place les trois piliers : metrics, logs, traces. "
                "Définir des SLI/SLO/SLA, calculer un error budget et "
                "construire un dashboard utilisable.\n\n"
                "On termine sur les principes SRE : éliminer le toil, "
                "post-mortem sans blâme, automatiser le runbook."
            ),
            quiz=_QuizSpec(
                coins_on_success=160,
                min_score_to_pass=80,
                questions=[
                    _q(
                        'Les trois piliers de l\'observabilité sont :',
                        35,
                        _ok('Metrics, logs et traces'),
                        _ko('CPU, RAM, disque'),
                        _ko('SSH, HTTP, FTP'),
                        _ko('OSI, TCP, UDP'),
                    ),
                    _q(
                        'Un SLO est :',
                        35,
                        _ok('Un objectif interne mesurable de qualité de service'),
                        _ko('Un script bash de déploiement'),
                        _ko('Un type de cache mémoire'),
                        _ko('Une norme ISO d\'accessibilité'),
                    ),
                    _q(
                        'L\'error budget représente :',
                        35,
                        _ok('La marge d\'indisponibilité tolérée par le SLO'),
                        _ko('Le coût d\'achat d\'un load balancer'),
                        _ko('Le nombre de tickets ouverts'),
                        _ko('Le délai DNS TTL'),
                    ),
                    _q(
                        'Un post-mortem SRE doit être :',
                        35,
                        _ok('Sans blâme et orienté apprentissage'),
                        _ko('Confidentiel et oral'),
                        _ko('Rédigé uniquement par le manager'),
                        _ko("Évité s'il y a réussite finale"),
                    ),
                ],
            ),
        ),
    ],
)


THEMES_CATALOG: list[_ThemeSpec] = [CYBER_THEME, NETWORK_THEME, WEB_THEME, DEVOPS_THEME]


# ─────────────────────────────────────────────────────────────────────────────
#  Catalogue utilisateurs (1 admin, 4 formateurs, 24 élèves)
# ─────────────────────────────────────────────────────────────────────────────

ADMIN_SPEC = _UserSpec(
    key='admin',
    email=f'admin@{EMAIL_DOMAIN_STAFF}',
    role_key='admin',
    is_staff=True,
    is_superuser=True,
    avatar_seed='Wyatt',
)

FORMATEUR_SPECS: list[_UserSpec] = [
    _UserSpec(key='formateur_cyber',  email=f'marie.dubois@{EMAIL_DOMAIN_STAFF}', role_key='formateur', avatar_seed='Kimberly'),
    _UserSpec(key='formateur_reseau', email=f'paul.martin@{EMAIL_DOMAIN_STAFF}',  role_key='formateur', avatar_seed='Alexander'),
    _UserSpec(key='formateur_web',    email=f'sofia.garcia@{EMAIL_DOMAIN_STAFF}', role_key='formateur', avatar_seed='Eden'),
    _UserSpec(key='formateur_devops', email=f'thomas.leroy@{EMAIL_DOMAIN_STAFF}', role_key='formateur', avatar_seed='Chase'),
]

# 6 apprenants par formateur, niveaux : 2 avancés, 2 intermédiaires, 2 débutants.
# Cybersécurité ─ formateur_cyber
LEARNERS_CYBER = [
    _UserSpec(key='eleve_cyber_1', email=f'lucas.bernard@{EMAIL_DOMAIN_USERS}',   role_key='utilisateur', formateur_key='formateur_cyber', avatar_seed='Mackenzie'),
    _UserSpec(key='eleve_cyber_2', email=f'emma.petit@{EMAIL_DOMAIN_USERS}',      role_key='utilisateur', formateur_key='formateur_cyber', avatar_seed='Eden'),
    _UserSpec(key='eleve_cyber_3', email=f'hugo.durand@{EMAIL_DOMAIN_USERS}',     role_key='utilisateur', formateur_key='formateur_cyber', avatar_seed='Chase'),
    _UserSpec(key='eleve_cyber_4', email=f'lea.moreau@{EMAIL_DOMAIN_USERS}',      role_key='utilisateur', formateur_key='formateur_cyber', avatar_seed='Kimberly'),
    _UserSpec(key='eleve_cyber_5', email=f'gabriel.simon@{EMAIL_DOMAIN_USERS}',   role_key='utilisateur', formateur_key='formateur_cyber', avatar_seed='Jameson'),
    _UserSpec(key='eleve_cyber_6', email=f'chloe.michel@{EMAIL_DOMAIN_USERS}',    role_key='utilisateur', formateur_key='formateur_cyber', avatar_seed='George'),
]

LEARNERS_RESEAU = [
    _UserSpec(key='eleve_reseau_1', email=f'nathan.laurent@{EMAIL_DOMAIN_USERS}', role_key='utilisateur', formateur_key='formateur_reseau', avatar_seed='Alexander'),
    _UserSpec(key='eleve_reseau_2', email=f'manon.thomas@{EMAIL_DOMAIN_USERS}',   role_key='utilisateur', formateur_key='formateur_reseau', avatar_seed='Mackenzie'),
    _UserSpec(key='eleve_reseau_3', email=f'ethan.lefevre@{EMAIL_DOMAIN_USERS}',  role_key='utilisateur', formateur_key='formateur_reseau', avatar_seed='Wyatt'),
    _UserSpec(key='eleve_reseau_4', email=f'jade.roux@{EMAIL_DOMAIN_USERS}',      role_key='utilisateur', formateur_key='formateur_reseau', avatar_seed='Eden'),
    _UserSpec(key='eleve_reseau_5', email=f'raphael.david@{EMAIL_DOMAIN_USERS}',  role_key='utilisateur', formateur_key='formateur_reseau', avatar_seed='Jameson'),
    _UserSpec(key='eleve_reseau_6', email=f'alice.fontaine@{EMAIL_DOMAIN_USERS}', role_key='utilisateur', formateur_key='formateur_reseau', avatar_seed='Chase'),
]

LEARNERS_WEB = [
    _UserSpec(key='eleve_web_1', email=f'adam.bertrand@{EMAIL_DOMAIN_USERS}',    role_key='utilisateur', formateur_key='formateur_web', avatar_seed='George'),
    _UserSpec(key='eleve_web_2', email=f'louise.morel@{EMAIL_DOMAIN_USERS}',     role_key='utilisateur', formateur_key='formateur_web', avatar_seed='Mackenzie'),
    _UserSpec(key='eleve_web_3', email=f'theo.girard@{EMAIL_DOMAIN_USERS}',      role_key='utilisateur', formateur_key='formateur_web', avatar_seed='Wyatt'),
    _UserSpec(key='eleve_web_4', email=f'camille.boyer@{EMAIL_DOMAIN_USERS}',    role_key='utilisateur', formateur_key='formateur_web', avatar_seed='Kimberly'),
    _UserSpec(key='eleve_web_5', email=f'jules.fournier@{EMAIL_DOMAIN_USERS}',   role_key='utilisateur', formateur_key='formateur_web', avatar_seed='Alexander'),
    _UserSpec(key='eleve_web_6', email=f'lucie.lambert@{EMAIL_DOMAIN_USERS}',    role_key='utilisateur', formateur_key='formateur_web', avatar_seed='Eden'),
]

LEARNERS_DEVOPS = [
    _UserSpec(key='eleve_devops_1', email=f'leo.faure@{EMAIL_DOMAIN_USERS}',          role_key='utilisateur', formateur_key='formateur_devops', avatar_seed='Jameson'),
    _UserSpec(key='eleve_devops_2', email=f'lea.charpentier@{EMAIL_DOMAIN_USERS}',    role_key='utilisateur', formateur_key='formateur_devops', avatar_seed='Chase'),
    _UserSpec(key='eleve_devops_3', email=f'antoine.gauthier@{EMAIL_DOMAIN_USERS}',   role_key='utilisateur', formateur_key='formateur_devops', avatar_seed='George'),
    _UserSpec(key='eleve_devops_4', email=f'mia.muller@{EMAIL_DOMAIN_USERS}',         role_key='utilisateur', formateur_key='formateur_devops', avatar_seed='Eden'),
    _UserSpec(key='eleve_devops_5', email=f'noah.colin@{EMAIL_DOMAIN_USERS}',         role_key='utilisateur', formateur_key='formateur_devops', avatar_seed='Mackenzie'),
    _UserSpec(key='eleve_devops_6', email=f'ines.barbier@{EMAIL_DOMAIN_USERS}',       role_key='utilisateur', formateur_key='formateur_devops', avatar_seed='Wyatt'),
]

LEARNER_SPECS: list[_UserSpec] = LEARNERS_CYBER + LEARNERS_RESEAU + LEARNERS_WEB + LEARNERS_DEVOPS

ALL_USER_SPECS: list[_UserSpec] = [ADMIN_SPEC, *FORMATEUR_SPECS, *LEARNER_SPECS]


# ─────────────────────────────────────────────────────────────────────────────
#  Profils de progression : quel élève finit combien de cours
# ─────────────────────────────────────────────────────────────────────────────

# Pour chaque cohorte (6 élèves), définit combien des 4 cours du parcours sont
# terminés et le score moyen au quiz validant. Ordre : élève 1 → élève 6.
COMPLETION_PROFILE_PER_COHORT: list[tuple[int, int]] = [
    (4, 95),   # élève 1 — finit tout, excellent
    (4, 88),   # élève 2 — finit tout, très bien
    (3, 82),   # élève 3 — un cours restant, bonne performance
    (2, 78),   # élève 4 — milieu de parcours
    (1, 72),   # élève 5 — débute le parcours
    (0, 0),    # élève 6 — pas encore commencé (juste inscrit)
]

# XP / wallet / streak dérivés du nombre de cours validés (par élève).
# Index = cours validés. Donne (xp, wallet, streak).
LEARNER_BASE_PROGRESSION: list[tuple[int, int, int]] = [
    (50,    0,  1),    # 0 cours  ← apprenti
    (350,   80, 4),    # 1 cours  ← débutant
    (1100, 220, 9),    # 2 cours  ← confirmé
    (2700, 480, 17),   # 3 cours  ← expert
    (5400, 980, 28),   # 4 cours  ← maître
]

FORMATEUR_PROFILE = {'xp': 4200, 'wallet': 850, 'streak': 22}
ADMIN_PROFILE = {'xp': 5800, 'wallet': 1500, 'streak': 35}


# ─────────────────────────────────────────────────────────────────────────────
#  Commande Django
# ─────────────────────────────────────────────────────────────────────────────

class Command(BaseCommand):
    help = (
        'Génère un jeu de données de démo cohérent (1 admin, 4 formateurs, '
        '24 apprenants, 4 thèmes, 16 cours, 16 quiz, badges, progressions). '
        'Idempotent. Les utilisateurs reçoivent tous le même mot de passe '
        '(par défaut : Edunova123!).'
    )

    # Cache local (rempli au cours du run).
    _roles: dict[str, Role]
    _ranks: list[Rank]
    _users: dict[str, User]
    _themes: dict[str, Theme]
    _courses_by_key: dict[str, Course]
    _quizzes_by_key: dict[str, Quiz]
    _badges_by_key: dict[str, Badge]

    def add_arguments(self, parser):
        parser.add_argument(
            '--password',
            default=DEFAULT_PASSWORD,
            help='Mot de passe appliqué à tous les comptes seedés (défaut : Edunova123!).',
        )
        parser.add_argument(
            '--reset',
            action='store_true',
            help=(
                'Supprime les utilisateurs/cours/quiz/badges seedés avant '
                'régénération. Conserve les rôles et les rangs (peu coûteux).'
            ),
        )

    @transaction.atomic
    def handle(self, *args, **options):
        password: str = options['password']
        do_reset: bool = options['reset']

        if do_reset:
            self._reset()

        self._roles = self._seed_roles()
        self._ranks = self._seed_ranks()
        self._users = self._seed_users(password=password)
        self._seed_profiles()
        self._equip_avatars()

        self._themes = self._seed_themes()
        self._badges_by_key, self._quizzes_by_key, self._courses_by_key = (
            self._seed_pedagogy()
        )

        self._seed_enrollments_progress_badges()
        self._seed_activity_logs()

        self._summary(password=password)

    # ── Reset ──────────────────────────────────────────────────────────────

    def _reset(self) -> None:
        self.stdout.write('• Reset des données seed_demo…')
        seeded_emails = [spec.email for spec in ALL_USER_SPECS]
        # Cascade sur enrollments / progress / purchases / badges / logs liés.
        User.objects.filter(email__in=seeded_emails).delete()

        course_titles: list[str] = []
        badge_names: list[str] = []
        for theme in THEMES_CATALOG:
            for course in theme.courses:
                course_titles.append(course.title)
                badge_names.append(course.badge_name)

        # Les quizzes pointés par les cours seedés deviennent orphelins après
        # suppression des cours (FK validating_quiz en PROTECT). On les
        # collecte avant pour les nettoyer.
        orphan_quiz_ids = list(
            Course.objects.filter(course_title__in=course_titles)
            .values_list('validating_quiz_id', flat=True)
        )

        Course.objects.filter(course_title__in=course_titles).delete()
        Quiz.objects.filter(quiz_id__in=orphan_quiz_ids).delete()
        Badge.objects.filter(badge_name__in=badge_names).delete()
        Theme.objects.filter(theme_title__in=[t.title for t in THEMES_CATALOG]).delete()

    # ── Référentiels (rôles, rangs) ────────────────────────────────────────

    def _seed_roles(self) -> dict[str, Role]:
        specs = {
            'admin': {
                'role_name': 'admin',
                'role_rights': {
                    'manage_users': True,
                    'manage_courses': True,
                    'manage_quizzes': True,
                },
            },
            'formateur': {
                'role_name': 'formateur',
                'role_rights': {
                    'manage_courses': True,
                    'manage_quizzes': True,
                    'manage_users': False,
                },
            },
            'utilisateur': {
                'role_name': 'utilisateur',
                'role_rights': {
                    'play_quizzes': True,
                    'view_courses': True,
                },
            },
        }
        roles: dict[str, Role] = {}
        for key, data in specs.items():
            role, _ = Role.objects.update_or_create(
                role_name=data['role_name'],
                defaults={'role_rights': data['role_rights']},
            )
            roles[key] = role
        return roles

    def _seed_ranks(self) -> list[Rank]:
        # Ordre croissant d'XP, étoiles 1→3 (validateur du modèle).
        rank_specs = [
            ('Apprenti',        0,    1),
            ('Débutant',        300,  1),
            ('Confirmé',        1000, 2),
            ('Expert',          2500, 2),
            ('Maître Edunova',  5000, 3),
        ]
        ranks: list[Rank] = []
        for label, xp, stars in rank_specs:
            rank, _ = Rank.objects.update_or_create(
                label=label,
                defaults={'xp_threshold': xp, 'stars': stars},
            )
            ranks.append(rank)
        return ranks

    def _rank_for_xp(self, xp: int) -> Rank | None:
        best: Rank | None = None
        for rank in self._ranks:
            if xp >= rank.xp_threshold:
                best = rank
        return best

    # ── Utilisateurs / profils ─────────────────────────────────────────────

    def _seed_users(self, *, password: str) -> dict[str, User]:
        users: dict[str, User] = {}

        # 1ère passe : créer / mettre à jour les comptes sans formateur (admin + formateurs).
        for spec in ALL_USER_SPECS:
            if spec.formateur_key is not None:
                continue
            user = self._upsert_user(spec, password=password, formateur=None)
            users[spec.key] = user

        # 2ème passe : élèves (référencent un formateur déjà créé).
        for spec in ALL_USER_SPECS:
            if spec.formateur_key is None:
                continue
            formateur = users.get(spec.formateur_key)
            user = self._upsert_user(spec, password=password, formateur=formateur)
            users[spec.key] = user

        return users

    def _upsert_user(
        self, spec: _UserSpec, *, password: str, formateur: User | None
    ) -> User:
        role = self._roles[spec.role_key]
        user, _ = User.objects.update_or_create(
            email=spec.email,
            defaults={
                'role': role,
                'is_staff': spec.is_staff,
                'is_superuser': spec.is_superuser,
                'is_active': True,
                'formateur': formateur,
            },
        )
        user.set_password(password)
        user.save(update_fields=['password', 'username'])
        return user

    def _seed_profiles(self) -> None:
        # Admin
        admin = self._users[ADMIN_SPEC.key]
        Profile.objects.update_or_create(
            user=admin,
            defaults={
                'total_xp': ADMIN_PROFILE['xp'],
                'wallet_balance': ADMIN_PROFILE['wallet'],
                'current_streak': ADMIN_PROFILE['streak'],
                'rank': self._rank_for_xp(ADMIN_PROFILE['xp']),
            },
        )

        # Formateurs
        for spec in FORMATEUR_SPECS:
            user = self._users[spec.key]
            Profile.objects.update_or_create(
                user=user,
                defaults={
                    'total_xp': FORMATEUR_PROFILE['xp'],
                    'wallet_balance': FORMATEUR_PROFILE['wallet'],
                    'current_streak': FORMATEUR_PROFILE['streak'],
                    'rank': self._rank_for_xp(FORMATEUR_PROFILE['xp']),
                },
            )

        # Apprenants — calcul à partir du profil de complétion par cohorte.
        for cohort in [LEARNERS_CYBER, LEARNERS_RESEAU, LEARNERS_WEB, LEARNERS_DEVOPS]:
            for index, spec in enumerate(cohort):
                completed_count, _avg_score = COMPLETION_PROFILE_PER_COHORT[index]
                xp, wallet, streak = LEARNER_BASE_PROGRESSION[completed_count]
                Profile.objects.update_or_create(
                    user=self._users[spec.key],
                    defaults={
                        'total_xp': xp,
                        'wallet_balance': wallet,
                        'current_streak': streak,
                        'rank': self._rank_for_xp(xp),
                    },
                )

    def _equip_avatars(self) -> None:
        avatar_assets = {
            cosm.cosmetic_name: cosm
            for cosm in Cosmetic.objects.filter(cosmetic_category='avatar_face')
        }
        if not avatar_assets:
            self.stdout.write(self.style.WARNING(
                '  ⚠ Aucun avatar trouvé : exécutez d\'abord `seed_cosmetics`.'
            ))
            return

        equipped = 0
        for spec in ALL_USER_SPECS:
            if spec.avatar_seed is None:
                continue
            cosmetic = avatar_assets.get(spec.avatar_seed)
            if cosmetic is None:
                continue
            user = self._users[spec.key]
            UserCosmeticPurchase.objects.get_or_create(user=user, cosmetic=cosmetic)
            profile = user.profile
            profile.current_avatar_url = cosmetic.cosmetic_asset_url
            profile.save(update_fields=['current_avatar_url'])
            equipped += 1
        self.stdout.write(f'  • {equipped} avatar(s) équipé(s).')

    # ── Pédagogie : thèmes / cours / quiz / questions / réponses / badges ──

    def _seed_themes(self) -> dict[str, Theme]:
        themes: dict[str, Theme] = {}
        for theme_spec in THEMES_CATALOG:
            theme, _ = Theme.objects.update_or_create(
                theme_title=theme_spec.title,
                defaults={},
            )
            themes[theme_spec.title] = theme
        return themes

    def _seed_pedagogy(
        self,
    ) -> tuple[dict[str, Badge], dict[str, Quiz], dict[str, Course]]:
        badges: dict[str, Badge] = {}
        quizzes: dict[str, Quiz] = {}
        courses: dict[str, Course] = {}

        for theme_spec in THEMES_CATALOG:
            theme = self._themes[theme_spec.title]
            formateur = self._users[theme_spec.formateur_key]

            for course_spec in theme_spec.courses:
                badge, _ = Badge.objects.update_or_create(
                    badge_name=course_spec.badge_name,
                    defaults={'icon_url': course_spec.badge_icon_url},
                )
                badges[course_spec.badge_name] = badge

                # Lookup du cours existant (titre unique dans nos seeds).
                course = Course.objects.filter(course_title=course_spec.title).first()
                if course is None:
                    quiz = Quiz.objects.create(
                        coins_on_success=course_spec.quiz.coins_on_success,
                        min_score_to_pass=course_spec.quiz.min_score_to_pass,
                        created_by=formateur,
                    )
                    course = Course.objects.create(
                        theme=theme,
                        validating_quiz=quiz,
                        delivered_badge=badge,
                        course_title=course_spec.title,
                        body_content=course_spec.body_content,
                        map_order=course_spec.map_order,
                        created_by=formateur,
                    )
                else:
                    quiz = course.validating_quiz
                    Quiz.objects.filter(pk=quiz.pk).update(
                        coins_on_success=course_spec.quiz.coins_on_success,
                        min_score_to_pass=course_spec.quiz.min_score_to_pass,
                        created_by=formateur,
                    )
                    quiz.refresh_from_db()
                    Course.objects.filter(pk=course.pk).update(
                        theme=theme,
                        delivered_badge=badge,
                        body_content=course_spec.body_content,
                        map_order=course_spec.map_order,
                        created_by=formateur,
                    )
                    course.refresh_from_db()

                # Régénération propre des questions / réponses (cascade).
                quiz.questions.all().delete()
                for q_spec in course_spec.quiz.questions:
                    question = Question.objects.create(
                        quiz=quiz,
                        question_content=q_spec.content,
                        xp_value=q_spec.xp,
                    )
                    for a_spec in q_spec.answers:
                        Answer.objects.create(
                            question=question,
                            label_answer=a_spec.label,
                            is_correct=a_spec.correct,
                        )

                quizzes[course_spec.title] = quiz
                courses[course_spec.title] = course

        return badges, quizzes, courses

    # ── Inscriptions, progressions, badges utilisateurs ────────────────────

    def _seed_enrollments_progress_badges(self) -> None:
        cohorts = [
            (LEARNERS_CYBER, CYBER_THEME),
            (LEARNERS_RESEAU, NETWORK_THEME),
            (LEARNERS_WEB, WEB_THEME),
            (LEARNERS_DEVOPS, DEVOPS_THEME),
        ]

        enrollments_count = progress_count = badge_count = 0
        for cohort, theme_spec in cohorts:
            ordered_courses = sorted(theme_spec.courses, key=lambda c: c.map_order)
            for index, learner_spec in enumerate(cohort):
                user = self._users[learner_spec.key]
                completed_count, score = COMPLETION_PROFILE_PER_COHORT[index]

                for course_pos, course_spec in enumerate(ordered_courses):
                    course = self._courses_by_key[course_spec.title]
                    CourseEnrollment.objects.get_or_create(user=user, course=course)
                    enrollments_count += 1

                    if course_pos < completed_count:
                        # Cours validé.
                        progress, _ = UserCourseProgress.objects.get_or_create(
                            user=user, course=course,
                            defaults={'is_unlocked': True, 'is_completed': True, 'best_score': score},
                        )
                        UserCourseProgress.objects.filter(pk=progress.pk).update(
                            is_unlocked=True,
                            is_completed=True,
                            best_score=max(progress.best_score, score),
                        )
                        progress_count += 1
                        if course.delivered_badge_id:
                            UserBadge.objects.get_or_create(
                                user=user, badge_id=course.delivered_badge_id
                            )
                            badge_count += 1
                    elif course_pos == completed_count:
                        # Premier cours non validé : débloqué.
                        UserCourseProgress.objects.update_or_create(
                            user=user, course=course,
                            defaults={'is_unlocked': True, 'is_completed': False},
                        )
                        progress_count += 1
                    else:
                        # Cours encore verrouillé.
                        UserCourseProgress.objects.update_or_create(
                            user=user, course=course,
                            defaults={'is_unlocked': False, 'is_completed': False},
                        )

        self.stdout.write(
            f'  • {enrollments_count} inscription(s) · '
            f'{progress_count} progression(s) · '
            f'{badge_count} badge(s) attribué(s).'
        )

    # ── Logs d'activité (échantillon réaliste) ─────────────────────────────

    def _seed_activity_logs(self) -> None:
        # On ne backdate pas (auto_now_add) ; on génère un échantillon récent.
        existing = ActivityLog.objects.count()
        if existing >= 30:
            self.stdout.write(f'  • {existing} log(s) déjà présents (skip).')
            return

        admin = self._users[ADMIN_SPEC.key]
        ActivityLog.objects.create(
            user=admin, action=ActivityLog.Action.LOGIN, metadata={'seed': True}
        )

        for spec in FORMATEUR_SPECS:
            user = self._users[spec.key]
            ActivityLog.objects.create(
                user=user, action=ActivityLog.Action.LOGIN, metadata={'seed': True}
            )

        # Quelques apprenants : login + un quiz_submit cohérent avec leur progression.
        cohorts = [
            (LEARNERS_CYBER, CYBER_THEME),
            (LEARNERS_RESEAU, NETWORK_THEME),
            (LEARNERS_WEB, WEB_THEME),
            (LEARNERS_DEVOPS, DEVOPS_THEME),
        ]
        for cohort, theme_spec in cohorts:
            ordered_courses = sorted(theme_spec.courses, key=lambda c: c.map_order)
            for index, learner_spec in enumerate(cohort):
                completed_count, score = COMPLETION_PROFILE_PER_COHORT[index]
                user = self._users[learner_spec.key]
                ActivityLog.objects.create(
                    user=user, action=ActivityLog.Action.LOGIN, metadata={'seed': True}
                )
                if completed_count == 0:
                    continue
                last_course_spec = ordered_courses[completed_count - 1]
                last_quiz = self._quizzes_by_key[last_course_spec.title]
                ActivityLog.objects.create(
                    user=user,
                    action=ActivityLog.Action.QUIZ_SUBMIT,
                    metadata={
                        'quiz_id': last_quiz.quiz_id,
                        'score': score,
                        'passed': True,
                        'seed': True,
                    },
                )

    # ── Récapitulatif final ────────────────────────────────────────────────

    def _summary(self, *, password: str) -> None:
        self.stdout.write(self.style.SUCCESS('\nSeed démo Edunova terminé.'))
        self.stdout.write(
            f'  Rôles      : {Role.objects.count()} · '
            f'Rangs : {Rank.objects.count()} · '
            f'Badges : {Badge.objects.count()}'
        )
        self.stdout.write(
            f'  Thèmes     : {Theme.objects.count()} · '
            f'Cours : {Course.objects.count()} · '
            f'Quiz : {Quiz.objects.count()} · '
            f'Questions : {Question.objects.count()} · '
            f'Réponses : {Answer.objects.count()}'
        )
        self.stdout.write(
            f'  Utilisateurs : {User.objects.count()} '
            f'(admin/staff : {User.objects.filter(is_staff=True).count()}, '
            f'apprenants : {User.objects.filter(role__role_name__iexact="utilisateur").count()})'
        )
        self.stdout.write(
            f'  Inscriptions : {CourseEnrollment.objects.count()} · '
            f'Progressions : {UserCourseProgress.objects.count()} · '
            f'Badges utilisateurs : {UserBadge.objects.count()}'
        )

        self.stdout.write('\n' + self.style.NOTICE('Identifiants de connexion (mot de passe partagé) :'))
        self.stdout.write(f'  Mot de passe : {password}')
        self.stdout.write(f'  Admin        : {ADMIN_SPEC.email}')
        for spec in FORMATEUR_SPECS:
            self.stdout.write(f'  Formateur    : {spec.email}')
        self.stdout.write('  Apprenants   : voir _UserSpec list (24 comptes)')
