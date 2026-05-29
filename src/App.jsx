import './App.css'
import { supabase } from './lib/supabaseClient'

const supabaseStatus = supabase
  ? 'Supabase connected ✓'
  : 'Supabase not configured'

function App() {
  return (
    <div className="splash">
      <h1 className="brand-heading">
        <span className="cream">Fitz</span>
        <span className="amber">the</span>
        <span className="cream">spotter</span>
      </h1>
      <p className="status">Build pipeline working ✓</p>
      <p className="supabase-status">{supabaseStatus}</p>
    </div>
  )
}

export default App
