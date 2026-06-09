# Server-Cheatsheet (Hetzner)

Schnellreferenz für Betrieb & Deployment auf dem Hetzner-Server.
Ersetze `DEINE-SERVER-IP` durch die echte IP. Alle Docker-Befehle laufen im
Projektordner (`cd ~/wohnungs-scan`).

> Voraussetzung: lokal committen + pushen, **dann** auf dem Server `git pull`.
> Die `.env.production.local` und der `data/`-Ordner sind git-ignoriert und
> werden bei `git pull` / Rebuild nie überschrieben.

---

## 1. Einloggen
```bash
ssh root@DEINE-SERVER-IP
```
(1Password bestätigt den SSH-Key per Touch ID. Kürzer geht's per Alias — siehe unten.)

## 2. Ins Projekt wechseln
```bash
cd ~/wohnungs-scan
```

## 3. Neuesten Code holen
```bash
git pull
```

## 4. Neu deployen (Image neu bauen + starten)
```bash
docker compose up -d --build
```
`-d` = Hintergrund, `--build` = mit neuem Code neu bauen. Dauert ein paar Minuten.

## 5. Logs ansehen
```bash
docker compose logs -f                                   # live (Strg+C beendet)
docker compose logs --tail 100                           # letzte 100 Zeilen
docker compose logs --tail 200 | grep -i scheduler       # nur Scheduler
docker compose logs --tail 500 | grep -iE "scraped|error|blocked|email|quiet"
```

## 6. Status prüfen
```bash
docker compose ps          # läuft / "healthy"?
docker stats --no-stream   # CPU/RAM des Containers
free -h                    # Server-RAM
df -h                      # Speicherplatz
```

## 7. Stoppen / Starten / Neustarten
```bash
docker compose restart     # neu starten (ohne Rebuild)
docker compose stop        # anhalten
docker compose up -d       # wieder starten
docker compose down        # Container entfernen (data/-Volume bleibt erhalten)
```

## 8. Einstellungen / Secrets bearbeiten
```bash
nano .env.production.local      # bearbeiten → Strg+O, Enter, Strg+X
docker compose up -d --build    # danach neu deployen, damit es greift
```
Wichtige Variablen u. a.: `SCRAPE_INTERVAL_MS`, `QUIET_HOURS_START` / `QUIET_HOURS_END`,
`RESEND_API_KEY`, `NOTIFY_EMAIL_TO`, `BROWSER_POOL_MAX`. Filter-Werte
(`NEXT_PUBLIC_MIN_ROOM_SIZE` etc.) wirken erst nach einem **Rebuild**.

## 9. Daten ansehen (was wurde gefunden?)
```bash
head -50 data/snapshots.json    # aktueller Stand pro Anbieter
# Anzahl gespeicherter Wohnungen (node läuft sonst im Container):
docker compose exec wohnungs-scan node -e 'const s=require("./data/offers.json");console.log(Object.keys(s.offers).length,"Wohnungen im Gedaechtnis")'
```

## 10. Typischer Update-Ablauf in einem Rutsch
```bash
cd ~/wohnungs-scan && git pull && docker compose up -d --build && docker compose logs -f
```
Beim ersten Durchlauf auf `Initializing scheduler` und `Successfully scraped … offerCount: N` achten.

## 11. Rollback (falls ein Deploy kaputt ist)
```bash
git reset --hard HEAD~1          # eine Version zurück
docker compose up -d --build
```
(`data/` bleibt erhalten — Rollback ist gefahrlos.)

---

## Optional: kürzeres Einloggen per Alias
Einmalig **auf dem Mac** in `~/.ssh/config` ergänzen:
```
Host hetzner
    HostName DEINE-SERVER-IP
    User root
```
Danach genügt: `ssh hetzner`

---

## Worauf in den Logs achten
| Meldung | Bedeutung |
|---|---|
| `Initializing scheduler` | Hintergrund-Wecker gestartet ✅ |
| `Starting scrape cycle` | eine Runde beginnt |
| `Successfully scraped … offerCount: N` | Anbieter erfolgreich, N Treffer |
| `Sent new offers email` | Mail mit neuen Wohnungen raus |
| `appears to be blocking us — backing off` | Anbieter hat gesperrt → 1 h Pause + Warn-Mail |
| `Skipping … quiet hours` / `pausing until window ends` | Nacht-Pause aktiv |
| `Protocol error` / `Failed to launch` | Browser-Problem → genauer hinschauen |
