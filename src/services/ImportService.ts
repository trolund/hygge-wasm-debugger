import { MemoryAllocator } from "./MemoryAllocator";


// ("malloc", ("env", "malloc", FunctionType("malloc", Some([ (None, I32) ], [ I32 ]))))
// ("readInt", ("env", "readInt", FunctionType("readInt", Some(([], [ I32 ])))))
// ("readFloat", ("env", "readFloat", FunctionType("readFloat", Some(([], [ F32 ])))))
// ("writeInt", ("env", "writeInt", FunctionType("writeInt", Some(([ (None, I32) ], [])))))
// ("writeFloat", ("env", "writeFloat", FunctionType("writeFloat", Some(([ (None, F32) ], [])))))
// ("writeS", ("env", "writeS", FunctionType("writeS", Some(([ (None, I32); (None, I32) ], [])))))

// function that take a wasm instance and memory alocator and return imports object
export function getImports(memoryAllocator: MemoryAllocator, isDebug: boolean = false): object {

    return {
        env: {
          abort(_msg: any, _file: any, line: any, column: any) {
            console.error("abort called at index.ts:" + line + ":" + column);
          },
          writeS(address: number, length: number) {
            // Get `memory[address..address + length]`.
            const mem = new Uint8Array(
              (memoryAllocator.memory as WebAssembly.Memory).buffer
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
          writeInt(i: number){
            console.log(i);
          },
          writeFloat(f: number){
            console.log(f);
          },
          readFloat() {
            var num;
            do {
              var val = prompt("Input a float");
              if (val == null) {
                continue;
              }
              num = parseFloat(val);

              console.log("User provided input:", num);
              return num;
            }
            while (num && isNaN(num));
            return 0;
          },
          
          malloc(size: number) {
            let pointer = memoryAllocator.allocate(size);
            if (isDebug) { console.log("malloc", size, "pointer", pointer); }
            return pointer;
          },
          readInt() {
            var num;
            do {
              var val = prompt("Input an integer");
              if (val == null) {
                continue;
              }
              num = parseInt(val);

              console.log("User provided input:", num);
              return num;
            }
            while (num && isNaN(num));
            return 0;
          },
        }
      }

    }