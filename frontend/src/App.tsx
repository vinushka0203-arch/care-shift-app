import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LoginPage } from './pages/LoginPage'
import { ShiftsPage } from './pages/ShiftsPage'
import { RequestsPage } from './pages/RequestsPage'
import { UsersPage } from './pages/UsersPage'
import { ShiftTypesPage } from './pages/ShiftTypesPage'
import { Layout } from './components/Layout'
import { RequireAuth } from './components/RequireAuth'
import { RequireAdmin } from './components/RequireAdmin'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route path="/" element={<ShiftsPage />} />
            <Route path="/requests" element={<RequestsPage />} />
            <Route
              path="/users"
              element={
                <RequireAdmin>
                  <UsersPage />
                </RequireAdmin>
              }
            />
            <Route
              path="/shift-types"
              element={
                <RequireAdmin>
                  <ShiftTypesPage />
                </RequireAdmin>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
