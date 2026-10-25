window.addEventListener('pageshow', function () {
    if (!localStorage.getItem('usuario')) {
        window.top.location.replace('/');
    }
});

function aplicarPermisos(nombrePantalla) {
    const usuarioStr = localStorage.getItem('usuario');
    if (!usuarioStr) {
        window.top.location.href = '/'; 
        return null;
    }

    const usuario = JSON.parse(usuarioStr);
    const norm = (s) => (s || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    const permisosModulo = usuario.permisos.find(p => p.Opcion === nombrePantalla || norm(p.Opcion) === norm(nombrePantalla));

    if (!permisosModulo || permisosModulo.Consultar === 0) {
        alert("No tienes permisos para ver esta pantalla.");
        
        window.top.location.href = '/dashboard.html';
        return null;
    }

    const elementosProtegidos = document.querySelectorAll('[data-permiso]');
    elementosProtegidos.forEach(elemento => {
        const accionRequerida = elemento.getAttribute('data-permiso');
        
        if (permisosModulo[accionRequerida] === 0) {
            elemento.classList.add('d-none'); 
        }
    });

    window.permisosPantallaActual = permisosModulo;

    if (typeof inicializarSelectoresFechaEsp === 'function') {
        inicializarSelectoresFechaEsp();
    }

    return usuario;
} 

function tienePermiso(accion) {
    if (!window.permisosPantallaActual) return false; 
    return window.permisosPantallaActual[accion] !== 0;
}

function mostrarBotonSegunModo(esEdicion, idBotonCrear = 'btnCrear', idBotonActualizar = 'btnActualizar') {
    const btnCrear = document.getElementById(idBotonCrear);
    const btnActualizar = document.getElementById(idBotonActualizar);

    if (btnCrear) {
        btnCrear.classList.toggle('d-none', esEdicion || !tienePermiso('Alta'));
    }
    if (btnActualizar) {
        btnActualizar.classList.toggle('d-none', !esEdicion || !tienePermiso('Cambio'));
    }
}

function construirMenuLateral(idContenedor = 'menuLateral') {
    const contenedor = document.getElementById(idContenedor);
    if (!contenedor) return;

    const usuarioStr = localStorage.getItem('usuario');
    if (!usuarioStr) return;

    const usuario = JSON.parse(usuarioStr);
    const permisos = (usuario.permisos || []).filter(p => p.Consultar == 1);

    const modulos = new Map();
    permisos.forEach(p => {
        if (!modulos.has(p.IdModulo)) {
            modulos.set(p.IdModulo, { nombre: p.NombreModulo, menus: new Map() });
        }
        const modulo = modulos.get(p.IdModulo);
        if (!modulo.menus.has(p.IdMenu)) {
            modulo.menus.set(p.IdMenu, { nombre: p.NombreMenu, opciones: [] });
        }
        modulo.menus.get(p.IdMenu).opciones.push(p);
    });

    if (modulos.size === 0) {
        contenedor.innerHTML = '<div class="text-muted small px-2">Sin opciones asignadas a tu rol.</div>';
        return;
    }

    let html = '';
    modulos.forEach((modulo, idModulo) => {
        const idColapsoModulo = `modCollapse${idModulo}`;
        html += `
            <div class="mb-2">
                <div class="menu-title fw-bold mb-1 d-flex justify-content-between align-items-center px-1"
                     style="cursor:pointer" data-bs-toggle="collapse" data-bs-target="#${idColapsoModulo}">
                    <span><i class="bi bi-folder2 me-1"></i>${modulo.nombre}</span>
                    <i class="bi bi-chevron-down small"></i>
                </div>
                <div class="collapse show" id="${idColapsoModulo}">`;

        modulo.menus.forEach((menu, idMenu) => {
            const idColapsoMenu = `menuCollapse${idMenu}`;
            html += `
                    <div class="ms-2 mb-1">
                        <div class="small text-muted fw-semibold px-2 py-1 d-flex justify-content-between align-items-center"
                             style="cursor:pointer" data-bs-toggle="collapse" data-bs-target="#${idColapsoMenu}">
                            <span>${menu.nombre}</span>
                            <i class="bi bi-chevron-down"></i>
                        </div>
                        <div class="collapse show" id="${idColapsoMenu}">
                            <ul class="nav flex-column ms-3">`;

            menu.opciones.forEach(op => {
                html += `
                                <li class="nav-item">
                                    <a class="nav-link py-1" href="/${paginaMenuHtml(op.Pagina)}" target="contentFrame">
                                        <i class="bi bi-dot"></i>${op.Opcion}
                                    </a>
                                </li>`;
            });

            html += `
                            </ul>
                        </div>
                    </div>`;
        });

        html += `
                </div>
            </div>`;
    });

    contenedor.innerHTML = html;
}

function obtenerCabecerasSeguridad() {
    const usuarioStr = localStorage.getItem('usuario');
    const cabeceras = {
        'Content-Type': 'application/json'
    };
    
    if (usuarioStr) {
        const usuario = JSON.parse(usuarioStr);
        
        if (usuario.idRole) {
            cabeceras['x-role-id'] = usuario.idRole.toString();
        }
        
        if (usuario.token) {
            cabeceras['Authorization'] = `Bearer ${usuario.token}`;
        }
    }
    
    return cabeceras;
}

function esFechaCalendarioValida(dia, mes, anio) {
    const d = Number(dia);
    const m = Number(mes);
    const y = Number(anio);
    if (!Number.isInteger(d) || !Number.isInteger(m) || !Number.isInteger(y)) return false;
    if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return false;
    const obj = new Date(Date.UTC(y, m - 1, d));
    return obj.getUTCFullYear() === y && (obj.getUTCMonth() + 1) === m && obj.getUTCDate() === d;
}

function formatearFecha(fechaStr) {
    if (!fechaStr) return '';
    if (fechaStr instanceof Date) {
        if (isNaN(fechaStr.getTime())) return '';
        const d = String(fechaStr.getDate()).padStart(2, '0');
        const m = String(fechaStr.getMonth() + 1).padStart(2, '0');
        const y = fechaStr.getFullYear();
        return `${d}/${m}/${y}`;
    }
    const str = String(fechaStr).trim();
    const matchEsp = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (matchEsp) {
        const d = matchEsp[1].padStart(2, '0');
        const m = matchEsp[2].padStart(2, '0');
        const y = matchEsp[3];
        return `${d}/${m}/${y}`;
    }
    const matchIso = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (matchIso) {
        const y = matchIso[1];
        const m = matchIso[2].padStart(2, '0');
        const d = matchIso[3].padStart(2, '0');
        return `${d}/${m}/${y}`;
    }
    const dObj = new Date(str);
    if (!isNaN(dObj.getTime())) {
        const d = String(dObj.getUTCDate()).padStart(2, '0');
        const m = String(dObj.getUTCMonth() + 1).padStart(2, '0');
        const y = dObj.getUTCFullYear();
        return `${d}/${m}/${y}`;
    }
    return str;
}

function formatearFechaHora(fechaStr) {
    if (!fechaStr) return '';
    const str = String(fechaStr).trim();
    const match = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
    if (match) {
        const y = match[1];
        const m = match[2].padStart(2, '0');
        const d = match[3].padStart(2, '0');
        const hh = match[4].padStart(2, '0');
        const mm = match[5].padStart(2, '0');
        const ss = match[6] ? `:${match[6].padStart(2, '0')}` : '';
        return `${d}/${m}/${y} ${hh}:${mm}${ss}`;
    }
    return formatearFecha(fechaStr);
}

function normalizarFechaIso(valor) {
    if (!valor) return '';
    if (valor instanceof Date) {
        if (isNaN(valor.getTime())) return '';
        const y = valor.getFullYear();
        const m = String(valor.getMonth() + 1).padStart(2, '0');
        const d = String(valor.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    const str = String(valor).trim();
    
    const matchEsp = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (matchEsp) {
        const d = matchEsp[1].padStart(2, '0');
        const m = matchEsp[2].padStart(2, '0');
        const y = matchEsp[3];
        if (!esFechaCalendarioValida(d, m, y)) return '';
        return `${y}-${m}-${d}`;
    }
    
    const matchIso = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (matchIso) {
        const y = matchIso[1];
        const m = matchIso[2].padStart(2, '0');
        const d = matchIso[3].padStart(2, '0');
        if (!esFechaCalendarioValida(d, m, y)) return '';
        return `${y}-${m}-${d}`;
    }
    return '';
}

function fechaEspAFechaIso(fechaEsp) {
    return normalizarFechaIso(fechaEsp) || String(fechaEsp || '').trim();
}

function inicializarSelectoresFechaEsp(raiz = document) {
    if (typeof document === 'undefined' || typeof HTMLInputElement === 'undefined') return;
    document.documentElement.setAttribute('lang', 'es');

    const nativeValueDesc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    if (!nativeValueDesc) return;

    const inputs = raiz.querySelectorAll('input[type="date"]:not([data-picker-interno="1"])');
    inputs.forEach(input => {
        if (input.dataset.esSelectorFecha === '1') return;
        input.dataset.esSelectorFecha = '1';

        const valorInicial = nativeValueDesc.get.call(input);
        const esSmall = input.classList.contains('form-control-sm');

        input.type = 'text';
        input.setAttribute('lang', 'es');
        input.placeholder = 'DD/MM/AAAA';
        input.maxLength = 10;
        input.autocomplete = 'off';
        input.inputMode = 'numeric';

        const wrapper = document.createElement('div');
        wrapper.className = `input-group ${esSmall ? 'input-group-sm' : ''} selector-fecha-esp position-relative`;
        input.parentNode.insertBefore(wrapper, input);
        wrapper.appendChild(input);

        const picker = document.createElement('input');
        picker.type = 'date';
        picker.setAttribute('lang', 'es');
        picker.setAttribute('data-picker-interno', '1');
        picker.tabIndex = -1;
        picker.setAttribute('aria-hidden', 'true');
        picker.style.cssText = 'position:absolute; width:0; height:0; opacity:0; pointer-events:none; border:0; padding:0; right:0; bottom:0;';

        const btnCal = document.createElement('button');
        btnCal.type = 'button';
        btnCal.className = `btn btn-outline-secondary ${input.readOnly || input.disabled ? 'disabled bg-light' : ''}`;
        btnCal.tabIndex = -1;
        btnCal.title = 'Seleccionar fecha (DD/MM/AAAA)';
        btnCal.innerHTML = '<i class="bi bi-calendar3"></i>';

        wrapper.appendChild(picker);
        wrapper.appendChild(btnCal);

        Object.defineProperty(input, 'valorVisual', {
            configurable: true,
            get() {
                return nativeValueDesc.get.call(input);
            }
        });

        Object.defineProperty(input, 'value', {
            configurable: true,
            enumerable: true,
            get() {
                const txt = (nativeValueDesc.get.call(input) || '').trim();
                if (!txt) return '';
                return normalizarFechaIso(txt);
            },
            set(nuevoValor) {
                if (!nuevoValor) {
                    nativeValueDesc.set.call(input, '');
                    picker.value = '';
                    input.setCustomValidity('');
                    return;
                }
                const iso = normalizarFechaIso(nuevoValor);
                const esp = iso ? formatearFecha(iso) : formatearFecha(nuevoValor);
                nativeValueDesc.set.call(input, esp);
                picker.value = iso || '';
                input.setCustomValidity('');
            }
        });

        if (valorInicial) {
            input.value = valorInicial;
        }

        btnCal.addEventListener('click', () => {
            if (input.readOnly || input.disabled) return;
            const isoActual = input.value;
            if (isoActual) picker.value = isoActual;
            try {
                if (typeof picker.showPicker === 'function') {
                    picker.showPicker();
                } else {
                    picker.focus();
                    picker.click();
                }
            } catch (err) {
                picker.focus();
                picker.click();
            }
        });

        picker.addEventListener('change', () => {
            if (input.readOnly || input.disabled) return;
            const iso = picker.value;
            nativeValueDesc.set.call(input, iso ? formatearFecha(iso) : '');
            input.setCustomValidity('');
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        });

        input.addEventListener('input', (e) => {
            if (input.readOnly || input.disabled) return;
            const raw = nativeValueDesc.get.call(input);
            
            const soloDigitos = raw.replace(/\D/g, '').slice(0, 8);
            let formateado = raw;
            if (!raw.includes('/') || /^\d+\/?\d*\/?\d*$/.test(raw)) {
                if (e.inputType && e.inputType.startsWith('delete')) {
                    formateado = raw.replace(/[^0-9/]/g, '');
                } else if (soloDigitos.length <= 2) {
                    formateado = soloDigitos;
                } else if (soloDigitos.length <= 4) {
                    formateado = `${soloDigitos.slice(0, 2)}/${soloDigitos.slice(2)}`;
                } else {
                    formateado = `${soloDigitos.slice(0, 2)}/${soloDigitos.slice(2, 4)}/${soloDigitos.slice(4, 8)}`;
                }
            } else {
                formateado = raw.replace(/[^0-9/]/g, '');
            }

            if (formateado !== raw) {
                nativeValueDesc.set.call(input, formateado);
            }

            const iso = normalizarFechaIso(formateado);
            if (iso) {
                picker.value = iso;
                input.setCustomValidity('');
            } else if (!formateado.trim()) {
                picker.value = '';
                input.setCustomValidity('');
            }
        });

        input.addEventListener('blur', () => {
            const txt = (nativeValueDesc.get.call(input) || '').trim();
            if (!txt) {
                picker.value = '';
                input.setCustomValidity('');
                return;
            }
            const iso = normalizarFechaIso(txt);
            if (iso) {
                nativeValueDesc.set.call(input, formatearFecha(iso));
                picker.value = iso;
                input.setCustomValidity('');
            } else {
                input.setCustomValidity('Ingrese una fecha válida en formato español DD/MM/AAAA (día/mes/año).');
            }
        });
    });
}

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        inicializarSelectoresFechaEsp();
    });
    document.addEventListener('reset', (e) => {
        const form = e.target;
        if (!form || !form.querySelectorAll) return;
        setTimeout(() => {
            const inputsFecha = form.querySelectorAll('input[data-es-selector-fecha="1"]');
            inputsFecha.forEach(inp => {
                inp.value = '';
            });
        }, 0);
    });
}

function compararValores(valA, valB, orden = 'asc') {
    if (valA === null || valA === undefined || valA === '') return orden === 'asc' ? 1 : -1;
    if (valB === null || valB === undefined || valB === '') return orden === 'asc' ? -1 : 1;

    if (typeof valA === 'number' && typeof valB === 'number') {
        return orden === 'asc' ? valA - valB : valB - valA;
    }
    const numA = Number(valA);
    const numB = Number(valB);
    if (!isNaN(numA) && !isNaN(numB) && String(valA).trim() !== '' && String(valB).trim() !== '') {
        return orden === 'asc' ? numA - numB : numB - numA;
    }

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(valA) && /^\d{2}\/\d{2}\/\d{4}$/.test(valB)) {
        const isoA = valA.split('/').reverse().join('-');
        const isoB = valB.split('/').reverse().join('-');
        return orden === 'asc' ? isoA.localeCompare(isoB) : isoB.localeCompare(isoA);
    }

    if (/^\d{4}-\d{2}-\d{2}/.test(valA) && /^\d{4}-\d{2}-\d{2}/.test(valB)) {
        return orden === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
    }

    const comp = String(valA).localeCompare(String(valB), 'es', { sensitivity: 'base', numeric: true });
    return orden === 'asc' ? comp : -comp;
}

function ordenarLista(lista, columna, orden = 'asc', campoId = null) {
    if (!Array.isArray(lista)) return [];
    return [...lista].sort((a, b) => {
        const valA = a[columna];
        const valB = b[columna];
        const res = compararValores(valA, valB, orden);
        if (res !== 0) return res;
        if (campoId && a[campoId] !== undefined && b[campoId] !== undefined) {
            return Number(a[campoId]) - Number(b[campoId]);
        }
        return 0;
    });
}

function configurarEncabezadosOrdenables(tablaId, onOrdenar, estadoInicial = { columna: '', orden: 'asc' }) {
    const tabla = document.getElementById(tablaId);
    if (!tabla) return;
    const ths = tabla.querySelectorAll('thead th[data-columna]');
    let estado = { ...estadoInicial };

    ths.forEach(th => {
        th.style.cursor = 'pointer';
        th.style.userSelect = 'none';
        const col = th.getAttribute('data-columna');
        
        let icono = th.querySelector('.sort-icon');
        if (!icono) {
            icono = document.createElement('i');
            icono.className = 'bi bi-arrow-down-up ms-1 small opacity-50 sort-icon';
            th.appendChild(icono);
        }

        th.onclick = () => {
            if (estado.columna === col) {
                estado.orden = estado.orden === 'asc' ? 'desc' : 'asc';
            } else {
                estado.columna = col;
                estado.orden = 'asc';
            }

            ths.forEach(otherTh => {
                const otherCol = otherTh.getAttribute('data-columna');
                const otherIcono = otherTh.querySelector('.sort-icon');
                if (otherIcono) {
                    if (otherCol === estado.columna) {
                        otherIcono.className = `bi bi-arrow-${estado.orden === 'asc' ? 'up' : 'down'} ms-1 small text-warning sort-icon`;
                    } else {
                        otherIcono.className = 'bi bi-arrow-down-up ms-1 small opacity-50 sort-icon';
                    }
                }
            });

            onOrdenar(estado.columna, estado.orden);
        };
    });
}

function paginaMenuHtml(pagina) {
    const nombre = String(pagina || '').trim().replace(/\.php$/i, '.html');
    return nombre === 'banco.html' ? 'bancos.html' : nombre;
}
