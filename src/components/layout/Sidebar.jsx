import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  FiGrid, FiUsers, FiPackage, FiDollarSign, FiTruck,
  FiHeadphones, FiHelpCircle, FiSettings, FiLogOut, FiMenu, FiX, FiUserPlus
} from 'react-icons/fi';

const menuSections = [
  {
    title: 'Principal',
    items: [
      { to: '/admin/dashboard', icon: FiGrid, label: 'Dashboard' },
      { to: '/admin/clientes', icon: FiUsers, label: 'Clientes', badge: null },
    ]
  },
  {
    title: 'Operações',
    items: [
      { to: '/admin/cotacoes', icon: FiDollarSign, label: 'Cotações' },
      { to: '/admin/rastreamentos', icon: FiPackage, label: 'Rastreamentos' },
      { to: '/admin/coletas', icon: FiTruck, label: 'Coletas' },
    ]
  },
  {
    title: 'Atendimento',
    items: [
      { to: '/admin/suporte', icon: FiHeadphones, label: 'Suporte' },
      { to: '/admin/motoristas', icon: FiUserPlus, label: 'Motoristas' },
      { to: '/admin/faq', icon: FiHelpCircle, label: 'FAQ' },
    ]
  },
  {
    title: 'Sistema',
    items: [
      { to: '/admin/configuracoes', icon: FiSettings, label: 'Configurações' },
    ]
  }
];

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <>
      <button className="btn btn-icon sidebar-toggle" onClick={() => setMobileOpen(true)}
        style={{ position:'fixed', top:16, left:16, zIndex:90, display:'none' }}>
        <FiMenu />
      </button>

      {mobileOpen && <div className="modal-overlay" onClick={() => setMobileOpen(false)} style={{zIndex:99}} />}

      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <img src="/logo.png" alt="GOLLOG" />
          <div>
            <h1>GOLLOG</h1>
            <span>APP</span>
          </div>
          {mobileOpen && (
            <button className="btn btn-ghost btn-icon" onClick={() => setMobileOpen(false)} style={{marginLeft:'auto'}}>
              <FiX />
            </button>
          )}
        </div>

        <nav className="sidebar-nav">
          {menuSections.map(section => (
            <div className="sidebar-section" key={section.title}>
              <div className="sidebar-section-title">{section.title}</div>
              {section.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                  onClick={() => setMobileOpen(false)}
                >
                  <span className="icon"><item.icon /></span>
                  {item.label}
                  {item.badge && <span className="sidebar-badge">{item.badge}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">A</div>
            <div className="sidebar-user-info">
              <div className="name">Admin</div>
              <div className="role">Osasco</div>
            </div>
            <button className="btn btn-ghost btn-icon" title="Sair">
              <FiLogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
