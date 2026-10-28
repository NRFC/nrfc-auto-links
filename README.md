# NRFC Auto Links

## Local WordPress Site

With Docker and Docker Compose installed, run from this directory:

```bash
docker compose up -d && docker compose logs -f
```

Wait for the setup service to exit successfully. It installs WordPress and
activates NRFC Auto Links automatically; no browser installation wizard is needed.

- Site: http://localhost:8080
- Admin: http://localhost:8080/wp-admin/
- Username: `admin`
- Password: `local-dev-password`
- Plugin settings: **Settings > NRFC Auto Links**

This is a local development environment, not a production deployment. The web
port is bound to the host's loopback interface and the database is not published.
The default credentials are for local use only. Set `WORDPRESS_ADMIN_USER`,
`WORDPRESS_ADMIN_PASSWORD`, `WORDPRESS_ADMIN_EMAIL`, `WORDPRESS_TITLE`, or
`WORDPRESS_PORT` in a local `.env` file to override the defaults before first
startup. The port also determines the initial WordPress URL.

WordPress files/uploads and the database persist in named volumes. Setup is safe
to rerun: it skips an existing installation and ensures the plugin is active.
Changing admin settings or the port after installation does not update the stored
credentials or site URL; update those in WordPress or reset the local site.
The plugin entry file and `src/` directory are bind-mounted read-only, so source
edits are available immediately without exposing local configuration or test files.
The Dockerfile also includes the plugin in the image for use without that mount.

Stop the site while keeping its data:

```bash
docker compose down
```

To delete the local site and database and start fresh (destructive):

```bash
docker compose down --volumes
docker compose up -d && docker compose logs -f
```

## Access the database

```bash
docker compose exec db mysql -uwordpress -pwordpress wordpress
```

## Run a wp command

```bash
docker run --rm -it \
    --user="33:33" \
    -v wordpress_data:/var/www/html \
    -v ./nrfc-auto-links.php:/var/www/html/wp-content/plugins/nrfc-auto-links/nrfc-auto-links.php:ro \
    -v ./src:/var/www/html/wp-content/plugins/nrfc-auto-links/src:ro \
    -e WORDPRESS_DB_HOST=db \
    -e WORDPRESS_DB_USER=wordpress \
    -e WORDPRESS_DB_PASSWORD=wordpress \
    -e WORDPRESS_DB_NAME=wordpress \
    --entrypoint wp "${CMD}"\
    wordpress:cli-php8.4
```

## Browser Tests

With Node.js 20.12+ and Docker Compose installed:

```bash
yarn install
yarn playwright install
yarn test:e2e
```

Playwright starts Docker Compose and waits for WordPress setup to complete before
opening the front page in Chromium, Firefox, and WebKit. It stops the Compose
services after the run, preserving their data. This also stops an already-running
local Compose site. The test URL uses `WORDPRESS_PORT` from the environment or
the local `.env` file, defaulting to `8080`.

## Unit Tests

This plugin now includes a PHPUnit unit test setup focused on the auto-link rule engine.

## What's Included

- `composer.json` with PHPUnit as a dev dependency
- `phpunit.xml.dist` test configuration
- `tests/bootstrap.php` bootstrap file
- `tests/RuleEngineTest.php` initial test coverage for rule application behavior
- `src/class-nrfc-auto-links.php` extracted, testable rule engine

## Run Tests

From the plugin directory:

```bash
composer install
composer test
```

If Composer is not available on your host, you can run it in Docker:

```bash
docker run --rm -u "$(id -u):$(id -g)" -v "$(pwd):/app" -w /app/wordpress/wp-content/plugins/nrfc-auto-links composer:2 install

docker run --rm -u "$(id -u):$(id -g)" -v "$(pwd):/app" -w /app/wordpress/wp-content/plugins/nrfc-auto-links composer:2 composer test
```
