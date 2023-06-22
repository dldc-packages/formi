import { expect, test } from 'vitest';
import { ZenFormController } from '../src/mod';

test('first test', () => {
  const controller = ZenFormController({ formName: 'test', initialFields: null });
  expect(controller).toBeDefined();
});
