# trusted-draws
A way to create trust between organisers and participants of lucky draws and lotteries.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a PostgreSQL database and set `DATABASE_URL`.
3. Run migrations:
   ```bash
   npm run migrate
   ```
4. Start the server:
   ```bash
   npm start
   ```

## MVP Phase 1

- Draw creation and management
- Entry submission system
- Basic draw execution
- Hashed result records with verification
- Simple admin panel and public draw page
