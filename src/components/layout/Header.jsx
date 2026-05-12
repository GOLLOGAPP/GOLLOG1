import { useState } from 'react';
import { FiBell, FiSearch } from 'react-icons/fi';

export default function Header({ title }) {
  const [unidade, setUnidade] = useState('Osasco');

  return (
    <header className="main-header">
      <h2>{title}</h2>
      <div className="header-actions">
        <div className="search-wrapper">
          <FiSearch className="search-icon" />
          <input className="search-input" placeholder="Buscar cliente, cotação..." />
        </div>
        <select className="unit-selector" value={unidade} onChange={e => setUnidade(e.target.value)}>
          <option value="Osasco">📍 Osasco</option>
          <option value="Barueri">📍 Barueri</option>
          <option value="Todas">📍 Todas</option>
        </select>
        <button className="btn btn-ghost btn-icon" title="Notificações">
          <FiBell size={18} />
        </button>
      </div>
    </header>
  );
}
