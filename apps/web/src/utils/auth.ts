import jwtDecode from 'jwt-decode';

export const validateToken = (token: string) => {
  if (!token) return false;
  try {
    const decoded = jwtDecode<{ exp: number }>(token);
    return decoded.exp > Date.now() / 1000;
  } catch {
    return false;
  }
};
