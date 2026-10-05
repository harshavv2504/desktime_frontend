import { describe, it, expect } from 'vitest';
import { parseContext, preciseTime } from '../ActivityDetails';
describe('recorded activity context', () => {
 it('separates a captured Windows file and workspace', () => {
 const result=parseContext('C:\\Work\\src\\app.ts | C:\\Work | | Visual Studio Code');
 expect(result.file).toBe('app.ts'); expect(result.workspace).toBe('C:\\Work');
 });
 it('does not invent a file from a regular window title', () => {expect(parseContext('Inbox | Chrome').path).toBe('');});
 it('shows seconds for short intervals', () => {expect(preciseTime('2026-10-05T16:00:05Z')).toContain('21:30:05');});
});
