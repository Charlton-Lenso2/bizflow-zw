import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './features/auth/context/AuthContext'
import { BusinessProvider } from './features/business/context/BusinessContext'
import { AppRouter } from './routes/AppRouter'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BusinessProvider>
          <AppRouter />
        </BusinessProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
