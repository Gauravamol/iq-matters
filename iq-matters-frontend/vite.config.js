import { createLogger, defineConfig } from "vite";

function normalizeTerminalMessage(message) {
  if (typeof message !== "string") {
    return message;
  }

  return message
    .replaceAll("\u279c", "->")
    .replaceAll("➜", "->");
}

const customLogger = createLogger();

for (const method of ["info", "warn", "warnOnce", "error"]) {
  const original = customLogger[method].bind(customLogger);

  customLogger[method] = (message, options) => {
    original(normalizeTerminalMessage(message), options);
  };
}

export default defineConfig(() => ({
  base: "/",
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === "MODULE_LEVEL_DIRECTIVE" && warning.message.includes('"use client"')) {
          return;
        }

        warn(warning);
      }
    }
  },
  customLogger
}));
