import {Navigate,Outlet,useLocation} from 'react-router-dom'; import {useAuth} from '../context/AuthContext'; import type{Role}from'../types';
export function AuthGuard(){const{user,loading}=useAuth();const l=useLocation();if(loading)return <div className="page-loader">Loading secure workspace…</div>;return user?<Outlet/>:<Navigate to="/login" replace state={{from:l.pathname}}/>}
export function RoleGuard({roles}:{roles:Role[]}){const{user}=useAuth();return user&&roles.includes(user.role)?<Outlet/>:<Navigate to="/forbidden" replace/>}
