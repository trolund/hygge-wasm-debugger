/**
  This function removes the ansi escape characters
  (normally used for printing colors and so)
  Inspired by: https://github.com/chalk/ansi-regex/blob/master/index.js
  MIT License Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (sindresorhus.com)
 */
export const cleanStdout = (stdout: string) => {
    const pattern = [
        "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)",
        "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))"
    ].join("|");

    const regexPattern = new RegExp(pattern, "g");
    return stdout.replace(regexPattern, "");
};


// Assign all reads to fd 0 (in this case, /dev/stdin) to our custom function
// Handle read of stdin, similar to C read
// https://linux.die.net/man/2/read
// Implemented here within the WasmFs Dependancy, Memfs:
// https://github.com/streamich/memfs/blob/master/src/volume.ts#L1020
// NOTE: This function MUST BE SYNCHRONOUS, 
// per the C api. Otherwise, the Wasi module will error.
export let readStdinCounter = 0
export const stdinRead = (
    stdinBuffer: Buffer, // Uint8Array of the buffer that is sent to the guest Wasm module's standard input
    offset: number, // offset for the standard input
    length: number, // length of the standard input
    position: number // Position in the input
    ) => {

  // Per the C API, first read should be the string
  // Second read would be the end of the string
  if (readStdinCounter % 2 !== 0) {
    readStdinCounter++;
    return 0;
  }

  // Use window.prompt to synchronously get input from the user
  // This will block the entire main thread until this finishes.
  // To do this more clean-ly, it would be best to use a Web Worker
  // and Shared Array Buffer. And use prompt as a fallback
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer
  // https://github.com/wasmerio/wasmer-js/blob/master/packages/wasm-terminal/src/process/process.ts#L174
  let responseStdin = prompt(
      `Please enter standard input to the quickjs prompt\n`
      );

  // When the user cancels, throw an error to get out of the standard input read loop
  // From the guest Wasm modules (quickjs)
  if (responseStdin === null) {
    const userError = new Error("Process killed by Prompt Cancellation");
    (userError as any).user = true;
    throw userError;
    return -1;
  }
  responseStdin += "\n";

  // Encode the string into bytes to be placed into the buffer for standard input
  const buffer = new TextEncoder().encode(responseStdin);
  for (let x = 0; x < buffer.length; ++x) {
    stdinBuffer[x] = buffer[x];
  }

  // Return the current stdin, per the C API
  return buffer.length;
}