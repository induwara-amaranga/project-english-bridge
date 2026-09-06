import { describe, expect, it } from 'vitest';
import { parentContactChannel } from './parentLink';

describe('parentContactChannel', () => {
  it('recognises a valid email', () => {
    expect(parentContactChannel('parent@example.com')).toBe('email');
  });
  it('rejects a malformed email', () => {
    expect(parentContactChannel('parent@example')).toBe('');
  });
  it('recognises a phone number with punctuation', () => {
    expect(parentContactChannel('+94 71 234 5678')).toBe('phone');
  });
  it('rejects text that is neither', () => {
    expect(parentContactChannel('not a contact')).toBe('');
  });
  it('returns empty for blank input', () => {
    expect(parentContactChannel('   ')).toBe('');
  });
});
