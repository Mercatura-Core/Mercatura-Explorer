import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      "**/.next/**",
      "dist/**",
      "build/**",
      "coverage/**",
      "apps/site/out/**",
      "**/*.tsbuildinfo",
    ],
  },
  ...tseslint.configs.recommended
);
