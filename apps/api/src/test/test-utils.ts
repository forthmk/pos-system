import path from 'node:path';

export function mockModule(
  testDir: string,
  modulePath: string,
  methods: Record<string, (...args: any[]) => any>,
) {
  const resolved = require.resolve(path.resolve(testDir, modulePath));
  const calls: Record<string, any[]> = {};
  const model: Record<string, any> = {};

  for (const [name, defaultImpl] of Object.entries(methods)) {
    calls[name] = [];
    model[name] = async (...args: any[]) => {
      calls[name].push(args.length <= 1 ? args[0] : args);
      return model[`_${name}`](...args);
    };
    model[`_${name}`] = defaultImpl;
  }

  require.cache[resolved] = { exports: model, loaded: true } as NodeModule;

  return { repository: model, calls, reset() {
    for (const [name, defaultImpl] of Object.entries(methods)) {
      calls[name] = [];
      model[`_${name}`] = defaultImpl;
    }
  } };
}
