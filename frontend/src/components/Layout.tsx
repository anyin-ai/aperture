import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Toast from './Toast'

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
      <Toast />
    </div>
  )
}
