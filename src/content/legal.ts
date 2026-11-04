/**
 * DRAFT legal texts. They must be reviewed by a qualified lawyer before launch.
 * Placeholders in [brackets] must be completed by the data controller.
 */
type Section = { title: string; body: string[] };
type Doc = { sections: Section[] };

export const LEGAL_UPDATED = "2026-11-04";

export const privacy: Record<"it" | "en", Doc> = {
  it: {
    sections: [
      { title: "1. Titolare del trattamento", body: ["[Ragione sociale], [indirizzo], Roma, Italia — email: [privacy@onerome.app]. Responsabile della protezione dei dati (se nominato): [contatto]."] },
      { title: "2. Dati trattati", body: [
        "Dati di account: email, password (conservata in forma cifrata dal fornitore di autenticazione), data di nascita.",
        "Dati di profilo: nome visualizzato, genere, foto, quartiere, professione e formazione (facoltative), lingue, interessi, valori, stile di vita, obiettivi e preferenze relazionali.",
        "Categorie particolari (art. 9 GDPR): il genere delle persone che desideri incontrare può rivelare il tuo orientamento sessuale. Lo trattiamo solo con il tuo consenso esplicito.",
        "Dati di utilizzo: like, match, connessioni, messaggi, notifiche, segnalazioni e blocchi.",
        "Dati di pagamento: gestiti da Stripe. OneRome conserva solo lo stato dell'abbonamento e l'identificativo cliente, mai i dati della carta.",
      ] },
      { title: "3. Finalità e basi giuridiche", body: [
        "Erogazione del servizio e gestione dell'account (esecuzione del contratto, art. 6.1.b).",
        "Proposte di persone compatibili basate su preferenze sensibili (consenso esplicito, art. 9.2.a).",
        "Sicurezza, prevenzione di abusi e moderazione (legittimo interesse, art. 6.1.f).",
        "Adempimenti fiscali e contabili relativi ai pagamenti (obbligo legale, art. 6.1.c).",
        "Comunicazioni informative facoltative (consenso, art. 6.1.a).",
      ] },
      { title: "4. Cosa vedono gli altri utenti", body: ["Mostriamo solo età, nome visualizzato, quartiere e le informazioni di profilo che scegli. La data di nascita completa, l'email e la posizione precisa non sono mai pubbliche. I messaggi sono visibili solo ai due partecipanti della conversazione."] },
      { title: "5. Conservazione", body: [
        "I messaggi di una connessione chiusa vengono eliminati dopo [90] giorni. Le notifiche dopo [180] giorni.",
        "Le prove allegate a una segnalazione possono essere conservate per il tempo necessario alla gestione del caso e alla tutela dei diritti.",
        "Alla cancellazione dell'account, profilo, foto, like, match e messaggi inviati vengono eliminati senza ritardo, salvo obblighi di legge.",
      ] },
      { title: "6. Destinatari e trasferimenti", body: ["Fornitori che agiscono come responsabili del trattamento: Supabase (database, autenticazione, archiviazione), Stripe (pagamenti), provider di hosting [Vercel/altro]. Eventuali trasferimenti extra UE avvengono sulla base di decisioni di adeguatezza o Clausole Contrattuali Standard."] },
      { title: "7. I tuoi diritti", body: ["Accesso, rettifica, cancellazione, limitazione, portabilità, opposizione e revoca del consenso in ogni momento. Dalle Impostazioni puoi scaricare i tuoi dati ed eliminare l'account. Puoi proporre reclamo al Garante per la protezione dei dati personali (www.garanteprivacy.it)."] },
      { title: "8. Minori", body: ["Il servizio è riservato ai maggiori di 18 anni. Gli account di minori vengono chiusi."] },
    ],
  },
  en: {
    sections: [
      { title: "1. Data controller", body: ["[Company name], [address], Rome, Italy — email: [privacy@onerome.app]. Data Protection Officer (if appointed): [contact]."] },
      { title: "2. Data we process", body: [
        "Account data: email, password (stored hashed by the authentication provider), date of birth.",
        "Profile data: display name, gender, photos, neighbourhood, occupation and education (optional), languages, interests, values, lifestyle, relationship goals and preferences.",
        "Special categories (GDPR art. 9): the gender of the people you want to meet may reveal your sexual orientation. We only process it with your explicit consent.",
        "Usage data: likes, matches, connections, messages, notifications, reports and blocks.",
        "Payment data: handled by Stripe. OneRome only stores the subscription status and customer identifier, never card details.",
      ] },
      { title: "3. Purposes and legal bases", body: [
        "Providing the service and managing your account (contract, art. 6.1.b).",
        "Suggesting compatible people based on sensitive preferences (explicit consent, art. 9.2.a).",
        "Security, abuse prevention and moderation (legitimate interest, art. 6.1.f).",
        "Tax and accounting obligations for payments (legal obligation, art. 6.1.c).",
        "Optional news (consent, art. 6.1.a).",
      ] },
      { title: "4. What other users see", body: ["We only show your age, display name, neighbourhood and the profile information you choose. Your full birth date, email and precise location are never public. Messages are visible only to the two participants of the conversation."] },
      { title: "5. Retention", body: [
        "Messages of a closed connection are deleted after [90] days. Notifications after [180] days.",
        "Evidence attached to a report may be kept for as long as needed to handle the case and protect legal rights.",
        "When you delete your account, your profile, photos, likes, matches and sent messages are erased without undue delay, unless the law requires otherwise.",
      ] },
      { title: "6. Recipients and transfers", body: ["Processors: Supabase (database, authentication, storage), Stripe (payments), hosting provider [Vercel/other]. Any transfer outside the EU relies on adequacy decisions or Standard Contractual Clauses."] },
      { title: "7. Your rights", body: ["Access, rectification, erasure, restriction, portability, objection and withdrawal of consent at any time. From Settings you can download your data and delete your account. You can lodge a complaint with the Italian Data Protection Authority (www.garanteprivacy.it)."] },
      { title: "8. Minors", body: ["The service is only for people aged 18 or over. Accounts of minors are closed."] },
    ],
  },
};

export const terms: Record<"it" | "en", Doc> = {
  it: {
    sections: [
      { title: "1. Il servizio", body: ["OneRome è una piattaforma di incontri per persone maggiorenni che vivono a Roma. Ogni utente può avere una sola Connessione Esclusiva attiva alla volta."] },
      { title: "2. Requisiti", body: ["Devi avere almeno 18 anni, fornire informazioni veritiere e usare un solo account personale."] },
      { title: "3. Connessione Esclusiva e regola delle 72 ore", body: ["Durante una connessione attiva non è possibile mettere like, creare match o avviare altre chat. Ciascuno dei due può chiuderla in qualsiasi momento. Se un messaggio resta senza risposta per 72 ore, o se nessun messaggio viene inviato entro 72 ore dall'avvio, la connessione si chiude automaticamente."] },
      { title: "4. Abbonamento", body: ["Registrazione, profilo, scoperta, like e match sono gratuiti. Per chattare entrambe le persone devono avere un abbonamento attivo di 5,99 € al mese (IVA inclusa), con rinnovo automatico disattivabile in qualsiasi momento dal portale clienti. Se l'abbonamento scade, l'invio di nuovi messaggi è sospeso fino al rinnovo. [Inserire informazioni sul diritto di recesso per i consumatori.]"] },
      { title: "5. Regole di comportamento", body: ["Sono vietati molestie, contenuti sessualmente espliciti non richiesti, discorsi d'odio, truffe, richieste di denaro, spam, profili falsi e qualsiasi attività illecita. Possiamo sospendere o chiudere gli account che violano queste regole."] },
      { title: "6. First Date e luoghi", body: ["I luoghi suggeriti sono indicazioni. Una prenotazione è confermata solo quando il locale la conferma. OneRome non è responsabile dei servizi offerti da terzi."] },
      { title: "7. Responsabilità", body: ["OneRome non effettua verifiche sui precedenti degli utenti. Incontra le persone in luoghi pubblici e segui i consigli di sicurezza. [Limitazioni di responsabilità da definire con un legale.]"] },
      { title: "8. Legge applicabile", body: ["Legge italiana. Foro del consumatore ove applicabile. [Da completare.]"] },
    ],
  },
  en: {
    sections: [
      { title: "1. The service", body: ["OneRome is a dating platform for adults living in Rome. Each user can have only one active Exclusive Connection at a time."] },
      { title: "2. Eligibility", body: ["You must be at least 18, provide truthful information and use a single personal account."] },
      { title: "3. Exclusive Connection and the 72-hour rule", body: ["During an active connection you cannot like, match or start other chats. Either person can end it at any time. If a message stays unanswered for 72 hours, or no message is sent within 72 hours of starting, the connection closes automatically."] },
      { title: "4. Subscription", body: ["Sign-up, profile, discovery, likes and matches are free. To chat, both people need an active subscription of €5.99 per month (VAT included) that renews automatically and can be cancelled at any time from the customer portal. If the subscription lapses, sending new messages is paused until renewal. [Add consumer withdrawal-right information.]"] },
      { title: "5. Code of conduct", body: ["Harassment, unsolicited explicit content, hate speech, scams, money requests, spam, fake profiles and any unlawful activity are forbidden. We may suspend or close accounts that break these rules."] },
      { title: "6. First Date and venues", body: ["Suggested places are recommendations. A booking is confirmed only when the venue confirms it. OneRome is not responsible for third-party services."] },
      { title: "7. Liability", body: ["OneRome does not run background checks on users. Meet in public places and follow the safety advice. [Liability limitations to be defined with a lawyer.]"] },
      { title: "8. Governing law", body: ["Italian law. Consumer forum where applicable. [To be completed.]"] },
    ],
  },
};
