import './App.css'
import { CodingPage } from './components/CodingPage'
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Landing } from './components/Landing';
import { AuthProviderWithHistory } from './auth/AuthProvider';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { Dashboard } from './pages/Dashboard';
import { Search } from './pages/Search';
import { Profile } from './pages/Profile';

function App() {
  return (
    <BrowserRouter>
      <AuthProviderWithHistory>
        <Routes>
          <Route path="/coding" element={
            <ProtectedRoute>
              <CodingPage />
            </ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/search" element={
            <ProtectedRoute>
              <Search />
            </ProtectedRoute>
          } />
          <Route path="/profile/:userId?" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          <Route path="/" element={<Landing />} />
        </Routes>
      </AuthProviderWithHistory>
    </BrowserRouter>
  )
}

export default App
