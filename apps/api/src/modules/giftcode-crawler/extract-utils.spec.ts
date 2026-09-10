import { parseHtml, extractFromCards } from './extract-utils';

describe('extractFromCards', () => {
  it('extracts active codes and skips expired cards', () => {
    const html = `
      <div class="container">
        <div class="code-card expired">
          <h3 class="code-text">OLDCODE123</h3>
          <div class="status-badge expired">Expired</div>
        </div>
        <div class="code-card">
          <div class="code-header">
            <h3 class="code-text">ACTIVE999</h3>
            <div class="status-badge active">Active</div>
          </div>
          <div class="reward-details">
            <span class="reward-count">x100</span>
            <span class="reward-name">Gems</span>
          </div>
        </div>
      </div>
    `;

    const root = parseHtml(html);
    const result = extractFromCards(root, {
      type: 'class',
      value: 'code-card',
    });

    expect(result.length).toBe(1);
    expect(result[0].code).toBe('ACTIVE999');
    expect(result[0].rewards).toContain('Gems');
  });

  it('does not concatenate adjacent tags into invalid code tokens', () => {
    const html = `
      <div class="code-card">
        <h3 class="code-text">NTEGIFT</h3><span>Active</span>
      </div>
    `;
    const root = parseHtml(html);
    const result = extractFromCards(root, {
      type: 'class',
      value: 'code-card',
    });

    expect(result.length).toBe(1);
    expect(result[0].code).toBe('NTEGIFT');
  });
});
