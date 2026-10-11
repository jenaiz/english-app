# Despliegue en producción (VPS de bukios en Hetzner)

Fluently corre en el VPS de app de bukios, detrás del nginx compartido de bukios
(`bukios-app-nginx-1`), igual que getzui.com.

```
 navegador ──HTTPS──▶ nginx bukios (prod.conf, red bukios-app_app)
                         └─▶ fluently-web (nginx: SPA + proxy /api/)   ← única pieza en la red compartida
                                └─▶ fluently-api (Go :8080) ──▶ fluently-db (Postgres 16, volumen fluently_pgdata)
```

| Qué | Dónde |
|---|---|
| Dominio actual (**temporal**) | `fluently.bukios.com` |
| Servidor | `deploy@bukios.com`, clave `~/.ssh/bukios_deploy` |
| Directorio en el VPS | `/home/deploy/fluently` (`docker-compose.yml` + `.env`) |
| Secretos | `.env` en el VPS, generado en el primer deploy (`DB_PASSWORD`, `JWT_SECRET`); no salen del servidor |
| vhost nginx | `nginx/prod.conf` del repo bukios → `/opt/bukios/nginx/prod.conf`; copia de referencia en `deploy/nginx-fluently.conf` |
| Certificado | Let's Encrypt `fluently.bukios.com` (DNS-01 con Hetzner, renovación automática con `certbot.timer`) |

## Primer despliegue (una sola vez)

1. **DNS**: en Hetzner DNS, zona `bukios.com`, registro `A fluently` → IP pública del VPS de app (la misma que `bukios.com`).
2. **Certificado** (en el VPS). Hay que emitirlo **antes** de recargar nginx: si el fichero del certificado no existe, nginx no arranca y se cae también bukios.com.
   ```bash
   sudo certbot certonly --authenticator dns-hetzner \
     --dns-hetzner-credentials /etc/letsencrypt/hetzner.ini \
     --dns-hetzner-propagation-seconds 60 \
     --cert-name fluently.bukios.com -d fluently.bukios.com
   ```
3. **nginx**: commitear el bloque de Fluently en `nginx/prod.conf` del repo bukios, copiarlo a `/opt/bukios/nginx/prod.conf` y validar y recargar:
   ```bash
   docker exec bukios-app-nginx-1 nginx -t && docker exec bukios-app-nginx-1 nginx -s reload
   ```
   Mientras Fluently no esté desplegado, el dominio devuelve 502; bukios.com no se ve afectado.
4. **Deploy** desde local: `./deploy/deploy.sh --minor` (la versión pasa de 0.0.0 a 0.1.0).

## Despliegues normales

```bash
./deploy/deploy.sh            # patch: compila amd64, envía las imágenes por SSH, docker compose up y valida /api/health
./deploy/deploy.sh --no-bump  # reintentar la misma versión
./deploy/db-dump.sh           # descarga un pg_dump a ./db-backups/
```

Las migraciones SQL se aplican solas cuando arranca el backend.

## Login con Google

Opcional. Añade el Client ID al `.env` del VPS y recrea el backend:

```bash
ssh -i ~/.ssh/bukios_deploy deploy@bukios.com \
  "cd ~/fluently && echo 'GOOGLE_CLIENT_ID=<id>.apps.googleusercontent.com' >> .env && docker compose up -d backend"
```

El dominio (`https://fluently.bukios.com`) tiene que estar en los **orígenes de JavaScript autorizados** del cliente OAuth. Si cambias de dominio, añade también el nuevo. Detalles en el README principal.

## Google Analytics

Opcional. Solo se carga si el usuario acepta las cookies de analítica en el banner. Añade el ID de medición de GA4 y recrea el backend (el frontend lo lee de `/api/auth/config`):

```bash
ssh -i ~/.ssh/bukios_deploy deploy@bukios.com \
  "cd ~/fluently && echo 'GA_MEASUREMENT_ID=G-XXXXXXXXXX' >> .env && docker compose up -d backend"
```

Los textos legales (`/aviso-legal`, `/privacidad`, `/cookies`, `/terminos`, `/contacto`) toman los datos del titular de `frontend/src/lib/site.ts` (el NIF está pendiente: `xxx`).

Logs: `ssh -i ~/.ssh/bukios_deploy deploy@bukios.com 'cd ~/fluently && docker compose logs -f --tail 100'`

## Cambiar de dominio (al publicar)

`fluently.bukios.com` es provisional. Para pasar a un dominio propio (p. ej. `fluently.app`):

1. **DNS** del dominio nuevo hacia la IP del VPS. Si se quiere renovación DNS-01 como el resto, la zona tiene que estar en Hetzner DNS (la misma cuenta que `/etc/letsencrypt/hetzner.ini`).
2. **Certificado**: `certbot certonly ... --cert-name <dominio> -d <dominio> -d www.<dominio>`.
3. **nginx** (repo bukios `nginx/prod.conf` y `deploy/nginx-fluently.conf` aquí):
   - cambiar `server_name` y las rutas `ssl_certificate*`;
   - añadir el bloque de redirección de `www` al dominio raíz (ver el ejemplo de getzui.com);
   - dejar `fluently.bukios.com` con un `return 301 https://<dominio>$request_uri;` durante un tiempo.
4. **Deploy**: actualizar el valor por defecto de `DOMAIN` en `deploy/deploy.sh` (o exportar `DEPLOY_DOMAIN`).
5. **Sesiones**: la cookie `token` es host-only, así que los usuarios tendrán que volver a iniciar sesión en el dominio nuevo. Los datos no cambian.
6. **Google**: añadir el dominio nuevo a los orígenes de JavaScript autorizados del cliente OAuth.
7. Revisar menciones a `fluently.bukios.com` con `grep -rn fluently.bukios.com`.

## Mover a otro servidor

Todo el estado está en Postgres. Pasos: `./deploy/db-dump.sh`, después `pg_restore --no-owner --no-acl` en el destino y, por último, copiar el **mismo** `JWT_SECRET` desde el `.env` del VPS para que no se cierren las sesiones.
