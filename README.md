# RecoverWatch

A full-stack web application that helps theft victims monitor online marketplaces for stolen items using AI-powered matching.

## Features

- **Item Registry** - Register stolen items with photos or detailed descriptions
- **Marketplace Scanner** - Automated scanning of eBay (via Browse API) and Craigslist (via RSS)
- **AI Match Analysis** - Claude vision and text analysis scores listing similarity (High/Possible/Unlikely)
- **Paste a Listing** - Manual check flow for Facebook Marketplace and other platforms
- **Alert Dashboard** - Card-based UI with match confidence badges and AI explanations
- **Case File Export** - HTML report (printable to PDF) for law enforcement or insurance
- **DMCA Report Template** - Pre-filled stolen property reports for eBay

## Tech Stack

- **Frontend**: React 18 + Tailwind CSS + Vite
- **Backend**: Node.js + Express
- **Database**: SQLite (better-sqlite3)
- **AI**: Anthropic Claude API (claude-sonnet-4-20250514)
- **Image Processing**: sharp for resizing, multer for uploads
- **Scheduling**: node-cron for periodic marketplace scans

## Quick Start

### 1. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:

```
ANTHROPIC_API_KEY=sk-ant-...    # Required for AI matching
EBAY_APP_ID=your-ebay-app-id   # Optional - get from developer.ebay.com
PORT=3001                        # Server port
```

### 2. Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

### 3. Start the app

In two terminal windows:

```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm run dev
```

The app will be available at `http://localhost:5173`.

### Getting eBay API Credentials

1. Go to [developer.ebay.com](https://developer.ebay.com/)
2. Create a developer account
3. Create an application (Production keys)
4. Copy the App ID (Client ID) to your `.env` file

eBay scanning is optional - the app works without it using Craigslist and manual listing analysis.

## How It Works

1. **Add an item** - Upload photos or describe your stolen property in detail
2. **Configure scanning** - Set your city, search radius, and scan frequency (6h/12h/daily)
3. **AI generates keywords** - Claude creates search term variants from your item description
4. **Automated scanning** - node-cron triggers marketplace searches on your schedule
5. **AI analyzes matches** - Each listing is compared against your item using Claude vision (for photos) or text analysis
6. **Review matches** - Dashboard shows flagged listings sorted by confidence with AI explanations
7. **Take action** - Export reports for law enforcement, file DMCA reports, or mark items as recovered

## Project Structure

```
recoverwwatch/
  client/              # React frontend (Vite)
    src/
      components/      # Reusable UI components
      pages/           # Route pages (Dashboard, AddItem, ItemDetail, Settings)
  server/              # Express backend
    ai/                # Claude API integration (matcher.js)
    db/                # SQLite schema and queries
    routes/            # API route handlers
    scrapers/          # eBay, Craigslist, and manual URL scrapers
  uploads/             # Stored item photos
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/items | List all items with stats |
| POST | /api/items | Create item (multipart for photos) |
| GET | /api/items/:id | Get item details |
| PUT | /api/items/:id | Update item |
| DELETE | /api/items/:id | Delete item |
| POST | /api/items/:id/recover | Mark as recovered |
| POST | /api/scans/:itemId | Trigger manual scan |
| GET | /api/scans/:itemId | Get scan history |
| GET | /api/listings/:itemId | Get listings for item |
| PUT | /api/listings/:id/status | Update listing status |
| POST | /api/listings/analyze-url | Manual listing analysis |
| GET | /api/settings | Get settings |
| PUT | /api/settings | Update settings |
| GET | /api/export/:itemId | Generate HTML report |
