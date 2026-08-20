const usuarioGuardado = localStorage.getItem('usuario');
if (!usuarioGuardado) {
  window.location.href = 'index.html'; // Si no hay sesión, pa' fuera
}

const usuarioActual = JSON.parse(usuarioGuardado);


document.getElementById('crearUsuarioForm').addEventListener('submit', async function(e) {
  e.preventDefault(); 

  const alertaContainer = document.getElementById('alerta-crear');
  alertaContainer.innerHTML = ''; // Limpiamos alertas previas

  const nuevoUsuario = {
    IdUsuario: document.getElementById('IdUsuario').value,
    Password: document.getElementById('Password').value,
    Nombre: document.getElementById('Nombre').value,
    Apellido: document.getElementById('Apellido').value,
    FechaNacimiento: document.getElementById('FechaNacimiento').value,
    CorreoElectronico: document.getElementById('CorreoElectronico').value,
    TelefonoMovil: document.getElementById('TelefonoMovil').value,
    IdGenero: parseInt(document.getElementById('IdGenero').value),
    IdRole: parseInt(document.getElementById('IdRole').value),
    IdSucursal: parseInt(document.getElementById('IdSucursal').value),
    Pregunta: document.getElementById('Pregunta').value,
    Respuesta: document.getElementById('Respuesta').value,
    
    UsuarioCreacion: usuarioActual.id 
  };

  try {
    const response = await fetch('http://localhost:3000/usuario', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(nuevoUsuario)
    });

    const data = await response.json();

    if (response.ok) {
      alertaContainer.innerHTML = `<div class="alert alert-success">${data.mensaje}</div>`;
      document.getElementById('crearUsuarioForm').reset();
    } else {
      alertaContainer.innerHTML = `<div class="alert alert-danger">${data.mensaje || data.error}</div>`;
    }

  } catch (error) {
    // Error de red (el backend está apagado)
    console.error('Error:', error);
    alertaContainer.innerHTML = `<div class="alert alert-warning">Error de conexión con el servidor.</div>`;
  }
});