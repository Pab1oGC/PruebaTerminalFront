export interface User {
  id: number;
  email: string;
  nombre: string;
  rol: 'admin' | 'supervisor' | 'boletero' | 'chofer';
  tenantCode: string;
}

export interface TenantInfo {
  id: number;
  codigo: string;
  nombre: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
  tenant: TenantInfo;
}
