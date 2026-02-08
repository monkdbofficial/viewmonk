-- ============================================
-- E-Commerce Sample Database for ER Diagram
-- ============================================
-- This creates a complete shop with:
-- - Customers, Categories, Products
-- - Orders and Order Items
-- - Foreign Key Relationships
-- ============================================

-- Create schema
CREATE SCHEMA IF NOT EXISTS shop;
USE shop;

-- Drop existing tables (in reverse order due to FKs)
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS customers CASCADE;

-- ============================================
-- 1. CUSTOMERS TABLE
-- ============================================
CREATE TABLE customers (
    id INTEGER PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. CATEGORIES TABLE
-- ============================================
CREATE TABLE categories (
    id INTEGER PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 3. PRODUCTS TABLE (FK → categories)
-- ============================================
CREATE TABLE products (
    id INTEGER PRIMARY KEY,
    category_id INTEGER NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    stock INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- ============================================
-- 4. ORDERS TABLE (FK → customers)
-- ============================================
CREATE TABLE orders (
    id INTEGER PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    order_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    shipping_address TEXT,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- ============================================
-- 5. ORDER_ITEMS TABLE (FK → orders, products)
-- ============================================
CREATE TABLE order_items (
    id INTEGER PRIMARY KEY,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- ============================================
-- INSERT SAMPLE DATA
-- ============================================

-- Insert Customers
INSERT INTO customers (id, name, email, phone, address) VALUES
(1, 'John Doe', 'john@example.com', '+1-555-0101', '123 Main St, New York, NY'),
(2, 'Jane Smith', 'jane@example.com', '+1-555-0102', '456 Oak Ave, Los Angeles, CA'),
(3, 'Bob Johnson', 'bob@example.com', '+1-555-0103', '789 Pine Rd, Chicago, IL'),
(4, 'Alice Brown', 'alice@example.com', '+1-555-0104', '321 Elm St, Houston, TX'),
(5, 'Charlie Wilson', 'charlie@example.com', '+1-555-0105', '654 Maple Dr, Phoenix, AZ');

-- Insert Categories
INSERT INTO categories (id, name, description) VALUES
(1, 'Electronics', 'Electronic devices and gadgets'),
(2, 'Clothing', 'Apparel and fashion items'),
(3, 'Books', 'Physical and digital books'),
(4, 'Home & Garden', 'Home improvement and garden supplies'),
(5, 'Sports', 'Sports equipment and fitness gear');

-- Insert Products
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
(10, 5, 'Running Shoes', 'Professional running shoes', 119.99, 60);

-- Insert Orders
INSERT INTO orders (id, customer_id, total_amount, status, shipping_address) VALUES
(1, 1, 1349.98, 'completed', '123 Main St, New York, NY'),
(2, 2, 79.98, 'shipped', '456 Oak Ave, Los Angeles, CA'),
(3, 3, 89.99, 'pending', '789 Pine Rd, Chicago, IL'),
(4, 1, 154.98, 'completed', '123 Main St, New York, NY'),
(5, 4, 44.99, 'shipped', '321 Elm St, Houston, TX');

-- Insert Order Items
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
(10, 5, 7, 1, 44.99, 44.99);

-- ============================================
-- VERIFY DATA
-- ============================================
SELECT 'Created 5 customers' as status, COUNT(*) as count FROM customers
UNION ALL
SELECT 'Created 5 categories', COUNT(*) FROM categories
UNION ALL
SELECT 'Created 10 products', COUNT(*) FROM products
UNION ALL
SELECT 'Created 5 orders', COUNT(*) FROM orders
UNION ALL
SELECT 'Created 10 order items', COUNT(*) FROM order_items;
