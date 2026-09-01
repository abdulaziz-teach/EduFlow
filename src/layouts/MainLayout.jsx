import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

function MainLayout() {
  const { pathname } = useLocation();
  const isLanding = pathname === '/';

  return (
    <div className="min-h-screen bg-dark text-text font-sans">
      <Navbar />
      <main>
        <Outlet />
      </main>
      {isLanding && <Footer />}
    </div>
  );
}

export default MainLayout;
