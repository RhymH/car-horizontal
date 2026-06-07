# Journal de développement — CarHorizontal

> Notes succinctes de ce qu'on ajoute, session par session.
> Pour chaque entrée : **ce qui a été fait** + **comment y accéder / le tester**.
> Le plus récent en haut.

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
