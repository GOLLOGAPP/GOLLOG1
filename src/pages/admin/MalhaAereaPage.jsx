import { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabase';

function parseXLS(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        if (raw.length < 2) { reject(new Error('Planilha vazia')); return; }

        const headers = raw[0].map(h => String(h || '').trim().toLowerCase());
        const find = (...terms) => headers.findIndex(h => terms.some(t => h.includes(t.toLowerCase())));

        const cols = {
          airline:          find('aln', 'airline'),
          flight_number:    find('flt', 'flight'),
          day_date:         find('day'),
          weekday:          find('weekday'),
          dept_station:     find('dept st', 'dept s'),
          dept_time:        find('dept t'),
          arrival_time:     find('arrv t', 'arrv tm'),
          rel_arrival:      find('rel'),
          arrival_station:  find('arrv s', 'arrv st'),
          ac_owner:         find('a/c', 'owner'),
          equipment:        find('equip'),
          aircraft:         find('aircraft'),
          service_type:     find('svc', 'service'),
          pode_carga:       find('pode', 'cargo', 'carga'),
        };

        const rows = raw.slice(1)
          .filter(r => String(r[cols.airline] || '').trim())
          .map(r => ({
            airline:          String(r[cols.airline]         ?? '').trim(),
            flight_number:    String(r[cols.flight_number]   ?? '').trim(),
            day_date:         String(r[cols.day_date]        ?? '').trim(),
            weekday:          String(r[cols.weekday]         ?? '').trim(),
            dept_station:     String(r[cols.dept_station]    ?? '').trim(),
            dept_time:        String(r[cols.dept_time]       ?? '').trim(),
            arrival_time:     String(r[cols.arrival_time]    ?? '').trim(),
            rel_arrival:      String(r[cols.rel_arrival]     ?? '').trim(),
            arrival_station:  String(r[cols.arrival_station] ?? '').trim(),
            ac_owner:         String(r[cols.ac_owner]        ?? '').trim(),
            equipment:        String(r[cols.equipment]       ?? '').trim(),
            aircraft:         String(r[cols.aircraft]        ?? '').trim(),
            service_type:     String(r[cols.service_type]    ?? '').trim(),
            pode_enviar_carga: String(r[cols.pode_carga]     ?? '').trim().toUpperCase(),
          }));

        resolve(rows);
      } catch (err) { reject(err); }
    };
    reader.readAsArrayBuffer(file);
  });
}

export default function MalhaAereaPage() {
  const [rows, setRows] = useState([]);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [uploadAtual, setUploadAtual] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const inputRef = useRef();

  useEffect(() => {
    fetchUploadAtual();
  }, []);

  async function fetchUploadAtual() {
    const { data } = await supabase
      .from('malha_uploads').select('*').eq('ativo', true).maybeSingle();
    setUploadAtual(data);
    if (data?.storage_path) {
      const { data: u } = supabase.storage.from('malha-aerea').getPublicUrl(data.storage_path);
      setDownloadUrl(u?.publicUrl || null);
    }
  }

  async function handleFile(f) {
    if (!f) return;
    setFile(f);
    setStatus('Lendo arquivo...');
    try {
      const parsed = await parseXLS(f);
      setRows(parsed);
      setStatus(`${parsed.length} voos encontrados. Revise e clique em Publicar.`);
    } catch (err) {
      setStatus('Erro ao ler arquivo: ' + err.message);
    }
  }

  async function handlePublicar() {
    if (!rows.length || !file) return;
    setLoading(true);
    setStatus('Enviando arquivo...');

    try {
      // Upload do arquivo original para Supabase Storage
      const timestamp = Date.now();
      const storagePath = `${timestamp}_${file.name}`;
      const { error: storageErr } = await supabase.storage
        .from('malha-aerea').upload(storagePath, file, { upsert: true });

      if (storageErr) {
        setStatus('Erro no upload do arquivo: ' + storageErr.message);
        setLoading(false);
        return;
      }

      setStatus('Importando voos...');

      // Envia dados para a API
      const res = await fetch('/api/admin/malha-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows, filename: file.name, storage_path: storagePath }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro desconhecido');

      setStatus(`✅ Malha publicada com sucesso! ${data.total} voos importados.`);
      setRows([]);
      setFile(null);
      fetchUploadAtual();
    } catch (err) {
      setStatus('Erro: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  const sim = rows.filter(r => r.pode_enviar_carga === 'SIM').length;
  const nao = rows.filter(r => r.pode_enviar_carga === 'NÃO' || r.pode_enviar_carga === 'NAO').length;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Malha Aérea</h1>
          <p className="page-subtitle">Importe e publique a malha de voos disponíveis para carga</p>
        </div>
        {downloadUrl && (
          <a href={downloadUrl} download className="btn btn-secondary">
            ⬇ Baixar XLS atual
          </a>
        )}
      </div>

      {uploadAtual && (
        <div className="card" style={{ marginBottom: 24, padding: '16px 24px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <strong>Malha ativa:</strong> {uploadAtual.filename} — {uploadAtual.total_voos} voos —{' '}
          publicada em {new Date(uploadAtual.uploaded_at).toLocaleString('pt-BR')}
        </div>
      )}

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16 }}>Importar nova malha</h3>

        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
          style={{
            border: '2px dashed #d1d5db', borderRadius: 8, padding: '48px 24px',
            textAlign: 'center', cursor: 'pointer', background: '#fafafa', marginBottom: 16,
          }}
        >
          <p style={{ fontSize: 16, color: '#6b7280', margin: 0 }}>
            {file ? `📄 ${file.name}` : '📂 Arraste o arquivo XLS aqui ou clique para selecionar'}
          </p>
          <input ref={inputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files[0])} />
        </div>

        {status && (
          <p style={{ marginBottom: 16, color: status.startsWith('✅') ? '#16a34a' : status.startsWith('Erro') ? '#dc2626' : '#374151' }}>
            {status}
          </p>
        )}

        {rows.length > 0 && (
          <>
            <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
              <span style={{ background: '#dcfce7', color: '#16a34a', padding: '4px 12px', borderRadius: 20, fontSize: 13 }}>
                ✅ Com cargo: {sim}
              </span>
              <span style={{ background: '#fee2e2', color: '#dc2626', padding: '4px 12px', borderRadius: 20, fontSize: 13 }}>
                ❌ Sem cargo: {nao}
              </span>
              <span style={{ background: '#f3f4f6', color: '#374151', padding: '4px 12px', borderRadius: 20, fontSize: 13 }}>
                Total: {rows.length}
              </span>
            </div>

            <div style={{ overflowX: 'auto', maxHeight: 320, marginBottom: 16 }}>
              <table className="data-table" style={{ fontSize: 12 }}>
                <thead>
                  <tr>
                    <th>Voo</th><th>Data</th><th>Dia</th><th>Origem</th>
                    <th>Saída</th><th>Chegada</th><th>Destino</th><th>Aeronave</th><th>Carga?</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 50).map((r, i) => (
                    <tr key={i}>
                      <td>{r.airline}{r.flight_number}</td>
                      <td>{r.day_date}</td>
                      <td>{r.weekday}</td>
                      <td>{r.dept_station}</td>
                      <td>{r.dept_time}</td>
                      <td>{r.arrival_time}</td>
                      <td>{r.arrival_station}</td>
                      <td>{r.aircraft}</td>
                      <td style={{ color: r.pode_enviar_carga === 'SIM' ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                        {r.pode_enviar_carga}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 50 && (
                <p style={{ textAlign: 'center', color: '#6b7280', fontSize: 13, marginTop: 8 }}>
                  Mostrando 50 de {rows.length} voos
                </p>
              )}
            </div>

            <button className="btn btn-primary" onClick={handlePublicar} disabled={loading}>
              {loading ? 'Publicando...' : `🚀 Publicar ${rows.length} voos`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
