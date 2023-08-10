import { expect, test } from 'vitest';
import { FormiController, FormiField } from '../src/mod';

test('Basic ingest', () => {
  const fields = FormiField.group({
    str: FormiField.string(),
    num: FormiField.number(),
  });

  const controller = FormiController({ formName: 'ingest', initialFields: fields });
  controller.ingest({ str: 'hello', num: 42 });
  const result = controller.getResult();
  expect(result.success).toEqual(true);
  if (result.success) {
    expect(result.value).toEqual({ str: 'hello', num: 42 });
  }
});
