
-- MonkDB Workbench - Database Initialization Script
-- This creates sample tables and data for testing

-- Create a sample users table
CREATE TABLE IF NOT EXISTS doc.users (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create a sample products table
CREATE TABLE IF NOT EXISTS doc.products (
    id TEXT PRIMARY KEY,
    name TEXT,
    price DOUBLE,
    category TEXT,
    stock INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create a sample orders table
CREATE TABLE IF NOT EXISTS doc.orders (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    product_id TEXT,
    quantity INTEGER,
    total DOUBLE,
    status TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data into users
INSERT INTO doc.users (id, name, email) VALUES
('user_1', 'John Doe', 'john@example.com'),
('user_2', 'Jane Smith', 'jane@example.com'),
('user_3', 'Bob Johnson', 'bob@example.com');

-- Insert sample data into products
INSERT INTO doc.products (id, name, price, category, stock) VALUES
('prod_1', 'Laptop', 999.99, 'Electronics', 50),
('prod_2', 'Mouse', 29.99, 'Electronics', 200),
('prod_3', 'Keyboard', 79.99, 'Electronics', 150),
('prod_4', 'Monitor', 299.99, 'Electronics', 75);

-- Insert sample data into orders
INSERT INTO doc.orders (id, user_id, product_id, quantity, total, status) VALUES
('order_1', 'user_1', 'prod_1', 1, 999.99, 'completed'),
('order_2', 'user_2', 'prod_2', 2, 59.98, 'completed'),
('order_3', 'user_3', 'prod_3', 1, 79.99, 'pending');

-- Refresh tables to make data immediately available
REFRESH TABLE doc.users;
REFRESH TABLE doc.products;
REFRESH TABLE doc.orders;
