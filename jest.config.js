export default {
  preset: 'ts-jest/presets/default-esm',
  globals: {
    'ts-jest': {
      // IsolatedModules: true,
      useESM: true,
    },
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
