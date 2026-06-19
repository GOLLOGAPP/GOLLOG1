import { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabase';

function excelTime(v) {
  if (typeof v === 'number' && v >= 0 && v < 1) {
    const mins = Math.round(v * 24 * 60);
    return `${String(Math.floor(mins / 60)).padStart(2,'0')}:${String(mins % 60).padStart(2,'0')}`;
  }
  return String(v ?? '').trim();
}

function excelDate(v) {
  if (typeof v === 'number' && v > 40000) {
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  }
  return String(v ?? '').trim();
}

function parseXLS(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        // raw: true preserves números para detectar e converter datas/horários
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });
        if (raw.length < 2) { reject(new Error('Planilha vazia')); return; }

        // Localiza a linha de cabeçalho (pode não ser a linha 0)
        let headerIdx = 0;
        for (let i = 0; i < Math.min(5, raw.length); i++) {
          const r = raw[i].map(h => String(h || '').trim().toLowerCase());
          if (r.some(h => h === 'aln' || h.includes('airline') || h === 'flt num' || h === 'flt')) {
            headerIdx = i;
            break;
          }
        }

        // normaliza espaços múltiplos para detectar "Arrv  Stn" → "arrv stn"
        const headers = raw[headerIdx].map(h => String(h || '').trim().toLowerCase().replace(/\s+/g, ' '));
        const find = (...terms) => headers.findIndex(h => terms.some(t => h.includes(t.toLowerCase())));

        console.log('[MALHA] headers detectados:', headers);
        const cols = {
          airline:          find('aln', 'airline'),
          flight_number:    find('flt', 'flight'),
          day_date:         find('day'),
          weekday:          find('weekday'),
          dept_station:     find('dept st', 'dept s', 'dep st', 'dep s'),
          dept_time:        find('dept tm', 'dept t', 'dep tm', 'dep t'),
          arrival_time:     find('arvi t', 'arrv tm', 'arrv t', 'arr tm', 'arr t'),
          rel_arrival:      find('rel'),
          arrival_station:  find('arvi s', 'arrv st', 'arrv s', 'arr st', 'arr s'),
          ac_owner:         find('a/c', 'owner'),
          equipment:        find('equip'),
          aircraft:         find('aircraft'),
          service_type:     find('svc', 'service'),
          pode_carga:       find('pode', 'cargo', 'carga'),
        };

        console.log('[MALHA] cols mapeados:', cols);
        const rows = raw.slice(headerIdx + 1)
          .filter(r => String(r[cols.airline] || '').trim())
          .map(r => ({
            airline:           String(r[cols.airline]         ?? '').trim(),
            flight_number:     String(r[cols.flight_number]   ?? '').trim(),
            day_date:          excelDate(r[cols.day_date]),
            weekday:           String(r[cols.weekday]         ?? '').trim(),
            dept_station:      String(r[cols.dept_station]    ?? '').trim().toUpperCase(),
            dept_time:         excelTime(r[cols.dept_time]),
            arrival_time:      excelTime(r[cols.arrival_time]),
            rel_arrival:       excelTime(r[cols.rel_arrival]),
            arrival_station:   String(r[cols.arrival_station] ?? '').trim().toUpperCase(),
            ac_owner:          String(r[cols.ac_owner]        ?? '').trim(),
            equipment:         String(r[cols.equipment]       ?? '').trim(),
            aircraft:          String(r[cols.aircraft]        ?? '').trim(),
            service_type:      String(r[cols.service_type]    ?? '').trim(),
            pode_enviar_carga: String(r[cols.pode_carga]      ?? '').trim().toUpperCase(),
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

    try {
      // 1. Upload do arquivo para Storage
      setStatus('Enviando arquivo...');
      const timestamp = Date.now();
      const safeName = file.name.replace(/\s+/g, '_');
      const storagePath = `${timestamp}_${safeName}`;
      const { error: storageErr } = await supabase.storage
        .from('malha-aerea').upload(storagePath, file, { upsert: true });
      if (storageErr) {
        setStatus('Erro no upload do arquivo: ' + storageErr.message);
        setLoading(false);
        return;
      }

      // 2. Desativa uploads anteriores
      setStatus('Substituindo malha anterior...');
      await supabase.from('malha_uploads').update({ ativo: false }).eq('ativo', true);

      // 3. Cria registro de upload e obtém o id para uso como malha_id
      const total = rows.length;
      const { data: uploadRec, error: uploadRecErr } = await supabase
        .from('malha_uploads')
        .insert({ filename: file.name, storage_path: storagePath, total_voos: total, ativo: true })
        .select('id').single();
      if (uploadRecErr) throw new Error('Erro ao registrar upload: ' + uploadRecErr.message);
      const malha_id = uploadRec.id;

      // 4. Limpa tabela
      await supabase.from('malha_aerea').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // 5. Insere em lotes de 500 com malha_id
      const batchSize = 500;
      for (let i = 0; i < total; i += batchSize) {
        const pct = Math.round(((i + batchSize) / total) * 100);
        setStatus(`Importando voos... ${Math.min(i + batchSize, total)}/${total} (${Math.min(pct,100)}%)`);
        const lote = rows.slice(i, i + batchSize).map(r => ({ ...r, malha_id }));
        const { error } = await supabase.from('malha_aerea').insert(lote);
        if (error) throw new Error('Erro ao inserir lote: ' + error.message);
      }

      setStatus(`✅ Malha publicada com sucesso! ${total} voos importados.`);
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
