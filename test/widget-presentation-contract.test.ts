import { describe, expect, it } from 'vitest';
import {
  buildHostedProvisioningPlan,
  parseHostedArgs,
} from '../scripts/provision-hosted-board-core.js';
import { readCustomization } from '../src/widget/config';

const BASE_ARGS = [
  '--tenant-slug',
  'contract-tenant',
  '--tenant-name',
  'Contract Tenant',
  '--app-slug',
  'contract-app',
  '--app-name',
  'Contract App',
  '--repo',
  'mean-weasel/contract',
  '--origin',
  'https://app.example.com',
  '--issuer',
  'https://app.example.com',
  '--audience',
  'bugdrop-board',
  '--jwks-url',
  'https://app.example.com/.well-known/jwks.json',
  '--github-installation-id',
  '123456',
  '--api-url',
  'https://board.example.com',
  '--token-endpoint',
  '/api/board-token',
];

const PRESENTATION_CONTRACT = [
  {
    attribute: 'data-layout',
    dataset: 'layout',
    flag: '--layout',
    values: ['inline', 'panel', 'kanban'],
  },
  {
    attribute: 'data-density',
    dataset: 'density',
    flag: '--density',
    values: ['compact', 'comfortable', 'spacious'],
  },
  {
    attribute: 'data-composer',
    dataset: 'composer',
    flag: '--composer',
    values: ['inline', 'collapsed'],
  },
  {
    attribute: 'data-empty-lane-display',
    dataset: 'emptyLaneDisplay',
    flag: '--empty-lane-display',
    values: ['visible', 'compact', 'hidden'],
  },
  {
    attribute: 'data-issue-links',
    dataset: 'issueLinks',
    flag: '--issue-links',
    values: ['visible', 'hidden'],
  },
] as const;

describe('widget presentation contract across runtime and hosted setup', () => {
  for (const setting of PRESENTATION_CONTRACT) {
    it(`keeps ${setting.flag} values aligned with the widget dataset`, () => {
      for (const value of setting.values) {
        const options = parseHostedArgs([...BASE_ARGS, setting.flag, value]);
        const plan = buildHostedProvisioningPlan(options);
        const customization = readCustomization(
          {
            dataset: { [setting.dataset]: value },
          } as unknown as HTMLScriptElement,
          { querySelector: () => null }
        );

        expect(options[setting.dataset]).toBe(value);
        expect(customization[setting.dataset]).toBe(value);
        expect(plan.handoff.embedSnippet).toContain(`${setting.attribute}="${value}"`);
      }
    });
  }
});
