import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
Object.defineProperty(globalThis, 'crypto', { value: { randomUUID: () => '00000000-0000-4000-8000-000000000000' }, configurable: true });
