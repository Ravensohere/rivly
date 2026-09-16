import { describe, it, expect } from 'vitest';
import { decodeEntities, gmailUrl, senderName } from '../SuggestionsTray';

describe('decodeEntities', () => {
  it('decodes the entities Gmail snippets actually contain', () => {
    expect(decodeEntities('Adiii&#39;s server')).toBe("Adiii's server");
    expect(decodeEntities('Tom &amp; Jerry')).toBe('Tom & Jerry');
    expect(decodeEntities('&quot;quoted&quot;')).toBe('"quoted"');
    expect(decodeEntities('a&nbsp;b')).toBe('a b');
  });

  it('leaves unknown entities alone rather than mangling them', () => {
    expect(decodeEntities('50&percnt; off')).toBe('50&percnt; off');
    expect(decodeEntities('plain text')).toBe('plain text');
  });

  it('does not let markup through as markup', () => {
    // Decoding is for display as TEXT; React escapes on render. The point here
    // is that we never hand this to an HTML parser.
    expect(decodeEntities('&lt;script&gt;')).toBe('<script>');
  });

  it('ignores control-character escapes', () => {
    expect(decodeEntities('a&#0;b')).toBe('a&#0;b');
  });
});

describe('senderName', () => {
  it('pulls the display name out of a From header', () => {
    expect(senderName('Google <no-reply@accounts.google.com>')).toBe('Google');
    expect(senderName('"CEDAT (Meetup)" <announce@email.meetup.com>')).toBe('CEDAT (Meetup)');
  });

  it('falls back to the raw value when there is no display name', () => {
    expect(senderName('contact@hireft.com')).toBe('contact@hireft.com');
  });
});

describe('gmailUrl', () => {
  it('links to #all so archived mail still opens', () => {
    expect(gmailUrl('1a09e268f01ac39d')).toBe(
      'https://mail.google.com/mail/u/0/#all/1a09e268f01ac39d',
    );
  });
});
