import { useEffect, useState } from "react";
import styles from './wasm-loader.module.css';
import { useFilePicker } from 'use-file-picker';
import { FiFileText, FiChevronRight, FiRefreshCcw } from "react-icons/fi";
import { WASI, init, MemFS } from "@wasmer/wasi";
import { Buffer } from 'buffer';
import { lowerI64Imports } from "@wasmer/wasm-transformer"
import { MemoryAllocator } from "../services/MemoryAllocator";
import { getImports } from "../services/ImportService";
import Switch from "react-switch";

// @ts-ignore
window.Buffer = Buffer;

type exportValue = {
  kind: string;
  name: string;
}

const css = "background: #FFF; color: blue; font-size: 12px; font-weight: bold;"

const log = (...args: any[]) => {
  console.log(...args.map((arg) => `%c${arg}`), css);
}

export const WasmLoader = () => {

  const [msg, setMsg] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [wasmResult, setWasmResult] = useState<number | null>(null);
  const [wasmModule, setWasmInstance] = useState<WebAssembly.Module | null>(null);
  const [isRunDisabled, setIsRunDisabled] = useState(true);
  const [stdout, setStdout] = useState("");
  const [funcList, setFuncList] = useState<string[]>([]);
  // selected function name
  const [selectedFunc, setSelectedFunc] = useState<string>("_start");
  const [isDebug, setIsDebug] = useState(true);

  let isInitialized = false;

  // on mount
  useEffect(() => {
    if (isInitialized) {
      return;
    }
    init().then(() => {
      log("🚀 WASI initialized");
      isInitialized = true;
    })

    return () => {
      isInitialized = false;
    }
  }, []);

  const [openFileSelector, { loading }] = useFilePicker({
    accept: ['.wasm'],
    readAs: "ArrayBuffer",
    multiple: false,
    limitFilesConfig: { max: 1 },
    onFilesSelected: async (file) => {
      setWasmResult(null);
      setStdout("");
      setIsRunDisabled(false);
      // get the first and only file
      const wasmFile = file.filesContent[0];
      // get the bytes
      const bytes = wasmFile.content;

      const loweredWasmBytes = await lowerI64Imports(bytes)

      // instantiate the wasm module
      const module: WebAssembly.Module = await WebAssembly.compile(loweredWasmBytes);
      setWasmInstance(module);

      const exports = WebAssembly.Module.exports(module);

      const funcList = exports.filter((e: exportValue) => e.kind == "function").map((e: exportValue) => e.name);
      setFuncList(funcList);

      const heapBase = exports.find((e: exportValue) => e.name == "heap_base_ptr" ? true : false);
      const haveEntryPoint = exports.find((e: exportValue) => (e.name == "_start" && e.kind == "function") ? true : false);

      if (haveEntryPoint) {
        log("Found _start function");
        setIsRunDisabled(false);
      } else {
        log("No _start function found");
        setMsg("No _start function found ❌");
        setIsRunDisabled(true);
      }
    },
    onFilesRejected: ({ errors }) => {
      // this callback is called when there were validation errors
      log('File rejected', errors);
      setMsg("File rejected: " + errors);
      setIsRunDisabled(true);
    },
    onFilesSuccessfulySelected: ({ plainFiles, filesContent }) => {
      // this callback is called when there were no validation errors
      log(`File selected: ${plainFiles[0].name}`);
      setMsg("File selected: " + plainFiles[0].name + " ✅");
      setIsRunDisabled(false);
    },
  });

  const run = async () => {
    log("🏃‍♂️ Running...");

    const memoryAllocator = new MemoryAllocator(isDebug);
    const fs = new MemFS()

    let wasi = new WASI({
      env: {},
      args: [],
      fs: fs,
      preopens: {
        "/": "/",
      }
    });

    setIsRunning(true);

    if (!wasmModule) {
      log("No wasm module found");
      return;
    }

    let wasiImports = {};
    let wasiUsed = false;

    try {
      wasiImports = wasi.getImports(wasmModule);
      wasiUsed = true;
    } catch (e) {
      log("WASI not used.")
    }

    const combinedImports = {
      ...wasiImports, // WASI imports
      ...getImports(memoryAllocator, isDebug) // Other "custom" imports
    };

    const instance = await WebAssembly.instantiate(wasmModule, combinedImports);

    // Grow the memory function

    let growMemory = (n: number) => {
      (instance.exports.memory as WebAssembly.Memory).grow(n);
    }

    let heap_base: number;

    try {
      heap_base = (instance.exports.heap_base_ptr as any).value as number;
    } catch (e) {
      log("No heap_base_ptr found");
      heap_base = 0;
    }

    // initialize the memory allocator
    memoryAllocator.set(heap_base);
    memoryAllocator.memory = (instance.exports.memory as WebAssembly.Memory);
    memoryAllocator.setGrow(growMemory);

    if (wasiUsed) {

      // Start the WebAssembly WASI instance!
      try {
        // Run the start function
        let exitCode = wasi.start(instance);
        // Get the stdout of the WASI module
        let stdout = wasi.getStdoutString();
        // 
        setStdout(stdout);

        log(`${stdout}(exit code: ${exitCode})`, 'DodgerBlue');
        setWasmResult(exitCode);
      } catch (e) {
        console.error(e);
      } finally {
        setIsRunning(false);
        wasi.free();
      }

    } else {
      try {
        const start = instance.exports[selectedFunc] as Function;
        const res = start();
        console.log("result:" + res);
      } catch (e) {
        console.error("Program failed");
      } finally {
        handleExitCode(instance);
        setIsRunning(false);
      }
    }
  }

  const handleExitCode = (instance: WebAssembly.Instance) => {
    try {
      let exitCode = (instance.exports.exit_code as any).value as number;
      log(`exit code: ${exitCode}`);
      setWasmResult(exitCode);
    } catch (e) {
      log("No exit_code found");
      setWasmResult(-1);
    }
  }

  const reloadPage = () => {
    window.location.reload();
  }

  const status = (result: number) => {
    if (result == 0) {
      return <div>exit code: {result}, Success✅</div>
    }
    else if (result == -1) {
      return <></>
    }

    return <div>exit code: {result}, Failure❌</div>
  }

  return (
    <>
      <button className={styles.button} onClick={reloadPage}><FiRefreshCcw className={styles.icon} />Reset</button>

      <span><label style={{ fontSize: "1rem", margin: "20px" }}>Debug mode</label><br /><br /><Switch onChange={() => setIsDebug(!isDebug)} checked={isDebug} /></span>
      {loading && <div>⏳Loading...</div>}
      {isRunning && <div>🏃‍♂️Running...</div>}
      <div>

        <button className={styles.button} onClick={openFileSelector}><FiFileText className={styles.icon} /> Select file</button>
        {funcList.length > 1 &&
          <select name="funcs" id="funcs" onChange={(e) => setSelectedFunc((e.target as any).value)} value={selectedFunc}>
            {funcList.map((func) => {
              return <option key={func} value={func}>{func}</option>
            })}
          </select>}
        <button disabled={isRunDisabled} className={styles.button} onClick={run}><FiChevronRight className={styles.icon} /> Run</button>
      </div>
      <div>
        <div>{msg}</div>
      </div>
      {status(wasmResult ?? -1)}
      {stdout && <div className={styles.stdout}>
        <div>Stdout:</div>
        <div>{stdout}</div>
      </div>}
      <footer className={styles.footer}>
        <div>Created by Troels Lund (trolund@gmail.com)</div>
      </footer>
    </>
  );
};


