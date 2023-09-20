import { log } from "console";
import { MemoryAllocator } from "./MemoryAllocator";

// function that take a wasm instance and memory alocator and return imports object
export function getImports(memoryAllocator: MemoryAllocator): object {

    let memory = memoryAllocator.memory as WebAssembly.Memory;

    return {
        env: {
          abort(_msg: any, _file: any, line: any, column: any) {
            console.error("abort called at index.ts:" + line + ":" + column);
          },
          writeS(address: number, length: number) {
            // Get `memory[address..address + length]`.
            const mem = new Uint8Array(
              memory.buffer
            );
    
            const data = mem.subarray(
              address,
              address + length
            );
    
            // Convert it into a string.
            const decoder = new TextDecoder("utf-8");
            const text = decoder.decode(data);
            console.log(text);
          },
          malloc(size: number) {
            let pointer = memoryAllocator.allocate(size);
            console.log("malloc", size, "pointer", pointer);
            return pointer;
          }
        }
      }

    }