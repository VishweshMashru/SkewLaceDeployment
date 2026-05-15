# CartonTrack

QR-based finished goods and carton tracking for textile factories.

## Stack
Next.js 15 · TypeScript · PostgreSQL (Neon) · Drizzle ORM · Tailwind CSS · Zod + RHF · qrcode

## Setup

```bash
npm install

# Create .env.local:
# DATABASE_URL=postgresql://...

npx drizzle-kit push   # creates all tables
npm run dev
```

## Workflow
1. **Products** — create SKUs with design number, color/category
2. **FG Labels** — generate QR for 1 piece / 1 dozen / manual qty → print label
3. **Cartons** — create a carton, scan/paste FG label IDs to pack items in
4. **Seal → Dispatch** — change status when ready to ship
5. **Scan any QR** — instant full detail on any phone

## Routes
| Path | Purpose |
|---|---|
| `/products` | Create & list products |
| `/finished-goods` | Create QR labels, view all |
| `/finished-goods/[id]` | Scan target — shows status, carton |
| `/cartons` | Create & list cartons |
| `/cartons/[id]` | Carton detail + QR + seal/dispatch |
| `/cartons/[id]/pack` | Add FG labels into carton |

## API
```
GET/POST  /api/products
GET/POST  /api/finished-goods
GET       /api/finished-goods/[id]
GET/POST  /api/cartons
GET       /api/cartons/[id]
POST      /api/cartons/[id]/add-item
PATCH     /api/cartons/[id]/status
```

## Schema
```
products        id, name, sku, design_number, color_category
finished_goods  id, product_id, tracking_type, quantity, status, carton_id, label
cartons         id, carton_number, status, notes, total_pieces
```

Status flows:
- FG: `available → packed → dispatched`
- Carton: `open → sealed → dispatched`
