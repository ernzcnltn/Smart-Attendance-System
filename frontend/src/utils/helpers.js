export const getToken = () => sessionStorage.getItem('token');

export const setToken = (token) => sessionStorage.setItem('token', token);

export const removeToken = () => sessionStorage.removeItem('token');

export const getUser = () => {
  const user = sessionStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

export const setUser = (user) => sessionStorage.setItem('user', JSON.stringify(user));

export const removeUser = () => sessionStorage.removeItem('user');

export const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const formatDateTime = (dateString) => {
  return new Date(dateString).toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};