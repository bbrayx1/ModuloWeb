// Archivo: static/js/estudiante.js

// 1. NAVEGACIÓN SPA (Single Page Application)
function cambiarSeccion(seccion) {
    document.getElementById('sec-inicio').classList.remove('active-section');
    document.getElementById('sec-ficha').classList.remove('active-section');
    document.getElementById('sec-docs').classList.remove('active-section');
    
    document.getElementById('nav-inicio').classList.remove('active');
    document.getElementById('nav-ficha').classList.remove('active');
    document.getElementById('nav-docs').classList.remove('active');
    
    document.getElementById('sec-' + seccion).classList.add('active-section');
    document.getElementById('nav-' + seccion).classList.add('active');
}

// 2. CONEXIÓN A LA BASE DE DATOS Y LÓGICA DE NEGOCIO
document.addEventListener("DOMContentLoaded", function() {
    
    // Obtener el usuario del Login 
    const codigoIngresado = localStorage.getItem('usuario_activo'); 
    
    // Si entra directo sin login, lo mandamos al login
    if(!codigoIngresado) {
        window.location.href = '/login/estudiante';
        return;
    }
    
    let documentosSubidos = 0;
    let aptoAcademico = false;
    
    // Petición a la Base de Datos SQLite
    fetch('/api/estudiante/' + codigoIngresado)
        .then(response => response.json())
        .then(data => {
            if(data.status === 'success') {
                const est = data.data; 

                // Llenado de Cabecera
                document.getElementById('display-codigo').textContent = codigoIngresado;
                
                // Llenado de Resumen (Inicio)
                document.getElementById('val-nombre').textContent = est.apellidos_nombres;
                document.getElementById('val-promedio').textContent = est.promedio_ponderado.toFixed(2);
                let invictoText = est.es_invicto ? " / Invicto" : "";
                document.getElementById('val-condicion').textContent = est.situacion_academica + invictoText;
                document.getElementById('val-residencia').textContent = est.lugar_residencia;
                document.getElementById('val-carga').textContent = est.carga_familiar + " Miembros";
                document.getElementById('val-ingresos').textContent = "S/ " + est.ingresos_economicos.toFixed(2);
                document.getElementById('val-ocupacion').textContent = est.condicion_ocupacional;

                // Llenado de Formulario SIIGAA (Ficha Soc.)
                document.getElementById('f-nombres').value = est.apellidos_nombres;
                document.getElementById('f-procedencia').value = est.lugar_procedencia;
                document.getElementById('f-procfam').value = est.procedencia_familiar;
                document.getElementById('f-cargafam').value = est.carga_familiar + " Dependientes";
                document.getElementById('f-ocupacion').value = est.condicion_ocupacional;
                document.getElementById('f-ingresofam').value = "S/ " + est.ingresos_economicos.toFixed(2);
                document.getElementById('f-residencialugar').value = est.lugar_residencia;

                // EVALUACIÓN ACADÉMICA
                let p_academico = 0;
                if (est.promedio_ponderado >= 15) p_academico = 3;
                else if (est.promedio_ponderado >= 14) p_academico = 2;
                else if (est.promedio_ponderado >= 13) p_academico = 1;
                
                aptoAcademico = p_academico > 0;
                document.getElementById('val-p-acad').textContent = p_academico + " Pts";

                // EVALUACIÓN SOCIOECONÓMICA
                let p_socio = 0;
                if (est.lugar_procedencia === 'Nativo' || est.lugar_procedencia === 'Provincias del área de influencia') p_socio += 2; else p_socio += 1;
                if (est.lugar_residencia === 'Zona rural') p_socio += 4; else if (est.lugar_residencia === 'Urbano marginal') p_socio += 3; else if (est.lugar_residencia === 'Urbano popular') p_socio += 2; else p_socio += 1;
                if (est.carga_familiar >= 5) p_socio += 3; else if (est.carga_familiar >= 3) p_socio += 2; else p_socio += 1;
                p_socio += (est.procedencia_familiar === 'Padres separados') ? 2 : 1;
                if (est.ingresos_economicos <= 1025) p_socio += 3; else if (est.ingresos_economicos <= 1500) p_socio += 2; else p_socio += 1;
                p_socio += (est.condicion_ocupacional === 'Desempleado') ? 2 : 1;

                document.getElementById('val-p-socio').textContent = p_socio + " Pts";
                document.getElementById('val-puntaje-total').textContent = (p_academico + p_socio) + " Pts";
                
                verificarBoton();
            } else {
                document.getElementById('error-banner').style.display = 'block';
                document.getElementById('sec-inicio').style.display = 'none';
            }
        })
        .catch(error => console.error("Error al obtener datos:", error));

    // 3. LÓGICA DE SUBIDA DE ARCHIVOS
    const inputs = document.querySelectorAll('.file-hidden');
    inputs.forEach((input, i) => {
        input.addEventListener('change', function() {
            const file = this.files[0];
            if(file) {
                const td = document.getElementById(`estado-doc-${i + 1}`);
                const previewSpan = document.getElementById(`preview-${i + 1}`);
                
                if (td.classList.contains('upload-pending')) {
                    documentosSubidos++;
                }
                
                td.innerHTML = `✓ Listo <span id="preview-${i + 1}"></span>`;
                td.className = 'upload-success';
                this.nextElementSibling.innerHTML = '<i class="fas fa-sync"></i> Cambiar';
                this.nextElementSibling.style.backgroundColor = "#555";
                
                const newPreviewSpan = document.getElementById(`preview-${i + 1}`);
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        newPreviewSpan.innerHTML = `<img src="${e.target.result}" class="thumbnail-preview" alt="Vista">`;
                    }
                    reader.readAsDataURL(file);
                } else if (file.type === 'application/pdf') {
                    newPreviewSpan.innerHTML = `<i class="fas fa-file-pdf pdf-icon-preview"></i>`;
                }
                
                verificarBoton();
            }
        });
    });

    // 4. VALIDACIÓN DE BOTÓN FINAL
    function verificarBoton() {
        const btn = document.getElementById('btn-final');
        if (!aptoAcademico) {
            btn.disabled = true;
            btn.innerHTML = "<i class='fas fa-ban'></i> Promedio insuficiente (Mín. 13)";
            btn.classList.add('btn-disabled');
            return;
        }
        if (documentosSubidos === 4) {
            btn.disabled = false;
            btn.innerHTML = "<i class='fas fa-paper-plane'></i> Confirmar y Enviar Expediente";
            btn.classList.remove('btn-disabled');
            btn.style.backgroundColor = "#d10000"; 
        } else {
            btn.disabled = true;
            btn.innerHTML = `<i class='fas fa-hourglass-half'></i> Faltan ${4 - documentosSubidos} Documentos`;
            btn.classList.add('btn-disabled');
        }
    }
    
    // 5. ACCIÓN DEL BOTÓN FINAL
    // 5. ACCIÓN DEL BOTÓN FINAL (Envía Datos + Archivos Reales)
    document.getElementById('btn-final').addEventListener('click', function() {
        
        const codigo = localStorage.getItem('usuario_activo');
        // Extraemos solo el número de los textos (ej: "3 Pts" -> "3")
        const p_acad = document.getElementById('val-p-acad').textContent.replace(' Pts', '');
        const p_socio = document.getElementById('val-p-socio').textContent.replace(' Pts', '');
        const p_total = document.getElementById('val-puntaje-total').textContent.replace(' Pts', '');

        // 1. Creamos el empaquetado (FormData)
        const formData = new FormData();
        formData.append('codigo', codigo);
        formData.append('puntaje_academico', p_acad);
        formData.append('puntaje_socioeconomico', p_socio);
        formData.append('puntaje_total', p_total);

        // 2. Extraemos los archivos físicos de los inputs
        const file1 = document.getElementById('file-1').files[0];
        const file2 = document.getElementById('file-2').files[0];
        const file3 = document.getElementById('file-3').files[0];
        const file4 = document.getElementById('file-4').files[0];

        // 3. Adjuntamos los archivos al empaquetado
        if(file1) formData.append('Constancia_Ingresos', file1);
        if(file2) formData.append('Declaracion_Jurada', file2);
        if(file3) formData.append('Recibo_Servicios', file3);
        if(file4) formData.append('Croquis_Vivienda', file4);

        // Cambiamos el botón para que diga "Subiendo..."
        this.innerHTML = "<i class='fas fa-spinner fa-spin'></i> Subiendo Expediente...";
        this.disabled = true;

        // 4. Enviamos TODO a Python
        fetch('/api/postular', {
            method: 'POST',
            body: formData // Ya no enviamos JSON, enviamos el FormData directo
        })
        .then(response => response.json())
        .then(data => {
            if(data.status === 'success') {
                alert("¡Expediente y documentos enviados exitosamente a Servicio Social para su revisión!");
                window.location.href = "/modulo/estudiante";
            } else {
                alert("Aviso: " + data.message);
                window.location.href = "/modulo/estudiante";
            }
        })
        .catch(error => {
            console.error("Error al guardar:", error);
            alert("Hubo un error al comunicarse con el servidor.");
        });
    });
    
});