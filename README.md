A Node.js + Express + MongoDB API for searching and managing medicines. Built with best practices: caching, pagination, security middleware and MongoDB text indexes for fast search.

🚀 Features
- Medicine search API with text search and filters
- Pagination (page, limit) and hasMore flag
- Sort by relevance, price, or name
- API Key authentication (x-api-key header)
- Rate limiting, CORS, Helmet, Compression
- CSV import script for bulk medicines
- Clean project structure (controllers, routes, models, middleware)

📂 Project Structure
medicines
 ├─ src/
 │   ├─ app.js              # Express app, middleware
 │   ├─ index.js            # Server entrypoint
 │   ├─ controllers/        # Route controllers
 │   │    └─ medicinesController.js
 │   ├─ routes/             # Express routes
 │   │    └─ medicinesRoutes.js
 │   ├─ models/             # Mongoose models
 │   │    └─ medicineModel.js
 │   ├─ middleware/         # Custom middlewares
 │   │    ├─ apiKey.js
 │   │    └─ error.js
 │   └─ utils/
 │        └─ db.js
 ├─ scripts/
 │    └─ import-from-csv.js
 ├─ .env
 ├─ package.json
 └─ README.md

⚙️ Installation
# clone repo
git clone https://github.com/orbittechnologys/medicines-care
cd medicines-care

# install dependencies
npm install
🛠️ Environment Variables
Create a `.env` file in the root:

API_KEY = your-api-key
PORT = 4036
DEPLOY_ENV = local
MONGO_URI = mongodb+srv://<user>:<password>@<cluster>.mongodb.net/indianMedicine1
SSL_CRT_PATH = /etc/letsencrypt/live/example.org/fullchain.pem
SSL_KEY_PATH = /etc/letsencrypt/live/example.org/privkey.pem
ALLOWED_ORIGINS = *

▶️ Run the Project
Development:
 npm run dev

Production:
 npm run serve

Server will run at http://localhost:4036

📖 API Endpoints
GET /health → Health check

GET /api/v1/medicines → Search medicines

📥 Import Medicines via CSV
npm run import:csv ./medicines.csv

🧰 Tech Stack
- Node.js, Express.js
- MongoDB (Atlas) with Mongoose
- Helmet, CORS, Compression, Rate-limit
- LRU cache for query caching
- Nodemon for development

📝 License
ISC © Moin Ahmed
