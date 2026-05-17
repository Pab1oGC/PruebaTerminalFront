export interface User {
  id: number;
  username: string;
  nombre: string;
  rol: 'admin' | 'boletero' | 'chofer';
}

export interface LoginResponse {
  token: string;
  user: User;
}
