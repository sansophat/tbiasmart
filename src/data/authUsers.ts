import { AuthUser } from '../types';

export const DEFAULT_AUTH_USER: AuthUser = {
  id: 'user_admin',
  username: 'admin',
  email: 'admin@pp-hospitality.com.kh',
  role: 'admin',
  nameKh: 'សាន្ត សុផាត',
  nameEn: 'San Sophat',
  avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
  employeeId: 'emp_1790150117850',
  employeeCode: 'EMP-001',
  branchId: 'br_main_hq',
  roleTitle: 'Super Administrator / HR Director',
  pinCode: '1234',
  password: 'admin',
};

// Only actual default admin is kept as system baseline user
export const DEMO_USERS: AuthUser[] = [
  DEFAULT_AUTH_USER,
];
