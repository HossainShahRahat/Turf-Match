import { spawn } from "child_process";

const commands = [
  { name: "BACKEND", cwd: "backend", cmd: "npm", args: ["run", "dev"] },
  { name: "FRONTEND", cwd: "frontend", cmd: "npm", args: ["run", "dev"] },
];

const processes = [];

function prefixLines(prefix, data) {
  return data
    .toString()
    .split("\n")
    .map((line) => (line.trim() ? `[${prefix}] ${line}` : line))
    .join("\n");
}

function startProcess({ name, cwd, cmd, args }) {
  const proc = spawn(cmd, args, {
    cwd,
    stdio: "pipe",
    shell: true,
  });

  processes.push(proc);

  proc.stdout.on("data", (data) => {
    process.stdout.write(prefixLines(name, data));
  });

  proc.stderr.on("data", (data) => {
    process.stderr.write(prefixLines(name, data));
  });

  proc.on("close", (code, signal) => {
    if (signal) {
      console.log(`[${name}] exited with signal ${signal}`);
    } else {
      console.log(`[${name}] exited with code ${code}`);
    }
  });

  proc.on("error", (err) => {
    console.error(`[${name}] failed to start: ${err.message}`);
  });

  return proc;
}

console.log("Starting development servers...\n");

commands.forEach(startProcess);

process.on("SIGINT", () => {
  console.log("\n\nShutting down development servers...");
  processes.forEach((proc) => {
    proc.kill("SIGTERM");
  });
  setTimeout(() => {
    let forceKilled = false;
    processes.forEach((proc) => {
      if (!proc.killed) {
        proc.kill("SIGKILL");
        forceKilled = true;
      }
    });
    if (forceKilled) {
      console.log("Force killed remaining processes.");
    }
    process.exit(0);
  }, 2000);
});

console.log("Press Ctrl+C to stop all servers.\n");
