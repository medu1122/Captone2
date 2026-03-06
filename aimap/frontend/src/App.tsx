import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/home" element={<HomePage />} />
        {/* Placeholder for future routes: /login, /register, /dashboard, etc. */}
      </Routes>
    </BrowserRouter>
  )
}

export default App
