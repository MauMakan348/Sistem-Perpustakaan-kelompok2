CREATE TABLE IF NOT EXISTS loans (
  id BIGINT PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  book_id INT NOT NULL,
  book_title TEXT NOT NULL,
  borrow_date DATETIME(3) NOT NULL,
  due_date DATETIME(3) NOT NULL,
  INDEX idx_loans_username (username),
  INDEX idx_loans_due_date (due_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
