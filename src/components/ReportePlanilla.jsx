import React, { useState, useEffect } from 'react';

const MESES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const formatQ = (val) => 'Q ' + Number(val || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatFecha = (fechaStr) => {
  if (!fechaStr) return '';
  const matchIso = String(fechaStr).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (matchIso) {
    return `${matchIso[3].padStart(2, '0')}/${matchIso[2].padStart(2, '0')}/${matchIso[1]}`;
  }
  return fechaStr;
};

const formatFechaHora = (fechaStr) => {
  if (!fechaStr) return '';
  const match = String(fechaStr).match(/^(\d{4})-(\d{1,2})-(\d{1,2})[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
  if (match) {
    const ss = match[6] ? `:${match[6].padStart(2, '0')}` : '';
    return `${match[3].padStart(2, '0')}/${match[2].padStart(2, '0')}/${match[1]} ${match[4].padStart(2, '0')}:${match[5].padStart(2, '0')}${ss}`;
  }
  return formatFecha(fechaStr);
};

export default function ReportePlanilla() {
  const [periodos, setPeriodos] = useState([]);
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState('');
  const [datosReporte, setDatosReporte] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [filtroEmpleado, setFiltroEmpleado] = useState('');
  const [filtroPuesto, setFiltroPuesto] = useState('');

  useEffect(() => {
    cargarPeriodos();
  }, []);

  const getHeaders = () => {
    const usuarioStr = localStorage.getItem('usuario');
    const roleId = usuarioStr ? JSON.parse(usuarioStr).idRole : localStorage.getItem('idRole') || '';
    return {
      'Content-Type': 'application/json',
      'x-role-id': roleId
    };
  };

  const cargarPeriodos = async () => {
    try {
      const res = await fetch('/planilla/reporte/periodos', { headers: getHeaders() });
      if (!res.ok) throw new Error('Error al cargar períodos');
      const data = await res.json();
      setPeriodos(data);
    } catch (err) {
      setError('No se pudieron obtener los períodos procesados.');
    }
  };

  const handleConsultar = async () => {
    if (!periodoSeleccionado) {
      alert('Por favor selecciona un período de planilla.');
      return;
    }
    const [anio, mes] = periodoSeleccionado.split('-');
    setCargando(true);
    setError(null);

    try {
      const res = await fetch(`/planilla/reporte/consolidado/${anio}/${mes}`, { headers: getHeaders() });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.mensaje || 'Error al obtener reporte');
      }
      const data = await res.json();
      setDatosReporte(data);
    } catch (err) {
      setError(err.message);
      setDatosReporte(null);
    } finally {
      setCargando(false);
    }
  };

  const handleImprimir = () => {
    window.print();
  };

  const handleExportarExcel = () => {
    if (!datosReporte || !datosReporte.detalle) return;

    const headers = [
      'Empleado', 'Fecha Contratacion', 'Puesto', 'Status',
      'Sueldo Base', 'Bonif. Decreto', 'Otros Ingresos',
      'Descuento IGSS', 'Descuento ISR', 'Descuento Inasistencias',
      'Salario Neto'
    ];

    const rows = datosReporte.detalle.map(d => [
      `"${d.NombreEmpleado}"`,
      d.FechaContratacion,
      `"${d.NombrePuesto}"`,
      d.NombreStatus,
      d.IngresoSueldoBase,
      d.IngresoBonificacionDecreto,
      d.IngresoOtrosIngresos,
      d.DescuentoIgss,
      d.DescuentoIsr,
      d.DescuentoInasistencias,
      d.SalarioNeto
    ]);

    rows.push([]);
    rows.push([
      '"TOTALES GENERALES"', '', '', '',
      '', '', `"${datosReporte.cabecera.TotalIngresos}"`,
      '', '', `"${datosReporte.cabecera.TotalDescuentos}"`,
      `"${datosReporte.cabecera.SalarioNeto}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Reporte_Planilla_${periodoSeleccionado}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container-fluid p-4 bg-light min-vh-100">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-area { box-shadow: none !important; border: none !important; }
          body { background: white !important; }
        }
      `}</style>

      <div className="card shadow-sm mb-4 border-0 no-print">
        <div className="card-body">
          <h4 className="card-title text-primary fw-bold mb-3">14. Reporte General de Planilla</h4>
          
          <div className="row g-3 align-items-end">
            <div className="col-md-5">
              <label className="form-label fw-semibold text-secondary">Período de Planilla:</label>
              <select
                className="form-select"
                value={periodoSeleccionado}
                onChange={(e) => setPeriodoSeleccionado(e.target.value)}
              >
                <option value="">-- Seleccione un Período --</option>
                {periodos.map((p) => (
                  <option key={`${p.Anio}-${p.Mes}`} value={`${p.Anio}-${p.Mes}`}>
                    {MESES[p.Mes]} {p.Anio} ({formatFecha(p.FechaInicio)} al {formatFecha(p.FechaFin)}){p.Procesado ? ` [Procesado (${formatFechaHora(p.FechaHoraProcesada)})]` : ' (Sin procesar)'}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-7 d-flex gap-2">
              <button className="btn btn-primary px-3" onClick={handleConsultar} disabled={cargando}>
                <i className="bi bi-search me-1"></i> {cargando ? 'Consultando...' : 'Consultar'}
              </button>
              <button className="btn btn-outline-danger px-3" onClick={handleImprimir} disabled={!datosReporte}>
                <i className="bi bi-printer me-1"></i> Imprimir (PDF)
              </button>
              <button className="btn btn-outline-success px-3" onClick={handleExportarExcel} disabled={!datosReporte}>
                <i className="bi bi-file-earmark-excel me-1"></i> Exportar (Excel)
              </button>
            </div>
          </div>

          {error && <div className="alert alert-danger mt-3 mb-0">{error}</div>}
        </div>
      </div>

      {datosReporte && (
        <div className="card shadow-sm border-0 print-area">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
              <div>
                <h5 className="fw-bold mb-0">Resumen de Planilla Procesada</h5>
                <small className="text-muted">
                  Período: {MESES[Number(periodoSeleccionado.split('-')[1])]} {periodoSeleccionado.split('-')[0]} | 
                  Fecha de Cierre: {formatFechaHora(datosReporte.cabecera.FechaHoraProcesada)}
                </small>
              </div>
              <span className="badge bg-primary fs-6">{datosReporte.detalle.length} Empleados</span>
            </div>

            <div className="row g-3 mb-4">
              <div className="col-md-4">
                <div className="p-3 bg-white border-start border-primary border-4 rounded shadow-sm text-center">
                  <div className="text-muted small text-uppercase fw-bold">Total Ingresos</div>
                  <div className="fs-4 fw-bold text-dark">{formatQ(datosReporte.cabecera.TotalIngresos)}</div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="p-3 bg-white border-start border-danger border-4 rounded shadow-sm text-center">
                  <div className="text-muted small text-uppercase fw-bold">Total Descuentos</div>
                  <div className="fs-4 fw-bold text-danger">{formatQ(datosReporte.cabecera.TotalDescuentos)}</div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="p-3 bg-white border-start border-success border-4 rounded shadow-sm text-center">
                  <div className="text-muted small text-uppercase fw-bold">Salario Neto General</div>
                  <div className="fs-4 fw-bold text-success">{formatQ(datosReporte.cabecera.SalarioNeto)}</div>
                </div>
              </div>
            </div>

            <div className="row g-2 mb-3 align-items-end bg-light p-3 rounded border no-print">
              <div className="col-md-5">
                <label className="form-label small fw-bold text-secondary mb-1">Buscar por Empleado o ID:</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Nombre o ID..."
                  value={filtroEmpleado}
                  onChange={e => setFiltroEmpleado(e.target.value)}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label small fw-bold text-secondary mb-1">Puesto:</label>
                <select
                  className="form-select form-select-sm"
                  value={filtroPuesto}
                  onChange={e => setFiltroPuesto(e.target.value)}
                >
                  <option value="">-- Todos los Puestos --</option>
                  {[...new Set(datosReporte.detalle.map(d => d.NombrePuesto).filter(Boolean))].sort().map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-3 d-flex gap-1">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary w-100"
                  onClick={() => { setFiltroEmpleado(''); setFiltroPuesto(''); }}
                >
                  <i className="bi bi-x-circle me-1"></i>Limpiar Filtros
                </button>
              </div>
            </div>

            <div className="table-responsive">
              <table className="table table-bordered table-striped table-hover align-middle text-nowrap" style={{ fontSize: '0.85rem' }}>
                <thead className="table-dark text-center">
                  <tr>
                    <th>ID</th>
                    <th>Empleado</th>
                    <th>Contratación (DD/MM/AAAA)</th>
                    <th>Puesto</th>
                    <th>Status</th>
                    <th>Sueldo Base</th>
                    <th>Bonif. Decreto</th>
                    <th>Otros Ingresos</th>
                    <th>% IGSS</th>
                    <th>Desc. IGSS</th>
                    <th>% ISR</th>
                    <th>Desc. ISR</th>
                    <th>Desc. Inasist.</th>
                    <th>Salario Neto</th>
                  </tr>
                </thead>
                <tbody>
                  {datosReporte.detalle
                    .filter(row => {
                      if (filtroEmpleado) {
                        const coincideId = String(row.IdEmpleado).includes(filtroEmpleado);
                        const coincideNom = (row.NombreEmpleado || '').toLowerCase().includes(filtroEmpleado.toLowerCase());
                        if (!coincideId && !coincideNom) return false;
                      }
                      if (filtroPuesto && row.NombrePuesto !== filtroPuesto) return false;
                      return true;
                    })
                    .map((row) => (
                      <tr key={row.IdPlanillaDetalle}>
                        <td className="fw-bold">{row.IdEmpleado}</td>
                        <td className="fw-semibold">{row.NombreEmpleado}</td>
                        <td className="text-center">{formatFecha(row.FechaContratacion)}</td>
                        <td>{row.NombrePuesto}</td>
                        <td className="text-center">
                          <span className="badge bg-success">{row.NombreStatus}</span>
                        </td>
                        <td className="text-end">{formatQ(row.IngresoSueldoBase)}</td>
                        <td className="text-end">{formatQ(row.IngresoBonificacionDecreto)}</td>
                        <td className="text-end">{formatQ(row.IngresoOtrosIngresos)}</td>
                        <td className="text-center">
                          <span className="badge bg-primary bg-opacity-10 text-primary">{Number(row.PorcentajeIgss ?? 4.83).toFixed(2)}%</span>
                        </td>
                        <td className="text-end text-danger">{formatQ(row.DescuentoIgss)}</td>
                        <td className="text-center">
                          <span className="badge bg-primary bg-opacity-10 text-primary">{Number(row.PorcentajeIsr ?? 5.00).toFixed(2)}%</span>
                        </td>
                        <td className="text-end text-danger">{formatQ(row.DescuentoIsr)}</td>
                        <td className="text-end text-danger">{formatQ(row.DescuentoInasistencias)}</td>
                        <td className="text-end fw-bold text-success">{formatQ(row.SalarioNeto)}</td>
                      </tr>
                    ))}
                  {datosReporte.detalle.filter(row => {
                    if (filtroEmpleado) {
                      const coincideId = String(row.IdEmpleado).includes(filtroEmpleado);
                      const coincideNom = (row.NombreEmpleado || '').toLowerCase().includes(filtroEmpleado.toLowerCase());
                      if (!coincideId && !coincideNom) return false;
                    }
                    if (filtroPuesto && row.NombrePuesto !== filtroPuesto) return false;
                    return true;
                  }).length === 0 && (
                    <tr>
                      <td colSpan="14" className="text-center text-muted py-4">
                        <i className="bi bi-search me-2"></i>No se encontraron empleados que coincidan con los criterios de búsqueda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
