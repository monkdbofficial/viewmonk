#!/usr/bin/env python3
"""
Create sample e-commerce database in MonkDB with relationships
This will create tables that show up beautifully in the ER Diagram
"""

import sys
import os

# Add MonkDB Python client to path
sys.path.insert(0, '/Users/surykantkumar/Development/monkdb/monk-main')

from monkdb import MonkDB

def main():
    print("🚀 Creating Sample E-Commerce Database in MonkDB...")
    print("=" * 60)

    # Connect to MonkDB
    print("\n📡 Connecting to MonkDB...")
    db = MonkDB(host='localhost', port=50051)
    print("✅ Connected!")

    # Create schema
    schema_name = "shop"
    print(f"\n📁 Creating schema '{schema_name}'...")
    try:
        db.query(f"CREATE SCHEMA IF NOT EXISTS {schema_name}")
        print(f"✅ Schema '{schema_name}' created!")
    except Exception as e:
        print(f"⚠️  Schema might already exist: {e}")

    # Use the schema
    db.query(f"USE {schema_name}")

    print("\n" + "=" * 60)
    print("📋 Creating Tables with Relationships...")
    print("=" * 60)

    # 1. CUSTOMERS TABLE
    print("\n1️⃣  Creating CUSTOMERS table...")
    db.query("""
        DROP TABLE IF EXISTS customers CASCADE
    """)
    db.query("""
        CREATE TABLE customers (
            id INTEGER PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(100) NOT NULL UNIQUE,
            phone VARCHAR(20),
            address TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("✅ CUSTOMERS table created!")

    # 2. CATEGORIES TABLE
    print("\n2️⃣  Creating CATEGORIES table...")
    db.query("""
        DROP TABLE IF EXISTS categories CASCADE
    """)
    db.query("""
        CREATE TABLE categories (
            id INTEGER PRIMARY KEY,
            name VARCHAR(50) NOT NULL,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("✅ CATEGORIES table created!")

    # 3. PRODUCTS TABLE (with FK to categories)
    print("\n3️⃣  Creating PRODUCTS table...")
    db.query("""
        DROP TABLE IF EXISTS products CASCADE
    """)
    db.query("""
        CREATE TABLE products (
            id INTEGER PRIMARY KEY,
            category_id INTEGER NOT NULL,
            name VARCHAR(200) NOT NULL,
            description TEXT,
            price DECIMAL(10, 2) NOT NULL,
            stock INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES categories(id)
        )
    """)
    print("✅ PRODUCTS table created with FK to CATEGORIES!")

    # 4. ORDERS TABLE (with FK to customers)
    print("\n4️⃣  Creating ORDERS table...")
    db.query("""
        DROP TABLE IF EXISTS orders CASCADE
    """)
    db.query("""
        CREATE TABLE orders (
            id INTEGER PRIMARY KEY,
            customer_id INTEGER NOT NULL,
            order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            total_amount DECIMAL(10, 2) NOT NULL,
            status VARCHAR(20) DEFAULT 'pending',
            shipping_address TEXT,
            FOREIGN KEY (customer_id) REFERENCES customers(id)
        )
    """)
    print("✅ ORDERS table created with FK to CUSTOMERS!")

    # 5. ORDER_ITEMS TABLE (with FK to orders and products)
    print("\n5️⃣  Creating ORDER_ITEMS table...")
    db.query("""
        DROP TABLE IF EXISTS order_items CASCADE
    """)
    db.query("""
        CREATE TABLE order_items (
            id INTEGER PRIMARY KEY,
            order_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            unit_price DECIMAL(10, 2) NOT NULL,
            subtotal DECIMAL(10, 2) NOT NULL,
            FOREIGN KEY (order_id) REFERENCES orders(id),
            FOREIGN KEY (product_id) REFERENCES products(id)
        )
    """)
    print("✅ ORDER_ITEMS table created with FK to ORDERS and PRODUCTS!")

    print("\n" + "=" * 60)
    print("📝 Inserting Sample Data...")
    print("=" * 60)

    # Insert Customers
    print("\n👥 Inserting customers...")
    db.query("""
        INSERT INTO customers (id, name, email, phone, address) VALUES
        (1, 'John Doe', 'john@example.com', '+1-555-0101', '123 Main St, New York, NY'),
        (2, 'Jane Smith', 'jane@example.com', '+1-555-0102', '456 Oak Ave, Los Angeles, CA'),
        (3, 'Bob Johnson', 'bob@example.com', '+1-555-0103', '789 Pine Rd, Chicago, IL'),
        (4, 'Alice Brown', 'alice@example.com', '+1-555-0104', '321 Elm St, Houston, TX'),
        (5, 'Charlie Wilson', 'charlie@example.com', '+1-555-0105', '654 Maple Dr, Phoenix, AZ')
    """)
    print("✅ Inserted 5 customers")

    # Insert Categories
    print("\n📂 Inserting categories...")
    db.query("""
        INSERT INTO categories (id, name, description) VALUES
        (1, 'Electronics', 'Electronic devices and gadgets'),
        (2, 'Clothing', 'Apparel and fashion items'),
        (3, 'Books', 'Physical and digital books'),
        (4, 'Home & Garden', 'Home improvement and garden supplies'),
        (5, 'Sports', 'Sports equipment and fitness gear')
    """)
    print("✅ Inserted 5 categories")

    # Insert Products
    print("\n🛍️  Inserting products...")
    db.query("""
        INSERT INTO products (id, category_id, name, description, price, stock) VALUES
        (1, 1, 'Laptop Pro 15', 'High-performance laptop with 16GB RAM', 1299.99, 25),
        (2, 1, 'Wireless Mouse', 'Ergonomic wireless mouse', 29.99, 150),
        (3, 1, 'USB-C Hub', '7-in-1 USB-C hub adapter', 49.99, 80),
        (4, 2, 'Cotton T-Shirt', 'Comfortable cotton t-shirt', 19.99, 200),
        (5, 2, 'Denim Jeans', 'Classic blue denim jeans', 59.99, 100),
        (6, 3, 'Python Programming', 'Learn Python programming', 39.99, 50),
        (7, 3, 'Database Design', 'Database design fundamentals', 44.99, 40),
        (8, 4, 'Garden Tool Set', 'Complete garden tool set', 89.99, 30),
        (9, 5, 'Yoga Mat', 'Premium yoga mat', 34.99, 75),
        (10, 5, 'Running Shoes', 'Professional running shoes', 119.99, 60)
    """)
    print("✅ Inserted 10 products")

    # Insert Orders
    print("\n🛒 Inserting orders...")
    db.query("""
        INSERT INTO orders (id, customer_id, total_amount, status, shipping_address) VALUES
        (1, 1, 1349.98, 'completed', '123 Main St, New York, NY'),
        (2, 2, 79.98, 'shipped', '456 Oak Ave, Los Angeles, CA'),
        (3, 3, 89.99, 'pending', '789 Pine Rd, Chicago, IL'),
        (4, 1, 154.98, 'completed', '123 Main St, New York, NY'),
        (5, 4, 44.99, 'shipped', '321 Elm St, Houston, TX')
    """)
    print("✅ Inserted 5 orders")

    # Insert Order Items
    print("\n📦 Inserting order items...")
    db.query("""
        INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, subtotal) VALUES
        (1, 1, 1, 1, 1299.99, 1299.99),
        (2, 1, 2, 1, 29.99, 29.99),
        (3, 1, 3, 1, 49.99, 49.99),
        (4, 2, 4, 2, 19.99, 39.98),
        (5, 2, 5, 1, 59.99, 59.99),
        (6, 3, 8, 1, 89.99, 89.99),
        (7, 4, 6, 1, 39.99, 39.99),
        (8, 4, 7, 1, 44.99, 44.99),
        (9, 4, 9, 2, 34.99, 69.98),
        (10, 5, 7, 1, 44.99, 44.99)
    """)
    print("✅ Inserted 10 order items")

    print("\n" + "=" * 60)
    print("📊 Data Summary")
    print("=" * 60)

    # Get counts
    customers_count = db.query("SELECT COUNT(*) FROM customers").rows[0][0]
    categories_count = db.query("SELECT COUNT(*) FROM categories").rows[0][0]
    products_count = db.query("SELECT COUNT(*) FROM products").rows[0][0]
    orders_count = db.query("SELECT COUNT(*) FROM orders").rows[0][0]
    items_count = db.query("SELECT COUNT(*) FROM order_items").rows[0][0]

    print(f"\n✅ {customers_count} Customers")
    print(f"✅ {categories_count} Categories")
    print(f"✅ {products_count} Products")
    print(f"✅ {orders_count} Orders")
    print(f"✅ {items_count} Order Items")

    print("\n" + "=" * 60)
    print("🎨 ER Diagram Relationships")
    print("=" * 60)

    print("""

    ┌──────────────┐          ┌──────────────┐
    │  CUSTOMERS   │          │ CATEGORIES   │
    │──────────────│          │──────────────│
    │ 🔑 id        │          │ 🔑 id        │
    │ ● name       │          │ ● name       │
    │ ● email      │          │ ● description│
    │ ● phone      │          └──────────────┘
    │ ● address    │                  │
    └──────────────┘                  │
            │                         │
            │ 1:N                     │ 1:N
            │                         │
            ▼                         ▼
    ┌──────────────┐          ┌──────────────┐
    │   ORDERS     │          │  PRODUCTS    │
    │──────────────│          │──────────────│
    │ 🔑 id        │          │ 🔑 id        │
    │ 🔗 customer_id│◄────────│ 🔗 category_id
    │ ● order_date │          │ ● name       │
    │ ● total      │          │ ● price      │
    │ ● status     │          │ ● stock      │
    └──────────────┘          └──────────────┘
            │                         │
            │ 1:N                     │ 1:N
            │                         │
            └────────►┌──────────────┐◄────────┘
                      │ ORDER_ITEMS  │
                      │──────────────│
                      │ 🔑 id        │
                      │ 🔗 order_id  │
                      │ 🔗 product_id│
                      │ ● quantity   │
                      │ ● unit_price │
                      │ ● subtotal   │
                      └──────────────┘

    Legend:
    🔑 = Primary Key
    🔗 = Foreign Key
    1:N = One-to-Many relationship
    """)

    print("\n" + "=" * 60)
    print("🎉 SUCCESS!")
    print("=" * 60)

    print("""
    ✅ Schema 'shop' created
    ✅ 5 tables created with relationships
    ✅ Sample data inserted

    📝 Next Steps:
    1. Go to MonkDB Workbench: http://localhost:3000/er-diagram
    2. Select 'shop' from the schema dropdown
    3. Click 'Refresh' button
    4. See all 5 tables with relationships!
    5. Drag tables to organize them
    6. Click 'Links' to see foreign key relationships

    🎨 You'll see:
    - Blue lines connecting tables (foreign keys)
    - 🔑 icons for primary keys
    - 🔗 icons for foreign keys
    - Arrows showing data flow direction
    """)

    print("\n" + "=" * 60)
    print("📋 Sample Queries to Try:")
    print("=" * 60)

    print("""
    -- See all customers with their orders
    SELECT c.name, COUNT(o.id) as order_count
    FROM customers c
    LEFT JOIN orders o ON c.id = o.customer_id
    GROUP BY c.name;

    -- See order details with customer and products
    SELECT
        c.name as customer,
        o.id as order_id,
        p.name as product,
        oi.quantity,
        oi.subtotal
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    JOIN order_items oi ON o.id = oi.order_id
    JOIN products p ON oi.product_id = p.id
    ORDER BY o.id;

    -- See products by category
    SELECT cat.name as category, COUNT(p.id) as product_count
    FROM categories cat
    LEFT JOIN products p ON cat.id = p.category_id
    GROUP BY cat.name;
    """)

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
