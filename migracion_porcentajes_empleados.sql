USE ProyectoAnalisis;

SET @dbname = DATABASE();
SET @tablename = "EMPLEADO";
SET @columnname = "PorcentajeIgss";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 'Columna PorcentajeIgss ya existe en EMPLEADO' AS Info;",
  "ALTER TABLE EMPLEADO ADD COLUMN PorcentajeIgss DECIMAL(5,2) NOT NULL DEFAULT 4.83 COMMENT 'Porcentaje descuento IGSS (%)' AFTER IngresoOtrosIngresos;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @columnname = "PorcentajeIsr";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 'Columna PorcentajeIsr ya existe en EMPLEADO' AS Info;",
  "ALTER TABLE EMPLEADO ADD COLUMN PorcentajeIsr DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT 'Porcentaje descuento ISR (%)' AFTER DescuentoIgss;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @columnname = "PorcentajeInasistencias";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 'Columna PorcentajeInasistencias ya existe en EMPLEADO' AS Info;",
  "ALTER TABLE EMPLEADO ADD COLUMN PorcentajeInasistencias DECIMAL(5,2) NOT NULL DEFAULT 100.00 COMMENT 'Porcentaje descuento por día de inasistencia (%)' AFTER DescuentoIsr;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @tablename = "PLANILLA_DETALLE";
SET @columnname = "PorcentajeIgss";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 'Columna PorcentajeIgss ya existe en PLANILLA_DETALLE' AS Info;",
  "ALTER TABLE PLANILLA_DETALLE ADD COLUMN PorcentajeIgss DECIMAL(5,2) NOT NULL DEFAULT 4.83 COMMENT 'Porcentaje IGSS aplicado (%)' AFTER IngresoOtrosIngresos;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @columnname = "PorcentajeIsr";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 'Columna PorcentajeIsr ya existe en PLANILLA_DETALLE' AS Info;",
  "ALTER TABLE PLANILLA_DETALLE ADD COLUMN PorcentajeIsr DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT 'Porcentaje ISR aplicado (%)' AFTER DescuentoIgss;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET SQL_SAFE_UPDATES = 0;

UPDATE EMPLEADO
SET 
  PorcentajeIgss = 4.83,
  PorcentajeIsr = CASE 
    WHEN IngresoSueldoBase > 0 AND DescuentoIsr > 0 THEN ROUND((DescuentoIsr / IngresoSueldoBase) * 100, 2)
    ELSE 0.00
  END,
  DescuentoIgss = ROUND(IngresoSueldoBase * (4.83 / 100), 2)
WHERE PorcentajeIgss IS NULL OR PorcentajeIgss = 0;

UPDATE PLANILLA_DETALLE
SET 
  PorcentajeIgss = 4.83,
  PorcentajeIsr = CASE 
    WHEN IngresoSueldoBase > 0 AND DescuentoIsr > 0 THEN ROUND((DescuentoIsr / IngresoSueldoBase) * 100, 2)
    ELSE 0.00
  END
WHERE PorcentajeIgss IS NULL OR PorcentajeIgss = 0;

SET SQL_SAFE_UPDATES = 1;

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
    d.PorcentajeIgss,
    d.DescuentoIgss,
    d.PorcentajeIsr,
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
    d.IdPlanillaDetalle,
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
    d.PorcentajeIgss,
    d.DescuentoIgss,
    d.PorcentajeIsr,
    d.DescuentoIsr,
    d.DescuentoInasistencias,
    (d.DescuentoIgss + d.DescuentoIsr + d.DescuentoInasistencias) AS TotalDescuentos,
    d.SalarioNeto,
    DATE_FORMAT(per.FechaInicio, '%Y-%m-%d') AS FechaInicioPeriodo,
    DATE_FORMAT(per.FechaFin, '%Y-%m-%d') AS FechaFinPeriodo,
    DATE_FORMAT(c.FechaHoraProcesada, '%Y-%m-%d %H:%i') AS FechaHoraProcesada
FROM PLANILLA_DETALLE d
INNER JOIN PLANILLA_CABECERA c ON d.Anio = c.Anio AND d.Mes = c.Mes
INNER JOIN PERIODO_PLANILLA per ON d.Anio = per.Anio AND d.Mes = per.Mes
INNER JOIN EMPLEADO e ON d.IdEmpleado = e.IdEmpleado
INNER JOIN PERSONA p ON e.IdPersona = p.IdPersona
INNER JOIN PUESTO pu ON d.IdPuesto = pu.IdPuesto
INNER JOIN DEPARTAMENTO dep ON pu.IdDepartamento = dep.IdDepartamento
INNER JOIN SUCURSAL suc ON e.IdSucursal = suc.IdSucursal
INNER JOIN EMPRESA emp ON suc.IdEmpresa = emp.IdEmpresa
LEFT JOIN CUENTA_BANCARIA_EMPLEADO cb ON e.IdEmpleado = cb.IdEmpleado AND cb.Activa = 1
LEFT JOIN BANCO ban ON cb.IdBanco = ban.IdBanco
LEFT JOIN DOCUMENTO_PERSONA dp ON p.IdPersona = dp.IdPersona AND dp.IdTipoDocumento = 1;
