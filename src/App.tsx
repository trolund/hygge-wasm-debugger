import './App.css';
import { WasmLoader } from './components/wasm-loader';

function App() {

  return (
    <div className="App">
      <header className="App-header">
        <h2>Welcome to WebAssembly debugger</h2>
        <WasmLoader />
        <p>Open the Chrome dev tools to debug the selected .wasm file</p>
        <p><b>Windows:</b> Ctrl + Shift + J. <b>Mac:</b> Cmd + Opt +J.</p>
      </header>
    </div>
  );
}

export default App;
