# OpenReply auf einem Hetzner-Server

Diese Anleitung ist für eine Person, die keine Befehle erfinden muss. Du klickst in Hetzner, fügst **eine** Zeile ein, und beantwortest ein paar Fragen. Am Ende läuft OpenReply nur auf diesem einen Server: die Webseite, der Dienst der die DMs schickt, die Datenbank, Redis, und ein Zertifikat für `https`.

Instagram wird über **deine eigene Meta-App** verbunden. Zernio brauchst du nicht. Railway ist seit dem 21. Oktober 2026 für neue Konten pausiert. Diese Anleitung benutzt Railway nicht.

Die Oberfläche von OpenReply ist Englisch. Die Buttons heißen deshalb so, wie sie im Programm stehen. Wo ein Knopf in Hetzner oder bei Meta woanders sitzen kann, steht **Unsicher:**.

Für dieses Konto gilt:

- Instagram-Kontotyp: **Business**
- Login-E-Mail: **hello@nadworker.de** (das Skript schlägt sie vor, Enter reicht)
- Vorschlag für die Adresse: **reply.nadworker.de**

## Was am Ende auf dem Server läuft

| Teil | Was es tut | Von außen erreichbar? |
| --- | --- | --- |
| Caddy | Holt das HTTPS-Zertifikat und leitet Besucher an die Webseite | Ja, Port 80 und 443 |
| `web` | Seite, Login, Instagram-Rückweg, Webhook. Legt beim Start die Datenbank an und spielt spätere Änderungen ein | Nur intern |
| `worker` | Schickt die DMs | Nur intern |
| `cron` | Erneuert das Instagram-Login jeden Tag um 05:00 UTC und speichert die Follower-Zahl. Alle 5 Minuten hängt es Kampagnen an ein neues Reel | Nur intern |
| Postgres | Kampagnen, Konten, Logs | Nur intern |
| Redis | Warteschlange für die DMs | Nur intern |

Der `ENCRYPTION_KEY` auf diesem Server entschlüsselt die Instagram-Tokens. Den kopierst du am Ende des Skripts in einen Passwort-Manager. Liegt er nur auf dem Server und die Platte ist weg, musst du Instagram neu verbinden.

## Was du vorher brauchst

- Ein Hetzner-Cloud-Konto mit hinterlegter Zahlungsart.
- Die Domain `nadworker.de`, bei der du einen DNS-Eintrag setzen darfst. Ohne Domain geht ein Notbehelf über `sslip.io` (Schritt 4).
- Ein Konto bei [Resend](https://resend.com) und ein API-Key. Die Login-Mails kommen von dort.
- Ein Facebook-Konto für die Meta-App. Die drei Meta-Geheimnisse darfst du beim Installieren leer lassen und später nachtragen.
- Ein zweites Instagram-Konto für den Test. OpenReply ignoriert Kommentare von deinem eigenen Business-Konto.

Preise auf der Hetzner-Seite, Stand der öffentlichen Preisliste: CX23 etwa 6 € im Monat (2 CPU, 4 GB RAM, 40 GB Platte), CX33 etwa 9 € im Monat (4 CPU, 8 GB RAM, 80 GB Platte), jeweils zuzüglich Mehrwertsteuer. **Unsicher:** der Betrag im Bestellfenster gilt, nicht diese Zahl.

Nimm **CX33**, wenn er in der Liste steht. Der erste Bau der App braucht viel Speicher. CX23 reicht, das Installationsskript legt dort automatisch 2 GB Auslagerungsspeicher an.

## 1. Server anlegen

1. Öffne [console.hetzner.cloud](https://console.hetzner.cloud) und melde dich an.
2. Ein Projekt öffnen oder **New project** anlegen. Name zum Beispiel `openreply`.
3. **Add server** (deutsch oft **Server hinzufügen**).
4. Standort: **Nürnberg** (Nuremberg, NBG1). Falkenstein (FSN1) ist genauso in Ordnung, wenn CX23 oder CX33 dort in der Liste steht. **Unsicher:** die günstige CX-Reihe zeigt Hetzner auf der Preisseite für Nürnberg und Helsinki. Fehlt der Typ in Falkenstein, nimm Nürnberg.
5. Image: **Ubuntu 24.04**.
6. Typ: **CX33**. Wenn du den kleineren willst: **CX23**. Beide liegen unter Shared / Cost-Optimized. **Unsicher:** die Gruppe heißt in der Oberfläche „Shared vCPU“ oder „Cost-Optimized“.
7. Netz: öffentliche IPv4 bleibt an. IPv6 darfst du an lassen.
8. SSH-Key: **keinen** hinzufügen, wenn du dich nicht von deinem eigenen Computer per SSH verbinden willst. Hetzner schickt das Root-Passwort dann per E-Mail. Die Web-Konsole im nächsten Schritt braucht dieses Passwort.
9. Name des Servers: `openreply`.
10. **Create & Buy now** (deutsch ungefähr **Erstellen & kostenpflichtig bestellen**). **Unsicher:** der genaue deutsche Wortlaut.

Danach steht in der Serverliste eine IPv4-Adresse, vier Zahlen mit Punkten, zum Beispiel `203.0.113.5`. Die brauchst du für den DNS-Eintrag. Lass das Fenster offen.

### Web-Konsole, ohne SSH auf deinem Computer

1. Den Server `openreply` anklicken.
2. Oben rechts das **Konsolen-Symbol** (Bildschirm-Icon). Die Hetzner-Doku nennt es die Console. **Unsicher:** es kann auch ein Menüpunkt **Console** sein.
3. Es öffnet sich ein schwarzes Fenster im Browser.
4. Login: `root`
5. Passwort: das aus der Hetzner-Mail. Beim Tippen bleibt es unsichtbar. Enter.
6. Einfügen: in der Konsole gibt es oft ein Klemmbrett-Symbol. Sonst Rechtsklick. **Unsicher:** die Taste dafür.

Wenn du doch einen SSH-Key gesetzt hast und keine Mail mit Passwort kam: am Server **Reset root password** suchen. In der älteren Ansicht liegt das unter **Rescue**. Das neue Passwort erscheint in der Hetzner-Oberfläche. **Unsicher:** der Menüpunkt wandert. Danach in der Web-Konsole als `root` anmelden.

Du bist richtig, wenn eine Zeile auf `#` endet.

## 2. DNS: reply.nadworker.de

Die Adresse muss auf die IPv4 des neuen Servers zeigen, bevor das Zertifikat klappt.

1. Öffne die Verwaltung von `nadworker.de` (dort, wo du die Domain gekauft hast, oder Hetzner DNS).
2. Neuen Eintrag vom Typ **A**.
3. Name / Host: `reply`. Manche Oberflächen wollen `reply.nadworker.de`. Nicht `@` eintragen, das wäre die nackte Domain.
4. Wert / Ziel: die IPv4 aus der Hetzner-Serverliste.
5. Speichern.

**Unsicher:** ob `nadworker.de` bei Hetzner DNS, in der Cloud-Console unter DNS, oder bei einem anderen Anbieter liegt. Der Eintragstyp heißt überall A.

Warte ein paar Minuten. Prüfung später: die Seite muss `https://reply.nadworker.de` sein, nicht die nackte IP.

### Ohne Domain, nur zum Probieren

Wenn der A-Eintrag noch nicht geht, nimm als Domain im Skript die Server-IP mit `.sslip.io` dahinter. Aus `203.0.113.5` wird `203.0.113.5.sslip.io`. Let's Encrypt stellt dafür ein Zertifikat aus, solange Port 80 offen ist. **Unsicher:** sslip.io ist ein fremder Dienst. Für den echten Betrieb ist `reply.nadworker.de` die Adresse, die du bei Meta einträgst. Wechselst du später die Domain, musst du `NEXTAUTH_URL` und die Meta-Adressen ändern. Dafür ist ein zweites Mal installieren mit neuer Domain der saubere Weg, die Schlüssel in der `.env` bleiben dabei erhalten, weil das Skript eine vorhandene `.env` nicht neu würfelt. Die Domain in der `.env` änderst du dann von Hand und startest neu. Einfacher ist, den DNS-Eintrag vor dem ersten Lauf zu setzen.

## 3. Der eine Installationsbefehl

In der Web-Konsole als root diese **eine** Zeile einfügen und Enter drücken:

```bash
curl -fsSL https://raw.githubusercontent.com/nvgii/openreply/cursor/railway-deploy-1204/deploy/hetzner/install.sh -o /tmp/openreply-install.sh && bash /tmp/openreply-install.sh
```

Nicht `curl ... | bash` verwenden. Dann kann das Skript keine Fragen stellen.

Es installiert Docker, öffnet in der Firewall nur die Ports 22, 80 und 443, holt das Repository, erzeugt die Schlüssel und startet alles. Der Bau dauert mehrere Minuten. Die Platte arbeitet, das Fenster darf offen bleiben.

Fragen, in dieser Reihenfolge:

| Frage | Was du tust |
| --- | --- |
| Domain oder Subdomain | Enter für `reply.nadworker.de`, oder die sslip.io-Adresse |
| Login-E-Mail | Enter für `hello@nadworker.de` |
| Resend API-Key | Den Key aus Resend einfügen. Er beginnt mit `re_` |
| Absender der Login-Mail | Enter für `OpenReply <hello@nadworker.de>`, wenn `nadworker.de` bei Resend als Absender-Domain verifiziert ist |
| INSTAGRAM_APP_ID | Enter, wenn du die Meta-App noch nicht hast |
| INSTAGRAM_APP_SECRET | Enter zum Überspringen |
| FACEBOOK_APP_SECRET | Enter zum Überspringen |

Am Ende druckt das Skript zwei Werte. Beide in einen Passwort-Manager kopieren, nicht in einen Chat:

- `ENCRYPTION_KEY` — 64 Zeichen, nur `0-9` und `a-f`. Ohne ihn sind die Instagram-Tokens unlesbar.
- `WEBHOOK_VERIFY_TOKEN` — denselben Text trägst du später bei Meta ein.

Sie stehen außerdem nur für root lesbar in `/opt/openreply/deploy/hetzner/.env`.

Eine Hetzner-Firewall musst du nicht extra bauen. Die Firewall auf dem Server macht das Skript. Hängst du in Hetzner zusätzlich eine Cloud-Firewall an den Server, müssen darin 22, 80 und 443 offen sein. **Unsicher:** ob dein Projekt schon so eine Firewall hat. Im Zweifel keine anhängen.

## 4. Prüfen, ob es lebt

Im Browser:

1. `https://reply.nadworker.de/api/live`  
   Es muss `{"status":"ok"}` kommen. Das sagt nur: die Webseite antwortet.
2. `https://reply.nadworker.de/api/health`  
   `"status":"ok"` und `worker.healthy` ist `true`. Direkt nach dem Start kann ein paar Sekunden `degraded` stehen, dann neu laden.

Kommt eine Zertifikatswarnung: der DNS-Eintrag zeigt noch nicht auf den Server, oder Caddy ist noch beim Holen des Zertifikats. Zwei Minuten warten und neu laden.

Logs, wieder als root in der Konsole:

```bash
cd /opt/openreply/deploy/hetzner && docker compose --env-file .env logs --tail 80 caddy web worker
```

## 5. Instagram auf Business stellen

In der Instagram-App, mit dem Konto, das die DMs schicken soll:

1. Profil → Menü → **Einstellungen und Aktivitäten**.
2. **Kontotyp und Tools**.
3. **Zu einem professionellen Konto wechseln** und **Business** wählen.

**Unsicher:** Instagram benennt die Menüs oft um. Der Kontotyp muss professionell sein, und für dieses Konto Business. Ein privates Konto lässt sich nicht verbinden.

## 6. Meta-App

Öffne [developers.facebook.com/apps](https://developers.facebook.com/apps) und erstelle eine App.

1. Typ: **Business**.
2. Kontakt-E-Mail: eine Adresse, die du liest. `hello@nadworker.de` passt.
3. Wenn Meta einen Anwendungsfall fragt: Filter **All**, dann **Manage messaging and content on Instagram**. Das ist Instagram Login. „Create and manage ads with Marketing API“ und „Authenticate with Facebook Login“ erzeugen einen anderen Login, den OpenReply nicht benutzt.
4. Den Marketing-API-Anwendungsfall wieder entfernen, falls er doch ausgewählt wurde.

### Die drei Werte auf den Server bringen

Es gibt zwei App-IDs. Die Zahl unter **Settings → Basic** ist die Facebook-App-ID. Die kommt **nicht** in `INSTAGRAM_APP_ID`.

| Variable | Wo in der Meta-App |
| --- | --- |
| `INSTAGRAM_APP_ID` | Produkt Instagram → API setup with Instagram login. Eine Zahl. |
| `INSTAGRAM_APP_SECRET` | Dieselbe Seite, **Show** |
| `FACEBOOK_APP_SECRET` | **App settings → Basic → App secret → Show** |

In der Hetzner-Web-Konsole als root:

```bash
bash /opt/openreply/deploy/hetzner/update.sh env
```

Die drei Werte einfügen. Enter bei einer Frage lässt den alten Wert stehen. Das Skript startet Webseite und Worker neu. Den `WEBHOOK_VERIFY_TOKEN` lässt es in Ruhe.

Die Anmeldung verlangt diese vier Berechtigungen (`lib/meta/oauth.ts`):

- `instagram_business_basic`
- `instagram_business_manage_comments`
- `instagram_business_manage_messages`
- `instagram_business_manage_insights`

Die Login-Adresse schickt alle vier auf einmal. Füge alle vier in der Meta-App hinzu. **Unsicher:** der Klickweg. Such im Produkt Instagram unter „API setup with Instagram login“ oder unter „Permissions“.

### Dein Konto als Tester

Im Entwicklungsmodus darf sich nur ein Konto verbinden, das eine Rolle an der App hat. Auch deins. Sonst steht da „Insufficient Developer Role“.

Bei Meta:

1. **App roles → Roles**. In der neueren Oberfläche auch unter Instagram → **Generate access tokens**.
2. **Instagram testers** → deinen Instagram-Benutzernamen, exakt.
3. Einladung senden.

In der Instagram-App mit diesem Konto:

1. Profil → Menü → **Einstellungen und Aktivitäten**.
2. **Apps und Websites**.
3. **Tester invites**.
4. Annehmen.

**Unsicher:** die deutschen Menünamen. Der Punkt heißt sinngemäß Tester-Einladungen unter Apps und Websites.

### Rücksprung-Adresse

Im Instagram-Produkt: **Set up Instagram business login** → **Business login settings**. Unter OAuth redirect URIs exakt, ohne Schrägstrich am Ende:

```text
https://reply.nadworker.de/api/instagram/callback
```

Eine falsche Zeile endet mit „redirect_uri mismatch“. Die Embed-URL von Meta brauchst du nicht.

### Webhook

Die Seite muss schon `https://reply.nadworker.de/api/live` liefern. Sonst kann Meta sie nicht prüfen.

Ebenfalls im Instagram-Produkt, **Configure webhooks**:

- Callback-URL: `https://reply.nadworker.de/api/webhook`
- Verify token: der `WEBHOOK_VERIFY_TOKEN` aus dem Installationsende oder aus der Datei `/opt/openreply/deploy/hetzner/.env`
- **Verify and save**

Wird der Knopf grau: ins Token-Feld klicken und den Token noch einmal einfügen.

Danach abonnieren:

- `comments` — Kommentar-zu-DM
- `messages` — eingehende DMs, Story-Antworten und Taps auf Buttons

Button-Taps kommen über `messages`. Ein extra Feld `messaging_postbacks` brauchst du nicht.

Zum Probieren ohne echten Kommentar: bei `comments` auf **Test**, danach **Send to My Server**. Erst der zweite Klick schickt etwas.

### Veröffentlichen

Echte Kommentare kommen nur, wenn die App **Live** ist. Im Development-Modus liefert nur der Test-Knopf Ereignisse.

1. Links **Publish**.
2. Vorher diese drei Adressen eintragen:

```text
https://reply.nadworker.de/privacy
https://reply.nadworker.de/data-deletion
https://reply.nadworker.de/terms
```

3. Veröffentlichen.

Dein eigenes Konto braucht keine App-Prüfung, sobald es die Tester-Einladung angenommen hat. App Review ist nur für fremde Konten, die keine Rolle an der App haben. Dafür verlangt Meta unter anderem ein Firmen-Dokument. Für dieses eine Business-Konto lässt du das weg.

## 7. Anmelden und eine Kampagne testen

1. `https://reply.nadworker.de/login` öffnen.
2. `hello@nadworker.de` eintragen. Den Link in der Mail öffnen, auch im Spam schauen.
3. Den Bereich **Zernio** auf **Settings** leer lassen.
4. Unter **Instagram Connection** auf **Connect using your own Meta app** klicken. Oben heißt derselbe Weg **Connect Instagram**.
5. Bei Instagram zustimmen.
6. Das Konto steht als **Connected**.

Fehlt eine Meldung zu Variablen, fehlen `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`, `NEXTAUTH_SECRET` oder ein gültiger `ENCRYPTION_KEY`. Die Meta-Werte trägst du mit `update.sh env` nach.

Kampagne:

1. `https://reply.nadworker.de/api/health` neu laden. `worker.healthy` muss `true` sein.
2. **Campaigns** → **Create Campaign**.
3. Einen Namen eintragen.
4. **When someone comments on** → „a specific post or reel“ → einen Beitrag anklicken.
5. **And this comment has** → „a specific word or words“ → `TEST`.
6. „also reply when someone DMs these words“, „an opening DM“ und „a follow requirement first“ aus lassen.
7. Unter **And then, they will get** bei „a DM with a link“ einen kurzen Text, zum Beispiel `Test angekommen`.
8. **Go Live**.
9. Mit einem **anderen** Instagram-Konto `TEST` unter den Beitrag schreiben.
10. Unter **DM Logs** steht **SENT**, und die DM kommt an.

OpenReply beantwortet nur Kommentare, die geschrieben wurden, **nachdem die Kampagne gestartet ist**. Der Start ist das Anlegen oder das Wieder-Einschalten nach einer Pause. Kommentare von davor bleiben liegen. Das gilt auch für Kommentare, die ManyChat oder du schon per DM beantwortet hast: die bekommen keine zweite DM.

Kommt nichts: **DM Logs** und `/api/health` prüfen. Die Meta-App muss Live sein, und `comments` muss abonniert sein. War das Konto bei ManyChat oder einem anderen DM-Tool, in der Meta Business Suite unter **Settings → Integrations → Conversation routing** das alte Tool entfernen und bei deiner App **Access all conversations** und **Take control of conversations** einschalten. Für den Test ohne Button brauchst du das erst, wenn später Buttons nichts tun und der Log „not the thread owner“ sagt.

## 8. Später aktualisieren

Neue Programmversion, als root:

```bash
bash /opt/openreply/deploy/hetzner/update.sh
```

Das holt den Branch `cursor/railway-deploy-1204` und baut die Container neu. Beim Start spielt die Webseite neue Datenbank-Änderungen ein. Der Dienst, der die DMs schickt, wartet darauf. Die `.env` und die gespeicherten Daten bleiben. Änderungen, die du von Hand in den Programmdateien auf dem Server gemacht hast, werden überschrieben.

Kampagnen, die schon laufen, merken sich beim Update den aktuellen Zeitpunkt. Kommentare von davor werden nicht nachgeholt.

Meta-Werte nachtragen oder ersetzen:

```bash
bash /opt/openreply/deploy/hetzner/update.sh env
```

Datenbank-Kopie auf dem Server, als root. Das ersetzt nicht die Sicherung des `ENCRYPTION_KEY`:

```bash
cd /opt/openreply/deploy/hetzner && docker compose --env-file .env exec -T postgres pg_dump -U openreply openreply > /root/openreply-backup.sql && chmod 600 /root/openreply-backup.sql
```

`docker compose down -v` löscht die Datenbank. Diesen Befehl nicht ausführen.

## Wenn der erste Start hakt

- `https://…/api/live` lädt nicht: DNS-A-Eintrag und `docker compose logs caddy` im Ordner `/opt/openreply/deploy/hetzner`.
- Der Bau bricht wegen Speicher ab: der Server ist zu klein, oder die 2-GB-Auslagerung fehlt. CX33 hat 8 GB. Nochmal `bash /tmp/openreply-install.sh` starten. Eine vorhandene `.env` wird nicht neu gewürfelt.
- `/api/health` zeigt Redis-Fehler: `docker compose logs redis web worker`.
- Keine Login-Mail: Resend-Key und Absender. `nadworker.de` muss bei Resend als Absender-Domain verifiziert sein, sonst kommt `OpenReply <hello@nadworker.de>` nicht an. **Unsicher:** ob Resend mit der Adresse `onboarding@resend.dev` noch nur an die E-Mail des Resend-Kontos sendet. Wenn `hello@nadworker.de` keine Mail bekommt, die Domain in Resend verifizieren.
