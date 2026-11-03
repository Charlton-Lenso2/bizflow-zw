import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './features/auth/context/AuthContext'
import { BusinessProvider } from './features/business/context/BusinessContext'
import { ThemeProvider } from './features/theme/context/ThemeContext'
import { AppRouter } from './routes/AppRouter'

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <BusinessProvider>
            <AppRouter />
          </BusinessProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App
