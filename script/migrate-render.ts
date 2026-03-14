import pg from "pg";
const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const client = new Client({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function migrate() {
  await client.connect();
  console.log("Connected to Render PostgreSQL");

  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer',
      full_name TEXT,
      phone TEXT,
      address TEXT,
      is_verified BOOLEAN DEFAULT false,
      verification_code TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      price NUMERIC NOT NULL,
      discount_price NUMERIC,
      main_image TEXT NOT NULL,
      images JSONB DEFAULT '[]',
      category_id INTEGER REFERENCES categories(id),
      brand TEXT,
      sizes JSONB DEFAULT '[]',
      colors JSONB DEFAULT '[]',
      size_inventory JSONB DEFAULT '{}',
      color_variants JSONB DEFAULT '[]',
      stock_quantity INTEGER NOT NULL DEFAULT 0,
      is_featured BOOLEAN DEFAULT false,
      is_new_arrival BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      total_amount NUMERIC NOT NULL,
      shipping_cost NUMERIC NOT NULL DEFAULT 0,
      shipping_region TEXT,
      status TEXT NOT NULL DEFAULT 'Pending',
      payment_method TEXT NOT NULL DEFAULT 'Cash on delivery',
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER REFERENCES orders(id) NOT NULL,
      product_id INTEGER REFERENCES products(id) NOT NULL,
      quantity INTEGER NOT NULL,
      price NUMERIC NOT NULL,
      size TEXT,
      color TEXT
    );

    CREATE TABLE IF NOT EXISTS wishlist (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) NOT NULL,
      product_id INTEGER REFERENCES products(id) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      product_id INTEGER REFERENCES products(id) NOT NULL,
      user_id INTEGER REFERENCES users(id),
      rating INTEGER NOT NULL,
      comment TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS discount_codes (
      id SERIAL PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      discount_percent INTEGER NOT NULL,
      max_uses INTEGER,
      used_count INTEGER DEFAULT 0,
      expires_at TIMESTAMP,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "session" (
      "sid" VARCHAR NOT NULL COLLATE "default",
      "sess" JSON NOT NULL,
      "expire" TIMESTAMP(6) NOT NULL,
      CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE
    );

    CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
  `);

  console.log("All tables created successfully!");
  await client.end();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
