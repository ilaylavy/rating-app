import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { ensureSeeded } from './seed'
import { BottomNav } from './components/BottomNav'
import Journal from './pages/Journal'
import AddEntry from './pages/AddEntry'
import EntryDetail from './pages/EntryDetail'
import Categories from './pages/Categories'
import CategoryForm from './pages/CategoryForm'
import Stats from './pages/Stats'
import TripForm from './pages/TripForm'
import Settings from './pages/Settings'

export default function App() {
  const { pathname } = useLocation()
  useEffect(() => {
    ensureSeeded()
  }, [])

  const showNav =
    ['/', '/stats', '/categories', '/settings'].includes(pathname) || pathname.startsWith('/entry/')

  return (
    <div className={`app ${showNav ? 'with-nav' : ''}`}>
      <Routes>
        <Route path="/" element={<Journal />} />
        <Route path="/add" element={<AddEntry />} />
        <Route path="/edit/:id" element={<AddEntry />} />
        <Route path="/entry/:id" element={<EntryDetail />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/categories/new" element={<CategoryForm />} />
        <Route path="/categories/:id" element={<CategoryForm />} />
        <Route path="/trips/new" element={<TripForm />} />
        <Route path="/trips/:id" element={<TripForm />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
      {showNav && <BottomNav />}
    </div>
  )
}
