import globals from "globals";
import eslint from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";

export default [
  eslint.configs.recommended,
  eslintConfigPrettier,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
];
