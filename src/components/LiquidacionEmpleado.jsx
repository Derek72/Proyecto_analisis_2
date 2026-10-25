function fechaLocalIso() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

import React, { useState, useEffect } from 'react';

const formatQ = (val) => 'Q ' + Number(val || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const MESES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const formatFecha = (fechaStr) => {
  if (!fechaStr) return '';
  const matchIso = String(fechaStr).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (matchIso) {
    return `${matchIso[3].padStart(2, '0')}/${matchIso[2].padStart(2, '0')}/${matchIso[1]}`;
  }
  return fechaStr;
};

export default function LiquidacionEmpleado() {
  const [empleados, setEmpleados] = useState([]);
  const [puestos, setPuestos] = useState([]);
  const [liquidaciones, setLiquidaciones] = useState([]);
  const [vista, setVista] = useState('formulario');

  const [mensajeErrorStatus, setMensajeErrorStatus] = useState('');
  const [mensajeErrorFechas, setMensajeErrorFechas] = useState('');
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroMotivo, setFiltroMotivo] = useState('');

  const [form, setForm] = useState({
    IdEmpleado: '',
    IdPuesto: '',
    NombrePuesto: '',
    FechaContratacion: '',
    FechaEgreso: fechaLocalIso(),
    FechaLiquidacion: fechaLocalIso(),
    MotivoEgreso: 'Despido Injustificado',
    IngresoSueldoBase: 0,
    SalarioDiario: 0,
    IngresoBonificacionDecreto: 250,
    IngresoOtrosIngresos: 0,
    DescuentoIgss: 0,
    DescuentoIsr: 0,
    PorcentajeInasistencias: 100,
    DiasInasistencia: 0,
    DescuentoInasistencias: 0,
    Observaciones: ''
  });

  const [resultadoCalculo, setResultadoCalculo] = useState(null);

  const getHeaders = () => {
    const usuarioStr = localStorage.getItem('usuario');
    const roleId = usuarioStr ? JSON.parse(usuarioStr).idRole : localStorage.getItem('idRole') || '';
    return {
      'Content-Type': 'application/json',
      'x-role-id': roleId
    };
  };

  useEffect(() => {
    cargarCombos();
    cargarHistorial();
  }, []);

  const cargarCombos = async () => {
    try {
      const resCombos = await fetch('/planilla/empleados/combos', { headers: getHeaders() });
      const dataCombos = await resCombos.json();
      setPuestos(dataCombos.puestos || []);

      const resEmp = await fetch('/planilla/empleados', { headers: getHeaders() });
      const dataEmp = await resEmp.json();
      setEmpleados(dataEmp);
    } catch (e) {
      console.error(e);
    }
  };

  const cargarHistorial = async () => {
    try {
      const res = await fetch('/planilla/liquidaciones', { headers: getHeaders() });
      const data = await res.json();
      setLiquidaciones(data);
    } catch (e) {
      console.error(e);
    }
  };

  const validarFechas = (emp, fechaEgreso) => {
    if (!emp || !fechaEgreso) {
      setMensajeErrorFechas('');
      return true;
    }

    const fContra = emp.FechaContratacion ? emp.FechaContratacion.slice(0, 10) : '';
    const fEgre = String(fechaEgreso).slice(0, 10);

    if (fContra && fEgre <= fContra) {
      setMensajeErrorFechas(`La fecha de egreso (${formatFecha(fEgre)}) debe ser estrictamente posterior a la fecha de contratación (${formatFecha(fContra)}).`);
      return false;
    }

    if (emp.UltimaFechaFinPlanilla) {
      const fFin = String(emp.UltimaFechaFinPlanilla).slice(0, 10);
      if (fFin && fEgre <= fFin) {
        const nomMes = MESES[emp.UltimoMesPlanilla] || `Mes ${emp.UltimoMesPlanilla}`;
        setMensajeErrorFechas(`La fecha de egreso (${formatFecha(fEgre)}) debe ser posterior al último período de planilla calculado del empleado (${nomMes} ${emp.UltimoAnioPlanilla || ''}, finalizado el ${formatFecha(fFin)}).`);
        return false;
      }
    }

    setMensajeErrorFechas('');
    return true;
  };

  const handleEmpleadoChange = (e) => {
    const id = Number(e.target.value);
    const emp = empleados.find(x => x.IdEmpleado === id);
    if (!emp) {
      setMensajeErrorStatus('');
      setMensajeErrorFechas('');
      setForm(prev => ({
        ...prev,
        IdEmpleado: '',
        IdPuesto: '',
        NombrePuesto: '',
        FechaContratacion: '',
        IngresoSueldoBase: 0,
        SalarioDiario: 0,
        IngresoBonificacionDecreto: 0,
        IngresoOtrosIngresos: 0,
        DescuentoIgss: 0,
        DescuentoIsr: 0,
        PorcentajeInasistencias: 100,
        DiasInasistencia: 0,
        DescuentoInasistencias: 0
      }));
      setResultadoCalculo(null);
      return;
    }

    const sueldoBase = Number(emp.IngresoSueldoBase || 0);
    const salarioDiario = Number((sueldoBase / 30).toFixed(2));

    if (emp.IdStatusEmpleado !== 1) {
      setMensajeErrorStatus(`No es posible continuar con la liquidación: El empleado no se encuentra activo (su estado actual es ${emp.NombreStatus || 'Inactivo'}). Solo se permite liquidar a empleados en estado activo.`);
      setMensajeErrorFechas('');
      setResultadoCalculo(null);
      setForm(prev => ({
        ...prev,
        IdEmpleado: id,
        IdPuesto: emp.IdPuesto,
        NombrePuesto: emp.NombrePuesto || '',
        FechaContratacion: emp.FechaContratacion ? emp.FechaContratacion.slice(0, 10) : '',
        IngresoSueldoBase: sueldoBase.toFixed(2),
        SalarioDiario: salarioDiario.toFixed(2),
        IngresoBonificacionDecreto: Number(emp.IngresoBonificacionDecreto || 0).toFixed(2),
        IngresoOtrosIngresos: Number(emp.IngresoOtrosIngresos || 0).toFixed(2),
        DescuentoIgss: Number(emp.DescuentoIgss || 0).toFixed(2),
        DescuentoIsr: Number(emp.DescuentoIsr || 0).toFixed(2),
        PorcentajeInasistencias: 100,
        DiasInasistencia: 0,
        DescuentoInasistencias: '0.00'
      }));
      return;
    }

    setMensajeErrorStatus('');
    validarFechas(emp, form.FechaEgreso);

    setForm(prev => ({
      ...prev,
      IdEmpleado: id,
      IdPuesto: emp.IdPuesto,
      NombrePuesto: emp.NombrePuesto || '',
      FechaContratacion: emp.FechaContratacion ? emp.FechaContratacion.slice(0, 10) : '',
      IngresoSueldoBase: sueldoBase.toFixed(2),
      SalarioDiario: salarioDiario.toFixed(2),
      IngresoBonificacionDecreto: Number(emp.IngresoBonificacionDecreto || 0).toFixed(2),
      IngresoOtrosIngresos: Number(emp.IngresoOtrosIngresos || 0).toFixed(2),
      DescuentoIgss: Number(emp.DescuentoIgss || 0).toFixed(2),
      DescuentoIsr: Number(emp.DescuentoIsr || 0).toFixed(2),
      PorcentajeInasistencias: 100,
      DiasInasistencia: 0,
      DescuentoInasistencias: '0.00'
    }));
  };

  const handleDiasInasistenciaChange = (e) => {
    const rawDias = Math.max(0, Number(e.target.value) || 0);
    const salarioDiario = Number(form.SalarioDiario || 0);
    const descuento = rawDias > 0 ? Number((salarioDiario * rawDias).toFixed(2)) : 0;
    setForm(prev => ({
      ...prev,
      DiasInasistencia: rawDias,
      DescuentoInasistencias: descuento.toFixed(2)
    }));
  };

  const handleFechaEgresoChange = (e) => {
    const val = e.target.value;
    const emp = empleados.find(x => x.IdEmpleado === Number(form.IdEmpleado));
    validarFechas(emp, val);
    setForm(prev => ({ ...prev, FechaEgreso: val }));
  };

  useEffect(() => {
    if (!form.IdEmpleado || !form.FechaContratacion || !form.FechaEgreso || mensajeErrorStatus || mensajeErrorFechas) {
      setResultadoCalculo(null);
      return;
    }

    const recalcular = async () => {
      try {
        const res = await fetch('/planilla/liquidaciones/simular', {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(form)
        });
        if (res.ok) {
          const data = await res.json();
          setResultadoCalculo(data);
        } else {
          setResultadoCalculo(null);
        }
      } catch (e) {
        console.error(e);
      }
    };

    recalcular();
  }, [form.IdEmpleado, form.FechaEgreso, form.FechaLiquidacion, form.MotivoEgreso, form.DiasInasistencia, form.DescuentoInasistencias, mensajeErrorStatus, mensajeErrorFechas]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (mensajeErrorStatus) {
      alert(mensajeErrorStatus);
      return;
    }

    if (mensajeErrorFechas) {
      alert(mensajeErrorFechas);
      return;
    }

    const emp = empleados.find(x => x.IdEmpleado === Number(form.IdEmpleado));
    if (!emp || emp.IdStatusEmpleado !== 1) {
      alert('No es posible continuar con la liquidación: El empleado seleccionado no se encuentra en estado activo.');
      return;
    }

    if (!validarFechas(emp, form.FechaEgreso)) {
      alert(mensajeErrorFechas || 'Fechas no válidas.');
      return;
    }

    if (!confirm('¿Confirma que desea procesar la liquidación laboral formal? Esta acción cambiará el status del empleado en el sistema.')) return;

    try {
      const res = await fetch('/planilla/liquidaciones', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(form)
      });
      if (res.ok) {
        alert('Liquidación registrada con éxito.');
        cargarCombos();
        cargarHistorial();
        setVista('historial');
      } else {
        const err = await res.json();
        alert(err.mensaje || 'Error al guardar la liquidación');
      }
    } catch (e) {
      alert('Error de conexión con el servidor.');
    }
  };

  return (
    <div className="container p-4 bg-light min-vh-100">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="fw-bold text-primary mb-0">16. Liquidación Laboral de Empleado</h4>
        <div>
          <button
            className={`btn btn-sm me-2 ${vista === 'formulario' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => { setVista('formulario'); setMensajeErrorStatus(''); setMensajeErrorFechas(''); }}
          >
            Nueva Liquidación
          </button>
          <button
            className={`btn btn-sm ${vista === 'historial' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setVista('historial')}
          >
            Historial de Liquidaciones
          </button>
        </div>
      </div>

      {vista === 'formulario' ? (
        <form onSubmit={handleSubmit}>
          {mensajeErrorStatus && (
            <div className="alert alert-danger py-2 mb-3 shadow-sm">
              <i className="bi bi-x-circle-fill me-2"></i>
              <strong>No es posible continuar:</strong> {mensajeErrorStatus}
            </div>
          )}

          {mensajeErrorFechas && (
            <div className="alert alert-danger py-2 mb-3 shadow-sm">
              <i className="bi bi-calendar-x me-2"></i>
              <strong>Validación de Fechas:</strong> {mensajeErrorFechas}
            </div>
          )}

          <div className="row g-3">
            <div className="col-md-7">
              <div className="card shadow-sm border-0 p-3 mb-3">
                <h6 className="fw-bold text-secondary border-bottom pb-2">1. Datos del Empleado y Motivo</h6>
                <div className="row g-2">
                  <div className="col-md-6">
                    <label className="form-label small">Empleado a Liquidar:</label>
                    <select className="form-select form-select-sm" value={form.IdEmpleado} onChange={handleEmpleadoChange} required>
                      <option value="">-- Seleccione un Empleado --</option>
                      {empleados.map(e => (
                        <option key={e.IdEmpleado} value={e.IdEmpleado}>
                          {e.NombrePersona} ({e.NombrePuesto}) - [{e.NombreStatus || (e.IdStatusEmpleado === 1 ? 'Activo' : 'Inactivo')}]
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Puesto: <span className="badge bg-secondary">Solo lectura</span></label>
                    <input
                      type="text"
                      className="form-control form-control-sm bg-light"
                      value={form.NombrePuesto || ''}
                      readOnly
                      placeholder="Puesto registrado oficial"
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small">Fecha Contratación: <span className="badge bg-secondary">Solo lectura</span></label>
                    <input type="text" className="form-control form-control-sm bg-light" value={formatFecha(form.FechaContratacion)} readOnly placeholder="DD/MM/AAAA" />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small">Fecha de Egreso:</label>
                    <input
                      type="date"
                      lang="es"
                      className="form-control form-control-sm"
                      value={form.FechaEgreso}
                      onChange={handleFechaEgresoChange}
                      required
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small">Fecha Liquidación:</label>
                    <input
                      type="date"
                      lang="es"
                      className="form-control form-control-sm"
                      value={form.FechaLiquidacion}
                      onChange={e => setForm({ ...form, FechaLiquidacion: e.target.value })}
                      required
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label small">Causa de Separación / Motivo:</label>
                    <select
                      className="form-select form-select-sm"
                      value={form.MotivoEgreso}
                      onChange={e => setForm({ ...form, MotivoEgreso: e.target.value })}
                    >
                      <option value="Despido Injustificado">Despido Injustificado (Con Indemnización)</option>
                      <option value="Renuncia Voluntaria">Renuncia Voluntaria (Solo Prestaciones)</option>
                      <option value="Despido Justificado">Despido Justificado (Solo Prestaciones)</option>
                      <option value="Vencimiento de Contrato">Vencimiento de Contrato</option>
                      <option value="Mutuo Acuerdo">Mutuo Acuerdo</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="card shadow-sm border-0 p-3">
                <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-2">
                  <h6 className="fw-bold text-secondary mb-0">2. Salario y Descuentos Oficiales</h6>
                  <span className="badge bg-secondary">Campos protegidos del empleado</span>
                </div>
                <div className="row g-2">
                  <div className="col-md-4">
                    <label className="form-label small">Sueldo Base (Q):</label>
                    <input
                      type="text"
                      className="form-control form-control-sm bg-light"
                      value={form.IngresoSueldoBase}
                      readOnly
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small">Bonif. Decreto (Q):</label>
                    <input
                      type="text"
                      className="form-control form-control-sm bg-light"
                      value={form.IngresoBonificacionDecreto}
                      readOnly
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small">Otros Ingresos (Q):</label>
                    <input
                      type="text"
                      className="form-control form-control-sm bg-light"
                      value={form.IngresoOtrosIngresos}
                      readOnly
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small">Desc. IGSS (Q):</label>
                    <input
                      type="text"
                      className="form-control form-control-sm bg-light"
                      value={form.DescuentoIgss}
                      readOnly
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small">Desc. ISR (Q):</label>
                    <input
                      type="text"
                      className="form-control form-control-sm bg-light"
                      value={form.DescuentoIsr}
                      readOnly
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small">Salario Diario (Base 30 días):</label>
                    <input
                      type="text"
                      className="form-control form-control-sm bg-light"
                      value={form.SalarioDiario}
                      readOnly
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small text-primary fw-bold">Días Faltados:</label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      className="form-control form-control-sm"
                      value={form.DiasInasistencia}
                      onChange={handleDiasInasistenciaChange}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small text-danger fw-bold">Desc. Inasistencias (Q):</label>
                    <input
                      type="text"
                      className="form-control form-control-sm bg-light fw-bold text-danger"
                      value={form.DescuentoInasistencias}
                      readOnly
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-5">
              <div className="card shadow-sm border-0 p-3 bg-white">
                <h6 className="fw-bold text-success border-bottom pb-2">3. Desglose de Liquidación Automática</h6>
                {resultadoCalculo ? (
                  <div className="small">
                    <div className="d-flex justify-content-between py-1">
                      <span>Días Laborados:</span>
                      <strong>{resultadoCalculo.diasTotalesTrabajados} días</strong>
                    </div>
                    <div className="d-flex justify-content-between py-1">
                      <span>Indemnización Legal:</span>
                      <strong>{formatQ(resultadoCalculo.montoIndemnizacion)}</strong>
                    </div>
                    <div className="d-flex justify-content-between py-1">
                      <span>Aguinaldo Proporcional:</span>
                      <strong>{formatQ(resultadoCalculo.montoAguinaldoProporcional)}</strong>
                    </div>
                    <div className="d-flex justify-content-between py-1">
                      <span>Bono 14 Proporcional:</span>
                      <strong>{formatQ(resultadoCalculo.montoBono14Proporcional)}</strong>
                    </div>
                    <div className="d-flex justify-content-between py-1">
                      <span>Vacaciones Proporcionales:</span>
                      <strong>{formatQ(resultadoCalculo.montoVacacionesProporcionales)}</strong>
                    </div>
                    <div className="d-flex justify-content-between py-1 border-top mt-2">
                      <span>Salario Ordinario Pendiente:</span>
                      <span>{formatQ(resultadoCalculo.salarioNetoPendiente)}</span>
                    </div>
                    <div className="d-flex justify-content-between py-1 text-danger">
                      <span>Total Descuentos:</span>
                      <span>- {formatQ(resultadoCalculo.totalDescuentos)}</span>
                    </div>

                    <div className="p-3 bg-success bg-opacity-10 rounded border border-success mt-3 text-center">
                      <div className="text-uppercase small fw-bold text-success">Total Neto de Liquidación</div>
                      <div className="fs-3 fw-bold text-success">{formatQ(resultadoCalculo.totalNetoLiquidacion)}</div>
                    </div>

                    <button type="submit" className="btn btn-success w-100 mt-4 fw-bold" disabled={Boolean(mensajeErrorStatus || mensajeErrorFechas)}>
                      <i className="bi bi-check-circle me-1"></i> Confirmar y Aplicar Liquidación
                    </button>
                  </div>
                ) : (
                  <div className="text-muted small text-center py-4">
                    {mensajeErrorStatus ? (
                      <span className="text-danger fw-semibold">Proceso bloqueado: El empleado seleccionado está inactivo.</span>
                    ) : mensajeErrorFechas ? (
                      <span className="text-danger fw-semibold">{mensajeErrorFechas}</span>
                    ) : (
                      'Seleccione un empleado activo para calcular y visualizar el desglose de liquidación.'
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="card shadow-sm border-0">
          <div className="card-body">
            <h5 className="fw-bold mb-3">Historial de Finiquitos y Liquidaciones</h5>

            <div className="row g-2 mb-3 align-items-end bg-light p-3 rounded border">
              <div className="col-md-4">
                <label className="form-label small fw-bold text-secondary mb-1">Buscar por ID o Empleado:</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Ej. 1 o Carlos..."
                  value={filtroTexto}
                  onChange={e => setFiltroTexto(e.target.value)}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label small fw-bold text-secondary mb-1">Motivo:</label>
                <select
                  className="form-select form-select-sm"
                  value={filtroMotivo}
                  onChange={e => setFiltroMotivo(e.target.value)}
                >
                  <option value="">-- Todos los Motivos --</option>
                  <option value="Despido Injustificado">Despido Injustificado</option>
                  <option value="Renuncia Voluntaria">Renuncia Voluntaria</option>
                  <option value="Despido Justificado">Despido Justificado</option>
                  <option value="Vencimiento de Contrato">Vencimiento de Contrato</option>
                  <option value="Mutuo Acuerdo">Mutuo Acuerdo</option>
                </select>
              </div>
              <div className="col-md-4 d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary w-100"
                  onClick={() => { setFiltroTexto(''); setFiltroMotivo(''); }}
                >
                  <i className="bi bi-x-circle me-1"></i>Limpiar Filtros
                </button>
              </div>
            </div>

            <div className="table-responsive">
              <table className="table table-hover table-bordered small align-middle">
                <thead className="table-dark">
                  <tr>
                    <th>No.</th>
                    <th>Empleado</th>
                    <th>Puesto</th>
                    <th>Fecha Liquidación (DD/MM/AAAA)</th>
                    <th>Motivo</th>
                    <th>Total Pagado</th>
                    <th>Registrado Por</th>
                  </tr>
                </thead>
                <tbody>
                  {liquidaciones
                    .filter(l => {
                      if (filtroTexto) {
                        const coincideId = String(l.IdLiquidacion).includes(filtroTexto);
                        const coincideNom = (l.NombreEmpleado || '').toLowerCase().includes(filtroTexto.toLowerCase());
                        if (!coincideId && !coincideNom) return false;
                      }
                      if (filtroMotivo && l.MotivoEgreso !== filtroMotivo) return false;
                      return true;
                    })
                    .map(l => (
                      <tr key={l.IdLiquidacion}>
                        <td>#{l.IdLiquidacion}</td>
                        <td className="fw-bold">{l.NombreEmpleado}</td>
                        <td>{l.NombrePuesto}</td>
                        <td>{formatFecha(l.FechaLiquidacion)}</td>
                        <td><span className="badge bg-secondary">{l.MotivoEgreso}</span></td>
                        <td className="text-end fw-bold text-success">{formatQ(l.TotalNetoLiquidacion)}</td>
                        <td>{l.UsuarioCreacion}</td>
                      </tr>
                    ))}
                  {liquidaciones.filter(l => {
                    if (filtroTexto) {
                      const coincideId = String(l.IdLiquidacion).includes(filtroTexto);
                      const coincideNom = (l.NombreEmpleado || '').toLowerCase().includes(filtroTexto.toLowerCase());
                      if (!coincideId && !coincideNom) return false;
                    }
                    if (filtroMotivo && l.MotivoEgreso !== filtroMotivo) return false;
                    return true;
                  }).length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-center text-muted py-4">
                        <i className="bi bi-search me-2"></i>No se encontraron liquidaciones que coincidan con los criterios de búsqueda.
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
