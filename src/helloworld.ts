import { init, WASI } from "@wasmer/wasi";

// This is needed to load the WASI library first

export const start = async (buf: ArrayBufferLike) => {
  await init();

  let wasi = new WASI({
    env: {},
    args: [],
  });

  const module = await WebAssembly.instantiate(buf)
  await wasi.instantiate(module, {});

  let exitCode = wasi.start();
  let stdout = wasi.getStdoutString();
  // This should print "hello world (exit code: 0)"
  console.log(`${stdout}\n(exit code: ${exitCode})`);
}
