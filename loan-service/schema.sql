CREATE TABLE IF NOT EXISTS loans (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  book_id INT NOT NULL,
  book_title TEXT NOT NULL,
  borrow_date DATETIME(3) NOT NULL,
  due_date DATETIME(3) NOT NULL,
  status ENUM('active', 'returned') NOT NULL DEFAULT 'active',
  returned_at DATETIME(3) NULL,
  INDEX idx_loans_username (username),
  INDEX idx_loans_due_date (due_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(32) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
