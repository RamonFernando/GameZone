import { spawn } from "node:child_process";

const commands = [
  { name: "e2e:checkout", args: ["run", "e2e:checkout"] },
  { name: "e2e:stripe", args: ["run", "e2e:stripe"] },
  { name: "e2e:paypal", args: ["run", "e2e:paypal"] },
];

function runNpmScript(script) {
  return new Promise((resolve) => {
    const child = spawn("npm", script.args, {
      stdio: "inherit",
      shell: true,
      env: process.env,
    });

    child.on("close", (code) => {
      resolve({
        name: script.name,
        code: code ?? 1,
      });
    });
  });
}

async function run() {
  console.log("[E2E ALL CONTINUE] Ejecutando suite completa...");

  const results = [];
  for (const command of commands) {
    console.log(`\n[E2E ALL CONTINUE] Iniciando ${command.name}`);
    const result = await runNpmScript(command);
    results.push(result);
    const status = result.code === 0 ? "OK" : `FALLO (${result.code})`;
    console.log(`[E2E ALL CONTINUE] ${command.name}: ${status}`);
  }

  const failed = results.filter((item) => item.code !== 0);
  console.log("\n[E2E ALL CONTINUE] Resumen:");
  for (const result of results) {
    console.log(`- ${result.name}: ${result.code === 0 ? "OK" : `FALLO (${result.code})`}`);
  }

  if (failed.length > 0) {
    process.exit(1);
  }
}

run().catch((error) => {
  console.error("[E2E ALL CONTINUE] Excepcion no controlada.");
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
