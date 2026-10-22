# OpenReply auf Railway einrichten

Diese Anleitung ist für eine Person, die OpenReply zum ersten Mal aufsetzt. Am Ende laufen Webseite, Hintergrunddienst, Datenbank und Redis in **einem** Railway-Projekt. Instagram wird über **deine eigene Meta-App** verbunden. Zernio brauchst du dafür nicht.

Die Schritte folgen dem Code und den bestehenden Docs in diesem Repository (`docs/setup.md`, `package.json`, `lib/env.ts`, `lib/meta/oauth.ts`, `worker/dm-worker.ts`, `scripts/railway-cron.mjs`, `.railway/railway.ts`). Wo sich eine Schaltfläche in Railway oder bei Meta verschoben haben kann, steht **Unsicher:**.

Die Oberfläche von OpenReply ist Englisch. Die Buttons unten heißen deshalb so, wie sie im Programm stehen.

## Was am Ende laufen muss

| Teil | Was es tut | Immer an? |
| --- | --- | --- |
| `web` | Die Seite, der Login, der Instagram-Rückweg und der Webhook | Ja |
| `worker` | Verschickt die DMs und holt verpasste Kommentare nach | Ja, darf nicht einschlafen |
| `cron` | Erneuert einmal am Tag das Instagram-Login und speichert die Follower-Zahl | Startet jeden Tag kurz und beendet sich |
| `postgres` | Kampagnen, Konten, Logs | Ja |
| `redis` | Die Warteschlange für DMs | Ja |

`web` und `worker` müssen dieselbe Datenbank, dasselbe Redis und **denselben** `ENCRYPTION_KEY` haben. Steht dort ein anderer Schlüssel, kann der Worker die gespeicherten Instagram-Tokens nicht lesen und jede DM schlägt fehl.

Die fertigen Befehle stehen auch in `.railway/railway.ts`. Die Klick-Anleitung hier reicht. Den Befehl `railway config apply` brauchst du nicht. Wenn du ihn später auf ein schon zusammengeklicktes Projekt loslässt, kann Railway Dienste löschen, deren Namen nicht in der Datei stehen.

## Was du vorher brauchst

- Ein GitHub-Konto, das dieses Repository sieht (`nvgii/openreply`).
- Ein Railway-Konto. Beim ersten Projekt verbindet Railway dich mit GitHub.
- Ein Facebook-Konto, mit dem du eine Meta-Entwickler-App anlegen darfst.
- Ein Instagram-Konto, das du auf **Business** oder **Creator** umstellst. Ein privates Konto lässt sich nicht verbinden.
- Eine E-Mail-Adresse, mit der du dich später anmeldest. OpenReply kennt kein Passwort. Du bekommst jedes Mal einen Link per E-Mail.
- Ein zweites Instagram-Konto nur für den Test. OpenReply ignoriert Kommentare von deinem eigenen verbundenen Konto.

Railway ist nicht dauerhaft kostenlos. Web, Worker, Postgres und Redis laufen durchgehend, der Worker muss wach bleiben. Aktuelle Preise stehen auf [railway.com/pricing](https://railway.com/pricing). **Unsicher:** wie viel Startguthaben ein neues Konto 2026 noch bekommt. Schau im Railway-Dashboard auf den Verbrauch, bevor du die Karte hinterlegst.

## Entscheidungen, die nur du treffen kannst

1. **Deine Login-E-Mail.** Trag sie in `ALLOWED_EMAILS` ein. Ohne diese Variable darf jede Person, die deine Adresse kennt, einen Login-Link anfordern und einen eigenen Arbeitsbereich bekommen.
2. **Wie die Login-Mails rausgehen.** Entweder [Resend](https://resend.com) (`RESEND_API_KEY` und `EMAIL_FROM`) oder dein eigener Mailserver (`EMAIL_SERVER`). Eins von beiden muss stehen, sonst kommt kein Login-Link an.
3. **Business oder Creator.** Beides funktioniert. Nimm den Typ, den du für das Konto willst.
4. **Ob du die Meta-App veröffentlichst.** Für echte Kommentare ja. Eine Prüfung durch Meta (App Review) brauchst du nur, wenn *fremde* Konten sich verbinden sollen. Dein eigenes Konto, das du als Tester einlädst, braucht das nicht.
5. **Wohin du `ENCRYPTION_KEY` zusätzlich notierst.** Verlierst du ihn, musst du Instagram neu verbinden. Änderst du ihn später, gilt dasselbe.

## 1. Railway-Projekt aus dem GitHub-Repository

1. Öffne [railway.com](https://railway.com) und melde dich an. Wenn Railway nach GitHub fragt, erlaube den Zugriff auf dieses Repository.
2. Klick **New Project**.
3. Wähl **GitHub repo** und such `nvgii/openreply`.
4. Wenn Railway **Add variables** und **Deploy Now** anbietet, nimm **Add variables**. Der erste Start ohne Zugangsdaten schlägt sonst fehl. Das ist kein Schaden, du musst danach nur neu starten.
5. Du landest auf der Projektfläche (Canvas). Der erste Dienst ist die Webseite. Klick ihn an und benenne ihn in `web` um. **Unsicher:** der Name steht oben in **Settings**, manchmal ist er direkt die Überschrift des Dienstes. Der Name muss exakt `web` lauten, weil die anderen Dienste ihn so ansprechen.

Railway merkt sich Änderungen als Entwurf. Oben erscheint ein Button **Deploy** (manchmal steht dort, dass Änderungen warten). Die neuen Werte gelten erst nach diesem Klick. **Unsicher:** die genaue Beschriftung des Buttons.

## 2. Postgres und Redis

1. Auf der Projektfläche **Create** (oder das Plus) öffnen.
2. **Database**, dann **PostgreSQL**.
3. Nochmal **Create** → **Database** → **Redis**.
4. Benenne die beiden Dienste in `postgres` und `redis` um, klein geschrieben. Die Verweise unten benutzen genau diese Namen. Heißt der Dienst bei dir `Postgres`, musst du in jedem Verweis `Postgres` statt `postgres` schreiben.

Warte, bis beide Dienste **Active** sind, bevor du die Webseite startest. Die Migration in Schritt 4 braucht eine erreichbare Datenbank.

Beide Dienste erzeugen eine interne Adresse (`postgres.railway.internal`, `redis.railway.internal`) und eine öffentliche (`*.proxy.rlwy.net` oder ähnlich). Innerhalb von Railway nimmst du die interne. Die öffentliche brauchst du für dieses Setup nicht.

## 3. Die drei Dienste aus demselben Repository

Du hast schon `web`. Lege zwei weitere Dienste aus **demselben** Repository und dem Branch `main` an:

1. **Create** → **GitHub Repo** → `nvgii/openreply`.
2. Benenne den neuen Dienst `worker`.
3. Wiederhole das und benenne den dritten Dienst `cron`.

**Unsicher:** der Menüpunkt heißt **GitHub Repo** oder **GitHub Repository**. Es ist der Eintrag, mit dem du ein Repository noch einmal hinzufügst, keine Datenbank und kein Docker-Image.

Dieses Repository enthält ein `Dockerfile`. Railway nimmt das manchmal automatisch als Bauanleitung. Für dieses Setup soll jeder der drei Dienste **Railpack** benutzen, damit die Build-Befehle unten gelten und Node 22 verwendet wird. Prisma 7 in diesem Repo verlangt Node `20.19`, `22.12` oder neuer (`package.json` / Prisma-Engine `^20.19 || ^22.12 || >=24.0`).

So prüfst du das, für `web`, `worker` und `cron` einzeln:

1. Dienst anklicken → **Settings**.
2. Im Bereich **Build** nach dem Builder schauen.
3. Steht dort **Dockerfile**, stell ihn auf **Railpack**. **Unsicher:** der Schalter kann **Builder** heißen.

Wenn du den Builder nicht findest und der Build später mit einer Node-Versionsmeldung abbricht, ist das die Stelle. Solange der Startbefehl und der Pre-deploy-Befehl aus der Tabelle gesetzt sind, funktioniert auch das Dockerfile, der eigene Build-Befehl wird dann aber ignoriert.

### Befehle pro Dienst

Trag sie unter **Settings** ein, im Bereich **Build** und **Deploy**.

| Dienst | Build Command | Pre-deploy Command | Start Command | Weiteres |
| --- | --- | --- | --- | --- |
| `web` | `npm run build` | `npm run db:migrate` | `npm start -- --hostname 0.0.0.0` | Healthcheck Path: `/api/live`, Timeout 300 Sekunden |
| `worker` | `npm run db:generate` | leer lassen | `npm run worker` | keinen Healthcheck, keine öffentliche Domain |
| `cron` | `node --check scripts/railway-cron.mjs` | leer lassen | `node scripts/railway-cron.mjs` | Cron Schedule: `0 5 * * *` |

Was die Befehle tun:

- `npm run build` erzeugt den Prisma-Client und baut die Next.js-Seite. Das steht so in `package.json`.
- `npm run db:migrate` ist `prisma migrate deploy`. Der legt die Tabellen an. Er muss **nach** dem Build laufen, wenn die Datenbank erreichbar ist. Deshalb ist er der Pre-deploy-Befehl und nicht Teil des Builds. Während des Builds gibt es kein privates Netz zu Postgres.
- `npm start -- --hostname 0.0.0.0` startet die Seite und bindet sie an alle Netzwerkschnittstellen. Railway erreicht sie sonst unter Umständen nicht. Der Port kommt von Railway (`PORT`). Trag selbst keine Variable `PORT` ein.
- `npm run db:generate` reicht dem Worker. Er führt TypeScript mit `tsx` aus und braucht den erzeugten Prisma-Client, nicht den Next-Build.
- `npm run worker` startet `worker/dm-worker.ts`. Der Prozess bleibt an. Eine Meldung wie „kein Port“ beim Worker ist in Ordnung. Gib ihm keine öffentliche Domain.
- Der Cron-Befehl ruft einmal die Routen `/api/cron/refresh-tokens`, `/api/cron/snapshot-followers` und `/api/cron/attach-next-reel` auf und beendet sich. `0 5 * * *` heißt jeden Tag um 05:00 UTC (im deutschen Sommer 07:00, im Winter 06:00). Railway plant in UTC und lässt mindestens 5 Minuten Abstand. Der Cron darf nicht dauerhaft laufen, sonst fällt der nächste Tag aus.

**Healthcheck nicht auf `/api/health` stellen.** Diese Adresse antwortet mit dem Status 503, solange der Worker noch nicht läuft. Railway würde den Web-Deploy dann als fehlgeschlagen markieren. `/api/live` sagt nur, dass die Webseite selbst antwortet. `/api/health` prüfst du später von Hand.

**Serverless / Sleep:** Wenn du einen Schalter **Serverless** oder **Sleep** siehst, lass ihn aus. Webhooks und der Worker müssen wach bleiben. **Unsicher:** ob der Schalter in deinem Konto angezeigt wird.

Lass den Restart beim Worker auf „bei Fehler neu starten“ (Standard). Beim Cron setzt der Zeitplan den Neustart auf „nie“, weil der Lauf sich selbst beendet.

## 4. Öffentliche Adresse nur für `web`

1. Dienst `web` öffnen → **Settings**.
2. **Generate Domain** klicken. **Unsicher:** der Knopf sitzt im Bereich Networking in den Settings, manchmal auch direkt in der Dienst-Ansicht.
3. Du bekommst eine Adresse wie `web-production-xxxx.up.railway.app`.
4. Den Ziel-Port leer lassen, damit Railway den Port aus `PORT` nimmt. Steht dort fest `3000`, obwohl die Logs einen anderen Port zeigen, den Port im Domain-Eintrag entfernen oder an den Log anpassen. **Unsicher:** das Feld heißt **Target port**.

Diese Adresse, mit `https://` davor und **ohne** Schrägstrich am Ende, ist deine `NEXTAUTH_URL`. Du tippst sie nicht ab. Der Verweis in Schritt 5 setzt sie.

Nur `web` bekommt eine Domain. `worker`, `cron`, `postgres` und `redis` bleiben ohne öffentliche Domain.

## 5. Umgebungsvariablen

Railway schlägt Variablen aus `.env.example` vor. **Übernimm diese Vorschläge nicht.** Die Beispielwerte stehen öffentlich im Repository. Wer den Beispiel-`ENCRYPTION_KEY` benutzt, verschlüsselt die Instagram-Tokens mit einem Schlüssel, den jede Person lesen kann.

Variablen trägst du im Tab **Variables** eines Dienstes ein: **New Variable**. Ein Verweis auf einen anderen Dienst sieht so aus: `${{dienst.NAME}}`. Railway bietet beim Tippen eine Auswahlliste an. Nimm die Liste, wenn der Name abweicht.

Änderungen bleiben ein Entwurf, bis du oben **Deploy** klickst.

Es gibt gemeinsame Variablen unter **Project Settings → Shared Variables**. **Unsicher:** der Menüpunkt kann etwas anders heißen. Wenn du sie findest, trag `NEXTAUTH_SECRET`, `CRON_SECRET` und `ENCRYPTION_KEY` dort **einmal** ein und hänge sie an `web`, `worker` und (nur die beiden Secrets, die der Cron braucht) `cron`. Sonst kopierst du dieselben Werte von Hand. Ein einziger abweichender Buchstabe bei `ENCRYPTION_KEY` reicht, damit DMs fehlschlagen.

### Geheimnisse erzeugen

`ENCRYPTION_KEY` muss **genau 64 Zeichen** lang sein und nur aus `0-9` und `a-f` bestehen. Das prüft `lib/env.ts`. Der Zufallsgenerator in Railway trifft dieses Format nicht. Erzeug den Schlüssel mit dem Befehl unten.

Am Mac oder unter Linux, im Terminal:

```bash
openssl rand -hex 32
```

Das ist der `ENCRYPTION_KEY`. Ein zweites Mal, für die anderen Zufallswerte:

```bash
openssl rand -base64 32
```

Führ den zweiten Befehl dreimal aus. Je ein Ergebnis wird `NEXTAUTH_SECRET`, `CRON_SECRET` und `WEBHOOK_VERIFY_TOKEN`.

Unter Windows, in PowerShell, für den `ENCRYPTION_KEY`:

```powershell
-join ((1..32 | ForEach-Object { '{0:x2}' -f (Get-Random -Maximum 256) }))
```

Und für die drei anderen Geheimnisse, dreimal ausführen:

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

Kopier die Ausgabe in Railway. Sie gehört in keine Chat-Nachricht und in keine Datei, die du zu GitHub schickst.

Für `NEXTAUTH_SECRET`, `CRON_SECRET` und `WEBHOOK_VERIFY_TOKEN` darfst du stattdessen den Generator neben dem Wertefeld in Railway benutzen, falls einer da ist. **Unsicher:** ob der Knopf bei dir „Generate“ heißt oder ein Würfel-Symbol ist. Für `ENCRYPTION_KEY` bleibt der Befehl oben verbindlich.

### Variabeln auf `web`

| Variable | Wert | Wozu | Woher |
| --- | --- | --- | --- |
| `RAILPACK_NODE_VERSION` | `22` | Node-Version für den Build. Prisma 7 braucht mindestens 22.12 auf der 22er-Linie. | Fester Text |
| `NEXTAUTH_URL` | `https://${{RAILWAY_PUBLIC_DOMAIN}}` | Öffentliche Adresse. Login-Links, Instagram-Rückweg, Links in DMs. Ohne Schrägstrich am Ende. | Verweis auf die Domain aus Schritt 4. Erst setzen, nachdem du **Generate Domain** geklickt hast. |
| `NEXTAUTH_SECRET` | Ausgabe von `openssl rand -base64 32` | Signiert die Anmeldung und die Klick-Hashes. | Selbst erzeugt. Gleicher Wert auf `worker`. |
| `CRON_SECRET` | andere Ausgabe von `openssl rand -base64 32` | Schützt `/api/cron/*`. Die Routen akzeptieren sonst `NEXTAUTH_SECRET`. Ein eigener Wert ist der hier vorgesehene Weg. | Selbst erzeugt. Gleicher Wert auf `cron`. |
| `ENCRYPTION_KEY` | Ausgabe von `openssl rand -hex 32` | Verschlüsselt Instagram-Tokens. 64 Hex-Zeichen. | Selbst erzeugt. Gleicher Wert auf `worker`. |
| `DATABASE_URL` | `${{postgres.DATABASE_URL}}` | Postgres im privaten Netz. | Verweis, nicht die öffentliche `DATABASE_PUBLIC_URL`. |
| `REDIS_URL` | `${{redis.REDIS_URL}}?family=0` | Redis für die Warteschlange. `?family=0` steht in der Railway-Doku zu ioredis/BullMQ, damit die Namensauflösung IPv4 und IPv6 kann. | Verweis plus diese sechs Zeichen am Ende. Enthält die angezeigte URL schon ein `?`, nimm stattdessen `&family=0`. **Unsicher:** die frische Redis-URL von Railway hat nach jetziger Doku kein `?`. |
| `META_GRAPH_API_VERSION` | `v25.0` | Version der Meta-Schnittstelle. Das ist der Standard in `lib/env.ts` und `.env.example`. | Fester Text. **Unsicher:** ob Meta im Dashboard inzwischen eine höhere Version anzeigt. Lass `v25.0`, solange die Aufrufe nicht mit „unknown version“ fehlschlagen. |
| `RESEND_API_KEY` | der Schlüssel aus Resend, beginnt mit `re_` | Verschickt den Login-Link. Weglassen, wenn du `EMAIL_SERVER` setzt. | [resend.com](https://resend.com) → API Keys. |
| `EMAIL_FROM` | Absender, zum Beispiel `OpenReply <login@deine-domain.de>` | Absenderzeile der Login-Mail. Der Platzhalter `login@example.com` kommt nicht an. | Eine Adresse auf einer Domain, die du bei Resend verifiziert hast. Siehe den Hinweis unter der Tabelle. |
| `ALLOWED_EMAILS` | deine E-Mail, mehrere mit Komma | Nur diese Adressen dürfen sich anmelden. Groß- und Kleinschreibung egal. | Deine eigene Adresse. |
| `INSTAGRAM_APP_ID` | Zahl aus der Meta-App | Instagram-Login. Das ist **nicht** die Facebook-App-ID auf der Seite Basic. | Schritt 8. |
| `INSTAGRAM_APP_SECRET` | Geheimnis auf derselben Instagram-Seite | Tausch des Login-Codes und eine der zwei möglichen Webhook-Signaturen. | Schritt 8, Button **Show**. |
| `FACEBOOK_APP_SECRET` | App Secret unter Settings → Basic | Die andere mögliche Webhook-Signatur. Der Code prüft beide (`lib/meta/webhook.ts`). | Schritt 8. |
| `WEBHOOK_VERIFY_TOKEN` | der dritte Zufallswert | Meta schickt ihn beim Einrichten des Webhooks. Derselbe Text kommt gleich noch einmal in die Meta-Oberfläche. | Selbst erzeugt. |

`EMAIL_SERVER` statt Resend, nur wenn du einen eigenen Mailserver hast:

```text
smtps://login%40example.com:passwort@mail.example.de:465
```

`@` im Namen wird zu `%40`. Port 465 mit `smtps://` ist verschlüsselte Post, Port 587 mit `smtp://` ist STARTTLS. Steht `EMAIL_SERVER`, wird `RESEND_API_KEY` nicht benutzt (`lib/auth.ts`).

**Hinweis zu Resend ohne eigene Domain.** Resend erlaubt mit der mitgelieferten Adresse `onboarding@resend.dev` oft nur den Versand an die E-Mail des Resend-Kontos. Für dich allein reicht das, wenn du dich mit genau dieser Adresse anmeldest und sie in `EMAIL_FROM` und `ALLOWED_EMAILS` steht. **Unsicher:** ob Resend das 2026 noch so anbietet. Wenn der Login-Link nicht ankommt, brauchst du eine verifizierte Absender-Domain.

### Variablen auf `worker`

| Variable | Wert |
| --- | --- |
| `RAILPACK_NODE_VERSION` | `22` |
| `NEXTAUTH_URL` | `https://${{web.RAILWAY_PUBLIC_DOMAIN}}` |
| `NEXTAUTH_SECRET` | derselbe Wert wie auf `web` |
| `ENCRYPTION_KEY` | derselbe Wert wie auf `web` |
| `DATABASE_URL` | `${{postgres.DATABASE_URL}}` |
| `REDIS_URL` | `${{redis.REDIS_URL}}?family=0` |
| `META_GRAPH_API_VERSION` | `v25.0` |

Der Worker verschickt DMs und baut dabei Links mit `NEXTAUTH_URL`. Den Klick-Hash rechnet er mit `NEXTAUTH_SECRET`. Meta-Geheimnisse und Resend braucht er nicht. Die Token-Erneuerung läuft über die Webseite.

### Variablen auf `cron`

| Variable | Wert |
| --- | --- |
| `RAILPACK_NODE_VERSION` | `22` |
| `CRON_BASE_URL` | `http://${{web.RAILWAY_PRIVATE_DOMAIN}}:${{web.PORT}}` |
| `CRON_SECRET` | derselbe Wert wie auf `web` |

`CRON_BASE_URL` ist `http`, nicht `https`, und hat keinen Schrägstrich am Ende. Das ist das private Netz zwischen den Diensten. **Unsicher:** ob `${{web.PORT}}` schon vor dem ersten erfolgreichen Deploy von `web` einen Wert hat. Bleibt die Adresse leer, nimm den Port aus den Deploy-Logs von `web` und trag `http://web.railway.internal:DIESER_PORT` ein.

### Optionale Variablen

Leer lassen, bis etwas nicht passt. Die Standards stehen im Code.

| Variable | Standard | Wirkung | Wohin |
| --- | --- | --- | --- |
| `EMAIL_SERVER` | aus | Eigener SMTP-Server statt Resend | `web` |
| `COMMENT_POLL_INTERVAL_MS` | `300000` | Abstand, in dem der Worker verpasste Kommentare sucht (5 Minuten) | `worker` |
| `COMMENT_POLL_MAX_PER_SWEEP` | `30` | Höchstens so viele neue Kommentare pro Durchgang | `worker` |
| `COMMENT_POLL_LOOKBACK_HOURS` | `72` | Wie weit der Durchgang zurückschaut | `worker` |
| `DB_POOL_MAX` | `3` | Gleichzeitige Datenbankverbindungen pro Prozess | `web` und `worker`, nur ändern, wenn die Datenbank Verbindungen ablehnt |
| `HEALTH_STUCK_QUEUE_WAITING` | `25` | Ab so vielen wartenden Jobs gilt `/api/health` als gestört, wenn keiner bearbeitet wird | `web` |
| `FOLLOW_RECHECK_DELAYS_MS` | `20000,40000` | Wartezeiten, wenn eine Follow-Prüfung wiederholt wird | `worker` |
| `FOLLOW_RECHECK_ACK_MESSAGE` | aus | Kurzer Text, während die Follow-Prüfung läuft | `worker` |

Zernio-Schlüssel kommen nicht hierher. Die stehen in den Einstellungen der laufenden App, und diesen Weg lässt du aus.

## 6. Erster Deploy

1. Oben **Deploy** klicken, damit Variablen und Befehle gelten.
2. Beim Dienst `web` die Build-Logs öffnen. Erfolgreich ist: der Build endet, danach läuft `prisma migrate deploy` ohne Fehler, danach startet Next und der Healthcheck auf `/api/live` wird grün.
3. Danach `worker` deployen, falls er nicht schon mitgelaufen ist. In seinen Logs steht `[DM Worker] Started`.
4. `cron` einmal von Hand laufen lassen, sobald `web` gesund ist, oder bis 05:00 UTC warten. **Unsicher:** der Knopf heißt in der Cron-Ansicht **Run now** oder du benutzt später die Railway-CLI `railway cron run`. Ein Fehlschlag vor dem ersten erfolgreichen Web-Deploy ist normal.
5. Im Browser öffnen: `https://DEINE-DOMAIN/api/live`. Es kommt `{"status":"ok"}`.
6. Danach `https://DEINE-DOMAIN/api/health`. Erst wenn der Worker ein paar Sekunden läuft, ist `"status":"ok"` und `worker.healthy` ist `true`. Vorher ist `degraded` richtig. Datenbank, Redis und Queue sollen `ok` sein.

Wenn `/api/health` bei Redis `error` zeigt, prüf `REDIS_URL` inklusive `?family=0` und ob `web` und `worker` im selben Projekt liegen wie `redis`.

## 7. Instagram auf Business oder Creator stellen

In der Instagram-App, mit dem Konto, das später die DMs schickt:

1. Profil → Menü → **Einstellungen und Aktivitäten** (Settings and activity).
2. **Kontotyp und Tools** (Account type and tools).
3. **Zu einem professionellen Konto wechseln** und **Business** oder **Creator** wählen.

**Unsicher:** Instagram benennt diese Menüs oft um. Der Zielpunkt ist der Kontotyp „professionell“, also Business oder Creator. Ein persönliches Konto kann OpenReply nicht verbinden (`docs/setup.md`).

## 8. Meta-App anlegen

Öffne [developers.facebook.com/apps](https://developers.facebook.com/apps) und erstelle eine App.

1. Typ: **Business**.
2. Kontakt-E-Mail: eine Adresse, die du liest.
3. Wenn Meta einen Anwendungsfall fragt: Filter **All**, dann **Manage messaging and content on Instagram**. Das ist Instagram Login. Die Einträge „Create and manage ads with Marketing API“ und „Authenticate with Facebook Login“ erzeugen später einen anderen Login, den OpenReply nicht benutzt.
4. Den Marketing-API-Anwendungsfall wieder entfernen, falls er doch ausgewählt wurde. Er hat eigene Prüfanforderungen.

### Die drei Werte für Railway

Es gibt zwei App-IDs. Die auf der Seite **Settings → Basic** ist die Facebook-App-ID. Die brauchst du **nicht** als `INSTAGRAM_APP_ID`.

| Variable | Wo in der Meta-App |
| --- | --- |
| `INSTAGRAM_APP_ID` | Produkt Instagram → API setup with Instagram login. Eine Zahl. |
| `INSTAGRAM_APP_SECRET` | Dieselbe Seite, **Show** |
| `FACEBOOK_APP_SECRET` | **App settings → Basic → App secret → Show** |

Trag sie bei `web` ein und deploye erneut, bevor du den Webhook prüfst.

Die Anmeldung verlangt diese vier Berechtigungen (`lib/meta/oauth.ts`):

- `instagram_business_basic` — welches Instagram-Konto verbunden ist
- `instagram_business_manage_comments` — Kommentare lesen und öffentlich antworten
- `instagram_business_manage_messages` — die private Antwort schicken
- `instagram_business_manage_insights` — den täglichen Follower-Stand speichern

Die Login-Adresse schickt alle vier Namen auf einmal. Füge deshalb alle vier in der Meta-App hinzu. **Unsicher:** der Klickweg in der neuen Oberfläche. Such im Produkt Instagram unter „API setup with Instagram login“ oder unter „Permissions“. Fehlt ein Name, lehnt Instagram den Login ab, bevor OpenReply einen Token bekommt.

### Dein Konto als Tester einladen und annehmen

Im Entwicklungsmodus darf sich nur ein Konto verbinden, das eine Rolle an der App hat. Auch dein eigenes Konto. Sonst erscheint „Insufficient Developer Role“.

Erste Hälfte, bei Meta:

1. **App roles → Roles**. In der neueren Oberfläche auch im Instagram-Produkt unter **Generate access tokens**.
2. Abschnitt **Instagram testers** → hinzufügen → **exakt** dein Instagram-Benutzername.
3. Einladung senden.

Zweite Hälfte, in der Instagram-App mit diesem Konto:

1. Profil → Menü → **Einstellungen und Aktivitäten**.
2. **Apps und Websites** (ältere App: Website-Berechtigungen, dann Apps und Websites).
3. **Tester invites**.
4. Die Einladung annehmen.

Solange die Einladung offen ist, schlägt der Login weiter fehl. **Unsicher:** die deutschen Menünamen in der Instagram-App. Der Punkt heißt sinngemäß Tester-Einladungen unter Apps und Websites.

### Rücksprung-Adresse

Im Instagram-Produkt: **Set up Instagram business login** → **Business login settings**. Unter OAuth redirect URIs exakt diese Zeile, mit deiner Railway-Domain:

```text
https://DEINE-DOMAIN/api/instagram/callback
```

Kein Schrägstrich am Ende. Eine falsche Zeile endet mit „redirect_uri mismatch“. Die Embed-URL von Meta brauchst du nicht. OpenReply baut den Login selbst.

### Webhook

Die Webseite muss schon laufen und `WEBHOOK_VERIFY_TOKEN` muss deployed sein. Sonst kann Meta die Adresse nicht prüfen.

Ebenfalls im Instagram-Produkt, **Configure webhooks**:

- Callback-URL: `https://DEINE-DOMAIN/api/webhook`
- Verify token: exakt der Wert von `WEBHOOK_VERIFY_TOKEN`
- **Verify and save**

Wenn der Knopf grau bleibt: ins Token-Feld klicken und den Token noch einmal einfügen. Das Ändern der URL leert das Feld oft.

Danach die Felder abonnieren:

- `comments` — Kommentar-zu-DM
- `messages` — eingehende DMs, Story-Antworten und Taps auf Buttons

`messages` weglassen heißt: der Schalter „also reply when someone DMs these words“ wirkt an, es kommt aber nie ein Ereignis an. Button-Taps kommen über dasselbe Feld `messages` (`lib/meta/webhook.ts`). Ein extra Feld `messaging_postbacks` musst du nicht abonnieren.

Zum Probieren ohne echten Kommentar: bei `comments` auf **Test**, danach **Send to My Server**. Erst der zweite Klick schickt etwas. Danach sollte eine Zeile in der Datenbank-Tabelle `WebhookEvent` liegen. Die siehst du nur, wenn du in Postgres schaust. Für den späteren echten Test reicht die Seite **DM Logs**.

### App veröffentlichen, App Review erstmal nicht

Echte Kommentare kommen nur, wenn die App **Live** ist. Im Development-Modus liefert nur der Test-Knopf Ereignisse. Das ist der häufigste Grund für „es passiert nichts“.

1. Links **Publish**.
2. Vorher diese drei Adressen eintragen, sonst lässt Meta dich nicht veröffentlichen. Die Seiten liefert OpenReply mit:

```text
https://DEINE-DOMAIN/privacy
https://DEINE-DOMAIN/data-deletion
https://DEINE-DOMAIN/terms
```

3. Veröffentlichen.

Eine veröffentlichte App hat damit noch **Standard Access**. Der gilt für Konten mit einer Rolle: Admins, Entwickler, Instagram-Tester. Dein eigenes Konto ist dabei, sobald du die Tester-Einladung angenommen hast. **Advanced Access** für beliebige fremde Konten gibt es nur über App Review. Das brauchst du für dein eigenes Konto nicht. Die Texte dafür liegen in `META_APP_REVIEW.md`, falls du später doch fremde Konten anbinden willst. Dafür verlangt Meta unter anderem ein Dokument einer eingetragenen Firma.

## 9. In OpenReply anmelden und Instagram verbinden

1. `https://DEINE-DOMAIN/login` öffnen.
2. Deine E-Mail aus `ALLOWED_EMAILS` eintragen und den Link in der Mail öffnen. Schau auch in den Spam-Ordner. Kommt keine Mail, stimmen `RESEND_API_KEY` und `EMAIL_FROM` nicht, oder Resend darf diese Empfängeradresse nicht.
3. Den Bereich **Zernio** auf der Seite **Settings** überspringen. Den füllst du nicht aus.
4. Unter **Instagram Connection** den Button **Connect using your own Meta app** klicken. Oben in der Leiste heißt derselbe Weg **Connect Instagram**. Beide gehen auf `/api/instagram/connect`.
5. Bei Instagram zustimmen. Das Konto muss die Tester-Einladung schon angenommen haben, und die Rücksprung-Adresse muss eingetragen sein.
6. Zurück in OpenReply steht das Konto als **Connected**.

Erscheint eine Meldung, dass Variablen fehlen, fehlen auf `web` noch `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`, `NEXTAUTH_SECRET` oder ein gültiger `ENCRYPTION_KEY` (`lib/env.ts`).

## 10. Eine Keyword-Kampagne testen

1. `https://DEINE-DOMAIN/api/health` noch einmal laden. `worker.healthy` muss `true` sein.
2. In der App **Campaigns** → **Create Campaign**.
3. Einen Namen eintragen.
4. Bei **When someone comments on** „a specific post or reel“ wählen und einen vorhandenen Beitrag anklicken.
5. Bei **And this comment has** „a specific word or words“ wählen und `TEST` eintragen.
6. Den Schalter „also reply when someone DMs these words“ aus lassen. „an opening DM“ und „a follow requirement first“ bleiben aus. So ist der erste Test nur eine DM auf einen Kommentar.
7. Unter **And then, they will get** bei „a DM with a link“ einen kurzen Text schreiben, zum Beispiel `Test angekommen`. Der Text darf leer nicht sein.
8. **Go Live** klicken.
9. Mit einem **anderen** Instagram-Konto `TEST` unter diesen Beitrag kommentieren. Dein eigenes verbundenes Konto zählt nicht.
10. Die DM sollte ankommen. Unter **DM Logs** steht eine Zeile **SENT**.

Kommt nichts:

- **DM Logs** öffnen und die Fehlermeldung lesen.
- `/api/health` prüfen. Ist der Worker nicht gesund, kommen Webhooks an, aber niemand schickt die DM.
- In der Meta-App prüfen, ob sie **Live** ist und ob `comments` abonniert ist.
- Die App war vorher mit ManyChat oder einem anderen DM-Tool verbunden? Dann kann der erste Text ankommen und jeder spätere Button-Tap mit „not the thread owner“ fehlschlagen. In der Meta Business Suite unter **Settings → Integrations → Conversation routing** das alte Tool entfernen und bei deiner App **Access all conversations** und **Take control of conversations** einschalten (`docs/setup.md`). Für den schlichten Test ohne Button brauchst du das erst, wenn du Buttons benutzt.

## Wenn der Build fehlschlägt

- Node-Version: Builder auf Railpack stellen und `RAILPACK_NODE_VERSION=22` setzen, dann neu deployen.
- `Can't reach database server` während des Builds: die Migration darf nicht im Build-Befehl stehen. Sie gehört in den Pre-deploy-Befehl von `web`.
- `Can't reach database server` im Pre-deploy: `postgres` ist noch nicht aktiv, oder `DATABASE_URL` zeigt auf `DATABASE_PUBLIC_URL` oder auf einen Tippfehler im Dienstnamen.
- Healthcheck rot, die Seite läuft in den Logs: Path ist `/api/live`, nicht `/api/health`. Hostname-Befehl ist gesetzt. Kein eigener `PORT`.
- Worker beendet sich sofort: Start Command ist `npm run worker`, nicht `npm start`.

## Kurz zum Merken

Die Webseite empfängt. Der Worker schickt. Dieselbe Datenbank, dasselbe Redis, derselbe `ENCRYPTION_KEY`. Die Meta-App muss live sein, dein Konto muss die Tester-Einladung angenommen haben, und der Testkommentar kommt von einem zweiten Konto.
