import { expect, test } from 'vitest';
import { FormiController, FormiField } from '../src/mod';

test('initialize controller', () => {
  const controller = FormiController({ formName: 'test', initialFields: null });
  expect(controller).toBeDefined();
});

test('FormiController.validate', () => {
  const data = new FormData();
  data.append('test', 'test');
  const validated = FormiController.validate({ formName: 'test', initialFields: FormiField.string() }, data);
  expect(validated).toMatchObject({
    success: true,
    value: 'test',
  });
});

test('FormiController.validate object', () => {
  const data = new FormData();
  data.append('test.str', 'demo');
  data.append('test.num', '42');

  const fields = FormiField.group({
    str: FormiField.string(),
    num: FormiField.number(),
  });

  const validated = FormiController.validate({ formName: 'test', initialFields: fields }, data);
  expect(validated).toMatchObject({
    success: true,
    value: { str: 'demo', num: 42 },
  });
});

test('Custom issues', () => {
  const fields = FormiField.group({
    str: FormiField.string(),
    num: FormiField.number(),
  });
  const data = new FormData();
  data.append('test.str', 'demo');
  data.append('test.num', '42');

  const validated = FormiController.validate({ formName: 'test', initialFields: fields }, data);
  if (!validated.success) {
    throw new Error('Validation failed');
  }
  validated.customIssues.add(validated.fields.children.num, { kind: 'InvalidNumber', value: 'Ooops' });
  expect(validated.customIssues.getIssues()).toEqual([
    {
      issues: [{ kind: 'InvalidNumber', value: 'Ooops' }],
      path: ['num'],
    },
  ]);
});

test('validate should skip fields from another form', () => {
  const data = new FormData();
  data.append('test.str', 'demo');
  data.append('test.num', '42');
  data.append('test2.str', 'demo');

  const fields = FormiField.group({
    str: FormiField.string(),
    num: FormiField.number(),
  });

  const validated = FormiController.validate({ formName: 'test', initialFields: fields }, data);
  expect(validated).toMatchObject({
    success: true,
    value: { str: 'demo', num: 42 },
  });
});
