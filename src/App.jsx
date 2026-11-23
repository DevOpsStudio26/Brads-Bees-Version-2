import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { CartProvider } from './context/CartProvider'
import { ContentProvider } from './context/ContentProvider'
import { MessageProvider } from './context/MessageProvider'
import Layout from './components/layout/Layout'
import Home from './pages/Home'
import Services from './pages/Services'
import Shop from './pages/Shop'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import Education from './pages/Education'
import Gallery from './pages/Gallery'
import Contact from './pages/Contact'
import NotFound from './pages/NotFound'

// Brad's admin page. Loaded only when someone opens /admin.
const AdminApp = lazy(() => import('./admin/AdminApp'))

function App() {
  return (
    <ContentProvider>
      <MessageProvider>
        <CartProvider>
          <BrowserRouter>
            <Routes>
              <Route
                path="/admin/*"
                element={
                  <Suspense fallback={null}>
                    <AdminApp />
                  </Suspense>
                }
              />
              <Route element={<Layout />}>
                <Route path="/" element={<Home />} />
                <Route path="/services" element={<Services />} />
                <Route path="/shop" element={<Shop />} />
                <Route path="/shop/cart" element={<Cart />} />
                <Route path="/shop/checkout" element={<Checkout />} />
                <Route path="/education" element={<Education />} />
                <Route path="/gallery" element={<Gallery />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </MessageProvider>
    </ContentProvider>
  )
}

export default App
