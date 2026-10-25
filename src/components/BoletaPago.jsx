import React, { useState, useEffect } from 'react';

const MESES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const formatQ = (val) => 'Q ' + Number(val || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatFecha = (fechaStr) => {
  if (!fechaStr) return '';
  const match = String(fechaStr).match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (match) {
    const [, anio, mes, dia] = match;
    return `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${anio}`;
  }
  return String(fechaStr);
};

export default function BoletaPago() {
  const [periodos, setPeriodos] = useState([]);
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState('');
  const [empleados, setEmpleados] = useState([]);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState('');
  const [boleta, setBoleta] = useState(null);
  const [cargando, setCargando] = useState(false);

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
      const res = await fetch('/planilla/boletas/periodos', { headers: getHeaders() });
      const data = await res.json();
      setPeriodos(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePeriodoChange = async (e) => {
    const val = e.target.value;
    setPeriodoSeleccionado(val);
    setEmpleadoSeleccionado('');
    setBoleta(null);

    if (!val) {
      setEmpleados([]);
      return;
    }

    const [anio, mes] = val.split('-');
    try {
      const res = await fetch(`/planilla/boletas/periodo/${anio}/${mes}/empleados`, { headers: getHeaders() });
      const data = await res.json();
      setEmpleados(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleConsultar = async () => {
    if (!periodoSeleccionado || !empleadoSeleccionado) {
      alert('Seleccione tanto el período como el empleado.');
      return;
    }

    const [anio, mes] = periodoSeleccionado.split('-');
    setCargando(true);
    try {
      const res = await fetch(`/planilla/boletas/${anio}/${mes}/${empleadoSeleccionado}`, { headers: getHeaders() });
      if (!res.ok) throw new Error('No se encontró la boleta de pago');
      const data = await res.json();
      setBoleta(data);
    } catch (err) {
      alert(err.message);
      setBoleta(null);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="container p-4 bg-light min-vh-100">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .boleta-container { border: 2px solid #000 !important; width: 100% !important; margin: 0 !important; }
        }
      `}</style>

      <div className="card shadow-sm border-0 mb-4 no-print">
        <div className="card-body">
          <h4 className="fw-bold text-primary mb-3">15. Consulta y Emisión de Boletas de Pago</h4>
          <div className="row g-3 align-items-end">
            <div className="col-md-4">
              <label className="form-label small fw-bold text-secondary">1. Período de Planilla:</label>
              <select className="form-select" value={periodoSeleccionado} onChange={handlePeriodoChange}>
                <option value="">-- Seleccionar Período --</option>
                {periodos.map((p) => (
                  <option key={`${p.Anio}-${p.Mes}`} value={`${p.Anio}-${p.Mes}`}>
                    {MESES[p.Mes]} {p.Anio} ({formatFecha(p.FechaInicio)} al {formatFecha(p.FechaFin)}){p.Procesado ? ' [Procesado]' : ' (Sin procesar)'}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-5">
              <label className="form-label small fw-bold text-secondary">2. Empleado:</label>
              <select
                className="form-select"
                value={empleadoSeleccionado}
                onChange={(e) => setEmpleadoSeleccionado(e.target.value)}
                disabled={!empleados.length}
              >
                <option value="">-- Seleccionar Empleado --</option>
                {empleados.map((emp) => (
                  <option key={emp.IdEmpleado} value={emp.IdEmpleado}>
                    {emp.NombreEmpleado} ({emp.NombrePuesto})
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-3 d-flex gap-2">
              <button className="btn btn-primary w-100" onClick={handleConsultar} disabled={cargando || !empleadoSeleccionado}>
                <i className="bi bi-search me-1"></i> {cargando ? 'Buscando...' : 'Consultar'}
              </button>
              <button className="btn btn-outline-danger" onClick={() => window.print()} disabled={!boleta}>
                <i className="bi bi-printer"></i> Imprimir/PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {boleta && (
        <div className="card shadow-sm border p-4 bg-white mx-auto boleta-container" style={{ maxWidth: '850px' }}>
          <div className="row border-bottom pb-3 mb-3 align-items-center">
            <div className="col-8">
              <h4 className="fw-bold mb-0 text-dark">{boleta.NombreEmpresa}</h4>
              <div className="small text-muted">NIT: {boleta.NitEmpresa} | Sucursal: {boleta.NombreSucursal}</div>
              <div className="fw-semibold text-secondary mt-1">BOLETA OFICIAL DE PAGO DE SALARIOS</div>
            </div>
            <div className="col-4 text-end">
              <div className="badge bg-light text-dark border p-2 text-start">
                <div><strong>Período:</strong> {MESES[boleta.Mes]} {boleta.Anio}</div>
                <div><strong>Del:</strong> {formatFecha(boleta.FechaInicioPeriodo)} <strong>Al:</strong> {formatFecha(boleta.FechaFinPeriodo)}</div>
              </div>
            </div>
          </div>

          <div className="row g-2 mb-3 bg-light p-2 rounded small">
            <div className="col-md-6"><strong>Empleado:</strong> {boleta.NombreEmpleado}</div>
            <div className="col-md-6"><strong>Puesto:</strong> {boleta.NombrePuesto}</div>
            <div className="col-md-6"><strong>Identificación:</strong> {boleta.NumeroIdentificacion}</div>
            <div className="col-md-6"><strong>Departamento:</strong> {boleta.NombreDepartamento}</div>
            <div className="col-md-6"><strong>Fecha Contratación:</strong> {formatFecha(boleta.FechaContratacion)}</div>
            <div className="col-md-6">
              <strong>Depósito:</strong> {boleta.NombreBanco ? `${boleta.NombreBanco} - ${boleta.NumeroDeCuenta}` : 'Pago por Cheque/Efectivo'}
            </div>
          </div>

          <div className="row g-4 mb-3">
            <div className="col-6">
              <table className="table table-sm table-bordered">
                <thead className="table-dark">
                  <tr>
                    <th>Ingresos</th>
                    <th className="text-end">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>Sueldo Base</td><td className="text-end">{formatQ(boleta.IngresoSueldoBase)}</td></tr>
                  <tr><td>Bonificación Decreto</td><td className="text-end">{formatQ(boleta.IngresoBonificacionDecreto)}</td></tr>
                  <tr><td>Otros Ingresos</td><td className="text-end">{formatQ(boleta.IngresoOtrosIngresos)}</td></tr>
                </tbody>
                <tfoot>
                  <tr className="fw-bold table-light">
                    <td>TOTAL INGRESOS</td>
                    <td className="text-end text-primary">{formatQ(boleta.TotalIngresos)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="col-6">
              <table className="table table-sm table-bordered">
                <thead className="table-light">
                  <tr>
                    <th>Descuentos</th>
                    <th className="text-end">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Cuota IGSS (Laboral) <span className="badge bg-secondary ms-1">{Number(boleta.PorcentajeIgss ?? 4.83).toFixed(2)}%</span></td>
                    <td className="text-end text-danger">{formatQ(boleta.DescuentoIgss)}</td>
                  </tr>
                  <tr>
                    <td>Retención ISR <span className="badge bg-secondary ms-1">{Number(boleta.PorcentajeIsr ?? 5.00).toFixed(2)}%</span></td>
                    <td className="text-end text-danger">{formatQ(boleta.DescuentoIsr)}</td>
                  </tr>
                  <tr><td>Inasistencias</td><td className="text-end text-danger">{formatQ(boleta.DescuentoInasistencias)}</td></tr>
                </tbody>
                <tfoot>
                  <tr className="fw-bold table-light">
                    <td>TOTAL DESCUENTOS</td>
                    <td className="text-end text-danger">{formatQ(boleta.TotalDescuentos)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="p-3 bg-light border rounded d-flex justify-content-between align-items-center mb-5">
            <span className="fs-6 fw-bold">LÍQUIDO A RECIBIR (Salario Neto):</span>
            <span className="fs-4 fw-bold text-success">{formatQ(boleta.SalarioNeto)}</span>
          </div>

          <div className="row text-center mt-4 pt-4 border-top">
            <div className="col-6">
              <div className="border-bottom mx-auto" style={{ width: '220px', height: '40px' }}></div>
              <div className="small fw-semibold mt-1">Firma del Colaborador</div>
              <div className="text-muted" style={{ fontSize: '0.75rem' }}>Recibí conforme el pago</div>
            </div>
            <div className="col-6">
              <div className="border-bottom mx-auto" style={{ width: '220px', height: '40px' }}></div>
              <div className="small fw-semibold mt-1">Recursos Humanos / Nóminas</div>
              <div className="text-muted" style={{ fontSize: '0.75rem' }}>Autorizado y procesado</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
