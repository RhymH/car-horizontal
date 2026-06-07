# Journal de développement — CarHorizontal

> Notes succinctes de ce qu'on ajoute, session par session.
> Pour chaque entrée : **ce qui a été fait** + **comment y accéder / le tester**.
> Le plus récent en haut.

---

## 2026-06-07 — P1-B : Centre de notifications collaborateurs

**Fonctionnalité**
Inbox d'actions intelligentes pour le garage. Un générateur transforme les signaux déjà calculés en notifications contextualisées et actionnables :
- échéances Timeline dans les 30 jours ou en retard (entretien, contrôle technique, pneus, fin de garantie, opportunité de reprise) ;
- clients **inactifs depuis ≈12 mois** (opportunité de relance).
Chaque notification porte une sévérité (Urgent / À traiter / Opportunité / Info) et une **action « 1 clic »** (voir client, voir véhicule, planifier un RDV, envoyer un rappel). Génération **idempotente** (clé de déduplication) — rejouable sans doublon.

**Comment y accéder / tester**
- Portal : **cloche dans la barre du haut** (badge de non-lus, rafraîchi toutes les 60 s) + entrée **« Notifications »** dans la sidebar → page `/notifications` (onglets À traiter / Traitées / Ignorées, actions Traité / Ignorer).
- Génération auto : job Hangfire `daily-generate-notifications` (02h30, après la régénération Timeline). Dashboard `http://localhost:5080/hangfire`.
- Génération manuelle (Owner/Admin) : `POST /api/notifications/generate`.
- API : `GET /api/notifications`, `GET /api/notifications/unread-count`, `POST /api/notifications/{id}/read|done|dismiss`.
- Le filtrage multitenant est porté par le filtre global du DbContext.

---

## 2026-06-07 — P0-A : Envoi réel des messages (SMS/Email)

**Fonctionnalité**
Pipeline d'envoi de messages avec architecture propre : abstractions `IEmailSender` / `ISmsSender` / `IMessageDispatcher`, providers sélectionnés par configuration. Implémentations « log » (simulées, sans dépendance externe) pour le dev. Le statut d'un rappel reflète désormais le **vrai résultat** de l'envoi (fini le `Sent` mensonger) et chaque envoi écrit un `MessageLog` fidèle.

**Pourquoi**
Avant, les rappels étaient marqués `Sent` sans rien envoyer (dispatch NoOp). Toute la promesse « rappels automatiques » était non fonctionnelle.

**Comment y accéder / tester**
- Config : `Messaging:Email:Provider` / `Messaging:Sms:Provider` dans `appsettings.json` (défaut `log`). Un provider inconnu = erreur explicite au démarrage.
- Envoi automatique : job Hangfire `dispatch-due-reminders` (dashboard `http://localhost:5080/hangfire`).
- Envoi manuel : `POST /api/reminders/{id}/send-now` (ou bouton « Envoyer » côté portal).
- Vérif : les envois simulés apparaissent dans les logs API (`[SIMULATED EMAIL]` / `[SIMULATED SMS]`) et dans la table `message_logs` (colonne `ProviderMessageId` = `log-email:…`).
- Brancher un vrai opérateur plus tard = ajouter une impl `IEmailSender`/`ISmsSender` dans `Infrastructure/Messaging/` + changer la config. Rien d'autre à toucher.
