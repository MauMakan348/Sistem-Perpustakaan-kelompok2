CREATE TABLE IF NOT EXISTS books (
  id INT PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  status VARCHAR(20) NOT NULL,
  CONSTRAINT chk_books_status CHECK (status IN ('tersedia', 'dipinjam'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
