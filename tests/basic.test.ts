import { expect, test } from 'vitest';
import { FormiController } from '../src/mod';

test('first test', () => {
  const controller = FormiController({ formName: 'test', initialFields: null });
  expect(controller).toBeDefined();
});
