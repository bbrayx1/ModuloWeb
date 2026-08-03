// Archivo: static/js/evaluador.js

let postulacionesGlobal = [];
let maxVacantes = 310;

function cambiarSeccion(seccion) {
    document.querySelectorAll('.content-section').forEach(el => el.classList.remove('active-section'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById('sec-' + seccion).classList.add('active-section');
    document.getElementById('nav-' + seccion).classList.add('active');
}

document.addEventListener("DOMContentLoaded", () => {
    cargarDatos();
});

// 1. CARGAR DATOS DESDE SQLITE
function cargarDatos() {
    fetch('/api/postulantes')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                postulacionesGlobal = data.data;
                distribuirTablas();
                actualizarKPIs();
            }
        });
}

// 2. DISTRIBUIR EN BANDEJAS SEGÚN EL ESTADO
function distribuirTablas() {
    const tbodyComision = document.getElementById('tabla-postulantes');
    const tbodySocial = document.getElementById('tabla-solicitudes');
    
    tbodyComision.innerHTML = '';
    tbodySocial.innerHTML = '';

    postulacionesGlobal.forEach(p => {
        // Llenar Bandeja de Servicio Social (En Revisión)
        if (p.estado === 'EN_REVISION') {
            tbodySocial.innerHTML += `
                <tr>
                    <td><strong>EXP-2026-${p.id_postulacion}</strong></td>
                    <td>${p.cod_matricula}</td>
                    <td>${p.apellidos_nombres}</td>
                    <td><span style="color:#d10000; font-weight:bold;"><i class="fas fa-clock"></i> Pendiente Validar</span></td>
                    <td>
                        <button class="btn-action" style="background:#0056b3;" onclick="abrirModal(${p.id_postulacion})"><i class="fas fa-search"></i> Ver Docs</button>
                        <button class="btn-action btn-approve" title="Dar visto bueno" onclick="cambiarEstado(${p.id_postulacion}, 'EVALUADA')"><i class="fas fa-check-double"></i> V°B°</button>
                    </td>
                </tr>`;
        } 
        // Llenar Bandeja de la Comisión Evaluadora
        else if (p.estado === 'EVALUADA' || p.estado === 'APROBADA' || p.estado === 'RECHAZADA') {
            let rowClass = "", botones = "";

            if (p.estado === "APROBADA") {
                rowClass = "row-approved";
                botones = `<span style="color: #28a745; font-weight:bold;"><i class="fas fa-check-circle"></i> Becado</span>`;
            } else if (p.estado === "RECHAZADA") {
                rowClass = "row-rejected";
                botones = `<span style="color: #dc3545; font-weight:bold;"><i class="fas fa-times-circle"></i> Denegado</span>`;
            } else {
                botones = `
                    <button class="btn-action btn-approve" title="Aprobar" onclick="cambiarEstado(${p.id_postulacion}, 'APROBADA')"><i class="fas fa-check"></i></button>
                    <button class="btn-action btn-reject" title="Rechazar" onclick="cambiarEstado(${p.id_postulacion}, 'RECHAZADA')"><i class="fas fa-times"></i></button>`;
            }

            tbodyComision.innerHTML += `
                <tr class="${rowClass}">
                    <td><strong>${p.cod_matricula}</strong></td>
                    <td>${p.apellidos_nombres}</td>
                    <td style="text-align: center;">${p.puntaje_academico}</td>
                    <td style="text-align: center;">${p.puntaje_socioeconomico}</td>
                    <td style="text-align: center; color:#d10000;"><strong>${p.puntaje_total}</strong></td>
                    <td style="text-align: center;"><button class="btn-action btn-view" onclick="abrirModal(${p.id_postulacion})"><i class="fas fa-folder-open"></i> Ver</button></td>
                    <td style="text-align: center;">${botones}</td>
                </tr>`;
        }
    });
}

// 3. ACTUALIZAR KPIS EN TIEMPO REAL
function actualizarKPIs() {
    let pendientes = 0, aprobados = 0, habilitadas = 0;
    postulacionesGlobal.forEach(p => {
        if (p.estado === 'EVALUADA') pendientes++;
        if (p.estado === 'APROBADA') aprobados++;
        if (p.estado === 'EVALUADA' || p.estado === 'APROBADA' || p.estado === 'RECHAZADA') habilitadas++;
    });

    document.getElementById('kpi-habilitadas').textContent = habilitadas;
    document.getElementById('kpi-pendientes').textContent = pendientes;
    document.getElementById('kpi-aprobados').textContent = aprobados;
    document.getElementById('kpi-vacantes').textContent = maxVacantes - aprobados;
}

// 4. CAMBIAR ESTADO EN LA BD
function cambiarEstado(id, nuevoEstado) {
    fetch('/api/actualizar_estado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_postulacion: id, estado: nuevoEstado })
    })
    .then(res => res.json())
    .then(data => {
        if(data.status === 'success') cargarDatos(); // Recargar tablas automáticamente
    });
}

// 5. LÓGICA DEL VISOR MODAL CON ARCHIVOS REALES
function abrirModal(id) {
    const p = postulacionesGlobal.find(x => x.id_postulacion === id);
    document.getElementById('modal-nombre').textContent = p.apellidos_nombres;
    document.getElementById('modal-codigo').textContent = p.cod_matricula;
    document.getElementById('modal-promedio').textContent = p.promedio_ponderado;
    document.getElementById('modal-ingreso').textContent = p.ingresos_economicos;
    
    // Resetear visor
    document.getElementById('viewer-placeholder').style.display = 'block';
    document.getElementById('preview-img').style.display = 'none';
    document.getElementById('preview-pdf').style.display = 'none';
    
    // Traer documentos de la BD
    const ul = document.getElementById('lista-documentos');
    ul.innerHTML = '<li>Cargando archivos...</li>';

    fetch('/api/documentos/' + id)
        .then(res => res.json())
        .then(data => {
            ul.innerHTML = '';
            if(data.data.length === 0) {
                ul.innerHTML = '<li>No se adjuntaron documentos físicos.</li>';
                return;
            }
            
            data.data.forEach(doc => {
                // Definir icono según si es imagen o PDF
                let icono = doc.ruta_archivo.endsWith('.pdf') ? 'fa-file-pdf' : 'fa-image';
                let color = doc.ruta_archivo.endsWith('.pdf') ? '#d10000' : '#0056b3';

                ul.innerHTML += `
                    <li class="doc-item" onclick="mostrarArchivo('${doc.ruta_archivo}', this)">
                        <i class="fas ${icono}" style="color: ${color}; font-size: 1.5em;"></i>
                        <div>
                            <strong style="display: block; font-size: 0.9em;">${doc.tipo_documento.replace('_', ' ')}</strong>
                            <span style="font-size: 0.8em; color: #888;">${doc.nombre_archivo}</span>
                        </div>
                    </li>`;
            });
        });

    document.getElementById('modal-revision').style.display = 'flex';
}

function cerrarModal() {
    document.getElementById('modal-revision').style.display = 'none';
}

function mostrarArchivo(ruta, element) {
    document.querySelectorAll('.doc-item').forEach(el => el.classList.remove('active-doc'));
    element.classList.add('active-doc');
    
    document.getElementById('viewer-placeholder').style.display = 'none';
    const imgEl = document.getElementById('preview-img');
    const pdfEl = document.getElementById('preview-pdf');

    if(ruta.endsWith('.pdf')) {
        imgEl.style.display = 'none';
        pdfEl.src = ruta;
        pdfEl.style.display = 'block';
    } else {
        pdfEl.style.display = 'none';
        imgEl.src = ruta;
        imgEl.style.display = 'block';
    }
}

// 6. GENERAR PDF DEL PADRÓN FINAL (SOLO APROBADOS)
function generarPDFPadron() {
    const tbodyPDF = document.getElementById('pdf-tbody');
    tbodyPDF.innerHTML = '';
    let aprobadosCount = 0;

    postulacionesGlobal.forEach(p => {
        if (p.estado === 'APROBADA') {
            aprobadosCount++;
            tbodyPDF.innerHTML += `
                <tr>
                    <td style="border: 1px solid #ccc; padding: 10px; text-align: center;">${p.cod_matricula}</td>
                    <td style="border: 1px solid #ccc; padding: 10px; text-align: left;">${p.apellidos_nombres}</td>
                    <td style="border: 1px solid #ccc; padding: 10px; text-align: center;">${p.puntaje_academico}</td>
                    <td style="border: 1px solid #ccc; padding: 10px; text-align: center;">${p.puntaje_socioeconomico}</td>
                    <td style="border: 1px solid #ccc; padding: 10px; text-align: center; font-weight: bold;">${p.puntaje_total}</td>
                </tr>`;
        }
    });

    if (aprobadosCount === 0) {
        alert("No hay alumnos aprobados todavía. Apruebe postulantes en el 'Panel' antes de generar el acta.");
        return;
    }

    const opt = {
        margin:       10,
        filename:     'Padron_Aprobados_Comedor_UNS_2026.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    const template = document.getElementById('pdf-template');
    template.style.display = 'block'; 
    
    html2pdf().set(opt).from(template).save().then(() => {
        template.style.display = 'none'; 
        const statusMsg = document.getElementById('pdf-status');
        statusMsg.style.display = 'inline';
        setTimeout(() => { statusMsg.style.display = 'none'; }, 3000);
    });
}