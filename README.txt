Indian Medicines API

Quickstart:
1) npm install
2) copy .env.example to .env and set MONGODB_URI
3) place A_Z_medicines_dataset_of_India.csv in project root (beside package.json)
4) npm run import:csv
5) npm run dev

Endpoints:
- GET /api/v1/medicines?q=augmentin&limit=10
- GET /api/v1/medicines/lookup/exact?name=Augmentin 625 Duo Tablet
- GET /api/v1/medicines/:id
- POST /api/v1/medicines/_import  (requires header x-api-key)

Notes:
- Text index is created on name, manufacturer, and ingredient names.
- Pricing is in INR (MRP). Packaging is parsed from pack_size_label where available.
- Admin routes protected by x-api-key. Do not expose publicly without network controls.