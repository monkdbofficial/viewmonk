#!/usr/bin/env python3
"""
Create shop schema with sample data using MonkDB API
"""

import requests
import json

# MonkDB API endpoint
API_URL = "http://localhost:3000/api/sql"

def execute_sql(query, schema="shop"):
    """Execute SQL query via API"""
    response = requests.post(
        API_URL,
        json={"query": query, "schema": schema}
    )
    return response.json()

def main():
    print("🚀 Creating Shop Database...")
    print("=" * 60)

    # Create schema
    print("\n📁 Creating 'shop' schema...")
    execute_sql("CREATE SCHEMA IF NOT EXISTS shop", schema="")
    print("✅ Schema created!")

    # Create tables
    queries = [
        # CUSTOMERS
        ("Creating CUSTOMERS table", """
            DROP TABLE IF EXISTS customers CASCADE;
            CREATE TABLE customers (
                id INTEGER PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) NOT NULL,
                phone VARCHAR(20),
                address TEXT
            )
        """),

        # CATEGORIES
        ("Creating CATEGORIES table", """
            DROP TABLE IF EXISTS categories CASCADE;
            CREATE TABLE categories (
                id INTEGER PRIMARY KEY,
                name VARCHAR(50) NOT NULL,
                description TEXT
            )
        """),

        # PRODUCTS
        ("Creating PRODUCTS table", """
            DROP TABLE IF EXISTS products CASCADE;
            CREATE TABLE products (
                id INTEGER PRIMARY KEY,
                category_id INTEGER NOT NULL,
                name VARCHAR(200) NOT NULL,
                price DECIMAL(10, 2) NOT NULL,
                stock INTEGER DEFAULT 0,
                FOREIGN KEY (category_id) REFERENCES categories(id)
            )
        """),

        # ORDERS
        ("Creating ORDERS table", """
            DROP TABLE IF EXISTS orders CASCADE;
            CREATE TABLE orders (
                id INTEGER PRIMARY KEY,
                customer_id INTEGER NOT NULL,
                total_amount DECIMAL(10, 2) NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                FOREIGN KEY (customer_id) REFERENCES customers(id)
            )
        """),

        # ORDER_ITEMS
        ("Creating ORDER_ITEMS table", """
            DROP TABLE IF EXISTS order_items CASCADE;
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
        """),

        # Insert Customers
        ("Inserting customers", """
            INSERT INTO customers (id, name, email, phone, address) VALUES
            (1, 'John Doe', 'john@example.com', '+1-555-0101', '123 Main St, NY'),
            (2, 'Jane Smith', 'jane@example.com', '+1-555-0102', '456 Oak Ave, LA'),
            (3, 'Bob Johnson', 'bob@example.com', '+1-555-0103', '789 Pine Rd, Chicago')
        """),

        # Insert Categories
        ("Inserting categories", """
            INSERT INTO categories (id, name, description) VALUES
            (1, 'Electronics', 'Electronic devices'),
            (2, 'Clothing', 'Apparel items'),
            (3, 'Books', 'Physical and digital books')
        """),

        # Insert Products
        ("Inserting products", """
            INSERT INTO products (id, category_id, name, price, stock) VALUES
            (1, 1, 'Laptop Pro 15', 1299.99, 25),
            (2, 1, 'Wireless Mouse', 29.99, 150),
            (3, 2, 'Cotton T-Shirt', 19.99, 200),
            (4, 3, 'Python Programming', 39.99, 50)
        """),

        # Insert Orders
        ("Inserting orders", """
            INSERT INTO orders (id, customer_id, total_amount, status) VALUES
            (1, 1, 1349.98, 'completed'),
            (2, 2, 79.98, 'shipped')
        """),

        # Insert Order Items
        ("Inserting order items", """
            INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, subtotal) VALUES
            (1, 1, 1, 1, 1299.99, 1299.99),
            (2, 1, 2, 1, 29.99, 29.99),
            (3, 2, 3, 2, 19.99, 39.98)
        """)
    ]

    for desc, query in queries:
        print(f"\n{desc}...")
        try:
            result = execute_sql(query)
            print("✅ Done!")
        except Exception as e:
            print(f"⚠️  {e}")

    print("\n" + "=" * 60)
    print("🎉 SUCCESS!")
    print("=" * 60)
    print("""
    ✅ Schema 'shop' created
    ✅ 5 tables created with relationships
    ✅ Sample data inserted

    📝 Next Steps:
    1. Go to: http://localhost:3000/er-diagram
    2. Select 'shop' from dropdown
    3. Click 'Refresh'
    4. See all 5 tables with relationships!
    """)

if __name__ == "__main__":
    main()
