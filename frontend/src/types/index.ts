export type Role='super_admin'|'institution_admin'|'issuer'|'verifier'|'student';
export interface User { id:string; fullName:string; email:string; role:Role; institutionId:string|null; mustChangePassword?:boolean }
export interface ApiError { message:string; code?:string; status?:number; requestId?:string; fields?:Record<string,string> }
export interface PageMeta { page:number; limit:number; total:number; totalPages:number; hasNextPage:boolean; hasPreviousPage:boolean }
export type JsonRecord=Record<string,unknown>;
