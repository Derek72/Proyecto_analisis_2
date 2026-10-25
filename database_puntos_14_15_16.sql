USE ProyectoAnalisis;

CREATE TABLE IF NOT EXISTS HISTORIAL_LABORAL (
    IdHistorial INT AUTO_INCREMENT PRIMARY KEY,
    IdEmpleado INT NOT NULL,
    IdPuesto INT NOT NULL,
    IdStatusEmpleado INT NOT NULL,
    TipoEvento VARCHAR(50) NOT NULL COMMENT 'CONTRATACION, CAMBIO_PUESTO, LIQUIDACION, BAJA',
    FechaEvento DATE NOT NULL,
    Descripcion TEXT,
    FechaCreacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UsuarioCreacion VARCHAR(100) NOT NULL,
    CONSTRAINT fk_hist_empleado FOREIGN KEY (IdEmpleado) REFERENCES EMPLEADO (IdEmpleado)
) DEFAULT CHARSET=utf8mb4;

CREATE OR REPLACE VIEW V_REPORTE_PLANILLA AS
SELECT 
    d.Anio,
    d.Mes,
    d.IdPlanillaDetalle,
    d.IdEmpleado,
    CONCAT(p.Nombre, ' ', p.Apellido) AS NombreEmpleado,
    DATE_FORMAT(d.FechaContratacion, '%Y-%m-%d') AS FechaContratacion,
    pu.Nombre AS NombrePuesto,
    st.Nombre AS NombreStatus,
    d.IngresoSueldoBase,
    d.IngresoBonificacionDecreto,
    d.IngresoOtrosIngresos,
    (d.IngresoSueldoBase + d.IngresoBonificacionDecreto + d.IngresoOtrosIngresos) AS TotalIngresosEmpleado,
    d.DescuentoIgss,
    d.DescuentoIsr,
    d.DescuentoInasistencias,
    (d.DescuentoIgss + d.DescuentoIsr + d.DescuentoInasistencias) AS TotalDescuentosEmpleado,
    d.SalarioNeto,
    DATE_FORMAT(c.FechaHoraProcesada, '%Y-%m-%d %H:%i:%s') AS FechaHoraProcesada,
    c.TotalIngresos AS TotalIngresosGeneral,
    c.TotalDescuentos AS TotalDescuentosGeneral,
    c.SalarioNeto AS TotalSalarioNetoGeneral
FROM PLANILLA_DETALLE d
INNER JOIN PLANILLA_CABECERA c 
    ON d.Anio = c.Anio AND d.Mes = c.Mes
INNER JOIN EMPLEADO e 
    ON d.IdEmpleado = e.IdEmpleado
INNER JOIN PERSONA p 
    ON e.IdPersona = p.IdPersona
INNER JOIN PUESTO pu 
    ON d.IdPuesto = pu.IdPuesto
INNER JOIN STATUS_EMPLEADO st 
    ON d.IdStatusEmpleado = st.IdStatusEmpleado;

CREATE OR REPLACE VIEW V_BOLETA_PAGO AS
SELECT 
    d.Anio,
    d.Mes,
    d.IdEmpleado,
    CONCAT(p.Nombre, ' ', p.Apellido) AS NombreEmpleado,
    COALESCE(dp.NoDocumento, 'N/D') AS NumeroIdentificacion,
    DATE_FORMAT(d.FechaContratacion, '%Y-%m-%d') AS FechaContratacion,
    pu.Nombre AS NombrePuesto,
    dep.Nombre AS NombreDepartamento,
    suc.Nombre AS NombreSucursal,
    emp.Nombre AS NombreEmpresa,
    emp.Nit AS NitEmpresa,
    cb.NumeroDeCuenta,
    ban.Nombre AS NombreBanco,
    d.IngresoSueldoBase,
    d.IngresoBonificacionDecreto,
    d.IngresoOtrosIngresos,
    (d.IngresoSueldoBase + d.IngresoBonificacionDecreto + d.IngresoOtrosIngresos) AS TotalIngresos,
    d.DescuentoIgss,
    d.DescuentoIsr,
    d.DescuentoInasistencias,
    (d.DescuentoIgss + d.DescuentoIsr + d.DescuentoInasistencias) AS TotalDescuentos,
    d.SalarioNeto,
    DATE_FORMAT(per.FechaInicio, '%Y-%m-%d') AS FechaInicioPeriodo,
    DATE_FORMAT(per.FechaFin, '%Y-%m-%d') AS FechaFinPeriodo,
    DATE_FORMAT(c.FechaHoraProcesada, '%Y-%m-%d %H:%i') AS FechaHoraProcesada
FROM PLANILLA_DETALLE d
INNER JOIN PLANILLA_CABECERA c 
    ON d.Anio = c.Anio AND d.Mes = c.Mes
INNER JOIN PERIODO_PLANILLA per 
    ON d.Anio = per.Anio AND d.Mes = per.Mes
INNER JOIN EMPLEADO e 
    ON d.IdEmpleado = e.IdEmpleado
INNER JOIN PERSONA p 
    ON e.IdPersona = p.IdPersona
INNER JOIN PUESTO pu 
    ON d.IdPuesto = pu.IdPuesto
INNER JOIN DEPARTAMENTO dep 
    ON pu.IdDepartamento = dep.IdDepartamento
INNER JOIN SUCURSAL suc 
    ON e.IdSucursal = suc.IdSucursal
INNER JOIN EMPRESA emp 
    ON suc.IdEmpresa = emp.IdEmpresa
LEFT JOIN DOCUMENTO_PERSONA dp 
    ON p.IdPersona = dp.IdPersona AND dp.IdTipoDocumento = 1
LEFT JOIN CUENTA_BANCARIA_EMPLEADO cb 
    ON e.IdEmpleado = cb.IdEmpleado AND cb.Activa = 1
LEFT JOIN BANCO ban 
    ON cb.IdBanco = ban.IdBanco;

SET SQL_SAFE_UPDATES = 0;

UPDATE OPCION SET Pagina = 'reporte_planilla.html' WHERE Nombre = 'Reporte de Planilla';
UPDATE OPCION SET Pagina = 'boleta_pago.html'      WHERE Nombre = 'Boletas de Pago';
UPDATE OPCION SET Pagina = 'liquidacion.html'      WHERE Nombre IN ('Liquidacion de Empleado', 'Liquidación de Empleado');

INSERT INTO ROLE_OPCION (IdRole, IdOpcion, Consultar, Alta, Baja, Cambio, Imprimir, Exportar, FechaCreacion, UsuarioCreacion)
SELECT 1, o.IdOpcion, 1, 1, 1, 1, 1, 1, NOW(), 'system'
FROM OPCION o
WHERE o.Nombre IN ('Reporte de Planilla', 'Boletas de Pago', 'Liquidacion de Empleado', 'Liquidación de Empleado')
ON DUPLICATE KEY UPDATE 
    Consultar = 1, Alta = 1, Baja = 1, Cambio = 1, Imprimir = 1, Exportar = 1;

SET SQL_SAFE_UPDATES = 1;

SELECT o.Nombre, o.Pagina, m.Nombre AS Menu 
FROM OPCION o 
JOIN MENU m ON o.IdMenu = m.IdMenu 
WHERE o.Nombre IN ('Reporte de Planilla', 'Boletas de Pago', 'Liquidacion de Empleado');
