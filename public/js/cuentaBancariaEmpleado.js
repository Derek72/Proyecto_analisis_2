let usuarioActual = null;
let idEdicionActual = null;
let cuentas = [];

document.addEventListener('DOMContentLoaded', async () => {
    usuarioActual = aplicarPermisos('Cuentas Bancarias Empleados');
    if (!usuarioActual) return;

    await cargarCombos();
    cargarCuentas();

    document.getElementById('btnCrear').addEventListener('click', guardarCuenta);
    document.getElementById('btnActualizar').addEventListener('click', guardarCuenta);
    document.getElementById('btnEliminarTop').addEventListener('click', () => eliminarCuenta());
    document.getElementById('btnLimpiar').addEventListener('click', limpiarFormulario);
    document.getElementById('btnImprimir').addEventListener('click', () => window.print());
    document.getElementById('btnExportar').addEventListener('click', exportarExcel);
});

function esc(t) {
    return String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function cargarCombos() {
    try {
        const response = await fetch('/planilla/cuentas-bancarias/combos', { headers: obtenerCabecerasSeguridad() });
        if (!response.ok) throw new Error('Error al cargar las listas');
        const { empleados, bancos } = await response.json();

        const cboEmp = document.getElementById('IdEmpleado');
        cboEmp.innerHTML = '<option value="">-- Seleccione un Empleado --</option>';
        empleados.forEach(e => cboEmp.add(new Option(e.NombreCompleto, e.IdEmpleado)));

        const cboBanco = document.getElementById('IdBanco');
        cboBanco.innerHTML = '<option value="">-- Seleccione un Banco --</option>';
        bancos.forEach(b => cboBanco.add(new Option(b.Nombre, b.IdBanco)));
    } catch (error) {
        console.error(error);
        alert('No se pudieron cargar los empleados y bancos.');
    }
}

async function cargarCuentas() {
    try {
        const response = await fetch('/planilla/cuentas-bancarias', { headers: obtenerCabecerasSeguridad() });
        if (!response.ok) throw new Error('Error al consultar cuentas');
        cuentas = await response.json();
        dibujarTabla(cuentas);
    } catch (error) { console.error(error); }
}

function dibujarTabla(datos) {
    const tbody = document.getElementById('tablaCuentasBody');
    tbody.innerHTML = '';

    datos.forEach(c => {
        const activa = String(c.Activa) === '1';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${c.IdCuentaBancaria}</td>
            <td class="fw-bold text-start">${esc(c.NombreEmpleado)}</td>
            <td>${esc(c.NombreBanco)}</td>
            <td>${esc(c.NumeroDeCuenta)}</td>
            <td><span class="badge ${activa ? 'bg-success' : 'bg-secondary'}">${activa ? 'Sí' : 'No'}</span></td>
            <td>
                <button class="btn btn-sm btn-warning me-1" data-permiso="Cambio" onclick="cargarParaEdicion(${c.IdCuentaBancaria})">Editar</button>
                <button class="btn btn-sm btn-danger" data-permiso="Baja" onclick="eliminarCuenta(${c.IdCuentaBancaria})">Eliminar</button>
            </td>`;
        tbody.appendChild(tr);
    });

    aplicarPermisos('Cuentas Bancarias Empleados');
}

window.cargarParaEdicion = function (id) {
    const c = cuentas.find(x => x.IdCuentaBancaria === id);
    if (!c) return;
    idEdicionActual = id;
    document.getElementById('IdEmpleado').value = c.IdEmpleado;
    document.getElementById('IdBanco').value = c.IdBanco;
    document.getElementById('NumeroDeCuenta').value = c.NumeroDeCuenta;
    document.getElementById('Activa').checked = String(c.Activa) === '1';

    document.getElementById('btnEliminarTop').classList.remove('d-none');
    mostrarBotonSegunModo(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

function limpiarFormulario() {
    document.getElementById('formCuenta').reset();
    document.getElementById('Activa').checked = true;
    idEdicionActual = null;
    document.getElementById('btnEliminarTop').classList.add('d-none');
    mostrarBotonSegunModo(false);
}

async function guardarCuenta() {
    const data = {
        IdEmpleado: document.getElementById('IdEmpleado').value,
        IdBanco: document.getElementById('IdBanco').value,
        NumeroDeCuenta: document.getElementById('NumeroDeCuenta').value.trim(),
        Activa: document.getElementById('Activa').checked ? '1' : '0'
    };

    if (!data.IdEmpleado || !data.IdBanco || !data.NumeroDeCuenta) {
        return alert('Por favor, completa Empleado, Banco y Número de Cuenta.');
    }

    const accion = idEdicionActual ? 'actualizar' : 'crear';
    if (!confirm(`¿Estás seguro de que deseas ${accion} esta cuenta bancaria?`)) return;

    if (idEdicionActual) data.UsuarioModificacion = usuarioActual.id;
    else data.UsuarioCreacion = usuarioActual.id;

    const url = idEdicionActual ? `/planilla/cuentas-bancarias/${idEdicionActual}` : '/planilla/cuentas-bancarias';
    const metodo = idEdicionActual ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, { method: metodo, headers: obtenerCabecerasSeguridad(), body: JSON.stringify(data) });
        const result = await response.json();

        if (response.ok) {
            alert(`¡Cuenta bancaria ${idEdicionActual ? 'actualizada' : 'creada'} exitosamente!`);
            limpiarFormulario();
            cargarCuentas();
        } else {
            alert(result.mensaje || 'Error al procesar la solicitud');
        }
    } catch (error) {
        console.error(error);
        alert('Ocurrió un error al comunicarse con el servidor.');
    }
}

async function eliminarCuenta(idParam) {
    const idEliminar = idParam || idEdicionActual;
    if (!idEliminar || !confirm('¿Estás seguro de eliminar esta cuenta bancaria? Esta acción no se puede deshacer.')) return;

    try {
        const response = await fetch(`/planilla/cuentas-bancarias/${idEliminar}`, { method: 'DELETE', headers: obtenerCabecerasSeguridad() });
        const result = await response.json();

        if (response.ok) {
            alert('¡Cuenta bancaria eliminada exitosamente!');
            limpiarFormulario();
            cargarCuentas();
        } else {
            alert(result.mensaje || 'Error al eliminar');
        }
    } catch (error) {
        console.error(error);
        alert('Ocurrió un error al comunicarse con el servidor.');
    }
}

function obtenerCabecerasSeguridad() {
    return { 'Content-Type': 'application/json', 'x-role-id': usuarioActual.idRole };
}

function exportarExcel() {
    const tabla = document.querySelector('#tablaCuentas');
    let csv = [];
    for (let i = 0; i < tabla.rows.length; i++) {
        let fila = [];
        let columnas = tabla.rows[i].querySelectorAll('td, th');
        for (let j = 0; j < columnas.length - 1; j++) {
            fila.push('"' + columnas[j].innerText.replace(/"/g, '""') + '"');
        }
        csv.push(fila.join(','));
    }
    const blob = new Blob(['\uFEFF' + csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const enlace = document.createElement('a');
    enlace.href = window.URL.createObjectURL(blob);
    enlace.download = 'CuentasBancariasEmpleados.csv';
    enlace.click();
}
