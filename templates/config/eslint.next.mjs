import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';
import sonarjs from 'eslint-plugin-sonarjs';
import tseslint from 'typescript-eslint';

export default defineConfig([
  // Clean Code 护栏：认知复杂度上限只约束生产代码，阈值是上限而非目标。
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { sonarjs },
    rules: { 'sonarjs/cognitive-complexity': ['error', 20] },
  },
  ...nextVitals,
  ...nextTypeScript,
  // 类型感知规则：拦截漏处理的 Promise、误用异步回调和遗漏分支等只有类型信息才能发现的问题。
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    extends: [tseslint.configs.recommendedTypeCheckedOnly],
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: {
      // 写 default 表示显式忽略其余分支；既无 default 又漏分支时报错。
      '@typescript-eslint/switch-exhaustiveness-check': [
        'error',
        { considerDefaultExhaustiveForUnions: true },
      ],
      // 框架约定的 async（next.config、Server Component）无 await 属正常，风格类规则误报多于收益。
      '@typescript-eslint/require-await': 'off',
      // 拦截器等边界需要原样透传未知异常。
      '@typescript-eslint/prefer-promise-reject-errors': ['error', { allowThrowingUnknown: true }],
    },
  },
  // 测试断言直接读取 JSON 响应与 vitest mock，any 与未绑定方法属有意写法。
  {
    files: ['tests/**'],
    rules: {
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/unbound-method': 'off',
    },
  },
  // shadcn CLI 的原样响应式 hook 保留上游实现，仅豁免该文件的同步初始化检查。
  { files: ['src/hooks/use-mobile.ts'], rules: { 'react-hooks/set-state-in-effect': 'off' } },
  globalIgnores([
    '.next/**',
    'out/**',
    'next-env.d.ts',
    'playwright-report/**',
    'test-results/**',
    'reports/**',
    '.stryker-tmp/**',
  ]),
]);
