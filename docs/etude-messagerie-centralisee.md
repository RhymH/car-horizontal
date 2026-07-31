# Étude de faisabilité — Messagerie centralisée multi-canaux

> **Date** : 31 juillet 2026
> **Objet** : intégrer dans CarHorizontal une inbox unifiée regroupant WhatsApp,
> Messenger, SMS, email et les canaux de vente de véhicules (Leboncoin,
> La Centrale, AutoScout24…), pour les garages clients.
> **Statut** : étude préalable — aucune décision d'implémentation actée.

---

## 1. Synthèse

Une messagerie centralisée est **faisable**, mais la couverture n'est pas
uniforme selon les canaux :

| Canal | Intégrable ? | Réception | Envoi depuis l'appli | Envoi hors appli visible dans l'appli ? |
|---|---|---|---|---|
| WhatsApp | ✅ Cloud API (Meta) | ✅ webhooks | ✅ (fenêtre 24 h / templates) | ✅ via « coexistence » (app WhatsApp Business) |
| Messenger | ✅ Messenger Platform | ✅ webhooks | ✅ (fenêtre 24 h) | ✅ nativement (webhooks `message_echoes`) |
| SMS | ✅ provider (Brevo, OVH, Twilio…) | ✅ numéro virtuel | ✅ | ❌ SMS envoyés du téléphone perso invisibles |
| Email | ✅ inbound parsing ou OAuth boîte mail | ✅ | ✅ | ✅ via sync IMAP/OAuth ou BCC automatique |
| Leboncoin | ⚠️ leads email uniquement | ✅ lead initial par email de redirection | ❌ pas de réponse dans le fil Leboncoin | ❌ réponses faites sur Leboncoin invisibles |
| La Centrale / AutoScout24 / mobile.de | ⚠️ leads email uniquement | ✅ idem | ❌ | ❌ |
| iMessage | ❌ | — | — | — |

**Recommandation MVP** : commencer par *leads email des portails + SMS*
(zéro dépendance Meta, couvre l'essentiel du besoin réel d'un garage),
puis WhatsApp en phase 2, Messenger en phase 3.

---

## 2. Détail par canal

### 2.1 WhatsApp — WhatsApp Business Platform (Cloud API)

Le canal le mieux outillé pour ce cas d'usage.

- **Fonctionnement** : envoi/réception via l'API Cloud de Meta, notifications
  entrantes par webhooks. Exactement le modèle qu'il faut pour une inbox.
- **Fenêtre de 24 h** : réponse libre et gratuite pendant 24 h après le
  dernier message du client. Au-delà, seuls des **templates pré-approuvés
  et payants** peuvent être envoyés.
- **Tarification** (modèle *par message* depuis juillet 2025) : messages de
  service dans la fenêtre = gratuits ; templates utilitaires ~80-90 % moins
  chers que le marketing ; le marketing vers la France est parmi les tarifs
  les plus élevés (~0,10 €+ par message délivré). Grille révisée
  trimestriellement par Meta.
- **Coexistence app + API** (déployée par Meta en mai 2025) : un même numéro
  peut être actif simultanément sur l'app **WhatsApp Business** du garagiste
  et sur la Cloud API. Les messages envoyés/reçus d'un côté sont répliqués
  de l'autre en temps réel (webhooks), avec import possible de 6 mois
  d'historique à l'activation. Le garagiste peut donc continuer à répondre
  depuis son téléphone, tout apparaît dans CarHorizontal.
  - Limites coexistence : app WhatsApp Business uniquement (pas le WhatsApp
    grand public), pas de groupes, pas d'édition/suppression de messages,
    onboarding généralement via un BSP.
- **Prérequis** : vérification Meta Business du garage, numéro dédié (ou
  coexistence), CarHorizontal vérifié comme Tech Provider Meta.

### 2.2 Messenger — Messenger Platform

- **Fonctionnement** : API gratuite, liée à la Page Facebook du garage,
  webhooks entrants + Send API.
- **Envoi hors appli** : les réponses faites depuis la boîte de réception de
  la Page (Meta Business Suite, app Facebook mobile) remontent nativement
  via les webhooks `message_echoes` — c'est le canal le plus simple pour la
  visibilité des messages envoyés ailleurs.
- **Fenêtre de 24 h** : même principe que WhatsApp ; en dehors, quasiment
  aucun envoi possible (les *message tags* historiques CONFIRMED_EVENT_UPDATE,
  ACCOUNT_UPDATE et POST_PURCHASE_UPDATE sont refusés par l'API depuis
  avril 2026).
- **Prérequis** : App Review Meta (`pages_messaging`) pour l'app SaaS —
  processus parfois long/capricieux — et connexion OAuth de la Page par
  chaque garage.

### 2.3 SMS

- Le plus simple à intégrer : provider déjà prévu dans l'architecture
  (`Messaging:Sms:Provider`). Numéro virtuel dédié par garage pour la
  réception des réponses.
- Pas de fenêtre de 24 h. Coût par SMS. Obligations légales françaises :
  mention STOP, pas de prospection 20 h–8 h, ni dimanches et jours fériés.
- **Limite majeure** : un SMS envoyé par le garagiste depuis son téléphone
  personnel (son numéro habituel) est **invisible** — les opérateurs
  n'exposent aucune API. Les SMS pro doivent transiter par le numéro virtuel,
  donc partir de l'appli. Les réponses entrantes des clients vers le numéro
  virtuel, elles, arrivent bien dans l'inbox.

### 2.4 Email

- **Réception** : adresse d'ingestion dédiée par garage
  (ex. `lead-garage42@in.carhorizontal.fr`) + inbound parsing chez un
  provider transactionnel, ou connexion OAuth de la boîte du garage.
- **Envoi hors appli visible** : deux options —
  1. **OAuth Gmail / Microsoft 365** : synchronisation des messages envoyés.
     UX idéale mais chantier conséquent (API Gmail/Graph, vérification
     Google, gestion des tokens).
  2. **BCC automatique** vers l'adresse d'ingestion (standard des CRM) :
     léger à implémenter, demande une configuration côté garage.

### 2.5 Portails d'annonces (Leboncoin, La Centrale, AutoScout24, mobile.de)

- **Aucune API de messagerie publique.** Les accès pro Leboncoin passent par
  des passerelles partenaires (Ubiflow…) qui couvrent la **diffusion
  d'annonces**, pas la messagerie. Scraper la messagerie interne violerait
  les CGU et casserait au premier changement d'interface.
- **Intégration standard du marché** (celle des CRM auto) : le **lead email**.
  L'adresse de contact de l'annonce est remplacée par l'adresse d'ingestion
  CarHorizontal ; le backend parse l'email entrant (nom, téléphone, véhicule
  concerné) et crée le lead + la conversation.
- La réponse se fait ensuite par email/SMS/WhatsApp vers les coordonnées
  laissées par l'acheteur — **pas dans le fil du portail**. Si le garage
  répond dans l'interface Leboncoin, c'est invisible pour l'appli.
- **Workflow à encourager côté produit** : dès qu'un lead portail arrive,
  basculer la conversation vers un canal maîtrisé.

### 2.6 iMessage

Impossible : Apple n'expose aucune API (hors *Apple Messages for Business*,
réservé aux grandes marques via des MSP agréés).

---

## 3. Limitations transverses

1. **Fenêtre des 24 h Meta** (contrainte produit n° 1) : l'inbox doit
   afficher l'état de la conversation (ouverte / expirée) et forcer le
   passage par template WhatsApp payant — ou proposer la bascule SMS/email —
   quand la fenêtre est fermée. L'ignorer produit des erreurs d'envoi en
   rafale.
2. **Onboarding par tenant** : chaque garage connecte *son* numéro WhatsApp,
   *sa* Page Facebook (OAuth), *son* email de leads. Parcours de
   configuration multi-étapes à concevoir, avec gestion des tokens expirés
   ou révoqués.
3. **Vérifications Meta** : statut Tech Provider + App Reviews pour opérer
   WhatsApp/Messenger au nom des clients. Délai en semaines, à lancer tôt.
4. **Pas de fil unifié côté acheteur** : un même prospect écrit sur Leboncoin
   (email anonymisé) puis sur WhatsApp (numéro) = deux identités. Le
   rapprochement avec la fiche `Customer` est heuristique (téléphone, nom) ;
   prévoir une UX de fusion manuelle.
5. **Coûts variables** : WhatsApp hors fenêtre et SMS sont payants au
   message. Décider tôt : refacturation au garage (crédits/quota par plan)
   ou absorption dans l'abonnement.
6. **RGPD** : stockage de conversations de prospects → politique de
   rétention, consentement pour tout envoi marketing.
7. **Déduplication des échos** : les messages « echo » (envoyés hors appli
   ou par le backend lui-même) doivent être dédupliqués et affichés avec
   leur auteur réel quand l'information existe.

---

## 4. Architecture cible dans CarHorizontal

L'architecture existante s'y prête bien :

- **Domain / Infrastructure** : entités `Conversation`, `Message`,
  `ChannelConnection` héritant d'`OrganizationEntityBase` ; une interface
  `IMessageChannel` implémentée par provider (même modèle que les providers
  SMS/email actuels).
- **Api** : module `Modules/Messaging/` (controller, service, DTOs,
  validators colocalisés) ; endpoints webhook pour Meta (WhatsApp +
  Messenger) et pour l'inbound email ; envois sortants via Hangfire avec
  retry.
- **Portal** : inbox type boîte de réception filtrée par canal, rattachée au
  `Customer` et au véhicule concerné — se marie naturellement avec le module
  Sales/leads.

### Décision structurante : intégration directe vs agrégateur

| Option | Avantages | Inconvénients |
|---|---|---|
| **Meta en direct** (Cloud API + Messenger Platform) | Pas d'intermédiaire, coût = tarif Meta seul | Deux App Reviews, maintenance webhooks, onboarding coexistence plus complexe |
| **Agrégateur** (Twilio Conversations, Sendbird, 360dialog…) | Une seule API pour WhatsApp + SMS (+ parfois Messenger), time-to-market court | Marge par message (~0,005–0,01 $), dépendance supplémentaire |

### Phasage proposé

1. **Phase 1 (MVP)** : leads email des portails + SMS. Zéro dépendance Meta,
   couvre l'essentiel du besoin d'un garage.
2. **Phase 2** : WhatsApp Cloud API avec coexistence.
3. **Phase 3** : Messenger.
4. **Hors scope** : messagerie interne des portails, iMessage.

---

## 5. Positionnement produit

Le pitch tient : *« Continuez à répondre depuis WhatsApp Business, Messenger
ou votre boîte mail — tout est centralisé dans CarHorizontal. »*

Avec **deux exceptions à assumer clairement dans l'UX** :
- les **SMS** doivent partir de l'appli (sinon invisibles) ;
- les fils **Leboncoin/portails** restent chez le portail — seul le lead
  initial est capté, la conversation doit basculer sur un canal maîtrisé.

---

## 6. Sources

- [WhatsApp Business API pricing 2026 (Sleekflow)](https://sleekflow.io/en-us/blog/whatsapp-business-price)
- [WhatsApp per-message billing (Uptail)](https://www.uptail.ai/blog/whatsapp-business-api-pricing-2026-what-it-costs-and-how-billing-works)
- [WhatsApp Coexistence — app + API sur un même numéro (Whautomate)](https://whautomate.com/whatsapp-coexistence)
- [WhatsApp Coexistence expliquée (Chakra)](https://chakrahq.com/article/whatsapp-business-app-api-coexistence-202/)
- [WhatsApp Coexistence : activation et limites (Clientify)](https://clientify.com/en/blog/communication/whatsapp-coexistence)
- [Messenger Platform overview (Meta)](https://developers.facebook.com/documentation/business-messaging/messenger-platform/overview)
- [Messenger Platform — conversations et webhooks (Meta)](https://developers.facebook.com/docs/messenger-platform/conversations/)
- [Messenger changelog — dépréciation des message tags avril 2026 (Meta)](https://developers.facebook.com/docs/messenger-platform/changelog/)
- [Messenger App Review pour SaaS](https://singhamandeep.com/facebook-messenger-bot-app-review-chatbot-saas/)
- [Leboncoin Solutions Pro — logiciels partenaires / API](https://leboncoinsolutionspro.fr/logiciels-partenaires-api/)
- [Guide accès données Leboncoin (Stream Estate)](https://stream.estate/fr/guides/leboncoin-api)
- [CRM automobile et import de leads portails (La Fabrique du Net)](https://www.lafabriquedunet.fr/logiciels/productivite/crm/crm-automobile)
