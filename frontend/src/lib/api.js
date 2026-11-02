const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

export function apiFetch(path, options = {}) {
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    }
  });
}

export function mapCategory(category) {
  return {
    ...category,
    bgTint: category.bgTint || `${category.color}22`
  };
}

export function mapExpense(expense) {
  return {
    ...expense,
    categoryId: expense.category?.id,
    accountId: 'acc-1',
    avatarBg: '#064e3b',
    avatarColor: '#34d399',
    tags: ['UPI']
  };
}
