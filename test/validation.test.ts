import { describe, expect, it } from 'vitest';
import { parseCreateItemInput } from '../src/lib/validation';

describe('parseCreateItemInput', () => {
  it('trims valid item input', () => {
    expect(
      parseCreateItemInput({
        title: '  Add SSO  ',
        description: '  Enterprise users need SSO.  ',
      })
    ).toEqual({
      title: 'Add SSO',
      description: 'Enterprise users need SSO.',
    });
  });

  it('allows a missing description', () => {
    expect(parseCreateItemInput({ title: 'Add SSO' })).toEqual({
      title: 'Add SSO',
      description: '',
    });
  });

  it('rejects non-object input', () => {
    expect(() => parseCreateItemInput(null)).toThrow('Invalid JSON body');
    expect(() => parseCreateItemInput([])).toThrow('Invalid JSON body');
  });

  it('rejects invalid titles', () => {
    expect(() => parseCreateItemInput({ title: 'ab' })).toThrow('at least 3');
    expect(() => parseCreateItemInput({ title: 'x'.repeat(121) })).toThrow('120');
  });

  it('rejects invalid descriptions', () => {
    expect(() => parseCreateItemInput({ title: 'Add SSO', description: 1 })).toThrow('string');
    expect(() => parseCreateItemInput({ title: 'Add SSO', description: 'x'.repeat(4001) })).toThrow(
      '4000'
    );
  });
});
