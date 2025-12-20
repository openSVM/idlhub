import { useState, useEffect } from 'react';
import './RegistryPage.css';

interface IDLEntry {
  id: string;
  name: string;
  description: string;
  arweaveId?: string;
}

export default function RegistryPage() {
  const [idls, setIdls] = useState<IDLEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function fetchIndex() {
      try {
        const res = await fetch('/index.json');
        const data = await res.json();
        if (data.protocols) {
          const entries = Object.entries(data.protocols).map(([id, info]: [string, any]) => ({
            id,
            name: info.name || id,
            description: info.description || '',
            arweaveId: info.arweaveId
          }));
          setIdls(entries);
        }
        setLoading(false);
      } catch {
        setLoading(false);
      }
    }
    fetchIndex();
  }, []);

  const filtered = idls.filter(idl =>
    idl.name.toLowerCase().includes(search.toLowerCase()) ||
    idl.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="registry-page">
      <h1 className="page-title">IDL Registry</h1>
      <p className="page-subtitle">
        Browse and search Solana protocol IDL files stored on Arweave.
      </p>

      <div className="search-box">
        <input
          type="text"
          placeholder="Search protocols..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="loading">Loading registry...</div>
      ) : (
        <div className="idl-grid">
          {filtered.map(idl => (
            <div key={idl.id} className="idl-card">
              <h3>{idl.name}</h3>
              <p className="idl-id">{idl.id}</p>
              <p className="idl-desc">{idl.description || 'No description'}</p>
              <div className="idl-actions">
                <a href={`/api/idl/${idl.id}`} target="_blank" rel="noopener noreferrer">
                  View IDL
                </a>
                {idl.arweaveId && (
                  <a href={`https://arweave.net/${idl.arweaveId}`} target="_blank" rel="noopener noreferrer">
                    Arweave
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="empty-state">No protocols found matching "{search}"</div>
      )}
    </div>
  );
}
