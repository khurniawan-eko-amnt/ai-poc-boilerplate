// ─── App Root ─────────────────────────────────────────────
import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from './stores/authStore'
import { useSettingsStore } from './stores/settingsStore'
import { useDebugShortcut } from './components/DebugPanel'
import { DebugPanel } from './components/DebugPanel'
import { AppLayout } from './components/Layout'
import { LoginPage } from './pages/Login'
import { RegisterPage } from './pages/Register'
import { DashboardPage } from './pages/Dashboard'
import { EquipmentListPage } from './pages/EquipmentList'
import { EquipmentFormPage } from './pages/EquipmentForm'
import { EquipmentDetailPage } from './pages/EquipmentDetail'
import { InspectionsListPage } from './pages/InspectionsList'
import { NewInspectionPage } from './pages/NewInspection'
import { InspectionDetailPage } from './pages/InspectionDetail'
import { InspectionReportPage } from './pages/InspectionReport'
import { DefectsPage } from './pages/Defects'
import { TemplatesPage } from './pages/Templates'
import { TemplateEditPage } from './pages/TemplateEdit'
import { ProfilePage } from './pages/Profile'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60 * 1000, retry: 1 } },
})

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const loading = useAuthStore((s) => s.loading)
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-zinc-950"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const loading = useAuthStore((s) => s.loading)
  if (loading) return null
  if (user) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  const initialize = useAuthStore((s) => s.initialize)
  const initialized = useAuthStore((s) => s.initialized)
  const applyTheme = useSettingsStore((s) => s.applyTheme)
  useDebugShortcut()

  useEffect(() => { initialize() }, [initialize])
  useEffect(() => { applyTheme() }, [applyTheme])

  if (!initialized) {
    return <div className="min-h-screen flex items-center justify-center bg-zinc-950"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/equipment" element={<EquipmentListPage />} />
            <Route path="/equipment/new" element={<EquipmentFormPage />} />
            <Route path="/equipment/:id" element={<EquipmentDetailPage />} />
            <Route path="/inspections" element={<InspectionsListPage />} />
            <Route path="/inspections/new/:equipmentId" element={<NewInspectionPage />} />
            <Route path="/inspections/:id" element={<InspectionDetailPage />} />
            <Route path="/inspections/:id/report" element={<InspectionReportPage />} />
            <Route path="/defects" element={<DefectsPage />} />
            <Route path="/templates" element={<TemplatesPage />} />
            <Route path="/templates/:id/edit" element={<TemplateEditPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        <DebugPanel />
      </BrowserRouter>
    </QueryClientProvider>
  )
}