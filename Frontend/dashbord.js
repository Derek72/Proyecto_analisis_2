const usuarioGuardado = localStorage.getItem('usuario');

if (!usuarioGuardado) {
  window.location.href = 'index.html';
} else {
  const usuario = JSON.parse(usuarioGuardado);
  document.getElementById('nombre-usuario').textContent = `Hola, ${usuario.nombre} (${usuario.rol})`;
}

document.getElementById('btn-logout').addEventListener('click', () => {
  localStorage.removeItem('usuario'); 
  window.location.href = 'index.html'; 
});

async function cargarEmpresas() {
  const tabla = document.getElementById('tabla-empresas');
  const alerta = document.getElementById('alerta-empresas');

  try {
    // Apuntamos al endpoint correcto del backend
    const response = await fetch('http://localhost:3000/empresa');
    
    if (!response.ok) throw new Error('Error al conectar con la API');
    
    const empresas = await response.json();
    
    tabla.innerHTML = '';

    if (empresas.length === 0) {
      tabla.innerHTML = '<tr><td colspan="4" class="text-center py-4">No hay empresas registradas.</td></tr>';
      return;
    }

    // Dibujamos las filas con los nombres exactos de la Base de Datos
    empresas.forEach(empresa => {
      const fila = document.createElement('tr');
      
      fila.innerHTML = `
        <td>${empresa.IdEmpresa}</td>
        <td>${empresa.Nombre}</td>
        <td>${empresa.Direccion}</td>
        <td>${empresa.Nit}</td>
      `;
      
      tabla.appendChild(fila);
    });

  } catch (error) {
    console.error('Error:', error);
    alerta.innerHTML = `<div class="alert alert-danger">Error al cargar las empresas. Verifica que el servidor backend esté encendido.</div>`;
    tabla.innerHTML = '<tr><td colspan="4" class="text-center text-danger py-4">Error de conexión</td></tr>';
  }
}

cargarEmpresas();