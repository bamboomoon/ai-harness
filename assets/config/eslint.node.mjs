import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import sonarjs from 'eslint-plugin-sonarjs';
import tseslint from 'typescript-eslint';

export default defineConfig([
  // Clean Code 护栏：认知复杂度上限只约束生产代码，阈值是上限而非目标。
  { files: ['src/**/*.ts'], plugins: { sonarjs }, rules: { 'sonarjs/cognitive-complexity': ['error', 20] } },
  js.configs.recommended,
  // 生产源码启用类型感知规则：拦截漏处理的 Promise、误用异步回调和遗漏分支。
  {
    files: ['src/**/*.ts'],
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: {
      // 写 default 表示显式忽略其余分支；既无 default 又漏分支时报错。
      '@typescript-eslint/switch-exhaustiveness-check': [
        'error',
        { considerDefaultExhaustiveForUnions: true },
      ],
      '@typescript-eslint/prefer-promise-reject-errors': ['error', { allowThrowingUnknown: true }],
    },
  },
  // 测试与脚本以 Node ESM 直接运行。
  { files: ['**/*.mjs'], languageOptions: { globals: globals.node } },
  globalIgnores(['dist/**', '.runs/**', 'sandbox/**']),
]);
