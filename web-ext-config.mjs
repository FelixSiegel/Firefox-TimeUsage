/* See:
 * - https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/#
 * - https://extensionworkshop.com/documentation/develop/web-ext-command-reference/
 */
export default {
  ignoreFiles: [
    "README.md",
  ],
  build: {
    overwriteDest: true,
  },
  run: {
    devtools: true,
  }
};