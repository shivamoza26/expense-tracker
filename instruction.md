# PulsePay Expense Tracker: Setup Instructions

Use this guide to set up the project on a new computer and ask an LLM for help if anything fails. The project has a React/Vite frontend, a Spring Boot backend, and a PostgreSQL database.

## 1. Install prerequisites

Install these before starting:

- **Git**, if you are cloning the repository.
- **Java 21 JDK** (not just a JRE).
- **Apache Maven 3.6.3 or newer**.
- **Node.js 20.19+ or 22.12+** and npm. These versions satisfy the Vite version in this project.
- **PostgreSQL 16** or Docker Desktop / Docker Engine to run PostgreSQL in a container.

Check installations in a terminal:

```bash
java -version
mvn -version
node -v
npm -v
git --version
```

## 2. Get the project

If you received the project folder, open a terminal in that folder. If you received a repository URL instead:

```bash
git clone <repository-url>
cd expense-tracker-fullstack
```

The project root is the folder containing `backend/`, `frontend/`, and `setup_fullstack.sh`.

## 3. Start PostgreSQL

The backend is configured to connect to a local PostgreSQL database using:

- Database: `pulsepay_db`
- Username: `postgres`
- Password: `postgres`
- Host and port: `localhost:5432`

These are development defaults in `backend/src/main/resources/application.properties`. They are intended for local development.

### Option A: PostgreSQL in Docker

Start a new local database container:

```bash
docker run --name pulsepay-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=pulsepay_db \
  -p 5432:5432 \
  -d postgres:16
```

If you already created the container and stopped it, start it again with:

```bash
docker start pulsepay-postgres
```

If port `5432` is already occupied, stop the other PostgreSQL service or ask an LLM to help change the port consistently in PostgreSQL and `application.properties`.

### Option B: PostgreSQL installed on the computer

Start the PostgreSQL service, then create the database. For example, with `psql` available and a PostgreSQL superuser named `postgres`:

```bash
psql -U postgres -h localhost -c "CREATE DATABASE pulsepay_db;"
```

Set the local `postgres` user's password to `postgres`, or update the username/password in `backend/src/main/resources/application.properties` to match your local PostgreSQL account. If the database already exists, do not create it again.

## 4. Install frontend dependencies

In a terminal:

```bash
cd frontend
npm ci
```

`npm ci` uses the committed `package-lock.json` to install the project's exact dependency versions.

## 5. Start the backend and initialize data

Make sure PostgreSQL is running and the `pulsepay_db` database exists. In a separate terminal, from the project root:

```bash
cd backend
mvn spring-boot:run
```

On startup, the backend creates/updates database tables through Hibernate, then initializes categories from `backend/src/main/resources/data.sql`. It also creates a demo account and sample expenses through `DemoDataInitializer` if they are missing. You do not need to manually populate tables for a fresh local setup.

The demo login is:

- Email: `demo@pulsepay.in`
- Password: `Demo@12345`

The initializer creates sample transactions spanning 2023–2026 so the dashboard charts and category breakdown have data. It checks for existing demo entries before adding them, so restarting the backend does not normally duplicate the seeded expenses.

Leave this terminal running. The backend API is at `http://localhost:8080/api/v1`.

## 6. Start the frontend

In another terminal:

```bash
cd frontend
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`, then sign in with the demo email and password above. You can also register a new account from the app; demo expenses belong to the demo account.

## 7. Stop and restart

- Stop each running frontend/backend terminal with **Ctrl+C**.
- Keep the Docker database between sessions and restart it with `docker start pulsepay-postgres`.
- Start the backend first, then the frontend.
- Database records persist between restarts. To reset the demo database, delete/recreate `pulsepay_db`; the backend will rebuild tables and seed categories and demo data on the next start.

## Troubleshooting

- **Backend cannot connect to PostgreSQL:** confirm PostgreSQL is running, listening on port `5432`, and that the database name and credentials match `application.properties`.
- **Database does not exist:** create `pulsepay_db` using the database steps above.
- **Port 8080 or 5173 is busy:** stop the application using that port or ask an LLM to help select another port and update the configuration where needed.
- **Frontend shows a network/API error:** confirm the backend started successfully at port `8080`; the frontend defaults to `http://localhost:8080/api/v1`.
- **Maven cannot download dependencies:** check internet access and retry `mvn spring-boot:run`.
- **Node reports an unsupported engine:** install Node.js 20.19+ or 22.12+ and run `npm ci` again.

## Prompt to give an LLM

You can give an LLM this file together with the project folder and say:

> Help me set up and run this PulsePay Expense Tracker project on my computer by following `instruction.md`. First identify my operating system and which prerequisites are already installed. Then guide me through any missing installations, starting PostgreSQL, installing frontend dependencies, starting the backend and frontend, and signing in with the demo account. Explain commands before asking me to run them, adapt paths and commands to my operating system, and troubleshoot errors using the actual project files. Do not overwrite or delete my database or project files without asking me first.
