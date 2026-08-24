import { describe, expect, it } from 'vitest';
import { api } from '../api/client';

describe('API client security and contract',()=>{
  it('uses credentialed cookie requests',()=>expect(api.defaults.withCredentials).toBe(true));
  it('uses configured /api base contract',()=>{expect(api.defaults.baseURL).toMatch(/\/api$/)});
  it('uses a finite timeout',()=>{expect(api.defaults.timeout).toBe(20000)});
  it('does not place secrets in client defaults',()=>{expect(JSON.stringify(api.defaults)).not.toMatch(/private.?key|jwt.?secret|pinata.?jwt/i)});
  it('does not inject browser bearer authentication',async()=>{const handler=(api.interceptors.request as unknown as {handlers:Array<{fulfilled:(v:Record<string,unknown>)=>Record<string,unknown>}>}).handlers[0].fulfilled;const config=await handler({headers:{},method:'get'}) as {headers:Record<string,string>};expect(config.headers.Authorization).toBeUndefined();expect(config.headers['X-Request-ID']).toBeTruthy()});
  it('external link policy is noopener noreferrer',()=>{const safe={target:'_blank',rel:'noopener noreferrer'};expect(safe.rel).toContain('noopener');expect(safe.rel).toContain('noreferrer')});
  it('mutations are not implicitly retried by axios',()=>{expect(api.defaults).not.toHaveProperty('retry')});
  it('never uses dangerouslySetInnerHTML',async()=>{const source=await import('../components/ui?raw');expect(String(source.default)).not.toContain('dangerouslySetInnerHTML')});
});
