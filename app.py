from flask import Flask, render_template, request, jsonify
import sqlite3
import os 
from werkzeug.utils import secure_filename 

app = Flask(__name__, static_folder='static', template_folder='templates')

# --- CONFIGURACIÓN DE CARPETA PARA SUBIR ARCHIVOS ---
UPLOAD_FOLDER = 'static/uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

def conectar_bd():
    conn = sqlite3.connect('db/siigaa.sqlite')
    conn.row_factory = sqlite3.Row
    return conn

# ==========================================
# 1. RUTAS PARA MOSTRAR LAS PÁGINAS HTML
# ==========================================
@app.route('/')
def index():
    return render_template('index.html')

# --- Rutas de Login ---
@app.route('/login/estudiante')
def vista_login_estudiante():
    return render_template('login/login_estudiante.html')

@app.route('/login/trabajador')
def vista_login_trabajador():
    return render_template('login/login_trabajador.html')

# --- Rutas de Módulos ---
@app.route('/modulo/estudiante')
def vista_modulos_estudiante():
    return render_template('modulo/modulos_estudiante.html')

@app.route('/modulo/trabajador')
def vista_modulos_trabajador():
    return render_template('modulo/modulos_trabajador.html')

# --- Rutas del Comedor ---
@app.route('/comedor/estudiante')
def vista_comedor_estudiante():
    return render_template('estudiante.html')

@app.route('/comedor/evaluador')
def vista_comedor_evaluador():
    return render_template('evaluador.html')


# ==========================================
# 2. RUTAS DE LA API (LÓGICA DEL SISTEMA)
# ==========================================

# API para el Login
@app.route('/api/login', methods=['POST'])
def login():
    datos = request.get_json()
    codigo = datos.get('codigo')
    
    conn = conectar_bd()
    estudiante = conn.execute("SELECT * FROM SIIGAA_Estudiante WHERE cod_matricula = ?", (codigo,)).fetchone()
    conn.close()
    
    if estudiante:
        # Si el código existe en la BD, le damos acceso
        return jsonify({"status": "success", "redirect": "/estudiante", "codigo": codigo})
    
    return jsonify({"status": "error", "message": "Código no encontrado en el SIIGAA."})

# API para cargar la tabla del Evaluador
# API para cargar la tabla del Evaluador (ACTUALIZADA)
@app.route('/api/postulantes', methods=['GET'])
def get_postulantes():
    conn = conectar_bd()
    postulantes = conn.execute("""
        SELECT p.id_postulacion, e.cod_matricula, e.apellidos_nombres, 
               p.puntaje_academico, p.puntaje_socioeconomico, p.puntaje_total, 
               p.categoria_minsa, p.estado, e.promedio_ponderado, e.ingresos_economicos
        FROM Comedor_Postulacion p
        JOIN SIIGAA_Estudiante e ON p.cod_matricula = e.cod_matricula
        ORDER BY p.fecha_registro DESC
    """).fetchall()
    conn.close()
    
    datos = [dict(row) for row in postulantes]
    return jsonify({"status": "success", "data": datos})

# NUEVO: API para traer los documentos de un alumno
@app.route('/api/documentos/<int:id_postulacion>', methods=['GET'])
def get_documentos(id_postulacion):
    conn = conectar_bd()
    documentos = conn.execute("SELECT * FROM Comedor_Documentos WHERE id_postulacion = ?", (id_postulacion,)).fetchall()
    conn.close()
    return jsonify({"status": "success", "data": [dict(row) for row in documentos]})

# NUEVO: API para cambiar el estado (Aprobar, Rechazar, o pasar a Evaluada)
@app.route('/api/actualizar_estado', methods=['POST'])
def actualizar_estado():
    datos = request.get_json()
    id_postulacion = datos.get('id_postulacion')
    nuevo_estado = datos.get('estado')
    
    conn = conectar_bd()
    conn.execute("UPDATE Comedor_Postulacion SET estado = ? WHERE id_postulacion = ?", (nuevo_estado, id_postulacion))
    conn.commit()
    conn.close()
    
    return jsonify({"status": "success"})


# API para obtener los datos reales del estudiante
@app.route('/api/estudiante/<codigo>', methods=['GET'])
def get_estudiante(codigo):
    conn = conectar_bd()
    
    # 1. Buscamos los datos académicos y socioeconómicos del SIIGAA
    estudiante = conn.execute("SELECT * FROM SIIGAA_Estudiante WHERE cod_matricula = ?", (codigo,)).fetchone()
    
    if not estudiante:
        conn.close()
        return jsonify({"status": "error", "message": "Estudiante no encontrado"})
    
    # 2. Buscamos si ya tiene una postulación en el comedor
    postulacion = conn.execute("SELECT estado FROM Comedor_Postulacion WHERE cod_matricula = ? ORDER BY fecha_registro DESC LIMIT 1", (codigo,)).fetchone()
    conn.close()
    
    # Si no ha postulado, le decimos que no está registrada
    estado_postulacion = postulacion['estado'] if postulacion else "NO REGISTRADA"
    
    # Convertimos los datos a un diccionario
    datos = dict(estudiante)
    datos['estado_postulacion'] = estado_postulacion
    
    return jsonify({"status": "success", "data": datos})

# API para Guardar la Postulación Final
@app.route('/api/postular', methods=['POST'])
def postular():
    # Como ahora enviamos archivos, leemos con request.form en lugar de get_json()
    codigo = request.form.get('codigo')
    p_acad = int(request.form.get('puntaje_academico'))
    p_socio = int(request.form.get('puntaje_socioeconomico'))
    p_total = int(request.form.get('puntaje_total'))
    
    categoria = 'C'
    if p_total >= 15: categoria = 'A'
    elif p_total >= 12: categoria = 'B'

    conn = conectar_bd()
    try:
        cursor = conn.cursor()
        
        # 1. Guardar la Postulación en estado 'EN_REVISION'
        cursor.execute("""
            INSERT INTO Comedor_Postulacion 
            (cod_matricula, id_convocatoria, puntaje_academico, puntaje_socioeconomico, puntaje_total, categoria_minsa, estado) 
            VALUES (?, 1, ?, ?, ?, ?, 'EN_REVISION')
        """, (codigo, p_acad, p_socio, p_total, categoria))
        
        id_postulacion = cursor.lastrowid # Obtenemos el ID que se acaba de crear
        
        # 2. Guardar los Documentos Adjuntos
        for clave_archivo in request.files:
            file = request.files[clave_archivo]
            if file and file.filename:
                # Limpiamos el nombre y lo guardamos en la carpeta /static/uploads
                filename = secure_filename(f"{codigo}_{file.filename}")
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(filepath)
                
                # Registramos el documento en la base de datos
                ruta_web = f"/static/uploads/{filename}"
                cursor.execute("""
                    INSERT INTO Comedor_Documentos (id_postulacion, tipo_documento, nombre_archivo, ruta_archivo)
                    VALUES (?, ?, ?, ?)
                """, (id_postulacion, clave_archivo, filename, ruta_web))
        
        conn.commit()
        return jsonify({"status": "success", "message": "Expediente y documentos enviados a Servicio Social para su revisión."})
        
    except sqlite3.IntegrityError:
        return jsonify({"status": "error", "message": "Este estudiante ya tiene una postulación en curso."})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})
    finally:
        conn.close()

# Iniciar el servidor
if __name__ == '__main__':
    print("🚀 Iniciando Servidor SIIGAA...")
    app.run(debug=True, port=5000)