(module
  ;; import the browser console object, you'll need to pass this in from JavaScript
  (import "env" "writeInt" (func $write (param i32)))

(func (export "main") (result i32)
    ;; create a local variable and initialize it to 0
    (local $i i32)

    (loop $my_loop

      ;; add one to $i
      local.get $i
      i32.const 1
      i32.add
      local.set $i

      ;; log the current value of $i
      local.get $i
      call $write

      ;; if $i is less than 10 branch to loop
      local.get $i
      i32.const 10
      i32.lt_s
      br_if $my_loop
    )
    
      ;; Set the return value of the function to 42
      i32.const 42
      return
  )

)
